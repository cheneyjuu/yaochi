"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  BriefcaseBusiness,
  Building2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  UserRoundCog,
} from "lucide-react";
import { useStore } from "../../lib/store";
import { listRoles, type Role } from "../../lib/rbac";
import {
  createWorkIdentityShadow,
  ensureGridNodes,
  getWorkIdentityAccount,
  listGridBuildingScope,
  listWorkIdentityBuildings,
  listWorkIdentityDeptOptions,
  searchWorkIdentityAccounts,
  updateGridBuildingScope,
  type WorkIdentityAccount,
  type WorkIdentityBuilding,
  type WorkIdentityDeptOption,
  type WorkIdentityShadow,
} from "../../lib/work-identity";

const GRID_MEMBER_ROLE = "GRID_MEMBER";

const PERSONAL_BUILDING_SCOPED_ROLES = new Set([
  "VOLUNTEER",
  "OWNER_REPRESENTATIVE",
]);

const SCOPE_LABEL: Record<string, string> = {
  ALL_COMMUNITY: "辖区全部",
  OWNER_GROUP: "楼栋责任田",
  ORG_ONLY: "本组织",
};

const DEPT_TYPE_LABEL: Record<number, string> = {
  1: "街道办",
  2: "居委会",
  3: "物业",
  4: "业委会",
  5: "网格",
  6: "党组织",
  7: "绿化",
  8: "保洁",
  9: "服务商",
  10: "志愿队",
  11: "业主代表团",
};

function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone ?? "—";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function scopeLabel(scope: string | null | undefined): string {
  if (!scope) return "未绑定";
  return SCOPE_LABEL[scope] ?? scope;
}

function roleLabel(shadow: WorkIdentityShadow): string {
  if (shadow.roleName && shadow.roleKey) return `${shadow.roleName} · ${shadow.roleKey}`;
  return shadow.roleKey ?? "未绑定角色";
}

