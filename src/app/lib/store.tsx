import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { DataScope, PropertyMode, RoleId } from "./types";
import { ROLES } from "./types";
import { loginByPhone, loadSession, clearSession, switchSysUserShadow, type Session } from "./auth";
import { setUnauthorizedHandler } from "./api";

export interface Community {
  id: string;
  name: string;
  mode: PropertyMode;
  households: number;
  area: number; // 总专有面积 ㎡
}

export const COMMUNITIES: Community[] = [
  { id: "c1", name: "盘古·和畅雅苑", mode: "trust", households: 1240, area: 156800 },
  { id: "c2", name: "盘古·锦绣华庭", mode: "reward", households: 860, area: 102400 },
  { id: "c3", name: "盘古·翠湖名邸", mode: "package", households: 540, area: 71200 },
];

interface StoreValue {
  role: RoleId;
  setRole: (r: RoleId) => void;
  communityId: string | "ALL"; // ALL = 辖区汇总（仅 G 端）
  setCommunityId: (id: string | "ALL") => void;
  community: Community;
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
  /** 后端 user_info.role_key（如 COMMITTEE_DIRECTOR），用于 nav 页级 requireRoleKeys 过滤。 */
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
  auditor: "ALL_COMMUNITY",
};

export function StoreProvider({ children }: { children: ReactNode }) {
  // 启动时从 localStorage 恢复会话，实现刷新不掉线
  const initial = loadSession();

  const [role, setRoleRaw] = useState<RoleId>(initial?.roleId ?? "committee_director");
  const [communityId, setCommunityId] = useState<string | "ALL">(initial?.communityId ?? "c1");
  const [mode, setMode] = useState<PropertyMode>("trust");
  const [lockdown, setLockdown] = useState(false);
  const [dataScope, setDataScope] = useState<DataScope>(
    initial ? DEFAULT_SCOPE[initial.roleId] : "ALL_COMMUNITY",
  );
  const [page, setPage] = useState("overview");
  const [authed, setAuthed] = useState(!!initial?.token);
  const [token, setToken] = useState<string | null>(initial?.token ?? null);
  const [permissions, setPermissions] = useState<string[]>(initial?.user.permissions ?? []);
  const [roleKey, setRoleKey] = useState<string | null>(initial?.user.role_key ?? null);

  // 注册 401/403 兜底：token 失效时清空会话回登录页
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setToken(null);
      setPermissions([]);
      setRoleKey(null);
      setAuthed(false);
      setPage("overview");
    });
  }, []);

  const setRole = (r: RoleId) => {
    setRoleRaw(r);
    setDataScope(DEFAULT_SCOPE[r]);
    const sideG = r === "street_admin";
    if (!sideG && communityId === "ALL") setCommunityId("c1");
    setPage("overview");
  };

  const applySession = (session: Session) => {
    setRoleRaw(session.roleId);
    setDataScope(DEFAULT_SCOPE[session.roleId]);
    setCommunityId(session.communityId);
    setPermissions(session.user.permissions ?? []);
    setRoleKey(session.user.role_key ?? null);
    setToken(session.token);
    setPage("overview");
    setLockdown(false);
    setAuthed(true);
  };

  // 真实登录：手机号 + 短信验证码 → 后端签发 JWT，角色/小区/权限由 user_info 派生
  const login = async (phone: string, smsCode: string) => {
    const session = await loginByPhone(phone, smsCode);
    applySession(session);
  };

  const switchShadow = async (targetUserId: number) => {
    const session = await switchSysUserShadow(targetUserId);
    applySession(session);
  };

  const logout = () => {
    clearSession();
    setToken(null);
    setPermissions([]);
    setRoleKey(null);
    setAuthed(false);
    setPage("overview");
  };

  const hasPermission = (key: string) => permissions.includes(key);

  const community = useMemo(() => {
    const found = COMMUNITIES.find((c) => c.id === communityId);
    return found ?? COMMUNITIES[0];
  }, [communityId]);

  // 当前小区模式跟随小区（除非用户手动切换演示）
  const effectiveMode = communityId === "ALL" ? mode : community.mode;

  const value: StoreValue = {
    role,
    setRole,
    communityId,
    setCommunityId,
    community,
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
