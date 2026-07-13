// 关联业务：统一消费后端租户事实、工作身份和物业管理模式，禁止前端伪造小区治理状态。
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { BackendPropertyManagementMode, DataScope, PropertyMode, RoleId } from "./types";
import { mapPropertyMode, ROLES } from "./types";
import {
  clearSession,
  listManagedCommunities,
  loadSession,
  loginByPhone,
  saveSession,
  switchManagedCommunity,
  switchSysUserShadow,
  type ManagedCommunity,
  type Session,
} from "./auth";
import { setUnauthorizedHandler } from "./api";
import {
  firstPageId,
  hasPage,
  listNavigationMenus,
  type NavModule,
} from "./nav";

export interface Community {
  id: string;
  name: string;
  mode: PropertyMode;
  households: number;
  area: number; // 总专有面积 ㎡
}

/** 没有有效租户上下文时的明确占位，绝不回退为其他小区的演示数据。 */
const EMPTY_COMMUNITY: Community = {
  id: "",
  name: "未选择小区",
  mode: "unconfigured",
  households: 0,
  area: 0,
};

interface StoreValue {
  role: RoleId;
  setRole: (r: RoleId) => void;
  /** 当前 JWT 实际生效的小区 tenant_id，不能只改显示名称。 */
  communityId: string;
  setCommunityId: (id: string) => Promise<void>;
  community: Community;
  managedCommunities: ManagedCommunity[];
  communitySwitching: boolean;
  mode: PropertyMode;
  /** 仅消费已由后端执行动作返回的模式，不提供前端手工切换入口。 */
  applyAuthoritativePropertyMode: (mode: BackendPropertyManagementMode | null) => void;
  lockdown: boolean; // 换届熔断 HANDOVER_LOCK
  setLockdown: (v: boolean) => void;
  dataScope: DataScope;
  setDataScope: (s: DataScope) => void;
  page: string;
  setPage: (p: string) => void;
  authed: boolean;
  token: string | null;
  permissions: string[];
  menus: NavModule[];
  /** 后端 user_info.role_key（如 COMMITTEE_DIRECTOR），用于业务组件判断身份。 */
  roleKey: string | null;
  hasPermission: (key: string) => boolean;
  login: (phone: string, smsCode: string) => Promise<void>;
  switchShadow: (targetUserId: number) => Promise<void>;
  logout: () => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

const DEFAULT_SCOPE: Record<RoleId, DataScope> = {
  street_admin: "ALL_DISTRICT",
  community_admin: "ALL_COMMUNITY",
  party_secretary: "ALL_COMMUNITY",
  gov_operator: "ALL_COMMUNITY",
  committee_director: "ALL_COMMUNITY",
  committee_member: "ALL_COMMUNITY",
  building_rep: "CUSTOM_BUILDING",
  property_manager: "ORG_ONLY",
  property_service: "ORG_ONLY",
  supplier_service: "ORG_ONLY",
  auditor: "ALL_COMMUNITY",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  // 启动时从 localStorage 恢复会话，实现刷新不掉线
  const initial = loadSession();

  const [role, setRoleRaw] = useState<RoleId>(initial?.roleId ?? "committee_director");
  const [communityId, setCommunityIdState] = useState<string>(initial?.communityId ?? "");
  const [communityName, setCommunityName] = useState<string | null>(initial?.user.tenant_name ?? null);
  const [managedCommunities, setManagedCommunities] = useState<ManagedCommunity[]>(
    initial?.managedCommunities ?? [],
  );
  const [communitySwitching, setCommunitySwitching] = useState(false);
  const [mode, setMode] = useState<PropertyMode>(() => mapPropertyMode(initial?.user.property_mode));
  const [lockdown, setLockdown] = useState(false);
  const [dataScope, setDataScope] = useState<DataScope>(
    initial ? DEFAULT_SCOPE[initial.roleId] : "ALL_COMMUNITY",
  );
  const [page, setPage] = useState("overview");
  const [authed, setAuthed] = useState(!!initial?.token);
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [permissions, setPermissions] = useState<string[]>(initial?.user.permissions ?? []);
  const [menus, setMenus] = useState<NavModule[]>(initial?.menus ?? []);
  const [roleKey, setRoleKey] = useState<string | null>(initial?.user.role_key ?? null);

  // 注册 401/403 兜底：token 失效时清空会话回登录页
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setPermissions([]);
      setMenus([]);
      setRoleKey(null);
      setManagedCommunities([]);
      setCommunityIdState("");
      setCommunityName(null);
      setMode("unconfigured");
      setAuthed(false);
      setPage("overview");
    });
  }, []);

  const setRole = (r: RoleId) => {
    setRoleRaw(r);
    setDataScope(DEFAULT_SCOPE[r]);
    setPage("overview");
  };

  const applySession = (session: Session) => {
    setRoleRaw(session.roleId);
    setDataScope(DEFAULT_SCOPE[session.roleId]);
    setCommunityIdState(session.communityId);
    setCommunityName(session.user.tenant_name ?? null);
    setMode(mapPropertyMode(session.user.property_mode));
    setManagedCommunities(session.managedCommunities ?? []);
    setPermissions(session.user.permissions ?? []);
    setMenus(session.menus ?? []);
    setRoleKey(session.user.role_key ?? null);
    setToken(session.token);
    setPage("overview");
    setLockdown(false);
    setAuthed(true);
  };

  // 真实登录：手机号 + 短信验证码 → 后端签发 JWT，角色/小区/权限由 user_info 派生
  const login = async (phone: string, smsCode: string) => {
    const session = await withMenus(await loginByPhone(phone, smsCode));
    applySession(session);
  };

  const switchShadow = async (targetUserId: number) => {
    const session = await withMenus(await switchSysUserShadow(targetUserId));
    applySession(session);
  };

  /**
   * G 端切换小区时先由后端校验监管范围并重签 JWT，再整体重挂工作台以重新加载租户数据。
   */
  const setCommunityId = async (id: string) => {
    if (role !== "street_admin" || id === communityId) return;
    const targetTenantId = Number(id);
    if (!Number.isSafeInteger(targetTenantId) || targetTenantId <= 0) {
      throw new Error("目标小区无效");
    }
    setCommunitySwitching(true);
    try {
      const session = await withMenus(await switchManagedCommunity(targetTenantId));
      applySession(session);
    } finally {
      setCommunitySwitching(false);
    }
  };

  /**
   * 模式只能在注册审核或属地执行成功后由服务端返回。此处同步受信响应与本地会话，
   * 避免顶栏继续显示旧模式，也不允许页面用按钮伪造模式切换。
   */
  const applyAuthoritativePropertyMode = (backendMode: BackendPropertyManagementMode | null) => {
    setMode(mapPropertyMode(backendMode));
    const nextManagedCommunities = role === "street_admin"
      ? managedCommunities.map((item) => (
        String(item.tenant_id) === communityId ? { ...item, property_mode: backendMode } : item
      ))
      : managedCommunities;
    if (role === "street_admin") setManagedCommunities(nextManagedCommunities);

    const current = loadSession();
    if (current?.token === token) {
      saveSession({
        ...current,
        user: { ...current.user, property_mode: backendMode },
        managedCommunities: nextManagedCommunities,
      });
    }
  };

  const logout = () => {
    clearSession();
    setToken(null);
    setPermissions([]);
    setMenus([]);
    setRoleKey(null);
    setManagedCommunities([]);
    setCommunityIdState("");
    setCommunityName(null);
    setMode("unconfigured");
    setAuthed(false);
    setPage("overview");
  };

  const hasPermission = (key: string) => permissions.includes(key);

  async function withMenus(session: Session): Promise<Session> {
    // 后续请求须使用新签发 token，因此先落地会话，再并发拉取菜单和可监管小区。
    saveSession(session);
    const [menus, managedContext] = await Promise.all([
      listNavigationMenus(),
      session.roleId === "street_admin" ? listManagedCommunities() : Promise.resolve(null),
    ]);
    const next: Session = {
      ...session,
      menus,
      managedCommunities: managedContext?.communities ?? [],
    };
    saveSession(next);
    return next;
  }

  useEffect(() => {
    if (!token) return;
    let alive = true;
    listNavigationMenus()
      .then((nextMenus) => {
        if (!alive) return;
        setMenus(nextMenus);
        const current = loadSession();
        if (current?.token === token) {
          saveSession({ ...current, menus: nextMenus });
        }
        setPage((currentPage) => (
          hasPage(nextMenus, currentPage)
            ? currentPage
            : (firstPageId(nextMenus) ?? "overview")
        ));
      })
      .catch(() => {
        if (alive) setMenus([]);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  // 兼容部署前已存在的登录会话：刷新页面后仍从后端恢复真实的辖区小区列表与当前 tenant。
  useEffect(() => {
    if (!token || role !== "street_admin") return;
    let alive = true;
    listManagedCommunities()
      .then((managedContext) => {
        if (!alive) return;
        const activeCommunityId = managedContext.active_tenant_id == null
          ? ""
          : String(managedContext.active_tenant_id);
        const activeCommunity = managedContext.communities.find(
          (item) => String(item.tenant_id) === activeCommunityId,
        );
        setManagedCommunities(managedContext.communities);
        setCommunityIdState(activeCommunityId);
        setCommunityName(activeCommunity?.tenant_name ?? null);
        setMode(mapPropertyMode(activeCommunity?.property_mode));
        const current = loadSession();
        if (current?.token === token) {
          saveSession({
            ...current,
            communityId: activeCommunityId,
            managedCommunities: managedContext.communities,
            user: {
              ...current.user,
              tenant_id: managedContext.active_tenant_id,
              tenant_name: activeCommunity?.tenant_name ?? null,
              property_mode: activeCommunity?.property_mode ?? null,
            },
          });
        }
      })
      .catch(() => {
        // 受控切换请求本身会显示错误；初始化失败时不以静态小区伪造辖区范围。
      });
    return () => {
      alive = false;
    };
  }, [role, token]);

  const community = useMemo(() => {
    if (role === "street_admin") {
      const found = managedCommunities.find((item) => String(item.tenant_id) === communityId);
      return found
        ? {
          id: String(found.tenant_id),
          name: found.tenant_name,
          mode: mapPropertyMode(found.property_mode),
          households: found.planned_household_count ?? 0,
          area: found.total_exclusive_area ?? 0,
        }
        : EMPTY_COMMUNITY;
    }
    return communityId && communityName?.trim()
      ? { id: communityId, name: communityName.trim(), mode, households: 0, area: 0 }
      : EMPTY_COMMUNITY;
  }, [communityId, communityName, managedCommunities, mode, role]);

  const value: StoreValue = {
    role,
    setRole,
    communityId,
    setCommunityId,
    community,
    managedCommunities,
    communitySwitching,
    mode: community.mode,
    applyAuthoritativePropertyMode,
    lockdown,
    setLockdown,
    dataScope,
    setDataScope,
    page,
    setPage,
    authed,
    token,
    permissions,
    menus,
    roleKey,
    hasPermission,
    login,
    switchShadow,
    logout,
  };

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export { ROLES };
