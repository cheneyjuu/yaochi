"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Building2, Loader2, Plus, ShieldCheck } from "lucide-react";
import {
  ensureGridNodes,
  listGridBuildingScope,
  listWorkIdentityBuildings,
  listWorkIdentityDeptOptions,
  updateGridBuildingScope,
  type WorkIdentityBuilding,
  type WorkIdentityDeptOption,
} from "../../lib/work-identity";
import { useStore } from "../../lib/store";

const GRID_MEMBER_ROLE = "GRID_MEMBER";

const DEPT_TYPE_LABEL: Record<number, string> = {
  1: "街道办",
  2: "居委会",
  5: "网格",
  6: "党组织",
};

type BuildingKey = `${number}:${number}`;

function toBuildingKey(building: WorkIdentityBuilding): BuildingKey | null {
  if (building.tenantId == null) return null;
  return `${building.tenantId}:${building.buildingId}`;
}

function fromBuildingKey(key: BuildingKey) {
  const [tenantId, buildingId] = key.split(":").map(Number);
  return { tenantId, buildingId };
}

export function GridManagement() {
  const { hasPermission } = useStore();
  const canManage = hasPermission("admin:user:assign-role");

  if (!canManage) {
    return (
      <div className="space-y-5 p-6">
        <PageHeader title="网格管理" desc="当前账号没有网格管理权限" />
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
      <PageHeader
        title="网格管理"
        desc="网格是组织节点，不是新角色；网格员统一使用 GRID_MEMBER 静态角色，具体 1 号/2 号网格与楼栋范围在这里维护。"
      />
      <GridScopePanel />
    </div>
  );
}

function GridScopePanel() {
  const [communityDeptOptions, setCommunityDeptOptions] = useState<WorkIdentityDeptOption[]>([]);
  const [gridDeptOptions, setGridDeptOptions] = useState<WorkIdentityDeptOption[]>([]);
  const [communityDeptId, setCommunityDeptId] = useState("");
  const [gridDeptId, setGridDeptId] = useState("");
  const [buildings, setBuildings] = useState<WorkIdentityBuilding[]>([]);
  const [selectedBuildingKeys, setSelectedBuildingKeys] = useState<Set<BuildingKey>>(new Set());
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
      toast.success("网格楼栋范围已更新");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "网格楼栋范围更新失败");
    } finally {
      setSavingScope(false);
    }
  }

  return (
    <div className="space-y-5">
      <SectionCard
        title="网格组织节点"
        desc="一键生成 1-5 号网格节点。此处只创建组织节点，不创建新角色。"
      >
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
            <div className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
              {selectedGridDept ? (
                <>
                  dept {selectedGridDept.deptId}
                  <StatusChip tone="tech">{DEPT_TYPE_LABEL[selectedGridDept.deptType] ?? selectedGridDept.deptType}</StatusChip>
                </>
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="网格楼栋范围"
        desc="网格范围是 GRID_MEMBER 的 OWNER_GROUP 数据底座；给自然人绑定网格员身份时只选择网格节点。"
        extra={
          <Button
            size="sm"
            disabled={gridDeptId === "" || selectedBuildingKeys.size === 0 || scopeLoading || savingScope}
            onClick={() => void saveGridScope()}
          >
            {savingScope ? <Loader2 className="size-4 mr-1 animate-spin" /> : <ShieldCheck className="size-4 mr-1" />}
            保存范围
          </Button>
        }
      >
        {scopeLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 inline size-4 animate-spin" /> 加载中
          </div>
        ) : buildings.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">当前网格节点暂无可选楼栋。</div>
        ) : (
          <div className="grid max-h-[420px] grid-cols-2 gap-2 overflow-auto md:grid-cols-4 xl:grid-cols-6">
            {buildings.map((building) => {
              const key = toBuildingKey(building);
              return (
              <label
                key={key ?? `missing:${building.buildingId}`}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Checkbox
                  checked={key != null && selectedBuildingKeys.has(key)}
                  onCheckedChange={(v) => toggleGridBuilding(building, Boolean(v))}
                />
                <Building2 className="size-3.5 text-muted-foreground" />
                <span className="min-w-0 truncate">
                  tenant {building.tenantId ?? "-"} · #{building.buildingId}
                </span>
              </label>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
