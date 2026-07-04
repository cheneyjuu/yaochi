"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip, EmptyState } from "../gov/common";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  IdCard,
  Info,
  Layers,
  Loader2,
  MapPinned,
  Network,
  Phone,
  Plus,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  createGridNode,
  deleteGridNode,
  listGridBuildingScope,
  listWorkIdentityAccounts,
  listWorkIdentityBuildings,
  listWorkIdentityDeptOptions,
  searchWorkIdentityAccounts,
  updateAssignedGridNodes,
  updateGridNode,
  updateGridBuildingScope,
  type WorkIdentityAccount,
  type WorkIdentityBuilding,
  type WorkIdentityDeptOption,
} from "../../lib/work-identity";
import { useStore } from "../../lib/store";

const GRID_MEMBER_ROLE = "GRID_MEMBER";

type BuildingKey = `${number}:${number}`;

interface BuildingGroup {
  tenantId: number | null;
  buildings: WorkIdentityBuilding[];
}

interface CommunityDisplay {
  name: string;
  short: string;
}

const COMMUNITY_DISPLAY: Record<number, CommunityDisplay> = {
  10001: { name: "和畅雅苑", short: "A" },
  10002: { name: "锦绣华庭", short: "B" },
  10003: { name: "翠湖名邸", short: "C" },
};

function communityDisplay(tenantId: number | null): CommunityDisplay {
  if (tenantId != null && COMMUNITY_DISPLAY[tenantId]) {
    return COMMUNITY_DISPLAY[tenantId];
  }
  return { name: tenantId == null ? "未归属小区" : `小区 ${tenantId}`, short: tenantId == null ? "-" : String(tenantId).slice(-1) };
}

function buildingDisplayName(buildingId: number): string {
  const normalized = buildingId % 100;
  return `${normalized === 0 ? buildingId : normalized}号楼`;
}

function toBuildingKey(building: WorkIdentityBuilding): BuildingKey | null {
  if (building.tenantId == null) return null;
  return `${building.tenantId}:${building.buildingId}`;
}

function fromBuildingKey(key: BuildingKey) {
  const [tenantId, buildingId] = key.split(":").map(Number);
  return { tenantId, buildingId };
}

function groupBuildingsByTenant(buildings: WorkIdentityBuilding[]): BuildingGroup[] {
  const groups = new Map<number | null, WorkIdentityBuilding[]>();
  for (const building of buildings) {
    const existing = groups.get(building.tenantId) ?? [];
    existing.push(building);
    groups.set(building.tenantId, existing);
  }
  return Array.from(groups.entries())
    .sort(([left], [right]) => (left ?? Number.MAX_SAFE_INTEGER) - (right ?? Number.MAX_SAFE_INTEGER))
    .map(([tenantId, group]) => ({
      tenantId,
      buildings: [...group].sort((left, right) => left.buildingId - right.buildingId),
    }));
}

function displayName(account: WorkIdentityAccount): string {
  return account.realName.replace(/^MOCK_/, "");
}

