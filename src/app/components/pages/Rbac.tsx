"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard } from "../gov/common";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ShieldAlert,
  ShieldCheck,
  Plus,
  Trash2,
  Loader2,
  KeyRound,
  Save,
  Search,
  UserCog,
  Phone,
} from "lucide-react";
import { useStore } from "../../lib/store";
import {
  listRoles,
  getRolePermissions,
  listPermissions,
  createRole,
  assignPermission,
  revokePermission,
  deleteRole,
  updateRoleDataScope,
  type Role,
  type RolePermission,
  type PermissionCatalog,
  type CreateRoleInput,
} from "../../lib/rbac";
import {
  createWorkIdentityShadow,
  createWorkIdentityAccount,
  listWorkIdentityBuildings,
  listWorkIdentityAccounts,
  listWorkIdentityDeptOptions,
  searchWorkIdentityAccounts,
  type WorkIdentityBuilding,
  type WorkIdentityAccount,
} from "../../lib/work-identity";

/* ─── 后端枚举 → 展示映射 ─── */

// 后端数据范围仅 3 值（fixed/default_data_scope 的 CHECK 约束）；
// 页面按原设计展开为业务语义卡片，提交时仍写回后端三枚举。
const DATA_SCOPES = [
  {
    value: "ALL_COMMUNITY",
    label: "辖区全部小区",
    desc: "可访问当前管理辖区内全部小区数据，适用于 G 端监管身份。",
    count: "按登录身份辖区聚合",
    appliesTo: (role: Role) => role.allowedDeptCategory === "G",
  },
  {
    value: "ALL_COMMUNITY",
    label: "本小区全量",
    desc: "可访问本小区全部业主、档案、财务和治理数据，适用于业委会主任等自治管理身份。",
    count: "按当前小区全量",
    appliesTo: (role: Role) => role.allowedDeptCategory === "B",
  },
  {
    value: "OWNER_GROUP",
    label: "按网格（AllowedBuildingIds）",
    desc: "网格员专用：由其所属网格节点聚合楼栋，可跨小区；具体网格在「网格组织管理」维护。",
    count: "跨小区聚合，随网格动态变化",
    appliesTo: (role: Role) => role.roleKey === "GRID_MEMBER",
  },
  {
    value: "OWNER_GROUP",
    label: "仅责任田楼栋",
    desc: "仅可访问分配到的楼栋，适用于楼栋代表、志愿者等自治侧责任田身份。",
    count: "按楼栋分配",
    appliesTo: (role: Role) => role.roleKey !== "GRID_MEMBER",
  },
  {
    value: "ORG_ONLY",
    label: "仅本组织",
    desc: "仅访问本物业或服务组织内部数据，不越界查看业主自治和监管数据。",
    count: "按服务组织隔离",
    appliesTo: () => true,
  },
] as const;

function visibleDataScopes(role: Role) {
  return DATA_SCOPES.filter((scope) => scope.appliesTo(role));
}

function scopeLabel(scope: string | null | undefined, role?: Pick<Role, "roleKey" | "allowedDeptCategory"> | null): string {
  if (!scope) return "-";
  if (scope === "ALL_COMMUNITY") {
    return role?.allowedDeptCategory === "G" ? "辖区全部小区" : "本小区全量";
  }
  if (scope === "OWNER_GROUP") {
    return role?.roleKey === "GRID_MEMBER" ? "按网格（AllowedBuildingIds）" : "仅责任田楼栋";
  }
  if (scope === "ORG_ONLY") return "仅本组织";
  return scope;
}

// 端归属位 G/B/S。
const DEPT_LABEL: Record<string, string> = {
  G: "政府端",
  B: "业委会端",
  S: "服务端",
};

// 权限分组 → 中文展示，缺省回退原值。
const GROUP_LABEL: Record<string, string> = {
  ADMIN: "系统管理",
  VOTING: "投票管理",
  WAIVER: "豁免",
  FUND: "资金",
  IDENTITY: "身份",
  LOCK: "换届熔断",
  OWNER: "业主",
  DISCLOSURE: "信息披露",
  DISPUTE: "纠纷",
};

function groupLabel(group: string): string {
  return GROUP_LABEL[group] ?? group;
}

function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2");
}

