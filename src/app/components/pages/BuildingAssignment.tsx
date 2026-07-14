"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
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
  Loader2,
  Search,
  Building2,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ArrowLeft,
  Network,
  Save,
} from "lucide-react";
import { useStore } from "../../lib/store";
import {
  searchAssignableUsers,
  listBuildings,
  getUserBuildings,
  getBuildingOccupants,
  assignBuilding,
  revokeBuilding,
  type AssignableRoleKey,
  type AssignableUser,
  type Building,
  type BuildingOccupant,
} from "../../lib/building-assignment";
import {
  listAssignedGridNodes,
  listWorkIdentityDeptOptions,
  searchWorkIdentityAccounts,
  updateAssignedGridNodes,
  type WorkIdentityAccount,
  type WorkIdentityDeptOption,
} from "../../lib/work-identity";

const GRID_MEMBER_ROLE = "GRID_MEMBER";

const ROLE_LABEL: Record<AssignableRoleKey, string> = {
  GRID_MEMBER: "网格员",
  VOLUNTEER: "志愿者",
  OWNER_REPRESENTATIVE: "业主代表",
};

const PERSONAL_ASSIGNABLE_ROLES = new Set<AssignableRoleKey>([
  "VOLUNTEER",
  "OWNER_REPRESENTATIVE",
]);

const COMPLIANCE_ISSUE_LABEL: Record<string, string> = {
  NOT_VERIFIED: "未实名（需 L2+ 实名）",
  BUILDING_LIMIT_REACHED: "楼栋数已达上限（5）",
};

const MAX_BUILDINGS = 5;
const ASSIGNER_ROLE_KEYS = new Set([
  "GOV_SUPER_ADMIN",
  "COMMUNITY_ADMIN",
  "PARTY_SECRETARY",
  "COMMITTEE_DIRECTOR",
]);

type Step = "search" | "compliance" | "assign";
type AssignMode = "grid" | "building";

