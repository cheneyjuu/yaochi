"use client";

import { useState } from "react";
import {
  PageHeader,
  KpiCard,
  SectionCard,
  StatusChip,
} from "../gov/common";
import { Button } from "../ui/button";
import {
  ChevronRight,
  ChevronDown,
  Building2,
  Layers,
  Users,
  SquareStack,
  Info,
  Plus,
  Pencil,
  Trash2,
  UserCheck,
  Grid2x2,
} from "lucide-react";

/* ─── 类型 ─── */
interface UnitNode {
  id: string;
  label: string;
  units: number;
  area: number;
  rep?: string;
  gridWorker?: string;
}

interface BuildingNode {
  id: string;
  label: string;
  floors: number;
  totalUnits: number;
  totalArea: number;
  units: UnitNode[];
  topics: number;
  rep?: string;
  gridWorker?: string;
}

interface CommunityNode {
  id: string;
  label: string;
  totalUnits: number;
  totalArea: number;
  buildings: BuildingNode[];
}

type TreeNode =
  | { kind: "community"; data: CommunityNode }
  | { kind: "building"; data: BuildingNode }
  | { kind: "unit"; data: UnitNode; building: BuildingNode };

/* ─── Mock 数据 ─── */
const COMMUNITY: CommunityNode = {
  id: "C001",
  label: "阳光花园小区",
  totalUnits: 468,
  totalArea: 46230.5,
  buildings: [
    {
      id: "B1",
      label: "1号楼",
      floors: 18,
      totalUnits: 72,
      totalArea: 7560.0,
      topics: 5,
      rep: "张伟",
      gridWorker: "王网格",
      units: [
        { id: "B1U1", label: "1单元", units: 36, area: 3780.0, rep: "张伟" },
        { id: "B1U2", label: "2单元", units: 36, area: 3780.0, rep: "李明" },
      ],
    },
    {
      id: "B2",
      label: "2号楼",
      floors: 18,
      totalUnits: 72,
      totalArea: 7344.0,
      topics: 3,
      rep: "孙浩然",
      gridWorker: "赵网格",
      units: [
        { id: "B2U1", label: "1单元", units: 24, area: 2448.0 },
        { id: "B2U2", label: "2单元", units: 24, area: 2448.0 },
        { id: "B2U3", label: "3单元", units: 24, area: 2448.0 },
      ],
    },
    {
      id: "B3",
      label: "3号楼",
      floors: 24,
      totalUnits: 96,
      totalArea: 9840.0,
      topics: 7,
      rep: "陈志强",
      gridWorker: "刘网格",
      units: [
        { id: "B3U1", label: "1单元", units: 48, area: 4920.0, rep: "陈志强" },
        { id: "B3U2", label: "2单元", units: 48, area: 4920.0 },
      ],
    },
    {
      id: "B4",
      label: "4号楼",
      floors: 18,
      totalUnits: 72,
      totalArea: 7344.0,
      topics: 2,
      rep: "吴光明",
      gridWorker: "周网格",
      units: [
        { id: "B4U1", label: "1单元", units: 24, area: 2448.0, rep: "吴光明" },
        { id: "B4U2", label: "2单元", units: 24, area: 2448.0 },
        { id: "B4U3", label: "3单元", units: 24, area: 2448.0 },
      ],
    },
    {
      id: "B5",
      label: "5号楼",
      floors: 12,
      totalUnits: 72,
      totalArea: 6912.0,
      topics: 4,
      rep: "赵雨欣",
      gridWorker: "钱网格",
      units: [
        { id: "B5U1", label: "1单元", units: 36, area: 3456.0, rep: "赵雨欣" },
        { id: "B5U2", label: "2单元", units: 36, area: 3456.0 },
      ],
    },
    {
      id: "B6",
      label: "6号楼",
      floors: 22,
      totalUnits: 84,
      totalArea: 7230.5,
      topics: 6,
      rep: "郑丽华",
      gridWorker: "孙网格",
      units: [
        { id: "B6U1", label: "1单元", units: 28, area: 2410.0, rep: "郑丽华" },
        { id: "B6U2", label: "2单元", units: 28, area: 2410.0 },
        { id: "B6U3", label: "3单元", units: 28, area: 2410.5 },
      ],
    },
  ],
};