/* ─── 主页面 ─── */
export function Rbac() {
  const { hasPermission } = useStore();
  const canManage = hasPermission("admin:role:manage");
  // 读侧门控：admin:role:read 为 G 端专属（后端 allowed_dept_categories='G'），
  // B/S 端角色无此权限 → 菜单已隐藏；此处兜底防止 page 残留为 rbac 时撞 403。
  const canRead = hasPermission("admin:role:read");

  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // 全量权限清单（一次拉取，勾选矩阵骨架）。
  const [catalog, setCatalog] = useState<PermissionCatalog[]>([]);
  // 当前角色已授权限。
  const [granted, setGranted] = useState<RolePermission[]>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  // 数据范围编辑草稿：选中角色或写回成功后同步为该角色 defaultDataScope。
  const [pendingScope, setPendingScope] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // 红线二次确认。
  const [pendingToggle, setPendingToggle] = useState<{
    key: string;
    nextChecked: boolean;
  } | null>(null);

  // 角色列表加载。
  useEffect(() => {
    let alive = true;
    setLoading(true);
    listRoles({ page: 1, size: 100 })
      .then((res) => {
        if (!alive) return;
        setRoles(res.items);
        setSelectedId(res.items[0]?.roleId ?? null);
      })
      .catch((err) => {
        if (!alive) return;
        toast.error(err instanceof Error ? err.message : "角色列表加载失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 权限清单加载（与角色列表并行）。
  useEffect(() => {
    let alive = true;
    listPermissions()
      .then((res) => {
        if (alive) setCatalog(res);
      })
      .catch((err) => {
        if (!alive) return;
        toast.error(err instanceof Error ? err.message : "权限清单加载失败");
      });
    return () => {
      alive = false;
    };
  }, []);

  const selected = roles.find((r) => r.roleId === selectedId) ?? null;

  // 选中角色变化 / 写回刷新 → 同步数据范围草稿为该角色当前 defaultDataScope。
  useEffect(() => {
    setPendingScope(selected?.defaultDataScope ?? null);
  }, [selectedId, selected?.defaultDataScope, refreshKey]);

  // fixed 非空 = 法理红线锁死，数据范围不可在线变更（后端 403/42302）。
  const scopeLocked = selected?.fixedDataScope != null;
  const scopeDirty =
    selected != null && pendingScope != null && pendingScope !== selected.defaultDataScope;

  // 选中角色 → 拉取已授权限明细。
  useEffect(() => {
    if (selectedId == null) {
      setGranted([]);
      return;
    }
    let alive = true;
    setPermLoading(true);
    getRolePermissions(selectedId)
      .then((res) => {
        if (alive) setGranted(res);
      })
      .catch((err) => {
        if (!alive) return;
        setGranted([]);
        toast.error(err instanceof Error ? err.message : "已授权限加载失败");
      })
      .finally(() => {
        if (alive) setPermLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedId, refreshKey]);

  const grantedKeys = useMemo(
    () => new Set(granted.map((p) => p.permissionKey)),
    [granted],
  );

  // 权限按 group 分组；红线单列。
  const redlinePerms = useMemo(
    () => catalog.filter((p) => p.isLegalRedline === 1),
    [catalog],
  );
  const grouped = useMemo(() => {
    const map = new Map<string, PermissionCatalog[]>();
    for (const p of catalog) {
      if (p.isLegalRedline === 1) continue;
      const arr = map.get(p.permissionGroup) ?? [];
      arr.push(p);
      map.set(p.permissionGroup, arr);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [catalog]);

  const grantedRedlines = redlinePerms.filter((p) => grantedKeys.has(p.permissionKey));

  // 列表刷新（写动作后），保留选中。
  async function reloadRoles(preserveId?: number) {
    try {
      const res = await listRoles({ page: 1, size: 100 });
      setRoles(res.items);
      const exists = preserveId != null && res.items.some((r) => r.roleId === preserveId);
      setSelectedId(exists ? preserveId! : (res.items[0]?.roleId ?? null));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "角色列表刷新失败");
    }
  }

  // 勾选切换：红线需二次确认。
  function onToggle(perm: PermissionCatalog, nextChecked: boolean) {
    if (!canManage || selectedId == null) return;
    if (perm.isLegalRedline === 1) {
      setPendingToggle({ key: perm.permissionKey, nextChecked });
      return;
    }
    void doToggle(perm.permissionKey, nextChecked);
  }

  async function doToggle(key: string, nextChecked: boolean) {
    if (selectedId == null) return;
    setActing(true);
    try {
      if (nextChecked) {
        await assignPermission(selectedId, key);
      } else {
        await revokePermission(selectedId, key);
      }
      setRefreshKey((k) => k + 1);
      await reloadRoles(selectedId);
      toast.success(nextChecked ? "权限已授予" : "权限已撤销");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "权限变更失败");
    } finally {
      setActing(false);
    }
  }

  // 分组全选 / 全不选（仅非红线）。
  async function toggleGroup(perms: PermissionCatalog[]) {
    if (!canManage || selectedId == null) return;
    const allChecked = perms.every((p) => grantedKeys.has(p.permissionKey));
    setActing(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const p of perms) {
        const isGranted = grantedKeys.has(p.permissionKey);
        try {
          if (allChecked && isGranted) {
            await revokePermission(selectedId, p.permissionKey);
            ok++;
          } else if (!allChecked && !isGranted) {
            await assignPermission(selectedId, p.permissionKey);
            ok++;
          }
        } catch {
          fail++;
        }
      }
      setRefreshKey((k) => k + 1);
      await reloadRoles(selectedId);
      if (fail > 0) toast.warning(`${ok} 项已更新，${fail} 项失败（端归属 / 红线约束）`);
      else toast.success(`${ok} 项已更新`);
    } finally {
      setActing(false);
    }
  }

  async function handleCreate(input: CreateRoleInput) {
    setActing(true);
    try {
      const res = await createRole(input);
      toast.success("角色已创建");
      setCreateOpen(false);
      await reloadRoles(res.roleId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "创建角色失败");
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (selected == null) return;
    setActing(true);
    try {
      await deleteRole(selected.roleId);
      toast.success("角色已删除");
      setDeleteOpen(false);
      await reloadRoles();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "删除角色失败");
    } finally {
      setActing(false);
    }
  }

  // 写回数据范围：fixed 非空已禁用编辑，此处不触发。
  async function handleSaveScope() {
    if (selected == null || pendingScope == null) return;
    setActing(true);
    try {
      await updateRoleDataScope(selected.roleId, pendingScope);
      await reloadRoles(selected.roleId);
      toast.success("数据范围已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "数据范围更新失败");
    } finally {
      setActing(false);
    }
  }

  if (!canRead) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader
          title="角色与数据范围配置"
          desc="RBAC + ABAC 核心 — 配置各角色可操作的权限点及数据可见范围"
        />
        <SectionCard>
          <div className="py-16 text-center text-muted-foreground">
            当前角色无 <span className="font-mono-num">admin:role:read</span> 权限，无法查看角色与数据范围配置。
          </div>
        </SectionCard>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32 text-muted-foreground">
        <Loader2 className="size-5 mr-2 animate-spin" /> 角色列表加载中…
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader
          title="角色与数据范围配置"
          desc="RBAC + ABAC 核心 — 配置各角色可操作的权限点及数据可见范围"
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> 新建角色
              </Button>
            ) : undefined
          }
        />
        <SectionCard>
          <div className="py-16 text-center text-muted-foreground">
            暂无角色数据。
          </div>
        </SectionCard>
        <CreateRoleDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onSubmit={handleCreate}
          submitting={acting}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="角色与数据范围配置"
        desc="RBAC + ABAC 核心 — 配置各角色权限与数据范围，并为用户账号分配角色"
      />

      <Tabs defaultValue="matrix" className="gap-4">
        <TabsList>
          <TabsTrigger value="matrix">权限矩阵配置</TabsTrigger>
          <TabsTrigger value="assign">用户角色分配</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="mt-0">
          {canManage && (
            <div className="mb-4 flex justify-end">
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="size-4" /> 新建角色
              </Button>
            </div>
          )}
      <div className="grid lg:grid-cols-12 gap-4 items-start">
        {/* ── 左：角色列表 ── */}
        <div className="lg:col-span-3">
          <SectionCard title="角色列表" bodyClassName="p-2">
            <div className="space-y-0.5">
              {roles.map((role) => {
                const active = selectedId === role.roleId;
                return (
                  <button
                    key={role.roleId}
                    className="w-full text-left rounded-md px-3 py-2.5 transition-colors"
                    style={{
                      backgroundColor: active ? "#e8f0fb" : undefined,
                      color: active ? "#143c78" : undefined,
                    }}
                    onClick={() => setSelectedId(role.roleId)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{role.roleName}</span>
                      {role.isSystem === 1 && (
                        <Badge variant="secondary" className="shrink-0 text-[10px]">预置</Badge>
                      )}
                      {role.status === "1" && (
                        <Badge variant="outline" className="shrink-0 text-[10px] text-muted-foreground">停用</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight flex items-center gap-2">
                      <span className="font-mono-num">{role.roleKey}</span>
                      <span>·</span>
                      <span>{role.permissionCount} 项权限</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* ── 中：权限矩阵 ── */}
        <div className="lg:col-span-5 space-y-3">
          {/* 法律红线区 */}
          <div className="rounded-lg border border-red-200 bg-red-50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200 bg-red-100/60">
              <ShieldAlert className="size-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">法律红线权限</span>
              <span className="ml-auto text-xs text-red-500">
                已授予 {grantedRedlines.length}/{redlinePerms.length}
              </span>
            </div>
            <div className="px-4 py-2">
              <p className="text-xs text-red-600 mb-3">
                ⚠️ 红线权限授予需谨慎，涉及强制撤销 / 大额放行 / 双签 / 熔断处置等，操作将被存证、不可逆。
              </p>
              {permLoading ? (
                <PermSkeleton />
              ) : redlinePerms.length === 0 ? (
                <p className="text-xs text-red-400 py-2">暂无红线权限定义。</p>
              ) : (
                <div className="space-y-2">
                  {redlinePerms.map((perm) => {
                    const checked = grantedKeys.has(perm.permissionKey);
                    return (
                      <label
                        key={perm.permissionKey}
                        className="flex items-center gap-3 cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          disabled={!canManage || acting}
                          onCheckedChange={() => onToggle(perm, !checked)}
                          className="border-red-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <div className="min-w-0">
                          <div className="text-sm text-red-700 font-medium truncate">
                            {perm.description}
                          </div>
                          <div className="text-[11px] text-red-400 font-mono-num">
                            {perm.permissionKey}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 普通权限模块 */}
          <SectionCard title="权限模块配置">
            {permLoading ? (
              <PermSkeleton />
            ) : grouped.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                暂无权限定义。
              </p>
            ) : (
              <div className="space-y-5">
                {grouped.map(([group, perms]) => {
                  const allChecked = perms.every((p) => grantedKeys.has(p.permissionKey));
                  const someChecked = perms.some((p) => grantedKeys.has(p.permissionKey));
                  return (
                    <div key={group}>
                      <div className="flex items-center gap-2 mb-2">
                        <KeyRound className="size-4 text-primary" />
                        <span className="text-sm font-semibold">{groupLabel(group)}</span>
                        <span className="text-xs text-muted-foreground">({perms.length})</span>
                        {canManage && (
                          <button
                            className="ml-auto text-xs text-primary underline disabled:opacity-50"
                            disabled={acting}
                            onClick={() => toggleGroup(perms)}
                          >
                            {allChecked ? "全不选" : "全选"}
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 gap-x-4 pl-6">
                        {perms.map((perm) => {
                          const checked = grantedKeys.has(perm.permissionKey);
                          return (
                            <label
                              key={perm.permissionKey}
                              className="flex items-start gap-2 cursor-pointer"
                              title={perm.permissionKey}
                            >
                              <Checkbox
                                checked={checked}
                                disabled={!canManage || acting}
                                onCheckedChange={() => onToggle(perm, !checked)}
                                className="mt-0.5"
                              />
                              <div className="min-w-0">
                                <div className="text-sm leading-tight">{perm.description}</div>
                                <div className="text-[11px] text-muted-foreground font-mono-num">
                                  {perm.permissionKey}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── 右：数据范围 + 摘要 ── */}
        <div className="lg:col-span-4 space-y-3">
          <SectionCard
            title="数据范围"
            desc="决定该角色能访问哪些数据记录"
          >
            <RadioGroup
              value={pendingScope ?? selected.defaultDataScope}
              onValueChange={(v) => !scopeLocked && canManage && setPendingScope(v)}
            >
              <div className="space-y-2">
                {visibleDataScopes(selected).map((scope) => {
                  const checked = (pendingScope ?? selected.defaultDataScope) === scope.value;
                  const disabled = scopeLocked || !canManage;
                  return (
                    <label
                      key={scope.value}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors"
                      style={{
                        borderColor: checked ? "#1b4f9c" : undefined,
                        backgroundColor: checked ? "#f0f5ff" : undefined,
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.75 : 1,
                      }}
                    >
                      <RadioGroupItem
                        value={scope.value}
                        disabled={disabled}
                        className="mt-0.5 shrink-0"
                      />
                      <div>
                        <div className="text-sm font-medium">{scope.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {scope.desc}
                        </div>
                        <div className="mt-1 text-xs font-mono-num text-primary">
                          {scope.count}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
            {scopeLocked ? (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <ShieldAlert className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  fixed_data_scope 非空 = 法理红线锁死，该角色数据范围强制固定为
                  「{scopeLabel(selected.fixedDataScope, selected)}」，不可在线变更。
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
                {canManage
                  ? "修改后点击下方「保存数据范围」写回。仅 default_data_scope 可改；fixed 字段不可在线变更。"
                  : "仅 GOV_SUPER_ADMIN 可变更数据范围。"}
              </p>
            )}
            {selected.roleKey === "GRID_MEMBER" && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  网格员是静态 RBAC 角色；此处只展示角色级数据范围，具体负责哪些网格请到「网格组织管理」维护。
                </span>
              </div>
            )}
            {canManage && !scopeLocked && (
              <Button
                className="w-full mt-3"
                disabled={!scopeDirty || acting}
                onClick={handleSaveScope}
              >
                <Save className="size-4 mr-2" />
                保存数据范围
              </Button>
            )}
          </SectionCard>

          {/* 权限摘要 */}
          <SectionCard title="当前配置摘要">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">角色</span>
                <span className="font-medium truncate ml-2">{selected.roleName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">roleKey</span>
                <span className="font-mono-num text-xs">{selected.roleKey}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">端归属</span>
                <span>{DEPT_LABEL[selected.allowedDeptCategory] ?? selected.allowedDeptCategory}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">授权点数</span>
                <span className="font-mono-num font-semibold text-primary">
                  {granted.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">红线权限</span>
                <span
                  className="font-mono-num font-semibold"
                  style={{ color: grantedRedlines.length > 0 ? "#d14343" : "#2e9e5b" }}
                >
                  {grantedRedlines.length} 项
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">数据范围</span>
                <span className="font-medium text-xs">
                  {scopeLabel(selected.defaultDataScope, selected)}
                </span>
              </div>
            </div>
          </SectionCard>

          {/* 删除角色（仅非系统 + manage 权限） */}
          {canManage && selected.isSystem === 0 && (
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogAction asChild>
                <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                  <Trash2 className="size-4 mr-2" /> 删除该角色
                </Button>
              </AlertDialogAction>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>删除角色「{selected.roleName}」？</AlertDialogTitle>
                  <AlertDialogDescription>
                    删除后该角色所有权限授予记录一并清除，且不可恢复。预置系统角色（is_system=1）受保护、不可删除。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={acting}>取消</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={acting}
                    onClick={(e) => {
                      e.preventDefault();
                      void handleDelete();
                    }}
                  >
                    {acting && <Loader2 className="size-4 mr-1 animate-spin" />} 确认删除
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {canManage && selected.isSystem === 1 && (
            <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
              <span>预置系统角色受保护，禁止删除。</span>
            </div>
          )}

          {grantedRedlines.length > 0 ? (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <ShieldAlert className="size-3.5 mt-0.5 shrink-0" />
              <span>
                已授予 {grantedRedlines.length} 个红线权限：
                {grantedRedlines.map((p) => p.description).join("、")}。
              </span>
            </div>
          ) : (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
              <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
              <span>当前未授予任何红线权限，符合最小权限原则。</span>
            </div>
          )}
        </div>
      </div>
        </TabsContent>

        <TabsContent value="assign" className="mt-0">
          <UserRoleAssignment roles={roles} canManage={canManage} />
        </TabsContent>
      </Tabs>

      <CreateRoleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        submitting={acting}
      />

      {/* 红线权限二次确认 */}
      <AlertDialog
        open={pendingToggle != null}
        onOpenChange={(v) => {
          if (!v) setPendingToggle(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.nextChecked ? "授予红线权限？" : "撤销红线权限？"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              红线权限变更将被存证、不可逆。请确认操作。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingToggle) void doToggle(pendingToggle.key, pendingToggle.nextChecked);
                setPendingToggle(null);
              }}
            >
              {acting && <Loader2 className="size-4 mr-1 animate-spin" />} 确认
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PermSkeleton() {
  return (
    <div className="space-y-2 py-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-5 rounded bg-muted/50 animate-pulse" />
      ))}
    </div>
  );
}

function UserRoleAssignment({
  roles,
  canManage,
}: {
  roles: Role[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [accounts, setAccounts] = useState<WorkIdentityAccount[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<WorkIdentityAccount | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [roleKey, setRoleKey] = useState("");
  const [deptId, setDeptId] = useState("");
  const [nickName, setNickName] = useState("");
  const [deptOptions, setDeptOptions] = useState<Array<{ deptId: number; deptName: string; deptType: number; tenantId: number | null }>>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [buildingOptions, setBuildingOptions] = useState<WorkIdentityBuilding[]>([]);
  const [buildingIds, setBuildingIds] = useState<number[]>([]);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedRole = roles.find((role) => role.roleKey === roleKey) ?? null;
  const ownerGroupRole = selectedRole?.defaultDataScope === "OWNER_GROUP" || selectedRole?.fixedDataScope === "OWNER_GROUP";
  const gridMember = roleKey === "GRID_MEMBER";
  const needsBuildingScope = ownerGroupRole && !gridMember;
  const canSubmit = selected != null
    && roleKey !== ""
    && deptId !== ""
    && (!needsBuildingScope || buildingIds.length > 0)
    && canManage;

  useEffect(() => {
    let alive = true;
    const trimmed = query.trim();
    const roleParam = roleFilter === "ALL" ? undefined : roleFilter;
    const t = setTimeout(() => {
      setSearching(true);
      const shouldSearch = trimmed.length > 0
        && (/^\d+$/.test(trimmed) ? trimmed.length >= 4 : trimmed.length >= 2);
      const request = shouldSearch
        ? searchWorkIdentityAccounts(trimmed, roleParam)
        : listWorkIdentityAccounts(roleParam);
      request
        .then((res) => {
          if (alive) setAccounts(res);
        })
        .catch((err) => {
          if (!alive) return;
          setAccounts([]);
          toast.error(err instanceof Error ? err.message : "用户账号搜索失败");
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, roleFilter]);

  useEffect(() => {
    if (roleKey === "") {
      setDeptOptions([]);
      setDeptId("");
      return;
    }
    let alive = true;
    setDeptLoading(true);
    listWorkIdentityDeptOptions(roleKey)
      .then((res) => {
        if (!alive) return;
        setDeptOptions(res);
        setDeptId((current) => current || (res[0] ? String(res[0].deptId) : ""));
        setBuildingIds([]);
      })
      .catch((err) => {
        if (!alive) return;
        setDeptOptions([]);
        setDeptId("");
        toast.error(err instanceof Error ? err.message : "部门选项加载失败");
      })
      .finally(() => {
        if (alive) setDeptLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [roleKey]);

  useEffect(() => {
    setBuildingIds([]);
    setBuildingOptions([]);
    if (!needsBuildingScope || deptId === "") {
      setBuildingLoading(false);
      return;
    }
    let alive = true;
    setBuildingLoading(true);
    listWorkIdentityBuildings(Number(deptId))
      .then((res) => {
        if (alive) setBuildingOptions(res);
      })
      .catch((err) => {
        if (!alive) return;
        setBuildingOptions([]);
        toast.error(err instanceof Error ? err.message : "楼栋选项加载失败");
      })
      .finally(() => {
        if (alive) setBuildingLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [deptId, needsBuildingScope]);

  function selectAccount(account: WorkIdentityAccount) {
    setSelected(account);
    setNickName(account.realName);
  }

  async function assignRole() {
    if (!selected || !canSubmit) return;
    setSubmitting(true);
    try {
      const shadow = await createWorkIdentityShadow(selected.accountId, {
        roleKey,
        deptId: Number(deptId),
        nickName: nickName.trim() || undefined,
        buildingIds: needsBuildingScope ? buildingIds : undefined,
      });
      toast.success(`已为 ${selected.realName} 分配 ${shadow.roleName ?? shadow.roleKey}`);
      const refreshed = await searchWorkIdentityAccounts(selected.phone);
      const nextSelected = refreshed.find((item) => item.accountId === selected.accountId) ?? selected;
      setSelected(nextSelected);
      setAccounts((prev) => prev.map((item) => (item.accountId === nextSelected.accountId ? nextSelected : item)));
      setRoleKey("");
      setDeptId("");
      setBuildingIds([]);
      setNickName(nextSelected.realName);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "角色分配失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <SectionCard
          title="用户列表"
          desc="按姓名、手机号或当前角色筛选已建档用户；选择用户后在右侧分配新的工作身份"
          extra={
            canManage ? (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="size-4" /> 新增用户并分配角色
              </Button>
            ) : undefined
          }
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索姓名 / 手机号 / 手机尾号"
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">全部角色</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role.roleId} value={role.roleKey}>
                    {role.roleName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {searching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
            <span className="ml-auto text-xs text-muted-foreground">共 {accounts.length} 个用户</span>
          </div>

          {accounts.length === 0 && !searching ? (
            <div className="py-12 text-center text-sm text-muted-foreground">暂无匹配用户。</div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>用户</TableHead>
                    <TableHead>账号</TableHead>
                    <TableHead>所属组织</TableHead>
                    <TableHead>当前角色</TableHead>
                    <TableHead>数据范围</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => {
                    const active = selected?.accountId === account.accountId;
                    const primaryShadow = account.shadows[0] ?? null;
                    return (
                      <TableRow
                        key={account.accountId}
                        className={active ? "bg-[#f0f5ff]" : undefined}
                        onClick={() => selectAccount(account)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="size-8">
                              <AvatarFallback className="gov-primary-gradient text-xs text-white">
                                {account.realName.slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{account.realName}</div>
                              <div className="text-xs text-muted-foreground">
                                <Phone className="mr-1 inline size-3" />
                                <span className="font-mono-num">{maskPhone(account.phone)}</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono-num text-xs">#{account.accountId}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {account.shadows.length > 0
                            ? account.shadows.map((shadow) => shadow.deptName ?? shadow.deptId).join(" / ")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1.5">
                            {account.shadows.length === 0 ? (
                              <Badge variant="outline" className="text-[10px]">未分配</Badge>
                            ) : account.shadows.map((shadow) => (
                              <Badge key={shadow.userId} variant="secondary" className="text-[10px]">
                                {shadow.roleName ?? shadow.roleKey}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {primaryShadow
                            ? scopeLabel(primaryShadow.effectiveDataScope, {
                              roleKey: primaryShadow.roleKey ?? "",
                              allowedDeptCategory: primaryShadow.deptCategory ?? "",
                            })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={account.status === 1 ? "secondary" : "outline"} className="text-[10px]">
                            {account.status === 1 ? "正常" : "停用"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(event) => {
                              event.stopPropagation();
                              selectAccount(account);
                            }}
                          >
                            <UserCog className="size-4" /> 分配角色
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="lg:col-span-5">
        <SectionCard
          title="分配角色"
          desc="创建该账号的新工作身份；角色权限和角色级数据范围来自左侧权限矩阵配置"
          extra={selected ? <Badge variant="secondary">{selected.realName}</Badge> : undefined}
        >
          {!selected ? (
            <div className="py-16 text-center text-sm text-muted-foreground">请先选择一个用户账号。</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg border p-3">
                <div className="mb-2 text-sm font-medium">当前已分配角色</div>
                {selected.shadows.length === 0 ? (
                  <div className="text-sm text-muted-foreground">暂无管理端工作身份。</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>角色</TableHead>
                        <TableHead>组织</TableHead>
                        <TableHead>数据范围</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.shadows.map((shadow) => (
                        <TableRow key={shadow.userId}>
                          <TableCell>
                            <Badge variant="secondary" className="text-[10px]">
                              {shadow.roleName ?? shadow.roleKey}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{shadow.deptName ?? shadow.deptId}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {scopeLabel(shadow.effectiveDataScope, {
                              roleKey: shadow.roleKey ?? "",
                              allowedDeptCategory: shadow.deptCategory ?? "",
                            })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>新角色</Label>
                  <Select value={roleKey} onValueChange={setRoleKey} disabled={!canManage}>
                    <SelectTrigger>
                      <SelectValue placeholder="选择角色" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.roleId} value={role.roleKey}>
                          {role.roleName} · {role.roleKey}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>组织 / 部门</Label>
                  <Select value={deptId} onValueChange={setDeptId} disabled={!roleKey || deptLoading || !canManage}>
                    <SelectTrigger>
                      <SelectValue placeholder={deptLoading ? "加载中" : "选择部门"} />
                    </SelectTrigger>
                    <SelectContent>
                      {deptOptions.map((dept) => (
                        <SelectItem key={dept.deptId} value={String(dept.deptId)}>
                          {dept.deptName} · dept {dept.deptId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>身份显示名</Label>
                  <Input
                    value={nickName}
                    onChange={(event) => setNickName(event.target.value)}
                    placeholder="可选，默认使用真实姓名"
                    disabled={!canManage}
                  />
                </div>
              </div>

              {needsBuildingScope && (
                <div className="rounded-lg border p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium">责任田楼栋</div>
                      <div className="text-xs text-muted-foreground">
                        {scopeLabel("OWNER_GROUP", selectedRole)}角色必须随工作身份绑定楼栋，后端据此形成 ABAC 行级范围。
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">已选 {buildingIds.length}</Badge>
                  </div>
                  {buildingLoading ? (
                    <div className="py-3 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 inline size-4 animate-spin" />楼栋加载中
                    </div>
                  ) : buildingOptions.length === 0 ? (
                    <div className="py-3 text-sm text-muted-foreground">当前组织下暂无可分配楼栋。</div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {buildingOptions.map((building) => {
                        const checked = buildingIds.includes(building.buildingId);
                        return (
                          <label key={`${building.tenantId ?? "tenant"}-${building.buildingId}`} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                            <Checkbox
                              checked={checked}
                              disabled={!canManage || submitting}
                              onCheckedChange={() => {
                                setBuildingIds((current) => checked
                                  ? current.filter((id) => id !== building.buildingId)
                                  : [...current, building.buildingId]);
                              }}
                            />
                            <span className="font-mono-num">{building.buildingId}</span>
                            {building.tenantId != null && (
                              <span className="text-xs text-muted-foreground">tenant {building.tenantId}</span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedRole && (
                <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    将创建「{selectedRole.roleName}」工作身份，继承数据范围
                    「{scopeLabel(selectedRole.fixedDataScope ?? selectedRole.defaultDataScope, selectedRole)}」。
                  </span>
                </div>
              )}

              {needsBuildingScope && buildingIds.length === 0 && (
                <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    该角色需要个人楼栋责任田。请选择至少一个楼栋后再分配，避免创建无有效 ABAC 范围的身份。
                  </span>
                </div>
              )}

              <div className="flex justify-end">
                <Button disabled={!canSubmit || submitting} onClick={() => void assignRole()}>
                  {submitting ? <Loader2 className="size-4 mr-1 animate-spin" /> : <UserCog className="size-4 mr-1" />}
                  分配角色 <ArrowRight className="size-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      <AddUserRoleDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        roles={roles}
        onCreated={(account) => {
          setAccounts((current) => [account, ...current.filter((item) => item.accountId !== account.accountId)]);
          setSelected(account);
          setQuery(account.phone);
        }}
      />
    </div>
  );
}

function AddUserRoleDialog({
  open,
  onOpenChange,
  roles,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roles: Role[];
  onCreated: (account: WorkIdentityAccount) => void;
}) {
  const [phone, setPhone] = useState("");
  const [realName, setRealName] = useState("");
  const [roleKey, setRoleKey] = useState("");
  const [deptId, setDeptId] = useState("");
  const [nickName, setNickName] = useState("");
  const [deptOptions, setDeptOptions] = useState<Array<{ deptId: number; deptName: string; deptType: number; tenantId: number | null }>>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [buildingOptions, setBuildingOptions] = useState<WorkIdentityBuilding[]>([]);
  const [buildingIds, setBuildingIds] = useState<number[]>([]);
  const [buildingLoading, setBuildingLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const selectedRole = roles.find((role) => role.roleKey === roleKey) ?? null;
  const needsBuildingScope = selectedRole != null
    && selectedRole.roleKey !== "GRID_MEMBER"
    && (selectedRole.defaultDataScope === "OWNER_GROUP" || selectedRole.fixedDataScope === "OWNER_GROUP");
  const valid = phone.trim().length === 11
    && realName.trim().length > 0
    && roleKey !== ""
    && deptId !== ""
    && (!needsBuildingScope || buildingIds.length > 0);

  useEffect(() => {
    if (!open) return;
    setPhone("");
    setRealName("");
    setRoleKey("");
    setDeptId("");
    setNickName("");
    setDeptOptions([]);
    setBuildingOptions([]);
    setBuildingIds([]);
  }, [open]);

  useEffect(() => {
    setDeptId("");
    setDeptOptions([]);
    setBuildingIds([]);
    if (roleKey === "") return;
    let alive = true;
    setDeptLoading(true);
    listWorkIdentityDeptOptions(roleKey)
      .then((res) => {
        if (!alive) return;
        setDeptOptions(res);
        setDeptId(res[0] ? String(res[0].deptId) : "");
      })
      .catch((err) => {
        if (!alive) return;
        toast.error(err instanceof Error ? err.message : "部门选项加载失败");
      })
      .finally(() => {
        if (alive) setDeptLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [roleKey]);

  useEffect(() => {
    setBuildingOptions([]);
    setBuildingIds([]);
    if (!needsBuildingScope || deptId === "") {
      setBuildingLoading(false);
      return;
    }
    let alive = true;
    setBuildingLoading(true);
    listWorkIdentityBuildings(Number(deptId))
      .then((res) => {
        if (alive) setBuildingOptions(res);
      })
      .catch((err) => {
        if (!alive) return;
        toast.error(err instanceof Error ? err.message : "楼栋选项加载失败");
      })
      .finally(() => {
        if (alive) setBuildingLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [deptId, needsBuildingScope]);

  async function submit() {
    if (!valid || selectedRole == null) return;
    setSubmitting(true);
    try {
      const account = await createWorkIdentityAccount({
        phone: phone.trim(),
        realName: realName.trim(),
        roleKey,
        deptId: Number(deptId),
        nickName: nickName.trim() || undefined,
        buildingIds: needsBuildingScope ? buildingIds : undefined,
      });
      toast.success(`已新增用户「${account.realName}」并分配角色`);
      onCreated(account);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "新增用户失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增用户并分配角色</DialogTitle>
          <DialogDescription>创建自然人账号及其首个管理端工作身份，保存后立即继承权限矩阵中的权限与数据范围。</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>姓名</Label>
              <Input value={realName} onChange={(event) => setRealName(event.target.value)} placeholder="真实姓名" />
            </div>
            <div className="space-y-1.5">
              <Label>手机号</Label>
              <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="11 位手机号" maxLength={11} />
            </div>
            <div className="space-y-1.5">
              <Label>分配角色</Label>
              <Select value={roleKey} onValueChange={setRoleKey}>
                <SelectTrigger><SelectValue placeholder="选择角色" /></SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.roleId} value={role.roleKey}>
                      {role.roleName} · {role.roleKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>组织 / 部门</Label>
              <Select value={deptId} onValueChange={setDeptId} disabled={!roleKey || deptLoading}>
                <SelectTrigger><SelectValue placeholder={deptLoading ? "加载中" : "选择部门"} /></SelectTrigger>
                <SelectContent>
                  {deptOptions.map((dept) => (
                    <SelectItem key={dept.deptId} value={String(dept.deptId)}>
                      {dept.deptName} · dept {dept.deptId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>身份显示名</Label>
              <Input value={nickName} onChange={(event) => setNickName(event.target.value)} placeholder="可选，默认使用姓名" />
            </div>
          </div>

          {selectedRole && (
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
              将创建「{selectedRole.roleName}」工作身份，继承数据范围「{scopeLabel(selectedRole.fixedDataScope ?? selectedRole.defaultDataScope, selectedRole)}」。
            </div>
          )}

          {needsBuildingScope && (
            <div className="rounded-lg border p-3">
              <div className="mb-2 text-sm font-medium">责任田楼栋</div>
              {buildingLoading ? (
                <div className="py-2 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />楼栋加载中
                </div>
              ) : buildingOptions.length === 0 ? (
                <div className="py-2 text-sm text-muted-foreground">当前组织下暂无可分配楼栋。</div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {buildingOptions.map((building) => {
                    const checked = buildingIds.includes(building.buildingId);
                    return (
                      <label key={`${building.tenantId ?? "tenant"}-${building.buildingId}`} className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <Checkbox
                          checked={checked}
                          disabled={submitting}
                          onCheckedChange={() => {
                            setBuildingIds((current) => checked
                              ? current.filter((id) => id !== building.buildingId)
                              : [...current, building.buildingId]);
                          }}
                        />
                        <span className="font-mono-num">{building.buildingId}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>取消</Button>
          <Button onClick={submit} disabled={!valid || submitting}>
            {submitting && <Loader2 className="size-4 mr-1 animate-spin" />} 创建并分配
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── 新建角色对话框 ─── */
function CreateRoleDialog({
  open,
  onOpenChange,
  onSubmit,
  submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (input: CreateRoleInput) => void;
  submitting: boolean;
}) {
  const [roleKey, setRoleKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [dept, setDept] = useState("G");
  const [scope, setScope] = useState<string>("ALL_COMMUNITY");
  const createScopeOptions = [
    {
      value: "ALL_COMMUNITY",
      label: dept === "G" ? "辖区全部小区" : "本小区全量",
    },
    {
      value: "OWNER_GROUP",
      label: "仅责任田楼栋",
    },
    {
      value: "ORG_ONLY",
      label: "仅本组织",
    },
  ];

  useEffect(() => {
    if (open) {
      setRoleKey("");
      setRoleName("");
      setDept("G");
      setScope("ALL_COMMUNITY");
    }
  }, [open]);

  const valid = roleKey.trim().length > 0 && roleName.trim().length > 0;

  function submit() {
    if (!valid) return;
    onSubmit({
      roleKey: roleKey.trim(),
      roleName: roleName.trim(),
      allowedDeptCategory: dept,
      defaultDataScope: scope,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建角色</DialogTitle>
          <DialogDescription>
            新建非系统角色，落库后可授予权限。数据范围创建后不可在线变更。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="role-key">roleKey</Label>
              <Input
                id="role-key"
                placeholder="如 COMMUNITY_AUDITOR"
                maxLength={50}
                value={roleKey}
                onChange={(e) => setRoleKey(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="role-name">角色名称</Label>
              <Input
                id="role-name"
                placeholder="如 社区审计员"
                maxLength={50}
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>端归属</Label>
              <Select value={dept} onValueChange={setDept}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="G">政府端</SelectItem>
                  <SelectItem value="B">业委会端</SelectItem>
                  <SelectItem value="S">服务端</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>默认数据范围</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                  <SelectContent>
                  {createScopeOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={submit} disabled={!valid || submitting}>
            {submitting && <Loader2 className="size-4 mr-1 animate-spin" />} 创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