interface GridCandidate {
  accountId: number;
  userId: number;
  nickName: string;
  phone: string;
  realName: string;
  buildingIds: number[];
  gridNodes: WorkIdentityDeptOption[];
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone ?? "-";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

function toGridCandidates(accounts: WorkIdentityAccount[]): GridCandidate[] {
  return accounts.flatMap((account) =>
    account.shadows
      .filter((shadow) => shadow.roleKey === GRID_MEMBER_ROLE)
      .map((shadow) => ({
        accountId: account.accountId,
        userId: shadow.userId,
        nickName: shadow.nickName ?? account.realName,
        phone: account.phone,
        realName: account.realName,
        buildingIds: shadow.buildingIds,
        gridNodes: shadow.gridNodes ?? [],
      })),
  );
}

export function BuildingAssignment() {
  const { roleKey } = useStore();
  const canAssign = roleKey != null && ASSIGNER_ROLE_KEYS.has(roleKey);
  const mode: AssignMode = roleKey === "COMMUNITY_ADMIN" ? "grid" : "building";

  const [step, setStep] = useState<Step>("search");

  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<AssignableUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AssignableUser | null>(null);

  const [gridKeyword, setGridKeyword] = useState("");
  const [gridSearchInput, setGridSearchInput] = useState("");
  const [gridResults, setGridResults] = useState<GridCandidate[]>([]);
  const [gridSearching, setGridSearching] = useState(false);
  const [selectedGridUser, setSelectedGridUser] = useState<GridCandidate | null>(null);
  const [gridNodes, setGridNodes] = useState<WorkIdentityDeptOption[]>([]);
  const [assignedGridSet, setAssignedGridSet] = useState<Set<number>>(new Set());
  const [gridNodesLoading, setGridNodesLoading] = useState(false);
  const [savingGridScope, setSavingGridScope] = useState(false);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [userBuildingSet, setUserBuildingSet] = useState<Set<number>>(new Set());
  const [occupantsMap, setOccupantsMap] = useState<Record<number, BuildingOccupant[]>>({});
  const [acting, setActing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [transferConfirm, setTransferConfirm] = useState<{
    buildingId: number;
    conflictUser: BuildingOccupant;
  } | null>(null);

  useEffect(() => {
    if (!canAssign || mode !== "building") return;
    const trimmed = keyword.trim();
    if (trimmed.length === 0) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(() => {
      let alive = true;
      setSearching(true);
      searchAssignableUsers(trimmed)
        .then((res) => {
          if (alive) {
            setSearchResults(res.filter((item) => PERSONAL_ASSIGNABLE_ROLES.has(item.roleKey)));
          }
        })
        .catch((err) => {
          if (!alive) return;
          setSearchResults([]);
          toast.error(err instanceof Error ? err.message : "搜索失败");
        })
        .finally(() => {
          if (alive) setSearching(false);
        });
      return () => {
        alive = false;
      };
    }, 300);
    return () => clearTimeout(t);
  }, [keyword, canAssign, mode]);

  useEffect(() => {
    if (!canAssign || mode !== "grid") return;
    const trimmed = gridKeyword.trim();
    if (trimmed.length === 0) {
      setGridResults([]);
      return;
    }
    const t = setTimeout(() => {
      let alive = true;
      setGridSearching(true);
      searchWorkIdentityAccounts(trimmed, GRID_MEMBER_ROLE)
        .then((accounts) => {
          if (alive) setGridResults(toGridCandidates(accounts));
        })
        .catch((err) => {
          if (!alive) return;
          setGridResults([]);
          toast.error(err instanceof Error ? err.message : "网格员搜索失败");
        })
        .finally(() => {
          if (alive) setGridSearching(false);
        });
      return () => {
        alive = false;
      };
    }, 300);
    return () => clearTimeout(t);
  }, [gridKeyword, canAssign, mode]);

  useEffect(() => {
    if (step !== "assign" || selected == null || mode !== "building") return;
    let alive = true;
    setLoadingBuildings(true);
    Promise.all([listBuildings(), getUserBuildings(selected.userId)])
      .then(([bds, assigned]) => {
        if (!alive) return undefined;
        setBuildings(bds);
        setUserBuildingSet(new Set(assigned.map((a) => a.buildingId)));
        return Promise.all(
          bds.map((b) =>
            getBuildingOccupants(b.buildingId).then((o) => ({
              id: b.buildingId,
              occupants: o.occupants,
            })),
          ),
        );
      })
      .then((occList) => {
        if (!alive || !occList) return;
        const map: Record<number, BuildingOccupant[]> = {};
        for (const x of occList) map[x.id] = x.occupants;
        setOccupantsMap(map);
      })
      .catch((err) => {
        if (!alive) return;
        toast.error(err instanceof Error ? err.message : "楼栋数据加载失败");
      })
      .finally(() => {
        if (alive) setLoadingBuildings(false);
      });
    return () => {
      alive = false;
    };
  }, [step, selected, refreshKey, mode]);

  useEffect(() => {
    if (step !== "assign" || selectedGridUser == null || mode !== "grid") return;
    let alive = true;
    setGridNodesLoading(true);
    Promise.all([
      listWorkIdentityDeptOptions(GRID_MEMBER_ROLE),
      listAssignedGridNodes(selectedGridUser.userId),
    ])
      .then(([nodes, assigned]) => {
        if (!alive) return;
        setGridNodes(nodes);
        setAssignedGridSet(new Set(assigned.map((node) => node.deptId)));
      })
      .catch((err) => {
        if (!alive) return;
        setGridNodes([]);
        toast.error(err instanceof Error ? err.message : "网格节点加载失败");
      })
      .finally(() => {
        if (alive) setGridNodesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [step, selectedGridUser, mode]);

  const complianceChecks = useMemo(() => {
    if (selected == null) return [];
    const issues = new Set(selected.complianceIssues);
    return [
      { key: "STATUS", label: "账号状态正常", ok: true },
      { key: "TENANT", label: "与当前管理者同小区", ok: true },
      { key: "VERIFIED", label: "已完成 L2+ 实名认证", ok: !issues.has("NOT_VERIFIED") },
      {
        key: "BUILDING_LIMIT",
        label: `已分配楼栋数 < ${MAX_BUILDINGS}（当前 ${selected.buildingCount}/${MAX_BUILDINGS}）`,
        ok: !issues.has("BUILDING_LIMIT_REACHED"),
      },
    ];
  }, [selected]);

  const gridComplianceChecks = useMemo(() => {
    if (selectedGridUser == null) return [];
    return [
      { key: "STATUS", label: "账号状态正常", ok: true },
      { key: "ROLE", label: "已绑定 GRID_MEMBER 静态角色", ok: true },
      {
        key: "SCOPE",
        label: `当前已分配 ${selectedGridUser.gridNodes.length} 个网格，聚合 ${selectedGridUser.buildingIds.length} 栋楼`,
        ok: true,
      },
    ];
  }, [selectedGridUser]);

  const allCompliant = complianceChecks.every((c) => c.ok);

  function selectUser(u: AssignableUser) {
    setSelected(u);
    setSelectedGridUser(null);
    setStep("compliance");
  }

  function selectGridUser(u: GridCandidate) {
    setSelected(null);
    setSelectedGridUser(u);
    setAssignedGridSet(new Set(u.gridNodes.map((node) => node.deptId)));
    setStep("compliance");
  }

  function backToSearch() {
    setStep("search");
    setSelected(null);
    setSelectedGridUser(null);
    setBuildings([]);
    setUserBuildingSet(new Set());
    setOccupantsMap({});
    setGridNodes([]);
    setAssignedGridSet(new Set());
  }

  function backToCompliance() {
    setStep("compliance");
  }

  function sameRoleConflict(buildingId: number): BuildingOccupant | null {
    if (!selected) return null;
    const occupants = occupantsMap[buildingId] ?? [];
    return occupants.find((o) => o.roleKey === selected.roleKey && o.userId !== selected.userId) ?? null;
  }

  function differentRoleSharers(buildingId: number): BuildingOccupant[] {
    if (!selected) return [];
    const occupants = occupantsMap[buildingId] ?? [];
    return occupants.filter((o) => o.roleKey !== selected.roleKey && o.userId !== selected.userId);
  }

  async function doAssign(buildingId: number, force: boolean) {
    if (!selected) return;
    setActing(true);
    try {
      await assignBuilding(selected.userId, buildingId, selected.roleKey, force);
      toast.success(force ? `楼栋 #${buildingId} 已转移分配` : `楼栋 #${buildingId} 已分配`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "楼栋分配失败");
    } finally {
      setActing(false);
    }
  }

  async function doRevoke(buildingId: number) {
    if (!selected) return;
    setActing(true);
    try {
      await revokeBuilding(selected.userId, buildingId);
      toast.success(`楼栋 #${buildingId} 已撤销`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "楼栋撤销失败");
    } finally {
      setActing(false);
    }
  }

  function onToggleBuilding(buildingId: number, nextChecked: boolean) {
    if (!selected || acting) return;
    if (!nextChecked) {
      void doRevoke(buildingId);
      return;
    }
    const conflict = sameRoleConflict(buildingId);
    if (conflict) {
      setTransferConfirm({ buildingId, conflictUser: conflict });
      return;
    }
    void doAssign(buildingId, false);
  }

  function toggleGridNode(deptId: number, checked: boolean) {
    setAssignedGridSet((prev) => {
      const next = new Set(prev);
      if (checked) next.add(deptId);
      else next.delete(deptId);
      return next;
    });
  }

  async function saveGridAssignment() {
    if (!selectedGridUser) return;
    if (assignedGridSet.size === 0) {
      toast.error("请至少选择一个网格");
      return;
    }
    setSavingGridScope(true);
    try {
      const saved = await updateAssignedGridNodes(selectedGridUser.userId, Array.from(assignedGridSet));
      const nextSet = new Set(saved.map((node) => node.deptId));
      setAssignedGridSet(nextSet);
      const updated = { ...selectedGridUser, gridNodes: saved };
      setSelectedGridUser(updated);
      setGridResults((prev) => prev.map((item) => (item.userId === updated.userId ? updated : item)));
      toast.success(`已为 ${selectedGridUser.nickName} 分配 ${saved.length} 个网格`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格分配失败");
    } finally {
      setSavingGridScope(false);
    }
  }

  if (!canAssign) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader title="数据范围分配" desc="为网格员分配网格，或为志愿者 / 业主代表分配个人楼栋责任田。" />
        <SectionCard>
          <div className="py-16 text-center text-muted-foreground">
            当前角色无权分配数据范围。需要 admin:user:assign-role 权限对应的管理身份。
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="数据范围分配"
        desc={
          mode === "grid"
            ? "搜索网格员账号，分配一个或多个网格节点；后端按网格聚合 AllowedBuildingIds。"
            : "搜索志愿者 / 业主代表账号，分配个人楼栋责任田。同角色互斥，不同角色可共享同栋楼。"
        }
      />

      <div className="flex items-center gap-2 text-sm">
        <StepCrumb label="搜索账号" active={step === "search"} done={step !== "search"} />
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <StepCrumb label="检查合规" active={step === "compliance"} done={step === "assign"} />
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <StepCrumb label={mode === "grid" ? "分配网格" : "分配楼栋"} active={step === "assign"} done={false} />
      </div>

      {step === "search" && mode === "grid" && (
        <SectionCard title="搜索网格员" desc="支持姓名 / 手机号 / 手机尾号，仅返回 GRID_MEMBER 工作身份">
          <SearchBox
            value={gridSearchInput}
            loading={gridSearching}
            placeholder="输入网格员姓名、手机号或手机尾号"
            onChange={(value) => {
              setGridSearchInput(value);
              setGridKeyword(value);
            }}
          />

          {gridKeyword.trim().length === 0 ? (
            <EmptyHint>请输入关键词开始搜索。</EmptyHint>
          ) : gridResults.length === 0 && !gridSearching ? (
            <EmptyHint>未找到匹配的网格员账号。请确认其已建档并绑定 GRID_MEMBER 角色。</EmptyHint>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead className="text-right">已分配网格</TableHead>
                  <TableHead className="text-right">聚合楼栋</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gridResults.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium">{u.nickName}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">网格员</Badge></TableCell>
                    <TableCell className="font-mono-num text-sm">{maskPhone(u.phone)}</TableCell>
                    <TableCell className="text-right font-mono-num text-sm">{u.gridNodes.length}</TableCell>
                    <TableCell className="text-right font-mono-num text-sm">{u.buildingIds.length}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => selectGridUser(u)}>
                        选择 <ChevronRight className="size-3.5 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      )}

      {step === "search" && mode === "building" && (
        <SectionCard title="搜索账号" desc="支持姓名 / 手机号 / 手机尾号，仅返回志愿者 / 业主代表">
          <SearchBox
            value={searchInput}
            loading={searching}
            placeholder="输入姓名、手机号或手机尾号"
            onChange={(value) => {
              setSearchInput(value);
              setKeyword(value);
            }}
          />

          {keyword.trim().length === 0 ? (
            <EmptyHint>请输入关键词开始搜索。</EmptyHint>
          ) : searchResults.length === 0 && !searching ? (
            <EmptyHint>未找到匹配的账号。请检查关键词或确认目标用户已注册并配有可分配角色。</EmptyHint>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>手机号</TableHead>
                  <TableHead>实名</TableHead>
                  <TableHead className="text-right">楼栋数</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((u) => (
                  <TableRow key={u.userId}>
                    <TableCell className="font-medium">{u.nickName}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{ROLE_LABEL[u.roleKey]}</Badge></TableCell>
                    <TableCell className="font-mono-num text-sm">{maskPhone(u.phone)}</TableCell>
                    <TableCell>
                      {u.realNameVerified === 1 ? <StatusChip tone="success">已实名</StatusChip> : <StatusChip tone="warning">未实名</StatusChip>}
                    </TableCell>
                    <TableCell className="text-right font-mono-num text-sm">{u.buildingCount}/{MAX_BUILDINGS}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => selectUser(u)}>
                        选择 <ChevronRight className="size-3.5 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>
      )}

      {step === "compliance" && mode === "grid" && selectedGridUser && (
        <ComplianceCard
          title="网格员身份检查"
          desc={`${selectedGridUser.nickName} · 网格员 · ${maskPhone(selectedGridUser.phone)}`}
          checks={gridComplianceChecks}
          onBack={backToSearch}
          onNext={() => setStep("assign")}
        />
      )}

      {step === "compliance" && mode === "building" && selected && (
        <ComplianceCard
          title="账号合规检查"
          desc={`${selected.nickName} · ${ROLE_LABEL[selected.roleKey]} · ${maskPhone(selected.phone)}`}
          checks={complianceChecks}
          onBack={backToSearch}
          onNext={() => setStep("assign")}
          nextDisabled={!allCompliant}
          issueText={
            !allCompliant
              ? selected.complianceIssues.map((i) => COMPLIANCE_ISSUE_LABEL[i] ?? i).join("；")
              : undefined
          }
        />
      )}

      {step === "assign" && mode === "grid" && selectedGridUser && (
        <SectionCard
          title="分配网格"
          desc={`${selectedGridUser.nickName} · 已选 ${assignedGridSet.size} 个网格`}
          extra={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={backToCompliance}>
                <ArrowLeft className="size-3.5 mr-1" /> 返回检查
              </Button>
              <Button size="sm" disabled={savingGridScope || assignedGridSet.size === 0} onClick={() => void saveGridAssignment()}>
                {savingGridScope ? <Loader2 className="size-3.5 mr-1 animate-spin" /> : <Save className="size-3.5 mr-1" />}
                保存分配
              </Button>
            </div>
          }
        >
          {gridNodesLoading ? (
            <LoadingHint>加载网格节点…</LoadingHint>
          ) : gridNodes.length === 0 ? (
            <EmptyHint>暂无可分配网格。请先在“网格组织管理”中新建网格并配置管辖范围。</EmptyHint>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {gridNodes.map((node) => {
                const checked = assignedGridSet.has(node.deptId);
                return (
                  <label
                    key={node.deptId}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors"
                    style={{
                      borderColor: checked ? "#1b4f9c" : undefined,
                      backgroundColor: checked ? "#f0f5ff" : undefined,
                    }}
                  >
                    <Checkbox checked={checked} onCheckedChange={(value) => toggleGridNode(node.deptId, Boolean(value))} />
                    <Network className="mt-0.5 size-4 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{node.deptName}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="font-mono-num">dept {node.deptId}</span>
                        <span className="font-mono-num">tenant {node.tenantId ?? "-"}</span>
                        <StatusChip tone="tech">网格节点</StatusChip>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {step === "assign" && mode === "building" && selected && (
        <SectionCard
          title="分配楼栋"
          desc={`${selected.nickName} · ${ROLE_LABEL[selected.roleKey]} · 已选 ${userBuildingSet.size} 栋`}
          extra={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={backToCompliance}>
                <ArrowLeft className="size-3.5 mr-1" /> 返回检查
              </Button>
              <Button size="sm" variant="outline" onClick={backToSearch}>重新搜索</Button>
            </div>
          }
        >
          {loadingBuildings ? (
            <LoadingHint>加载楼栋与占用快照…</LoadingHint>
          ) : buildings.length === 0 ? (
            <EmptyHint>当前小区暂无楼栋数据。</EmptyHint>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {buildings.map((b) => {
                const checked = userBuildingSet.has(b.buildingId);
                const conflict = sameRoleConflict(b.buildingId);
                const sharers = differentRoleSharers(b.buildingId);
                return (
                  <label
                    key={b.buildingId}
                    className="flex cursor-pointer flex-col gap-2 rounded-lg border p-3 transition-colors"
                    style={{
                      borderColor: checked ? "#1b4f9c" : conflict ? "#d4a017" : undefined,
                      backgroundColor: checked ? "#f0f5ff" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox checked={checked} disabled={acting} onCheckedChange={() => onToggleBuilding(b.buildingId, !checked)} />
                      <Building2 className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">楼栋 #{b.buildingId}</span>
                    </div>
                    {checked && <div className="pl-7 text-[11px] text-blue-700">已分配给当前用户</div>}
                    {!checked && conflict && <div className="pl-7 text-[11px] text-amber-700">同角色「{conflict.nickName}」占用，勾选触发转移</div>}
                    {sharers.length > 0 && (
                      <div className="pl-7 text-[11px] text-muted-foreground">
                        共享：{sharers.map((s) => `${s.nickName}(${ROLE_LABEL[s.roleKey]})`).join("、")}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      <AlertDialog open={transferConfirm != null} onOpenChange={(v) => !v && setTransferConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>转移楼栋分配？</AlertDialogTitle>
            <AlertDialogDescription>
              {transferConfirm && selected ? (
                <>
                  楼栋 <b>#{transferConfirm.buildingId}</b> 当前由「<b>{transferConfirm.conflictUser.nickName}</b>」
                  （{ROLE_LABEL[transferConfirm.conflictUser.roleKey]}）负责。
                  <br />
                  分配给「<b>{selected.nickName}</b>」会自动撤销原占用者，操作不可逆。是否继续？
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={acting}
              onClick={(e) => {
                e.preventDefault();
                if (transferConfirm) void doAssign(transferConfirm.buildingId, true);
                setTransferConfirm(null);
              }}
            >
              {acting && <Loader2 className="size-4 mr-1 animate-spin" />} 确认转移
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SearchBox({
  value,
  loading,
  placeholder,
  onChange,
}: {
  value: string;
  loading: boolean;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <div className="relative max-w-md flex-1">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder={placeholder} className="pl-9" value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
      {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

function ComplianceCard({
  title,
  desc,
  checks,
  onBack,
  onNext,
  nextDisabled,
  issueText,
}: {
  title: string;
  desc: string;
  checks: Array<{ key: string; label: string; ok: boolean }>;
  onBack: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  issueText?: string;
}) {
  return (
    <SectionCard
      title={title}
      desc={desc}
      extra={
        <Button size="sm" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-3.5 mr-1" /> 返回搜索
        </Button>
      }
    >
      <div className="mb-5 space-y-2">
        {checks.map((c) => (
          <div
            key={c.key}
            className="flex items-center gap-3 rounded-md border p-3"
            style={{
              borderColor: c.ok ? "#d1e7d6" : "#f5d6d6",
              backgroundColor: c.ok ? "#f4faf6" : "#fdf4f4",
            }}
          >
            {c.ok ? <ShieldCheck className="size-5 shrink-0 text-green-600" /> : <ShieldAlert className="size-5 shrink-0 text-red-600" />}
            <span className="text-sm">{c.label}</span>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onBack}>取消</Button>
        <Button disabled={nextDisabled} onClick={onNext}>进入分配 <ChevronRight className="size-4 ml-1" /></Button>
      </div>
      {issueText && <p className="mt-3 text-xs text-red-600">{issueText}</p>}
    </SectionCard>
  );
}

function LoadingHint({ children }: { children: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-muted-foreground">
      <Loader2 className="size-5 mr-2 animate-spin" /> {children}
    </div>
  );
}

function EmptyHint({ children }: { children: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

function StepCrumb({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className="rounded px-2 py-0.5 text-xs"
      style={{
        backgroundColor: active ? "#1b4f9c" : done ? "#e8f6ee" : "#f1f5f9",
        color: active ? "white" : done ? "#1f7a45" : "#64748b",
        fontWeight: active ? 600 : 500,
      }}
    >
      {done && "✓ "}
      {label}
    </span>
  );
}
