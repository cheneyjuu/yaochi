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
import { ShieldAlert, ShieldCheck, Plus, Trash2, Loader2, KeyRound } from "lucide-react";
import { useStore } from "../../lib/store";
import {
  listRoles,
  getRolePermissions,
  listPermissions,
  createRole,
  assignPermission,
  revokePermission,
  deleteRole,
  type Role,
  type RolePermission,
  type PermissionCatalog,
  type CreateRoleInput,
} from "../../lib/rbac";

/* ─── 后端枚举 → 展示映射 ─── */

// 后端数据范围仅 3 值（fixed/default_data_scope 的 CHECK 约束）。
const DATA_SCOPES = [
  {
    value: "ALL_COMMUNITY",
    label: "辖区全部小区",
    desc: "跨小区聚合（街道级管理员）",
  },
  {
    value: "OWNER_GROUP",
    label: "业主集合",
    desc: "按授权楼栋限行（网格员 / 楼栋代表）",
  },
  {
    value: "ORG_ONLY",
    label: "仅本组织",
    desc: "物业组织内数据，不含业主隐私",
  },
] as const;

const SCOPE_LABEL: Record<string, string> = Object.fromEntries(
  DATA_SCOPES.map((s) => [s.value, s.label]),
);

// 端归属位 G/B/S。
const DEPT_LABEL: Record<string, string> = {
  G: "政府端",
  B: "业委会端",
  S: "服务端",
};

// 权限分组 → 中文展示，缺省回退原值。
const GROUP_LABEL: Record<string, string> = {
  ADMIN: "系统管理",
  VOTING: "议题表决",
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

/* ─── 主页面 ─── */
export function Rbac() {
  const { hasPermission } = useStore();
  const canManage = hasPermission("admin:role:manage");

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
        desc="RBAC + ABAC 核心 — 配置各角色可操作的权限点及数据可见范围"
        actions={
          canManage ? (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> 新建角色
            </Button>
          ) : undefined
        }
      />

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
            desc="决定该角色能访问哪些数据记录（创建后不可在线变更）"
          >
            <RadioGroup value={selected.defaultDataScope}>
              <div className="space-y-2">
                {DATA_SCOPES.map((scope) => {
                  const checked = selected.defaultDataScope === scope.value;
                  return (
                    <label
                      key={scope.value}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors"
                      style={{
                        borderColor: checked ? "#1b4f9c" : undefined,
                        backgroundColor: checked ? "#f0f5ff" : undefined,
                        cursor: "not-allowed",
                        opacity: 0.95,
                      }}
                    >
                      <RadioGroupItem
                        value={scope.value}
                        className="mt-0.5 shrink-0 pointer-events-none"
                      />
                      <div>
                        <div className="text-sm font-medium">{scope.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {scope.desc}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
            {selected.fixedDataScope && (
              <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
                <ShieldAlert className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  fixed_data_scope 非空 = 红线锁死，该角色数据范围强制固定为
                  「{SCOPE_LABEL[selected.fixedDataScope] ?? selected.fixedDataScope}」。
                </span>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              后端无 update 接口，已有角色数据范围只读；新建角色时可在对话框中设定。
            </p>
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
                  {SCOPE_LABEL[selected.defaultDataScope] ?? selected.defaultDataScope}
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
                  {DATA_SCOPES.map((s) => (
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
