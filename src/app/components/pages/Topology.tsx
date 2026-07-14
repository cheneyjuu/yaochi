"use client";

// 关联业务：展示当前小区已录入的房屋产权基础名册结构，不预置任何楼栋或法定计票基数。

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  House,
  Info,
  Layers3,
  RefreshCw,
  Upload,
  Users,
} from "lucide-react";
import { KpiCard, PageHeader, SectionCard } from "../gov/common";
import { Button } from "../ui/button";
import { useStore } from "../../lib/store";
import {
  getPropertyRosterTopology,
  type PropertyRosterBuildingTopology,
  type PropertyRosterTopology,
  type PropertyRosterUnitTopology,
} from "../../lib/property-binding";

type SelectedNode =
  | { kind: "community" }
  | { kind: "building"; buildingId: number }
  | { kind: "unit"; buildingId: number; unitName: string };

function formatArea(area: number) {
  return area.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function TreeRow({
  label,
  icon,
  depth,
  meta,
  expanded,
  selected,
  hasChildren,
  onToggle,
  onSelect,
}: {
  label: string;
  icon: ReactNode;
  depth: number;
  meta?: string;
  expanded?: boolean;
  selected?: boolean;
  hasChildren?: boolean;
  onToggle?: () => void;
  onSelect: () => void;
}) {
  return (
    <div
      className="flex min-h-10 items-center gap-1.5 rounded-md px-2 py-2 transition-colors"
      style={{
        paddingLeft: `${8 + depth * 20}px`,
        backgroundColor: selected ? "#e8f0fb" : undefined,
        color: selected ? "#143c78" : undefined,
      }}
    >
      {hasChildren ? (
        <button
          type="button"
          className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          title={expanded ? "收起" : "展开"}
          aria-label={expanded ? `收起${label}` : `展开${label}`}
          onClick={onToggle}
        >
          {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
        </button>
      ) : (
        <span className="size-5 shrink-0" />
      )}
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        onClick={onSelect}
      >
        <span className="shrink-0" style={{ color: selected ? "#1b4f9c" : "#5a6677" }}>
          {icon}
        </span>
        <span className="flex-1 truncate text-sm font-medium">{label}</span>
        {meta && <span className="shrink-0 font-mono-num text-xs text-muted-foreground">{meta}</span>}
      </button>
    </div>
  );
}

function CommunityDetail({ topology }: { topology: PropertyRosterTopology }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{topology.communityName}</h2>
        <p className="text-sm text-muted-foreground">当前已录入的房屋产权基础名册</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard label="已录入房屋" value={topology.householdCount} unit="套" tone="primary" icon={<House className="size-4" />} />
        <KpiCard label="登记建筑面积" value={formatArea(topology.totalArea)} unit="㎡" tone="tech" icon={<Layers3 className="size-4" />} />
      </div>
      <div className="flex items-start gap-2 rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 text-xs text-[#2a4f8a]">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>以上数据仅反映当前已录入的基础名册，尚未发布为法定计票基数，不能用于投票计票或法定人数判断。</span>
      </div>
      <SectionCard title="楼栋汇总" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">楼栋</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">单元</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">房屋</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">登记建筑面积(㎡)</th>
              </tr>
            </thead>
            <tbody>
              {topology.buildings.map((building) => (
                <tr key={building.buildingId} className="border-b last:border-0">
                  <td className="px-4 py-2">{building.buildingName}</td>
                  <td className="px-4 py-2 text-right font-mono-num">{building.units.length}</td>
                  <td className="px-4 py-2 text-right font-mono-num">{building.householdCount}</td>
                  <td className="px-4 py-2 text-right font-mono-num">{formatArea(building.totalArea)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function BuildingDetail({ building }: { building: PropertyRosterBuildingTopology }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{building.buildingName}</h2>
        <p className="text-sm text-muted-foreground">{building.units.length} 个已录入单元</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard label="已录入房屋" value={building.householdCount} unit="套" tone="primary" icon={<House className="size-4" />} />
        <KpiCard label="登记建筑面积" value={formatArea(building.totalArea)} unit="㎡" tone="tech" icon={<Layers3 className="size-4" />} />
      </div>
      <SectionCard title="单元汇总" bodyClassName="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">单元</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">房屋</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">登记建筑面积(㎡)</th>
              </tr>
            </thead>
            <tbody>
              {building.units.map((unit) => (
                <tr key={unit.unitName} className="border-b last:border-0">
                  <td className="px-4 py-2">{unit.unitName}</td>
                  <td className="px-4 py-2 text-right font-mono-num">{unit.householdCount}</td>
                  <td className="px-4 py-2 text-right font-mono-num">{formatArea(unit.totalArea)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}

function UnitDetail({ building, unit }: { building: PropertyRosterBuildingTopology; unit: PropertyRosterUnitTopology }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{building.buildingName} · {unit.unitName}</h2>
        <p className="text-sm text-muted-foreground">已录入的房屋产权基础名册汇总</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiCard label="已录入房屋" value={unit.householdCount} unit="套" tone="primary" icon={<House className="size-4" />} />
        <KpiCard label="登记建筑面积" value={formatArea(unit.totalArea)} unit="㎡" tone="tech" icon={<Layers3 className="size-4" />} />
      </div>
      <div className="flex items-start gap-2 rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 text-xs text-[#2a4f8a]">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        <span>本页仅展示当前名册的录入汇总。房屋、产权关系和法定计票基数需要按各自流程核验和发布。</span>
      </div>
    </div>
  );
}

export function Topology() {
  const { setPage } = useStore();
  const [topology, setTopology] = useState<PropertyRosterTopology | null>(null);
  const [selected, setSelected] = useState<SelectedNode>({ kind: "community" });
  const [expandedBuildings, setExpandedBuildings] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTopology = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await getPropertyRosterTopology();
      setTopology(next);
      setExpandedBuildings(new Set(next.buildings.map((building) => building.buildingId)));
      setSelected({ kind: "community" });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "加载房屋基础名册失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTopology();
  }, [loadTopology]);

  function toggleBuilding(buildingId: number) {
    setExpandedBuildings((current) => {
      const next = new Set(current);
      if (next.has(buildingId)) next.delete(buildingId);
      else next.add(buildingId);
      return next;
    });
  }

  function renderDetail() {
    if (!topology) return null;
    if (selected.kind === "community") return <CommunityDetail topology={topology} />;

    const building = topology.buildings.find((item) => item.buildingId === selected.buildingId);
    if (!building) return <CommunityDetail topology={topology} />;
    if (selected.kind === "building") return <BuildingDetail building={building} />;

    const unit = building.units.find((item) => item.unitName === selected.unitName);
    return unit ? <UnitDetail building={building} unit={unit} /> : <BuildingDetail building={building} />;
  }

  const openImport = () => setPage("property-roster-import");

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="楼栋/单元结构"
        desc="展示当前已录入的房屋产权基础名册；新注册小区不会预置楼栋、单元或房屋。"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void loadTopology()} disabled={loading}>
              <RefreshCw className={`mr-1.5 size-4 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button size="sm" onClick={openImport}>
              <Upload className="mr-1.5 size-4" />
              导入或逐户登记
            </Button>
          </div>
        }
      />

      {loading && !topology ? (
        <SectionCard title="结构树">
          <div className="space-y-3 py-6">
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
            <div className="h-10 animate-pulse rounded bg-muted" />
          </div>
        </SectionCard>
      ) : error ? (
        <SectionCard title="楼栋/单元结构">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm font-medium">加载房屋基础名册失败</p>
            <p className="max-w-lg text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={() => void loadTopology()}>
              <RefreshCw className="mr-1.5 size-4" />
              重新加载
            </Button>
          </div>
        </SectionCard>
      ) : topology && topology.buildings.length === 0 ? (
        <SectionCard title="楼栋/单元结构">
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
              <Building2 className="size-7" />
            </span>
            <div className="space-y-1">
              <p className="text-base font-semibold">尚未录入楼栋和房屋</p>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                新注册小区默认不预置楼栋、单元或房屋。请由具备权限的管理端人员上传或逐户登记房屋产权基础名册。
              </p>
            </div>
            <div className="rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 text-left text-xs leading-5 text-[#2a4f8a]">
              当前名册用于基础信息管理；法定计票基数仍需独立核验、对账和发布。
            </div>
            <Button onClick={openImport}>
              <Upload className="mr-1.5 size-4" />
              导入或逐户登记名册
            </Button>
          </div>
        </SectionCard>
      ) : topology ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionCard title="结构树" bodyClassName="p-2">
              <TreeRow
                label={topology.communityName}
                icon={<Building2 className="size-4" />}
                depth={0}
                meta={`${topology.householdCount} 套`}
                selected={selected.kind === "community"}
                onSelect={() => setSelected({ kind: "community" })}
              />
              {topology.buildings.map((building) => (
                <div key={building.buildingId}>
                  <TreeRow
                    label={building.buildingName}
                    icon={<Layers3 className="size-4" />}
                    depth={1}
                    meta={`${building.householdCount} 套`}
                    expanded={expandedBuildings.has(building.buildingId)}
                    selected={selected.kind === "building" && selected.buildingId === building.buildingId}
                    hasChildren={building.units.length > 0}
                    onToggle={() => toggleBuilding(building.buildingId)}
                    onSelect={() => setSelected({ kind: "building", buildingId: building.buildingId })}
                  />
                  {expandedBuildings.has(building.buildingId) && building.units.map((unit) => (
                    <TreeRow
                      key={`${building.buildingId}-${unit.unitName}`}
                      label={unit.unitName}
                      icon={<Users className="size-3.5" />}
                      depth={2}
                      meta={`${unit.householdCount} 套`}
                      selected={selected.kind === "unit"
                        && selected.buildingId === building.buildingId
                        && selected.unitName === unit.unitName}
                      onSelect={() => setSelected({
                        kind: "unit",
                        buildingId: building.buildingId,
                        unitName: unit.unitName,
                      })}
                    />
                  ))}
                </div>
              ))}
            </SectionCard>
          </div>
          <div className="lg:col-span-8">
            <SectionCard title="节点详情">{renderDetail()}</SectionCard>
          </div>
        </div>
      ) : null}
    </div>
  );
}