function maskPhone(phone: string): string {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function gridMemberShadow(account: WorkIdentityAccount) {
  return account.shadows.find((shadow) => shadow.roleKey === GRID_MEMBER_ROLE) ?? null;
}

function assignedGridDeptIds(account: WorkIdentityAccount): number[] {
  const deptIds = new Set<number>();
  for (const shadow of account.shadows) {
    if (shadow.roleKey !== GRID_MEMBER_ROLE) continue;
    if (shadow.deptType === 5) deptIds.add(shadow.deptId);
    for (const node of shadow.gridNodes) deptIds.add(node.deptId);
  }
  return Array.from(deptIds);
}

function complianceChecks(account: WorkIdentityAccount) {
  const verified = account.realNameVerified === 1;
  const active = account.status === 1;
  const hasGridIdentity = gridMemberShadow(account) != null;
  return [
    {
      label: "实名认证等级 ≥ L3（人脸核身）",
      detail: verified ? "已通过实名核验" : "当前未实名",
      ok: verified,
    },
    {
      label: "岗前培训合格",
      detail: hasGridIdentity ? "网格员身份有效" : "未取得网格员身份",
      ok: hasGridIdentity,
    },
    {
      label: "无违规 / 失信记录",
      detail: active ? "记录正常" : "账号不可用",
      ok: active,
    },
    {
      label: "账号状态正常（未冻结）",
      detail: active ? "正常" : "异常",
      ok: active,
    },
  ];
}

function canJoinGrid(account: WorkIdentityAccount): boolean {
  return complianceChecks(account).every((check) => check.ok);
}

function AddGridMemberDialog({
  grid,
  assignedMembers,
  onAssigned,
}: {
  grid: WorkIdentityDeptOption;
  assignedMembers: WorkIdentityAccount[];
  onAssigned: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [candidates, setCandidates] = useState<WorkIdentityAccount[]>([]);
  const [candidate, setCandidate] = useState<WorkIdentityAccount | null>(null);
  const assignedAccountIds = new Set(assignedMembers.map((account) => account.accountId));
  const checks = candidate == null ? [] : complianceChecks(candidate);
  const passed = candidate != null && canJoinGrid(candidate);

  function reset(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setQuery("");
      setSearched(false);
      setCandidates([]);
      setCandidate(null);
      setSearching(false);
      setAssigning(false);
    }
  }

  async function search(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const keyword = query.trim();
    if (keyword === "") {
      toast.error("请输入姓名、手机号尾号或账号");
      return;
    }
    setSearching(true);
    setSearched(true);
    setCandidate(null);
    try {
      const results = await searchWorkIdentityAccounts(keyword, GRID_MEMBER_ROLE);
      setCandidates(results.filter((account) => !assignedAccountIds.has(account.accountId)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格员搜索失败");
    } finally {
      setSearching(false);
    }
  }

  async function assign() {
    if (candidate == null || !passed) return;
    const shadow = gridMemberShadow(candidate);
    if (shadow == null) {
      toast.error("该账号不是网格员身份，不能加入网格");
      return;
    }
    setAssigning(true);
    try {
      const nextGridIds = Array.from(new Set([...assignedGridDeptIds(candidate), grid.deptId]));
      await updateAssignedGridNodes(shadow.userId, nextGridIds);
      await onAssigned();
      toast.success(`已将 ${displayName(candidate)} 加入「${grid.deptName}」`);
      reset(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格员分配失败");
    } finally {
      setAssigning(false);
    }
  }

  return (
    <>
      <Button size="sm" onClick={() => reset(true)}>
        <UserPlus className="size-4" /> 分配网格员
      </Button>
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">为「{grid.deptName}」分配网格员</DialogTitle>
            <DialogDescription className="text-base leading-7">
              搜索账号 → 合规校验 → 加入网格。加入后该网格员即获得本网格聚合的行级数据范围（AllowedBuildingIds）。
            </DialogDescription>
          </DialogHeader>

          {candidate == null ? (
            <div className="space-y-4">
              <form className="flex gap-2" onSubmit={(event) => void search(event)}>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="姓名 / 手机尾号（如 6789）/ 账号 —— 仅网格员"
                    className="h-12 pl-9 text-base"
                  />
                </div>
                <Button className="h-12 px-6" type="submit" disabled={searching}>
                  {searching ? <Loader2 className="size-4 animate-spin" /> : "搜索"}
                </Button>
              </form>

              {!searched ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
                  仅可搜索到 <span className="font-semibold text-foreground">网格员</span> 身份账号，不会检索到业主或其他角色。
                </div>
              ) : searching ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  <Loader2 className="mr-2 inline size-4 animate-spin" />搜索中
                </div>
              ) : candidates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-6 py-8 text-center text-sm text-muted-foreground">
                  未找到可加入本网格的网格员账号。
                </div>
              ) : (
                <div className="space-y-2">
                  {candidates.map((account) => (
                    <button
                      key={account.accountId}
                      type="button"
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/20 p-3 text-left transition-colors hover:border-primary"
                      onClick={() => setCandidate(account)}
                    >
                      <Avatar className="size-11">
                        <AvatarFallback className="gov-primary-gradient text-white">
                          {displayName(account).slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{displayName(account)}</span>
                          <StatusChip tone="info">网格员</StatusChip>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1"><Phone className="size-3" />{maskPhone(account.phone)}</span>
                          <span className="inline-flex items-center gap-1"><IdCard className="size-3" />{account.shadows[0]?.userName ?? account.accountId}</span>
                        </div>
                      </div>
                      <StatusChip tone={canJoinGrid(account) ? "success" : "danger"}>
                        {canJoinGrid(account) ? "通过校验" : "未通过校验"}
                      </StatusChip>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg bg-muted/20 p-4">
                <Avatar className="size-14">
                  <AvatarFallback className="gov-primary-gradient text-lg text-white">
                    {displayName(candidate).slice(0, 1)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold">{displayName(candidate)}</span>
                    <StatusChip tone="info">网格员</StatusChip>
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {candidate.shadows[0]?.userName ?? candidate.accountId} · {maskPhone(candidate.phone)}
                  </div>
                </div>
                <StatusChip tone={passed ? "success" : "danger"} dot>
                  {passed ? "通过校验" : "未通过校验"}
                </StatusChip>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {checks.map((check) => (
                  <div
                    key={check.label}
                    className={`flex items-start gap-3 rounded-lg border p-3 ${check.ok ? "border-green-200 bg-green-50 text-green-700" : "border-red-200 bg-red-50 text-red-700"}`}
                  >
                    {check.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <XCircle className="mt-0.5 size-4 shrink-0" />}
                    <div>
                      <div className="text-sm font-semibold text-foreground">{check.label}</div>
                      <div className="mt-1 text-sm">{check.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {!passed && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>该账号未通过合规校验，不可加入网格。请先完成实名 / 培训 / 解除违规或冻结。</span>
                </div>
              )}

              <DialogFooter className="items-center sm:justify-between">
                <Button variant="outline" onClick={() => setCandidate(null)} disabled={assigning}>
                  <ArrowLeft className="size-4" /> 返回搜索
                </Button>
                <Button onClick={() => void assign()} disabled={!passed || assigning}>
                  {assigning ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  确认加入网格
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function GridManagement() {
  const { hasPermission } = useStore();
  const canManage = hasPermission("admin:user:assign-role");

  if (!canManage) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader title="网格组织管理" desc="当前账号没有网格管理权限" />
        <SectionCard>
          <div className="py-16 text-center text-sm text-muted-foreground">
            需要 admin:user:assign-role 权限。
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <GridScopePanel />
    </div>
  );
}

function GridScopePanel() {
  const [gridDeptOptions, setGridDeptOptions] = useState<WorkIdentityDeptOption[]>([]);
  const [gridDeptId, setGridDeptId] = useState("");
  const [gridRenameName, setGridRenameName] = useState("");
  const [buildings, setBuildings] = useState<WorkIdentityBuilding[]>([]);
  const [gridScopes, setGridScopes] = useState<Record<number, WorkIdentityBuilding[]>>({});
  const [gridMembers, setGridMembers] = useState<WorkIdentityAccount[]>([]);
  const [selectedBuildingKeys, setSelectedBuildingKeys] = useState<Set<BuildingKey>>(new Set());
  const [deptOptionsLoading, setDeptOptionsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [scopeLoading, setScopeLoading] = useState(false);
  const [savingScope, setSavingScope] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const selectedGridDept = gridDeptOptions.find((dept) => String(dept.deptId) === gridDeptId) ?? null;
  const buildingGroups = groupBuildingsByTenant(buildings);
  const selectedSpan = new Set(Array.from(selectedBuildingKeys).map((key) => fromBuildingKey(key).tenantId)).size;
  const selectedGridMembers = selectedGridDept == null ? [] : gridLeaders(selectedGridDept.deptId);

  useEffect(() => {
    setGridRenameName(selectedGridDept?.deptName ?? "");
  }, [selectedGridDept?.deptId, selectedGridDept?.deptName]);

  async function refreshGridOptions(preferredGridId?: number) {
    const grids = await listWorkIdentityDeptOptions(GRID_MEMBER_ROLE);
    setGridDeptOptions(grids);
    if (preferredGridId != null && grids.some((dept) => dept.deptId === preferredGridId)) {
      setGridDeptId(String(preferredGridId));
    } else {
      setGridDeptId((current) => (
        current && grids.some((dept) => String(dept.deptId) === current)
          ? current
          : (grids[0] ? String(grids[0].deptId) : "")
      ));
    }
    const entries = await Promise.all(grids.map(async (dept) => {
      try {
        return [dept.deptId, await listGridBuildingScope(dept.deptId)] as const;
      } catch {
        return [dept.deptId, []] as const;
      }
    }));
    setGridScopes(Object.fromEntries(entries));
    return grids;
  }

  async function refreshGridMembers() {
    const members = await listWorkIdentityAccounts(GRID_MEMBER_ROLE);
    setGridMembers(members);
  }

  useEffect(() => {
    let alive = true;
    setDeptOptionsLoading(true);
    Promise.all([
      refreshGridOptions(),
      listWorkIdentityAccounts(GRID_MEMBER_ROLE),
    ])
      .then(([grids, members]) => {
        if (!alive) return;
        setGridMembers(members);
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
      setSelectedBuildingKeys(new Set());
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
        setGridScopes((current) => ({ ...current, [Number(gridDeptId)]: scope }));
        setSelectedBuildingKeys(new Set(scope.map(toBuildingKey).filter((key): key is BuildingKey => key != null)));
      })
      .catch((err) => {
        if (!alive) return;
        setBuildings([]);
        setSelectedBuildingKeys(new Set());
        toast.error(err instanceof Error ? err.message : "网格楼栋范围加载失败");
      })
      .finally(() => {
        if (alive) setScopeLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [gridDeptId]);

  function nextDefaultGridName() {
    const existingNames = new Set(gridDeptOptions.map((dept) => dept.deptName));
    let index = gridDeptOptions.length + 1;
    let candidate = `${index}号网格`;
    while (existingNames.has(candidate)) {
      index += 1;
      candidate = `${index}号网格`;
    }
    return candidate;
  }

  async function addGridNode() {
    setGenerating(true);
    try {
      const created = await createGridNode(nextDefaultGridName());
      await refreshGridOptions(created.deptId);
      setGridDeptId(String(created.deptId));
      toast.success("已新建网格，请选择覆盖楼栋");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格组织节点新增失败");
    } finally {
      setGenerating(false);
    }
  }

  async function renameSelectedGridNode() {
    if (selectedGridDept == null || gridRenameName.trim() === "") return;
    setRenaming(true);
    try {
      const updated = await updateGridNode(selectedGridDept.deptId, gridRenameName.trim());
      setGridDeptOptions((prev) => prev.map((dept) => (dept.deptId === updated.deptId ? updated : dept)));
      toast.success("网格组织节点已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格组织节点更新失败");
    } finally {
      setRenaming(false);
    }
  }

  async function deleteSelectedGridNode() {
    if (selectedGridDept == null) return;
    setDeleting(true);
    try {
      await deleteGridNode(selectedGridDept.deptId);
      const grids = await refreshGridOptions();
      setGridDeptId(grids[0] ? String(grids[0].deptId) : "");
      setDeleteDialogOpen(false);
      toast.success("网格组织节点已删除");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格组织节点删除失败");
    } finally {
      setDeleting(false);
    }
  }

  function gridLeaders(deptId: number): WorkIdentityAccount[] {
    return gridMembers.filter((account) =>
      account.shadows.some((shadow) =>
        shadow.roleKey === GRID_MEMBER_ROLE
        && (shadow.deptId === deptId || shadow.gridNodes.some((node) => node.deptId === deptId)),
      ),
    );
  }

  function gridScope(deptId: number): WorkIdentityBuilding[] {
    return gridScopes[deptId] ?? [];
  }

  function gridTenantCount(deptId: number): number {
    return new Set(gridScope(deptId).map((building) => building.tenantId).filter((tenantId) => tenantId != null)).size;
  }

  function toggleGridBuilding(building: WorkIdentityBuilding, checked: boolean) {
    const key = toBuildingKey(building);
    if (key == null) {
      toast.error("楼栋缺少小区租户标识，不能用于跨小区网格");
      return;
    }
    setSelectedBuildingKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  async function saveGridScope() {
    if (gridDeptId === "" || selectedBuildingKeys.size === 0) return;
    setSavingScope(true);
    try {
      const saved = await updateGridBuildingScope(
        Number(gridDeptId),
        Array.from(selectedBuildingKeys).map(fromBuildingKey),
      );
      setSelectedBuildingKeys(new Set(saved.map(toBuildingKey).filter((key): key is BuildingKey => key != null)));
      setGridScopes((current) => ({ ...current, [Number(gridDeptId)]: saved }));
      toast.success("网格楼栋范围已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格楼栋范围更新失败");
    } finally {
      setSavingScope(false);
    }
  }

  async function saveSelectedGrid() {
    if (selectedGridDept == null) return;
    if (gridRenameName.trim() === "") {
      toast.error("请填写网格名称");
      return;
    }
    if (selectedBuildingKeys.size === 0) {
      toast.error("请至少选择一栋楼");
      return;
    }
    await renameSelectedGridNode();
    await saveGridScope();
  }

  async function removeGridMember(account: WorkIdentityAccount) {
    if (selectedGridDept == null) return;
    const shadow = gridMemberShadow(account);
    if (shadow == null) {
      toast.error("未找到该账号的网格员工作身份");
      return;
    }
    const remainingGridIds = assignedGridDeptIds(account).filter((deptId) => deptId !== selectedGridDept.deptId);
    if (remainingGridIds.length === 0) {
      toast.error("该网格员至少需要保留一个网格，如需移除请先分配到其他网格。");
      return;
    }
    try {
      await updateAssignedGridNodes(shadow.userId, remainingGridIds);
      await refreshGridMembers();
      toast.success(`已将 ${displayName(account)} 移出「${selectedGridDept.deptName}」`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格员移除失败");
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="网格组织管理"
        desc="网格是可跨小区聚合楼栋的组织树节点（Dept）。网格员是全系统统一的静态角色，其负责哪个网格通过此处的网格节点 + 行级数据范围解耦。"
        actions={
          <Button disabled={generating} onClick={() => void addGridNode()}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} 新建网格
          </Button>
        }
      />

      <div className="flex items-start gap-3 rounded-lg border border-[#3a6fbf]/30 bg-[#e8f0fb] p-4 text-sm text-[#2a4f8a]">
        <Info className="mt-0.5 size-4 shrink-0" />
        <div className="space-y-1">
          <div className="font-semibold">Role / Dept / 行级数据范围 三者解耦</div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span>· <b>静态角色 Role</b>「网格员」→ 决定菜单与按钮（RBAC）</span>
            <span>· <b>组织节点 Dept</b>「一号网格」→ 可跨小区聚合楼栋</span>
            <span>· <b>AllowedBuildingIds</b> → 由所属网格聚合，决定可见楼栋（ABAC 行级）</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
        <SectionCard
          title="网格列表"
          desc={deptOptionsLoading ? "加载中" : `共 ${gridDeptOptions.length} 个网格`}
          className="lg:col-span-1"
          bodyClassName="p-2"
        >
          {deptOptionsLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 inline size-4 animate-spin" />加载中
            </div>
          ) : gridDeptOptions.length === 0 ? (
            <EmptyState title="暂无网格" desc="点击右上角新建网格" />
          ) : (
            <div className="space-y-1.5">
              {gridDeptOptions.map((dept) => {
                const active = String(dept.deptId) === gridDeptId;
                const span = gridTenantCount(dept.deptId);
                const scope = gridScope(dept.deptId);
                const leaders = gridLeaders(dept.deptId);
                const community = communityDisplay(dept.tenantId);
                return (
                  <button
                    key={dept.deptId}
                    onClick={() => setGridDeptId(String(dept.deptId))}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${active ? "border-primary bg-accent" : "border-border hover:border-primary/40"}`}
                  >
                    <div className="flex items-center gap-2">
                      <Network className="size-4 text-primary" />
                      <span className="font-semibold">{dept.deptName}</span>
                      <span className="font-mono-num text-xs text-muted-foreground">dept {dept.deptId}</span>
                      {span > 1 && <StatusChip tone="tech" className="ml-auto">跨 {span} 小区</StatusChip>}
                    </div>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground font-mono-num">
                      <span className="inline-flex items-center gap-1"><Building2 className="size-3" />{scope.length} 栋</span>
                      <span className="inline-flex items-center gap-1"><Users className="size-3" />{leaders.length} 网格员</span>
                      <span className="inline-flex items-center gap-1"><MapPinned className="size-3" />{community.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </SectionCard>

        <div className="space-y-5 lg:col-span-2">
          {selectedGridDept ? (
            <>
              <SectionCard
                title="网格信息"
                desc="编辑网格名称与覆盖楼栋（可跨小区）"
                extra={
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      disabled={deleting}
                      onClick={() => setDeleteDialogOpen(true)}
                    >
                      <Trash2 className="size-4" /> 删除
                    </Button>
                    <Button
                      size="sm"
                      disabled={renaming || savingScope}
                      onClick={() => void saveSelectedGrid()}
                    >
                      {renaming || savingScope ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      保存
                    </Button>
                  </div>
                }
              >
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>网格名称</Label>
                    <Input
                      value={gridRenameName}
                      maxLength={100}
                      onChange={(event) => setGridRenameName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>网格编号</Label>
                    <Input value={`dept-${selectedGridDept.deptId}`} disabled className="font-mono-num" />
                  </div>
                </div>

                <div className="mb-2 flex items-center gap-2">
                  <Label>覆盖楼栋</Label>
                  <StatusChip tone="primary">已选 {selectedBuildingKeys.size} 栋</StatusChip>
                  {selectedSpan > 1 && <StatusChip tone="tech">跨 {selectedSpan} 个小区</StatusChip>}
                </div>

                {scopeLoading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 inline size-4 animate-spin" />加载中
                  </div>
                ) : buildingGroups.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">当前网格节点暂无可选楼栋。</div>
                ) : (
                  <div className="space-y-3">
                    {buildingGroups.map((group) => {
                      const community = communityDisplay(group.tenantId);
                      return (
                        <div key={group.tenantId ?? "missing"} className="rounded-lg border border-border p-3">
                          <div className="mb-2.5 flex items-center gap-2">
                            <span className="grid size-6 place-items-center rounded text-xs text-white gov-primary-gradient">
                              {community.short}
                            </span>
                            <span className="text-sm font-semibold">{community.name}</span>
                            <span className="text-xs text-muted-foreground">（{group.buildings.length} 栋）</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                            {group.buildings.map((building) => {
                              const key = toBuildingKey(building);
                              const checked = key != null && selectedBuildingKeys.has(key);
                              return (
                                <button
                                  key={key ?? `missing:${building.buildingId}`}
                                  type="button"
                                  onClick={() => toggleGridBuilding(building, !checked)}
                                  className={`rounded-md border px-2 py-2 text-center transition-all ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}
                                >
                                  <div className="text-sm font-medium">{buildingDisplayName(building.buildingId)}</div>
                                  <div className={`text-[11px] ${checked ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                    {community.name}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <SectionCard title="覆盖范围预览" desc="AllowedBuildingIds（跨小区聚合）">
                  {selectedBuildingKeys.size === 0 ? (
                    <p className="text-sm text-muted-foreground">尚未选择楼栋。</p>
                  ) : (
                    <div className="space-y-3">
                      {Array.from(selectedBuildingKeys).reduce<Array<{ tenantId: number; buildingIds: number[] }>>((groups, key) => {
                        const item = fromBuildingKey(key);
                        const group = groups.find((entry) => entry.tenantId === item.tenantId);
                        if (group) group.buildingIds.push(item.buildingId);
                        else groups.push({ tenantId: item.tenantId, buildingIds: [item.buildingId] });
                        return groups;
                      }, []).sort((left, right) => left.tenantId - right.tenantId).map((group) => {
                        const community = communityDisplay(group.tenantId);
                        return (
                          <div key={group.tenantId}>
                            <div className="mb-1.5 flex items-center gap-1.5 text-sm">
                              <Layers className="size-3.5 text-muted-foreground" />
                              <span className="font-medium">{community.name}</span>
                              <span className="text-xs text-muted-foreground">{group.buildingIds.length} 栋</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {[...group.buildingIds].sort((left, right) => left - right).map((buildingId) => (
                                <StatusChip key={buildingId} tone="info">{community.short}·{buildingDisplayName(buildingId)}</StatusChip>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SectionCard>

                <SectionCard
                  title="网格员分配"
                  desc="为本网格分配网格员，即为其配置数据范围（AllowedBuildingIds）"
                  extra={
                    <AddGridMemberDialog
                      grid={selectedGridDept}
                      assignedMembers={selectedGridMembers}
                      onAssigned={refreshGridMembers}
                    />
                  }
                >
                  {selectedGridMembers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">暂无网格员，请点击右上角分配网格员。</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedGridMembers.map((account) => (
                        <div key={account.accountId} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                          <Avatar className="size-8">
                            <AvatarFallback className="gov-primary-gradient text-xs text-white">
                              {displayName(account).slice(0, 1)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{displayName(account)}</span>
                              <StatusChip tone="info">网格员</StatusChip>
                            </div>
                            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1"><Phone className="size-3" />{maskPhone(account.phone)}</span>
                              <span className="inline-flex items-center gap-1"><IdCard className="size-3" />{gridMemberShadow(account)?.userName ?? account.accountId}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground hover:text-destructive"
                            onClick={() => void removeGridMember(account)}
                          >
                            <X className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </div>
            </>
          ) : (
            <SectionCard>
              <EmptyState title="请选择或新建网格" />
            </SectionCard>
          )}
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除网格「{selectedGridDept?.deptName}」？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后该网格的楼栋聚合将解除，已分配到此网格的网格员将失去对应行级数据范围。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void deleteSelectedGridNode();
              }}
            >
              {deleting && <Loader2 className="size-4 mr-1 animate-spin" />}确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
