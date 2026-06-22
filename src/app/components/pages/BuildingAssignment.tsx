"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard } from "../gov/common";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Loader2, Users, Building2, ShieldCheck } from "lucide-react";
import { useStore } from "../../lib/store";
import {
  listAssignableUsers,
  listBuildings,
  getUserBuildings,
  assignBuilding,
  revokeBuilding,
  type AssignableRoleKey,
  type AssignableUser,
  type Building,
} from "../../lib/building-assignment";

/* ─── 可分配角色映射（与后端 ASSIGNABLE_ROLES 一致）── */
const ROLE_OPTIONS: { value: AssignableRoleKey; label: string; desc: string }[] = [
  { value: "GRID_OPERATOR", label: "网格员", desc: "G 端执行角色，按楼栋管辖网格事务" },
  { value: "VOLUNTEER", label: "志愿者", desc: "B 端业主自治协助，按授权楼栋开展工作" },
  { value: "OWNER_REPRESENTATIVE", label: "业主代表", desc: "B 端楼栋代表，代表本楼栋业主参与议事" },
];

/* ─── 分配者白名单（与后端 ASSIGNER_ROLES 一致）── */
const ASSIGNER_ROLE_KEYS = new Set([
  "GOV_SUPER_ADMIN",
  "COMMUNITY_ADMIN",
  "PARTY_SECRETARY",
  "COMMITTEE_DIRECTOR",
]);

/* ─── 主页面 ─── */
export function BuildingAssignment() {
  const { roleKey } = useStore();
  const canAssign = roleKey != null && ASSIGNER_ROLE_KEYS.has(roleKey);

  const [targetRole, setTargetRole] = useState<AssignableRoleKey>("GRID_OPERATOR");
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userBuildings, setUserBuildings] = useState<Set<number>>(new Set());
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(true);
  const [loadingAssigned, setLoadingAssigned] = useState(false);
  const [acting, setActing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 楼栋列表（全量，一次拉）
  useEffect(() => {
    let alive = true;
    setLoadingBuildings(true);
    listBuildings()
      .then((res) => {
        if (alive) setBuildings(res);
      })
      .catch((err) => {
        if (!alive) return;
        toast.error(err instanceof Error ? err.message : "楼栋列表加载失败");
      })
      .finally(() => {
        if (alive) setLoadingBuildings(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // 切换角色 → 拉用户列表
  useEffect(() => {
    let alive = true;
    setLoadingUsers(true);
    listAssignableUsers(targetRole)
      .then((res) => {
        if (!alive) return;
        setUsers(res);
        setSelectedUserId(res[0]?.userId ?? null);
      })
      .catch((err) => {
        if (!alive) return;
        setUsers([]);
        setSelectedUserId(null);
        toast.error(err instanceof Error ? err.message : "用户列表加载失败");
      })
      .finally(() => {
        if (alive) setLoadingUsers(false);
      });
    return () => {
      alive = false;
    };
  }, [targetRole, refreshKey]);

  // 选中用户 → 拉已分配楼栋
  useEffect(() => {
    if (selectedUserId == null) {
      setUserBuildings(new Set());
      return;
    }
    let alive = true;
    setLoadingAssigned(true);
    getUserBuildings(selectedUserId)
      .then((res) => {
        if (alive) setUserBuildings(new Set(res.map((a) => a.buildingId)));
      })
      .catch((err) => {
        if (!alive) return;
        setUserBuildings(new Set());
        toast.error(err instanceof Error ? err.message : "已分配楼栋加载失败");
      })
      .finally(() => {
        if (alive) setLoadingAssigned(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedUserId, refreshKey]);

  const selectedUser = useMemo(
    () => users.find((u) => u.userId === selectedUserId) ?? null,
    [users, selectedUserId],
  );

  async function onToggleBuilding(buildingId: number, nextChecked: boolean) {
    if (!canAssign || selectedUserId == null) return;
    setActing(true);
    try {
      if (nextChecked) {
        await assignBuilding(selectedUserId, buildingId, targetRole);
        toast.success(`楼栋 #${buildingId} 已分配`);
      } else {
        await revokeBuilding(selectedUserId, buildingId);
        toast.success(`楼栋 #${buildingId} 已撤销`);
      }
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "楼栋分配变更失败");
    } finally {
      setActing(false);
    }
  }

  // 入口兜底：非分配者角色显示无权限提示，不发请求。
  if (!canAssign) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader
          title="楼栋责任田分配"
          desc="给网格员 / 志愿者 / 业主代表分配负责的楼栋"
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
        desc="给网格员 / 志愿者 / 业主代表分配负责的楼栋。变更立即生效，幂等可重复操作。"
      />

      <div className="grid lg:grid-cols-12 gap-4 items-start">
        {/* ── 左：角色选择 + 用户列表 ── */}
        <div className="lg:col-span-4 space-y-3">
          <SectionCard title="选择目标角色">
            <Select value={targetRole} onValueChange={(v) => setTargetRole(v as AssignableRoleKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    <div className="flex flex-col">
                      <span>{o.label}</span>
                      <span className="text-[11px] text-muted-foreground">{o.desc}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SectionCard>

          <SectionCard title="用户列表" bodyClassName="p-2">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="size-4 mr-2 animate-spin" /> 加载中…
              </div>
            ) : users.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                当前小区暂无该角色用户。
              </div>
            ) : (
              <div className="space-y-0.5">
                {users.map((u) => {
                  const active = selectedUserId === u.userId;
                  return (
                    <button
                      key={u.userId}
                      className="w-full text-left rounded-md px-3 py-2.5 transition-colors"
                      style={{
                        backgroundColor: active ? "#e8f0fb" : undefined,
                        color: active ? "#143c78" : undefined,
                      }}
                      onClick={() => setSelectedUserId(u.userId)}
                    >
                      <div className="flex items-center gap-2">
                        <Users className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{u.nickName}</span>
                        <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                          {u.buildingCount} 栋
                        </Badge>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 font-mono-num">
                        userId={u.userId}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </div>

        {/* ── 右：楼栋勾选 ── */}
        <div className="lg:col-span-8 space-y-3">
          <SectionCard
            title="楼栋分配"
            desc={
              selectedUser
                ? `${selectedUser.nickName} · ${ROLE_OPTIONS.find((o) => o.value === targetRole)?.label} · 已勾选 ${userBuildings.size} 栋`
                : "请在左侧选择用户"
            }
          >
            {!selectedUser ? (
              <div className="py-16 text-center text-muted-foreground">
                请在左侧选择目标用户。
              </div>
            ) : loadingBuildings || loadingAssigned ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="size-5 mr-2 animate-spin" /> 加载中…
              </div>
            ) : buildings.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                当前小区暂无楼栋数据。
              </div>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {buildings.map((b) => {
                  const checked = userBuildings.has(b.buildingId);
                  return (
                    <label
                      key={b.buildingId}
                      className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors"
                      style={{
                        borderColor: checked ? "#1b4f9c" : undefined,
                        backgroundColor: checked ? "#f0f5ff" : undefined,
                      }}
                    >
                      <Checkbox
                        checked={checked}
                        disabled={acting}
                        onCheckedChange={() => onToggleBuilding(b.buildingId, !checked)}
                      />
                      <div className="flex items-center gap-2">
                        <Building2 className="size-4 text-muted-foreground" />
                        <span className="text-sm font-medium">楼栋 #{b.buildingId}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {selectedUser && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
                <span>
                  操作幂等：勾选立即分配、取消立即撤销；同一楼栋重复勾选不会重复入库。撤销后再勾选会复活原记录。
                </span>
              </div>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
