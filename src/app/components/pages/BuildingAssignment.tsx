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

/* ─── 角色展示映射 ─── */
const ROLE_LABEL: Record<AssignableRoleKey, string> = {
  GRID_MEMBER: "网格员（转网格管理）",
  VOLUNTEER: "志愿者",
  OWNER_REPRESENTATIVE: "业主代表",
};

const VISIBLE_ASSIGNABLE_ROLES = new Set<AssignableRoleKey>([
  "VOLUNTEER",
  "OWNER_REPRESENTATIVE",
]);

/* ─── 合规标签展示 ─── */
const COMPLIANCE_ISSUE_LABEL: Record<string, string> = {
  NOT_VERIFIED: "未实名（需 L2+ 实名）",
  BUILDING_LIMIT_REACHED: "楼栋数已达上限（5）",
};

const MAX_BUILDINGS = 5;

/* ─── 分配者白名单（与后端 ASSIGNER_ROLES 一致）── */
const ASSIGNER_ROLE_KEYS = new Set([
  "GOV_SUPER_ADMIN",
  "COMMUNITY_ADMIN",
  "PARTY_SECRETARY",
  "COMMITTEE_DIRECTOR",
]);

/* ─── 步骤定义 ─── */
type Step = "search" | "compliance" | "assign";

/* ─── 手机号脱敏 ─── */
function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone ?? "—";
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

