import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DataScope, PropertyMode, RoleId } from "./types";
import { ROLES } from "./types";
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
  mode?: PropertyMode;
  households: number;
  area: number; // 总专有面积 ㎡
}

/** 非 G 端展示用的既有演示小区；G 端一律使用后端授权列表。 */
const DEMO_COMMUNITIES: Community[] = [
  { id: "c1", name: "盘古·和畅雅苑", mode: "trust", households: 1240, area: 156800 },
  { id: "c2", name: "盘古·锦绣华庭", mode: "reward", households: 860, area: 102400 },
  { id: "c3", name: "盘古·翠湖名邸", mode: "package", households: 540, area: 71200 },
];

const EMPTY_GOVERNMENT_COMMUNITY: Community = {
  id: "",
  name: "未选择小区",
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
  setMode: (m: PropertyMode) => void;
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
  const [managedCommunities, setManagedCommunities] = useState<ManagedCommunity[]>(
    initial?.managedCommunities ?? [],
  );
  const [communitySwitching, setCommunitySwitching] = useState(false);
  const [mode, setMode] = useState<PropertyMode>("trust");
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

  const logout = () => {
    clearSession();
    setToken(null);
    setPermissions([]);
    setMenus([]);
    setRoleKey(null);
    setManagedCommunities([]);
    setCommunityIdState("");
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
        setManagedCommunities(managedContext.communities);
        setCommunityIdState(activeCommunityId);
        const current = loadSession();
        if (current?.token === token) {
          saveSession({
            ...current,
            communityId: activeCommunityId,
            managedCommunities: managedContext.communities,
            user: { ...current.user, tenant_id: managedContext.active_tenant_id },
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
          households: found.planned_household_count ?? 0,
          area: found.total_exclusive_area ?? 0,
        }
        : EMPTY_GOVERNMENT_COMMUNITY;
    }
    return DEMO_COMMUNITIES.find((item) => item.id === communityId) ?? DEMO_COMMUNITIES[0];
  }, [communityId, managedCommunities, role]);

  // 当前小区模式跟随小区（除非用户手动切换演示）
  const effectiveMode = community.mode ?? mode;

  const value: StoreValue = {
    role,
    setRole,
    communityId,
    setCommunityId,
    community,
    managedCommunities,
    communitySwitching,
    mode: effectiveMode,
    setMode,
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