export function WorkIdentity() {
  const { hasPermission } = useStore();
  const canAssign = hasPermission("admin:user:assign-role");

  const [keyword, setKeyword] = useState("");
  const [accounts, setAccounts] = useState<WorkIdentityAccount[]>([]);
  const [selected, setSelected] = useState<WorkIdentityAccount | null>(null);
  const [searching, setSearching] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [refreshingAccount, setRefreshingAccount] = useState(false);

  useEffect(() => {
    if (!canAssign) return;
    let alive = true;
    setRolesLoading(true);
    listRoles({ page: 1, size: 100 })
      .then((res) => {
        if (alive) setRoles(res.items.filter((r) => r.status === "0"));
      })
      .catch((err) => {
        if (alive) toast.error(err instanceof Error ? err.message : "角色列表加载失败");
      })
      .finally(() => {
        if (alive) setRolesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [canAssign]);

  async function doSearch() {
    const k = keyword.trim();
    if (!k) {
      setAccounts([]);
      setSelected(null);
      return;
    }
    setSearching(true);
    try {
      const res = await searchWorkIdentityAccounts(k);
      setAccounts(res);
      setSelected((current) => {
        if (!current) return res[0] ?? null;
        return res.find((a) => a.accountId === current.accountId) ?? res[0] ?? null;
      });
    } catch (err) {
      setAccounts([]);
      setSelected(null);
      toast.error(err instanceof Error ? err.message : "账号搜索失败");
    } finally {
      setSearching(false);
    }
  }

  async function refreshAccount(accountId: number) {
    setRefreshingAccount(true);
    try {
      const next = await getWorkIdentityAccount(accountId);
      setSelected(next);
      setAccounts((rows) => rows.map((a) => (a.accountId === accountId ? next : a)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "账号刷新失败");
    } finally {
      setRefreshingAccount(false);
    }
  }

  if (!canAssign) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader title="工作身份与授权" desc="当前账号没有工作身份授权权限" />
        <SectionCard>
          <div className="py-16 text-center text-muted-foreground">
            需要 admin:user:assign-role 权限。
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="工作身份与授权"
        desc="同一自然人账号可拥有多个管理端工作身份；网格员使用统一静态角色，楼栋范围挂在网格组织节点"
        actions={
          <Button disabled={!selected} onClick={() => setDialogOpen(true)}>
            <Plus className="size-4 mr-1" /> 新增工作身份
          </Button>
        }
      />

      <SectionCard title="账号检索" desc="按手机号、姓名或既有工作身份名称检索自然人账号">
        <div className="flex items-center gap-2">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              value={keyword}
              placeholder="姓名、手机号或手机尾号"
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void doSearch();
              }}
            />
          </div>
          <Button onClick={() => void doSearch()} disabled={searching}>
            {searching ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Search className="size-4 mr-1" />}
            搜索
          </Button>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_1fr]">
        <SectionCard title="自然人账号" bodyClassName="p-0">
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              暂无账号结果。
            </div>
          ) : (
            <div className="divide-y">
              {accounts.map((account) => {
                const active = selected?.accountId === account.accountId;
                return (
                  <button
                    key={account.accountId}
                    onClick={() => setSelected(account)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    style={{ backgroundColor: active ? "#f0f5ff" : undefined }}
                  >
                    <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-[#e8f0fb] text-primary">
                      <UserRoundCog className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">{account.realName || "未命名账号"}</span>
                        {account.realNameVerified === 1 ? (
                          <StatusChip tone="success">已实名</StatusChip>
                        ) : (
                          <StatusChip tone="warning">未实名</StatusChip>
                        )}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        {maskPhone(account.phone)} · {account.shadows.length} 个工作身份
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="工作身份"
          desc={selected ? `${selected.realName || selected.accountId} · ${maskPhone(selected.phone)}` : "请选择自然人账号"}
          extra={
            selected && (
              <Button
                size="sm"
                variant="outline"
                disabled={refreshingAccount}
                onClick={() => void refreshAccount(selected.accountId)}
              >
                {refreshingAccount && <Loader2 className="size-4 mr-1 animate-spin" />}
                刷新
              </Button>
            )
          }
        >
          {!selected ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              选择账号后查看 RBAC 角色与 ABAC 楼栋范围。
            </div>
          ) : selected.shadows.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              该自然人暂无管理端工作身份。
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工作身份</TableHead>
                  <TableHead>组织</TableHead>
                  <TableHead>RBAC 角色</TableHead>
                  <TableHead>数据范围</TableHead>
                  <TableHead>ABAC 楼栋</TableHead>
                  <TableHead className="text-right">userId</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.shadows.map((shadow) => (
                  <TableRow key={shadow.userId}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BriefcaseBusiness className="size-4 text-muted-foreground" />
                        <span className="font-medium">{shadow.nickName ?? shadow.userName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{shadow.deptName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">
                        {shadow.deptType != null ? DEPT_TYPE_LABEL[shadow.deptType] ?? `deptType ${shadow.deptType}` : "—"}
                        {shadow.tenantId != null ? ` · tenant ${shadow.tenantId}` : " · 跨租户"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {roleLabel(shadow)}
                      </Badge>
                    </TableCell>
                    <TableCell>{scopeLabel(shadow.effectiveDataScope)}</TableCell>
                    <TableCell>
                      {shadow.buildingIds.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {shadow.buildingIds.map((id) => (
                            <Badge key={id} variant="outline" className="text-[10px]">
                              #{id}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono-num text-xs">{shadow.userId}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      </div>

      <GridScopePanel />

      <CreateIdentityDialog
        open={dialogOpen}
        account={selected}
        roles={roles}
        rolesLoading={rolesLoading}
        onOpenChange={setDialogOpen}
        onCreated={(shadow) => {
          toast.success(`${shadow.roleName ?? shadow.roleKey} 工作身份已创建`);
          if (selected) void refreshAccount(selected.accountId);
        }}
      />
    </div>
  );
}


function GridScopePanel() {
  const [communityDeptOptions, setCommunityDeptOptions] = useState<WorkIdentityDeptOption[]>([]);
  const [gridDeptOptions, setGridDeptOptions] = useState<WorkIdentityDeptOption[]>([]);
  const [communityDeptId, setCommunityDeptId] = useState("");
  const [gridDeptId, setGridDeptId] = useState("");
  const [buildings, setBuildings] = useState<WorkIdentityBuilding[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<number>>(new Set());
  const [deptOptionsLoading, setDeptOptionsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [savingScope, setSavingScope] = useState(false);

  const selectedGridDept = gridDeptOptions.find((dept) => String(dept.deptId) === gridDeptId) ?? null;

  useEffect(() => {
    let alive = true;
    setDeptOptionsLoading(true);
    Promise.all([
      listWorkIdentityDeptOptions("COMMUNITY_ADMIN"),
      listWorkIdentityDeptOptions(GRID_MEMBER_ROLE),
    ])
      .then(([communities, grids]) => {
        if (!alive) return;
        setCommunityDeptOptions(communities);
        setGridDeptOptions(grids);
        setCommunityDeptId((current) => current || (communities[0] ? String(communities[0].deptId) : ""));
        setGridDeptId((current) => current || (grids[0] ? String(grids[0].deptId) : ""));
      })
      .catch((err) => {
        if (alive) toast.error(err instanceof Error ? err.message : "网格组织加载失败");
      })
      .finally(() => {
        if (alive) setDeptOptionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (gridDeptId === "") {
      setBuildings([]);
      setSelectedBuildingIds(new Set());
      return;
    }
    let alive = true;
    setScopeLoading(true);
    Promise.all([
      listWorkIdentityBuildings(Number(gridDeptId)),
      listGridBuildingScope(Number(gridDeptId)),
    ])
      .then(([options, scope]) => {
        if (!alive) return;
        setBuildings(options);
        setSelectedBuildingIds(new Set(scope.map((item) => item.buildingId)));
      })
      .catch((err) => {
        if (!alive) return;
        setBuildings([]);
        setSelectedBuildingIds(new Set());
        toast.error(err instanceof Error ? err.message : "网格楼栋范围加载失败");
      })
      .finally(() => {
        if (alive) setScopeLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [gridDeptId]);

  async function generateGridNodes() {
    if (communityDeptId === "") return;
    setGenerating(true);
    try {
      const created = await ensureGridNodes(Number(communityDeptId));
      const grids = await listWorkIdentityDeptOptions(GRID_MEMBER_ROLE);
      setGridDeptOptions(grids);
      const preferred = created[0] ?? grids[0];
      if (preferred) setGridDeptId(String(preferred.deptId));
      toast.success("网格组织节点已生成");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格组织节点生成失败");
    } finally {
      setGenerating(false);
    }
  }

  function toggleGridBuilding(buildingId: number, checked: boolean) {
    setSelectedBuildingIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(buildingId);
      else next.delete(buildingId);
      return next;
    });
  }

  async function saveGridScope() {
    if (gridDeptId === "" || selectedBuildingIds.size === 0) return;
    setSavingScope(true);
    try {
      const saved = await updateGridBuildingScope(Number(gridDeptId), Array.from(selectedBuildingIds));
      setSelectedBuildingIds(new Set(saved.map((item) => item.buildingId)));
      toast.success("网格楼栋范围已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格楼栋范围更新失败");
    } finally {
      setSavingScope(false);
    }
  }

  return (
    <SectionCard title="网格节点空间配置" desc="GRID_MEMBER 只作为静态角色，具体网格与楼栋范围由组织节点承载">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_auto_1fr_1fr]">
        <div className="space-y-2">
          <Label>居委会节点</Label>
          <Select value={communityDeptId} onValueChange={setCommunityDeptId} disabled={deptOptionsLoading}>
            <SelectTrigger>
              <SelectValue placeholder={deptOptionsLoading ? "加载中" : "选择居委会"} />
            </SelectTrigger>
            <SelectContent>
              {communityDeptOptions.map((dept) => (
                <SelectItem key={dept.deptId} value={String(dept.deptId)}>
                  {dept.deptName} · tenant {dept.tenantId ?? "-"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button disabled={!communityDeptId || generating} onClick={() => void generateGridNodes()}>
            {generating ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Plus className="size-4 mr-1" />}
            生成 1-5 号网格
          </Button>
        </div>

        <div className="space-y-2">
          <Label>网格节点</Label>
          <Select value={gridDeptId} onValueChange={setGridDeptId} disabled={deptOptionsLoading || generating}>
            <SelectTrigger>
              <SelectValue placeholder="选择网格" />
            </SelectTrigger>
            <SelectContent>
              {gridDeptOptions.map((dept) => (
                <SelectItem key={dept.deptId} value={String(dept.deptId)}>
                  {dept.deptName} · tenant {dept.tenantId ?? "-"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>当前节点</Label>
          <div className="flex h-10 items-center rounded-md border px-3 text-sm">
            {selectedGridDept ? "dept " + selectedGridDept.deptId + " · " + (DEPT_TYPE_LABEL[selectedGridDept.deptType] ?? selectedGridDept.deptType) : "—"}
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-md border p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="size-4 text-muted-foreground" /> 网格楼栋范围
          </div>
          <Button
            size="sm"
            disabled={gridDeptId === "" || selectedBuildingIds.size === 0 || scopeLoading || savingScope}
            onClick={() => void saveGridScope()}
          >
            {savingScope ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ShieldCheck className="size-4 mr-1" />}
            保存范围
          </Button>
        </div>
        {scopeLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline size-4 animate-spin" /> 加载中
          </div>
        ) : buildings.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">当前网格节点暂无可选楼栋。</div>
        ) : (
          <div className="grid max-h-64 grid-cols-2 gap-2 overflow-auto md:grid-cols-4 xl:grid-cols-6">
            {buildings.map((building) => (
              <label
                key={building.buildingId}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={selectedBuildingIds.has(building.buildingId)}
                  onCheckedChange={(v) => toggleGridBuilding(building.buildingId, Boolean(v))}
                />
                #{building.buildingId}
              </label>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}


function CreateIdentityDialog({
  open,
  account,
  roles,
  rolesLoading,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  account: WorkIdentityAccount | null;
  roles: Role[];
  rolesLoading: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (shadow: WorkIdentityShadow) => void;
}) {
  const [roleKey, setRoleKey] = useState("");
  const [deptId, setDeptId] = useState("");
  const [nickName, setNickName] = useState("");
  const [deptOptions, setDeptOptions] = useState<WorkIdentityDeptOption[]>([]);
  const [deptLoading, setDeptLoading] = useState(false);
  const [buildings, setBuildings] = useState<WorkIdentityBuilding[]>([]);
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<Set<number>>(new Set());
  const [forceTransfer, setForceTransfer] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const role = roles.find((r) => r.roleKey === roleKey) ?? null;
  const needsBuildings = roleKey !== "" && PERSONAL_BUILDING_SCOPED_ROLES.has(roleKey);
  const isGridMember = roleKey === GRID_MEMBER_ROLE;
  const duplicateDept = useMemo(() => {
    if (!account || deptId === "") return false;
    const id = Number(deptId);
    return account.shadows.some((shadow) => shadow.deptId === id);
  }, [account, deptId]);

  useEffect(() => {
    if (!open) return;
    setRoleKey("");
    setDeptId("");
    setNickName("");
    setDeptOptions([]);
    setSelectedBuildingIds(new Set());
    setForceTransfer(false);
  }, [open, account?.accountId]);

  useEffect(() => {
    if (!open || roleKey === "") return;
    let alive = true;
    setDeptLoading(true);
    setDeptId("");
    listWorkIdentityDeptOptions(roleKey)
      .then((res) => {
        if (!alive) return;
        setDeptOptions(res);
        setDeptId(res[0] ? String(res[0].deptId) : "");
      })
      .catch((err) => {
        if (alive) toast.error(err instanceof Error ? err.message : "部门选项加载失败");
      })
      .finally(() => {
        if (alive) setDeptLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [open, roleKey]);

  useEffect(() => {
    if (!open || !needsBuildings || deptId === "") {
      setBuildings([]);
      setSelectedBuildingIds(new Set());
      return;
    }
    let alive = true;
    setSelectedBuildingIds(new Set());
    listWorkIdentityBuildings(Number(deptId))
      .then((res) => {
        if (alive) setBuildings(res);
      })
      .catch((err) => {
        if (alive) setBuildings([]);
        if (alive) toast.error(err instanceof Error ? err.message : "楼栋列表加载失败");
      });
    return () => {
      alive = false;
    };
  }, [open, needsBuildings, deptId]);

  const canSubmit = Boolean(
    account && roleKey && deptId && !duplicateDept && (!needsBuildings || selectedBuildingIds.size > 0),
  );

  function toggleBuilding(buildingId: number, checked: boolean) {
    setSelectedBuildingIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(buildingId);
      else next.delete(buildingId);
      return next;
    });
  }

  async function submit() {
    if (!account || !canSubmit) return;
    setSubmitting(true);
    try {
      const shadow = await createWorkIdentityShadow(account.accountId, {
        roleKey,
        deptId: Number(deptId),
        nickName: nickName.trim() || undefined,
        buildingIds: needsBuildings ? Array.from(selectedBuildingIds) : [],
        forceBuildingTransfer: needsBuildings && forceTransfer,
      });
      onCreated(shadow);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "工作身份创建失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>新增工作身份</DialogTitle>
          <DialogDescription>
            {account ? `${account.realName || account.accountId} · ${maskPhone(account.phone)}` : "请选择账号"}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>RBAC 角色</Label>
            <Select value={roleKey} onValueChange={setRoleKey} disabled={rolesLoading}>
              <SelectTrigger>
                <SelectValue placeholder={rolesLoading ? "加载中" : "选择角色"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map((item) => (
                  <SelectItem key={item.roleKey} value={item.roleKey}>
                    {item.roleName} · {item.roleKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>所属组织</Label>
            <Select value={deptId} onValueChange={setDeptId} disabled={!roleKey || deptLoading}>
              <SelectTrigger>
                <SelectValue placeholder={deptLoading ? "加载中" : "选择组织"} />
              </SelectTrigger>
              <SelectContent>
                {deptOptions.map((dept) => (
                  <SelectItem key={dept.deptId} value={String(dept.deptId)}>
                    {dept.deptName} · {DEPT_TYPE_LABEL[dept.deptType] ?? dept.deptType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>显示名称</Label>
            <Input value={nickName} maxLength={50} onChange={(e) => setNickName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>数据范围</Label>
            <div className="flex h-10 items-center rounded-md border px-3 text-sm">
              {role ? scopeLabel(role.fixedDataScope ?? role.defaultDataScope) : "—"}
            </div>
          </div>
        </div>

        {duplicateDept && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            该自然人在所选组织下已有工作身份。
          </div>
        )}

        {isGridMember && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
            网格员分身只绑定网格组织节点，楼栋范围来自网格节点空间配置。
          </div>
        )}

        {needsBuildings && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="size-4 text-muted-foreground" /> ABAC 楼栋范围
              </div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={forceTransfer} onCheckedChange={(v) => setForceTransfer(Boolean(v))} />
                同角色占用时转移
              </label>
            </div>
            {buildings.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">当前小区暂无楼栋。</div>
            ) : (
              <div className="grid max-h-56 grid-cols-2 gap-2 overflow-auto md:grid-cols-4">
                {buildings.map((building) => (
                  <label
                    key={building.buildingId}
                    className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <Checkbox
                      checked={selectedBuildingIds.has(building.buildingId)}
                      onCheckedChange={(v) => toggleBuilding(building.buildingId, Boolean(v))}
                    />
                    #{building.buildingId}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={!canSubmit || submitting} onClick={() => void submit()}>
            {submitting ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ShieldCheck className="size-4 mr-1" />}
            创建
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