/* ─── 主页面 ─── */
export function BuildingAssignment() {
  const { roleKey } = useStore();
  const canAssign = roleKey != null && ASSIGNER_ROLE_KEYS.has(roleKey);

  const [step, setStep] = useState<Step>("search");

  // 搜索状态
  const [keyword, setKeyword] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchResults, setSearchResults] = useState<AssignableUser[]>([]);
  const [searching, setSearching] = useState(false);

  // 选中用户
  const [selected, setSelected] = useState<AssignableUser | null>(null);

  // 楼栋列表 + 该用户已分配
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [userBuildingSet, setUserBuildingSet] = useState<Set<number>>(new Set());
  // 楼栋 → 占用者列表（用于显示「同角色占用」chip 与转移确认）
  const [occupantsMap, setOccupantsMap] = useState<Record<number, BuildingOccupant[]>>({});
  const [loadingOccupants, setLoadingOccupants] = useState(false);

  // 操作中 / 刷新
  const [acting, setActing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 同角色冲突的二次确认对话框
  const [transferConfirm, setTransferConfirm] = useState<{
    buildingId: number;
    conflictUser: BuildingOccupant;
  } | null>(null);

  // debounce 搜索：keyword 改变后 300ms 触发
  useEffect(() => {
    if (!canAssign) return;
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
          if (alive) setSearchResults(res.filter((item) => VISIBLE_ASSIGNABLE_ROLES.has(item.roleKey)));
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
  }, [keyword, canAssign]);

  // 进入「分配」步骤 → 拉楼栋列表 + 该用户已分配 + 占用快照
  useEffect(() => {
    if (step !== "assign" || selected == null) return;
    let alive = true;
    setLoadingBuildings(true);
    Promise.all([listBuildings(), getUserBuildings(selected.userId)])
      .then(([bds, assigned]) => {
        if (!alive) return;
        setBuildings(bds);
        setUserBuildingSet(new Set(assigned.map((a) => a.buildingId)));
        // 并发拉每个楼栋的占用快照
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
        if (alive) {
          setLoadingBuildings(false);
          setLoadingOccupants(false);
        }
      });
    return () => {
      alive = false;
    };
  }, [step, selected, refreshKey]);

  // 合规检查结果（驱动 Step 2 的 ✓/✗ 展示）
  const complianceChecks = useMemo(() => {
    if (selected == null) return [];
    const issues = new Set(selected.complianceIssues);
    return [
      { key: "STATUS", label: "账号状态正常", ok: true }, // 搜索结果已过滤 status='0'
      { key: "TENANT", label: "与当前管理者同小区", ok: true }, // 后端 SQL 已按 tenantId 过滤
      {
        key: "VERIFIED",
        label: "已完成 L2+ 实名认证",
        ok: !issues.has("NOT_VERIFIED"),
      },
      {
        key: "BUILDING_LIMIT",
        label: `已分配楼栋数 < ${MAX_BUILDINGS}（当前 ${selected.buildingCount}/${MAX_BUILDINGS}）`,
        ok: !issues.has("BUILDING_LIMIT_REACHED"),
      },
    ];
  }, [selected]);

  const allCompliant = complianceChecks.every((c) => c.ok);

  function selectUser(u: AssignableUser) {
    setSelected(u);
    setStep("compliance");
  }

  function backToSearch() {
    setStep("search");
    setSelected(null);
    setBuildings([]);
    setUserBuildingSet(new Set());
    setOccupantsMap({});
  }

  function backToCompliance() {
    setStep("compliance");
  }

  /** 计算某楼栋的「同角色冲突」（与 selected 的角色相同但 userId 不同的占用者）。 */
  function sameRoleConflict(buildingId: number): BuildingOccupant | null {
    if (!selected) return null;
    const occupants = occupantsMap[buildingId] ?? [];
    return (
      occupants.find(
        (o) => o.roleKey === selected.roleKey && o.userId !== selected.userId,
      ) ?? null
    );
  }

  /** 计算某楼栋的「不同角色共享」标签（非当前选中用户、且不冲突的）。 */
  function differentRoleSharers(buildingId: number): BuildingOccupant[] {
    if (!selected) return [];
    const occupants = occupantsMap[buildingId] ?? [];
    return occupants.filter(
      (o) => o.roleKey !== selected.roleKey && o.userId !== selected.userId,
    );
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
      // 同角色冲突 → 二次确认转移
      setTransferConfirm({ buildingId, conflictUser: conflict });
      return;
    }
    void doAssign(buildingId, false);
  }

  // 入口兜底
  if (!canAssign) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader
          title="楼栋责任田分配"
          desc="个人楼栋责任田仅用于志愿者 / 业主代表；网格员范围请到「网格管理」配置。"
        />
        <SectionCard>
          <div className="py-16 text-center text-muted-foreground">
            当前角色无权分配楼栋责任田。仅街道办超管 / 居委会管理员 / 党组书记 / 业委会主任可分配。
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="楼栋责任田分配"
        desc="搜索账号 → 检查合规 → 分配个人楼栋责任田。同角色互斥（自动转移），不同角色可共享同栋楼。"
      />

      {/* 步骤面包屑 */}
      <div className="flex items-center gap-2 text-sm">
        <StepCrumb label="搜索账号" active={step === "search"} done={step !== "search"} />
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <StepCrumb label="检查合规" active={step === "compliance"} done={step === "assign"} />
        <ChevronRight className="size-3.5 text-muted-foreground" />
        <StepCrumb label="分配楼栋" active={step === "assign"} done={false} />
      </div>

      {/* 步骤 1：搜索 */}
      {step === "search" && (
        <SectionCard title="搜索账号" desc="支持姓名 / 手机号 / 手机尾号（仅返回志愿者 / 业主代表）">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="输入姓名、手机号或手机尾号"
                className="pl-9"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setKeyword(e.target.value);
                }}
              />
            </div>
            {searching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          </div>

          {keyword.trim().length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              请输入关键词开始搜索。
            </div>
          ) : searchResults.length === 0 && !searching ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              未找到匹配的账号。请检查关键词或确认目标用户已注册并配有可分配角色。
            </div>
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
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px]">
                        {ROLE_LABEL[u.roleKey]}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono-num text-sm">{maskPhone(u.phone)}</TableCell>
                    <TableCell>
                      {u.realNameVerified === 1 ? (
                        <StatusChip tone="success">已实名</StatusChip>
                      ) : (
                        <StatusChip tone="warning">未实名</StatusChip>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono-num text-sm">
                      {u.buildingCount}/{MAX_BUILDINGS}
                    </TableCell>
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

      {/* 步骤 2：合规检查 */}
      {step === "compliance" && selected && (
        <SectionCard
          title="账号合规检查"
          desc={`${selected.nickName} · ${ROLE_LABEL[selected.roleKey]} · ${maskPhone(selected.phone)}`}
          extra={
            <Button size="sm" variant="outline" onClick={backToSearch}>
              <ArrowLeft className="size-3.5 mr-1" /> 返回搜索
            </Button>
          }
        >
          <div className="space-y-2 mb-5">
            {complianceChecks.map((c) => (
              <div
                key={c.key}
                className="flex items-center gap-3 rounded-md border p-3"
                style={{
                  borderColor: c.ok ? "#d1e7d6" : "#f5d6d6",
                  backgroundColor: c.ok ? "#f4faf6" : "#fdf4f4",
                }}
              >
                {c.ok ? (
                  <ShieldCheck className="size-5 text-green-600 shrink-0" />
                ) : (
                  <ShieldAlert className="size-5 text-red-600 shrink-0" />
                )}
                <span className="text-sm">{c.label}</span>
                {!c.ok && selected.complianceIssues.length > 0 && (
                  <span className="ml-auto text-xs text-red-600">
                    {selected.complianceIssues
                      .filter((i) =>
                        c.key === "VERIFIED" ? i === "NOT_VERIFIED" :
                        c.key === "BUILDING_LIMIT" ? i === "BUILDING_LIMIT_REACHED" : false,
                      )
                      .map((i) => COMPLIANCE_ISSUE_LABEL[i] ?? i)
                      .join("；")}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={backToSearch}>
              取消
            </Button>
            <Button disabled={!allCompliant} onClick={() => setStep("assign")}>
              进入分配 <ChevronRight className="size-4 ml-1" />
            </Button>
          </div>
          {!allCompliant && (
            <p className="mt-3 text-xs text-red-600">
              账号未达合规要求，无法分配。请先完善对应项再回到此页。
            </p>
          )}
        </SectionCard>
      )}

      {/* 步骤 3：分配楼栋 */}
      {step === "assign" && selected && (
        <SectionCard
          title="分配楼栋"
          desc={`${selected.nickName} · ${ROLE_LABEL[selected.roleKey]} · 已选 ${userBuildingSet.size} 栋`}
          extra={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={backToCompliance}>
                <ArrowLeft className="size-3.5 mr-1" /> 返回检查
              </Button>
              <Button size="sm" variant="outline" onClick={backToSearch}>
                重新搜索
              </Button>
            </div>
          }
        >
          {loadingBuildings ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="size-5 mr-2 animate-spin" /> 加载楼栋与占用快照…
            </div>
          ) : buildings.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              当前小区暂无楼栋数据。
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {buildings.map((b) => {
                const checked = userBuildingSet.has(b.buildingId);
                const conflict = sameRoleConflict(b.buildingId);
                const sharers = differentRoleSharers(b.buildingId);
                return (
                  <label
                    key={b.buildingId}
                    className="flex flex-col gap-2 rounded-lg border p-3 cursor-pointer transition-colors"
                    style={{
                      borderColor: checked ? "#1b4f9c" : conflict ? "#d4a017" : undefined,
                      backgroundColor: checked ? "#f0f5ff" : undefined,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={checked}
                        disabled={acting}
                        onCheckedChange={() => onToggleBuilding(b.buildingId, !checked)}
                      />
                      <Building2 className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium">楼栋 #{b.buildingId}</span>
                    </div>
                    {checked && (
                      <div className="text-[11px] text-blue-700 pl-7">✓ 已分配给当前用户</div>
                    )}
                    {!checked && conflict && (
                      <div className="text-[11px] text-amber-700 pl-7">
                        ⚠ 同角色「{conflict.nickName}」占用 · 勾选触发转移
                      </div>
                    )}
                    {sharers.length > 0 && (
                      <div className="text-[11px] text-muted-foreground pl-7">
                        ℹ 共享：
                        {sharers.map((s) => `${s.nickName}(${ROLE_LABEL[s.roleKey]})`).join("、")}
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </SectionCard>
      )}

      {/* 转移二次确认 */}
      <AlertDialog
        open={transferConfirm != null}
        onOpenChange={(v) => {
          if (!v) setTransferConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>转移楼栋分配？</AlertDialogTitle>
            <AlertDialogDescription>
              {transferConfirm && selected ? (
                <>
                  楼栋 <b>#{transferConfirm.buildingId}</b> 当前由「<b>{transferConfirm.conflictUser.nickName}</b>」（{ROLE_LABEL[transferConfirm.conflictUser.roleKey]}）负责。
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

/* ─── 步骤面包屑小组件 ─── */
function StepCrumb({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-xs"
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