/* ─── 树节点行 ─── */
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
  icon: React.ReactNode;
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
      className="flex items-center gap-1.5 px-2 py-2 rounded-md cursor-pointer transition-colors select-none"
      style={{
        paddingLeft: `${8 + depth * 20}px`,
        backgroundColor: selected ? "#e8f0fb" : undefined,
        color: selected ? "#143c78" : undefined,
      }}
      onClick={onSelect}
    >
      {hasChildren ? (
        <button
          className="shrink-0 text-muted-foreground hover:text-foreground"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>
      ) : (
        <span className="size-4 shrink-0" />
      )}
      <span className="shrink-0" style={{ color: selected ? "#1b4f9c" : "#5a6677" }}>
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium truncate">{label}</span>
      {meta && (
        <span className="text-xs text-muted-foreground shrink-0 font-mono-num">
          {meta}
        </span>
      )}
    </div>
  );
}

/* ─── 详情面板 ─── */
function DetailPanel({ node }: { node: TreeNode }) {
  if (node.kind === "community") {
    const c = node.data;
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{c.label}</h2>
          <p className="text-sm text-muted-foreground">小区根节点</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="总户数" value={c.totalUnits} unit="户" tone="primary" icon={<Users className="size-4" />} />
          <KpiCard label="总专有面积" value={c.totalArea.toFixed(0)} unit="㎡" tone="tech" icon={<SquareStack className="size-4" />} />
        </div>
        <div className="rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 flex items-start gap-2 text-xs text-[#2a4f8a]">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          <span>以上户数与面积为<strong>计票分母来源</strong>，依据《物业管理条例》第十二条，重大决议须达到总户数 2/3 且面积 2/3 双过半。</span>
        </div>
        <SectionCard title="楼栋概览" bodyClassName="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">楼栋</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">户数</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">面积(㎡)</th>
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">楼栋代表</th>
              </tr>
            </thead>
            <tbody>
              {c.buildings.map((b) => (
                <tr key={b.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{b.label}</td>
                  <td className="px-4 py-2 text-right font-mono-num">{b.totalUnits}</td>
                  <td className="px-4 py-2 text-right font-mono-num">{b.totalArea.toFixed(1)}</td>
                  <td className="px-4 py-2 text-muted-foreground">{b.rep ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      </div>
    );
  }

  if (node.kind === "building") {
    const b = node.data;
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{b.label}</h2>
            <p className="text-sm text-muted-foreground">{b.floors} 层 · {b.units.length} 个单元</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Pencil className="size-3.5 mr-1" />编辑</Button>
            <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
              <Trash2 className="size-3.5 mr-1" />删除
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="楼栋户数" value={b.totalUnits} unit="户" tone="primary" icon={<Users className="size-4" />} />
          <KpiCard label="总专有面积" value={b.totalArea.toFixed(0)} unit="㎡" tone="tech" icon={<SquareStack className="size-4" />} />
        </div>
        <div className="rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 flex items-start gap-2 text-xs text-[#2a4f8a]">
          <Info className="size-3.5 mt-0.5 shrink-0" />
          <span>本楼栋户数与面积是<strong>计票分母</strong>的组成部分，数据变更须经管理员审批。</span>
        </div>
        <SectionCard title="关联人员">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">楼栋代表</p>
              <div className="flex items-center gap-1.5">
                <UserCheck className="size-4 text-primary" />
                <span>{b.rep ?? "未指定"}</span>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">网格员</p>
              <div className="flex items-center gap-1.5">
                <Grid2x2 className="size-4 text-tech" />
                <span>{b.gridWorker ?? "未指定"}</span>
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="历史议题">
          <div className="flex items-center gap-2">
            <span className="font-mono-num text-2xl font-bold text-primary">{b.topics}</span>
            <span className="text-sm text-muted-foreground">条关联议题</span>
            <StatusChip tone={b.topics > 5 ? "warning" : "success"}>
              {b.topics > 5 ? "活跃" : "正常"}
            </StatusChip>
          </div>
        </SectionCard>
      </div>
    );
  }

  // unit
  const u = node.data;
  const b = node.building;
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold">{b.label} · {u.label}</h2>
          <p className="text-sm text-muted-foreground">楼栋单元节点</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Pencil className="size-3.5 mr-1" />编辑</Button>
          <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5">
            <Trash2 className="size-3.5 mr-1" />删除
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="单元户数" value={u.units} unit="户" tone="primary" icon={<Users className="size-4" />} />
        <KpiCard label="专有面积" value={u.area.toFixed(0)} unit="㎡" tone="tech" icon={<SquareStack className="size-4" />} />
      </div>
      <div className="rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 flex items-start gap-2 text-xs text-[#2a4f8a]">
        <Info className="size-3.5 mt-0.5 shrink-0" />
        <span>单元面积与户数是<strong>计票分母</strong>的最小颗粒度，修改前需提交变更申请。</span>
      </div>
      {u.rep && (
        <SectionCard title="单元代表">
          <div className="flex items-center gap-1.5 text-sm">
            <UserCheck className="size-4 text-primary" />
            <span>{u.rep}</span>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ─── 主页面 ─── */
export function Topology() {
  const [expandedBuildings, setExpandedBuildings] = useState<Set<string>>(
    new Set(["B1"])
  );
  const [selected, setSelected] = useState<TreeNode>({
    kind: "community",
    data: COMMUNITY,
  });

  function toggleBuilding(id: string) {
    setExpandedBuildings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function isSelected(kind: string, id: string) {
    if (kind === "community" && selected.kind === "community") return true;
    if (kind === "building" && selected.kind === "building")
      return selected.data.id === id;
    if (kind === "unit" && selected.kind === "unit")
      return selected.data.id === id;
    return false;
  }

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="楼栋/单元结构"
        desc="物理拓扑树 — 小区 → 楼栋 → 单元，户数与面积是计票分母的权威来源"
        actions={
          <Button size="sm">
            <Plus className="size-4 mr-1.5" />
            新增节点
          </Button>
        }
      />

      <div className="grid lg:grid-cols-12 gap-4">
        {/* 左侧树 */}
        <div className="lg:col-span-4">
          <SectionCard title="结构树" bodyClassName="p-2">
            {/* 小区根 */}
            <TreeRow
              label={COMMUNITY.label}
              icon={<Building2 className="size-4" />}
              depth={0}
              meta={`${COMMUNITY.totalUnits} 户`}
              expanded={true}
              selected={isSelected("community", COMMUNITY.id)}
              hasChildren
              onSelect={() =>
                setSelected({ kind: "community", data: COMMUNITY })
              }
            />

            {/* 楼栋 */}
            {COMMUNITY.buildings.map((building) => (
              <div key={building.id}>
                <TreeRow
                  label={building.label}
                  icon={<Layers className="size-4" />}
                  depth={1}
                  meta={`${building.totalUnits} 户`}
                  expanded={expandedBuildings.has(building.id)}
                  selected={isSelected("building", building.id)}
                  hasChildren
                  onToggle={() => toggleBuilding(building.id)}
                  onSelect={() =>
                    setSelected({ kind: "building", data: building })
                  }
                />

                {/* 单元 */}
                {expandedBuildings.has(building.id) &&
                  building.units.map((unit) => (
                    <TreeRow
                      key={unit.id}
                      label={unit.label}
                      icon={<Users className="size-3.5" />}
                      depth={2}
                      meta={`${unit.units} 户`}
                      selected={isSelected("unit", unit.id)}
                      onSelect={() =>
                        setSelected({
                          kind: "unit",
                          data: unit,
                          building,
                        })
                      }
                    />
                  ))}
              </div>
            ))}
          </SectionCard>
        </div>

        {/* 右侧详情 */}
        <div className="lg:col-span-8">
          <SectionCard title="节点详情">
            <DetailPanel node={selected} />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
