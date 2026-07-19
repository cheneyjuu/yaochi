// 关联业务：维护社区组织备案、建筑名册、计票基数、维修事项议事依据及公示提醒。
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronRight,
  Download,
  FileClock,
  History,
  Landmark,
  Layers,
  Loader2,
  MapPinned,
  RefreshCcw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { PageHeader, SectionCard, StatusChip, EmptyState } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Textarea } from "../ui/textarea";
import { useStore } from "../../lib/store";
import { PropertyManagementModeGovernance } from "./PropertyManagementModeGovernance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  getCommunitySettings,
  recalculateCommunityDenominator,
  submitDenominatorReview,
  updateCommunityAssetLedger,
  updateCommunityOrganization,
  type CommunityAssetLedger,
  type CommunityAuditLog,
  type CommunityOrganization,
  type CommunitySettingsResponse,
} from "../../lib/community-settings";
import { OwnersAssemblyRuleManagement } from "./OwnersAssemblyRuleManagement";

type TabKey = "organization" | "building" | "denominator" | "rules" | "propertyMode" | "changes";

interface BoundaryNode {
  id: string;
  label: string;
  type: "building" | "public" | "parking";
  mapX: number;
  mapZ: number;
  width: number;
  depth: number;
  height: number;
  unitCount: number;
  area: number;
}

function text(value: string | number | null | undefined): string {
  return value == null ? "" : String(value);
}

function numberOrUndefined(value: string): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function Field({
  label,
  value,
  disabled,
  type = "text",
  onChange,
}: {
  label: string;
  value: string | number | null | undefined;
  disabled?: boolean;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        value={text(value)}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="h-10"
      />
    </div>
  );
}

function booleanTone(value: boolean) {
  return value ? "success" : "warning";
}

function governanceStatusMeta(value: string) {
  switch (value) {
    case "NORMAL":
      return { label: "正常运行", chip: "正常", tone: "success" as const };
    case "HANDOVER_LOCK":
      return { label: "业委会换届交接中", chip: "部分操作暂缓", tone: "warning" as const };
    case "FINANCIAL_LOCKED":
      return { label: "资金事项办理暂缓", chip: "部分操作暂缓", tone: "warning" as const };
    default:
      return { label: "状态待核对", chip: "请核对", tone: "warning" as const };
  }
}

function displayTime(value: string | null | undefined) {
  if (!value) return "未记录";
  return value.replace("T", " ").slice(0, 16);
}

function auditSectionMeta(sectionCode: CommunityAuditLog["sectionCode"]) {
  switch (sectionCode) {
    case "ORGANIZATION":
      return { label: "组织备案", tone: "info" as const };
    case "BUILDING":
      return { label: "建筑名册", tone: "tech" as const };
    case "DENOMINATOR":
      return { label: "计票基数", tone: "warning" as const };
    case "RULES":
      return { label: "维修筹备要求", tone: "success" as const };
    default:
      return { label: "其他设置", tone: "neutral" as const };
  }
}

function auditActor(log: CommunityAuditLog) {
  const name = log.operatorName || "未知操作人";
  const role = log.operatorRoleName || log.operatorRoleKey;
  return role ? `${name} · ${role}` : name;
}

function formatArea(value: string | number | null | undefined) {
  const n = Number(value ?? 0);
  return n.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function buildBoundaryNodes(asset: CommunityAssetLedger): BoundaryNode[] {
  const directory = asset.buildings.slice(0, 12);
  const buildingCount = Math.max(1, directory.length || asset.liveLedgerStats.buildingCount || 1);
  const unitBase = Math.max(1, Math.floor((asset.registeredPropertyUnitCount || asset.liveLedgerStats.unitCount || buildingCount) / buildingCount));
  const totalArea = Number(asset.registeredVotingTotalArea || asset.liveLedgerStats.totalArea || 0);
  const columns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(buildingCount))));
  const rows = Math.ceil(buildingCount / columns);
  const gapX = 2.05;
  const gapZ = 1.7;
  const originX = -((columns - 1) * gapX) / 2;
  const originZ = -((rows - 1) * gapZ) / 2;
  const averageArea = buildingCount > 0 ? totalArea / buildingCount : 0;
  const nodes: BoundaryNode[] = Array.from({ length: buildingCount }, (_, index) => {
    const building = directory[index];
    const col = index % columns;
    const row = Math.floor(index / columns);
    const height = Math.max(0.72, Math.min(2.45, averageArea > 0 ? Math.sqrt(averageArea) / 145 : 1.1));
    return {
      id: building ? `building-${building.buildingId}` : `building-${index + 1}`,
      label: building?.buildingName ?? `${index + 1}号楼`,
      type: "building" as const,
      mapX: originX + col * gapX,
      mapZ: originZ + row * gapZ,
      width: 1.18,
      depth: rows > 2 ? 0.95 : 1.1,
      height,
      unitCount: building?.unitCount
        ?? unitBase + (index < (asset.registeredPropertyUnitCount % buildingCount) ? 1 : 0),
      area: buildingCount > 0 ? totalArea / buildingCount : 0,
    };
  });
  const serviceZ = originZ + rows * gapZ + 0.6;
  if (Number(asset.publicArea) > 0) {
    nodes.push({
      id: "public-space",
      label: "公共服务空间",
      type: "public",
      mapX: -1.2,
      mapZ: serviceZ,
      width: 2.25,
      depth: 0.9,
      height: 0.08,
      unitCount: 0,
      area: Number(asset.publicArea),
    });
  }
  if (Number(asset.excludedParkingArea) > 0 || asset.parkingSpaceCount > 0) {
    nodes.push({
      id: "parking",
      label: "地下车位",
      type: "parking",
      mapX: 1.35,
      mapZ: serviceZ,
      width: 2.25,
      depth: 0.9,
      height: 0.16,
      unitCount: asset.parkingSpaceCount,
      area: Number(asset.excludedParkingArea),
    });
  }
  return nodes;
}

export function CommunitySettings() {
  const { hasPermission } = useStore();
  const [activeTab, setActiveTab] = useState<TabKey>("organization");
  const [data, setData] = useState<CommunitySettingsResponse | null>(null);
  const [organizationDraft, setOrganizationDraft] = useState<CommunityOrganization | null>(null);
  const [assetDraft, setAssetDraft] = useState<CommunityAssetLedger | null>(null);
  const [reviewReason, setReviewReason] = useState("");
  const [selectedAuditLog, setSelectedAuditLog] = useState<CommunityAuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const next = await getCommunitySettings();
      setData(next);
      setOrganizationDraft(next.organization);
      setAssetDraft(next.assetLedger);
      if (!next.organization && activeTab === "organization") setActiveTab("building");
      if (!next.rules && activeTab === "rules") setActiveTab("building");
    } catch (e) {
      setError(e instanceof Error ? e.message : "社区设置加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const visibleTabs = useMemo(() => {
    const tabs: { key: TabKey; label: string; mobileLabel: string }[] = [];
    if (data?.organization) tabs.push({ key: "organization", label: "组织备案", mobileLabel: "备案" });
    tabs.push({ key: "building", label: "建筑名册", mobileLabel: "名册" });
    tabs.push({ key: "denominator", label: "法定计票基数", mobileLabel: "计票基数" });
    if (data?.rules) tabs.push({ key: "rules", label: "议事与公示规则", mobileLabel: "议事规则" });
    if (hasPermission("property:management-mode:read")) {
      tabs.push({ key: "propertyMode", label: "物业管理模式", mobileLabel: "管理模式" });
    }
    tabs.push({ key: "changes", label: "变更记录", mobileLabel: "变更记录" });
    return tabs;
  }, [data, hasPermission]);

  async function saveOrganization() {
    if (!organizationDraft) return;
    setSaving("organization");
    try {
      const next = await updateCommunityOrganization(organizationDraft);
      setData(next);
      setOrganizationDraft(next.organization);
      toast.success("组织备案已保存");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(null);
    }
  }

  async function saveAssetLedger() {
    if (!assetDraft) return;
    setSaving("asset");
    try {
      const developerAccountId = data?.permissions.government
        ? numberOrUndefined(assetDraft.developerAccountId ?? "")
        : undefined;
      const next = await updateCommunityAssetLedger({
        propertyAreaName: assetDraft.propertyAreaName,
        propertyAreaCode: assetDraft.propertyAreaCode,
        developerName: assetDraft.developerName,
        developerAccountId,
        plannedHouseholdCount: assetDraft.plannedHouseholdCount,
        deliveredHouseholdCount: assetDraft.deliveredHouseholdCount,
        registeredPropertyUnitCount: assetDraft.registeredPropertyUnitCount,
        totalPlannedBuildingArea: assetDraft.totalPlannedBuildingArea,
        totalExclusiveArea: assetDraft.totalExclusiveArea,
        registeredVotingTotalArea: assetDraft.registeredVotingTotalArea,
        excludedParkingArea: assetDraft.excludedParkingArea,
        publicArea: assetDraft.publicArea,
        buildingCount: assetDraft.buildingCount,
        unitCount: assetDraft.unitCount,
        parkingSpaceCount: assetDraft.parkingSpaceCount,
        plotRatio: assetDraft.plotRatio,
      });
      setData(next);
      setAssetDraft(next.assetLedger);
      toast.success("规划指标已保存");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(null);
    }
  }

  async function recalculate() {
    setSaving("recalculate");
    try {
      const next = await recalculateCommunityDenominator();
      setData(next);
      setAssetDraft(next.assetLedger);
      toast.success("计票基数已重新校对");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "校对失败");
    } finally {
      setSaving(null);
    }
  }

  async function submitReview() {
    if (!reviewReason.trim()) {
      toast.error("请填写复核原因");
      return;
    }
    setSaving("review");
    try {
      const next = await submitDenominatorReview({
        requestedTotalArea: data?.assetLedger.liveLedgerStats.totalArea,
        requestedOwnerCount: data?.assetLedger.liveLedgerStats.ownerCount,
        requestedUnitCount: data?.assetLedger.liveLedgerStats.unitCount,
        reason: reviewReason.trim(),
      });
      setData(next);
      setReviewReason("");
      toast.success("计票基数复核申请已提交");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "提交失败");
    } finally {
      setSaving(null);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[360px] place-items-center">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="社区设置暂不可用"
        desc={error ?? "没有读取到社区法权配置。"}
      />
    );
  }

  const permissions = data.permissions;
  const asset = assetDraft ?? data.assetLedger;
  const org = organizationDraft;
  const rules = data.rules;
  const liveAreaGap = Math.abs(Number(data.assetLedger.liveLedgerStats.totalArea) - Number(data.denominator.legalTotalExclusiveArea));
  const governanceStatus = governanceStatusMeta(data.header.governanceStatus);

  function exportDenominatorReport() {
    const report = {
      exportedAt: new Date().toISOString(),
      tenant: data.header,
      legalDenominator: data.denominator,
      liveLedgerStats: data.assetLedger.liveLedgerStats,
      breakdown: data.denominator.breakdown,
      auditLogs: data.auditLogs,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `community-denominator-${data.header.tenantId}-v${data.denominator.statisticsVersion}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="小区基础资料与议事规则"
        desc={`小区编号：${data.header.tenantCode} · 计票基数：第 ${data.header.statisticsVersion} 版 · 最后更新：${displayTime(data.header.lastUpdatedAt)}`}
        actions={
          <Button variant="outline" onClick={load}>
            <RefreshCcw className="size-4 mr-2" />
            刷新
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <SectionCard bodyClassName="p-4" className="md:col-span-2">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-md bg-blue-50 text-primary">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">治理状态</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-base font-semibold">{governanceStatus.label}</span>
                <StatusChip tone={governanceStatus.tone} dot>{governanceStatus.chip}</StatusChip>
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard bodyClassName="p-4">
          <p className="text-sm text-muted-foreground">法定专有面积</p>
          <p className="mt-2 text-xl font-semibold text-primary">{data.denominator.legalTotalExclusiveArea} ㎡</p>
        </SectionCard>
        <SectionCard bodyClassName="p-4">
          <p className="text-sm text-muted-foreground">登记投票业主</p>
          <p className="mt-2 text-xl font-semibold text-primary">{data.denominator.registeredVotingOwnerCount} 人</p>
        </SectionCard>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabKey)} className="gap-4">
        <div className="overflow-x-auto">
          <TabsList className="w-full min-w-max rounded-md sm:w-auto">
            {visibleTabs.map((tab) => (
              <TabsTrigger key={tab.key} value={tab.key} className="rounded-md px-2 sm:px-4">
                <span className="sm:hidden">{tab.mobileLabel}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="organization" className="space-y-4">
          {org && (
            <SectionCard
              title="行政区划与组织备案"
              desc="社区行政归属、备案主体与过渡期管理组织。"
              extra={permissions.canEditOfficialData ? (
                <Button onClick={saveOrganization} disabled={saving === "organization"}>
                  <Save className="size-4 mr-2" />
                  保存组织备案
                </Button>
              ) : <StatusChip tone="warning">只读</StatusChip>}
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <Field label="省份代码" value={org.provinceCode} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, provinceCode: v })} />
                <Field label="省份名称" value={org.provinceName} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, provinceName: v })} />
                <Field label="城市代码" value={org.cityCode} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, cityCode: v })} />
                <Field label="城市名称" value={org.cityName} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, cityName: v })} />
                <Field label="区县代码" value={org.districtCode} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, districtCode: v })} />
                <Field label="区县名称" value={org.districtName} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, districtName: v })} />
                <Field label="街道代码" value={org.streetCode} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, streetCode: v })} />
                <Field label="街道名称" value={org.streetName} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, streetName: v })} />
                <Field label="社区代码" value={org.communityCode} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, communityCode: v })} />
                <Field label="社区名称" value={org.communityName} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, communityName: v })} />
                <div className="md:col-span-2">
                  <Field label="物业地址" value={org.address} disabled={!permissions.canEditOfficialData} onChange={(v) => setOrganizationDraft((d) => d && { ...d, address: v })} />
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <SwitchRow label="业主大会备案" checked={org.ownersAssemblyEstablished} disabled={!permissions.canEditOfficialData} onCheckedChange={(v) => setOrganizationDraft((d) => d && { ...d, ownersAssemblyEstablished: v })} />
                <SwitchRow label="业主委员会备案" checked={org.committeeEstablished} disabled={!permissions.canEditOfficialData} onCheckedChange={(v) => setOrganizationDraft((d) => d && { ...d, committeeEstablished: v })} />
                <div className="rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">过渡期管理组织</p>
                  <p className="mt-1 font-semibold">{org.transitionOrgType || "未配置"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{org.transitionOrgStatus || "未记录状态"}</p>
                </div>
              </div>
            </SectionCard>
          )}

        </TabsContent>

        <TabsContent value="building" className="space-y-4">
          <SectionCard
            title="物业区域与规划指标"
            desc="维护物业区域和规划口径；维修工单可选楼栋以有效房屋名册为准。"
            extra={permissions.canEditAssetLedger ? (
              <Button onClick={saveAssetLedger} disabled={saving === "asset"}>
                <Save className="size-4 mr-2" />
                保存规划指标
              </Button>
            ) : <StatusChip tone="warning">只读</StatusChip>}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Field label="物业区域名称" value={asset.propertyAreaName} disabled={!permissions.government} onChange={(v) => setAssetDraft((d) => d && { ...d, propertyAreaName: v })} />
              <Field label="物业区域编码" value={asset.propertyAreaCode} disabled={!permissions.government} onChange={(v) => setAssetDraft((d) => d && { ...d, propertyAreaCode: v })} />
              <Field label="建设单位" value={asset.developerName} disabled={!permissions.government} onChange={(v) => setAssetDraft((d) => d && { ...d, developerName: v })} />
              <Field label="法人账号" value={asset.developerAccountId} disabled={!permissions.government} onChange={(v) => setAssetDraft((d) => d && { ...d, developerAccountId: v })} />
              <Field label="规划户数" type="number" value={asset.plannedHouseholdCount} disabled={!permissions.canEditAssetLedger} onChange={(v) => setAssetDraft((d) => d && { ...d, plannedHouseholdCount: Number(v) })} />
              <Field label="已交付户数" type="number" value={asset.deliveredHouseholdCount} disabled={!permissions.canEditAssetLedger} onChange={(v) => setAssetDraft((d) => d && { ...d, deliveredHouseholdCount: Number(v) })} />
              <Field label="登记单元数" type="number" value={asset.registeredPropertyUnitCount} disabled={!permissions.canEditAssetLedger} onChange={(v) => setAssetDraft((d) => d && { ...d, registeredPropertyUnitCount: Number(v) })} />
              <Field label="投票权业主数" value={asset.registeredVotingOwnerCount} disabled onChange={() => undefined} />
              <Field label="规划建筑面积" value={asset.totalPlannedBuildingArea} disabled={!permissions.canEditAssetLedger} onChange={(v) => setAssetDraft((d) => d && { ...d, totalPlannedBuildingArea: v })} />
              <Field label="法定专有面积" value={asset.totalExclusiveArea} disabled={!permissions.canEditLegalArea} onChange={(v) => setAssetDraft((d) => d && { ...d, totalExclusiveArea: v })} />
              <Field label="登记可计票面积" value={asset.registeredVotingTotalArea} disabled={!permissions.canEditLegalArea} onChange={(v) => setAssetDraft((d) => d && { ...d, registeredVotingTotalArea: v })} />
              <Field label="应扣除车位面积" value={asset.excludedParkingArea} disabled={!permissions.canEditLegalArea} onChange={(v) => setAssetDraft((d) => d && { ...d, excludedParkingArea: v })} />
              <Field label="公共服务空间面积" value={asset.publicArea} disabled={!permissions.canEditLegalArea} onChange={(v) => setAssetDraft((d) => d && { ...d, publicArea: v })} />
              <Field label="规划楼栋数" type="number" value={asset.buildingCount} disabled={!permissions.canEditAssetLedger} onChange={(v) => setAssetDraft((d) => d && { ...d, buildingCount: Number(v) })} />
              <Field label="规划单元数" type="number" value={asset.unitCount} disabled={!permissions.canEditAssetLedger} onChange={(v) => setAssetDraft((d) => d && { ...d, unitCount: Number(v) })} />
              <Field label="车位数量" type="number" value={asset.parkingSpaceCount} disabled={!permissions.canEditAssetLedger} onChange={(v) => setAssetDraft((d) => d && { ...d, parkingSpaceCount: Number(v) })} />
            </div>
          </SectionCard>

          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="实时台账面积" value={`${asset.liveLedgerStats.totalArea} ㎡`} />
            <Metric label="实时业主数" value={`${asset.liveLedgerStats.ownerCount} 人`} />
            <Metric label="实时房屋单元" value={`${asset.liveLedgerStats.unitCount} 套`} />
            <Metric label="在册楼栋" value={`${asset.liveLedgerStats.buildingCount} 栋`} />
          </div>

          <SectionCard
            title="在册楼栋目录"
            desc="来源于有效房屋名册，与维修工单登记时的楼栋选项保持一致。"
            extra={<StatusChip tone="info">共 {asset.buildings.length} 栋</StatusChip>}
          >
            {asset.buildings.length === 0 ? (
              <EmptyState title="暂无在册楼栋" desc="请先通过小区空间名册导入有效房屋数据。" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-y bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">楼栋名称</th>
                      <th className="px-3 py-2 font-medium">楼栋编号</th>
                      <th className="px-3 py-2 font-medium">单元数</th>
                      <th className="px-3 py-2 font-medium">房屋数</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asset.buildings.map((building) => (
                      <tr key={building.buildingId} className="border-b last:border-b-0">
                        <td className="px-3 py-3 font-medium">{building.buildingName}</td>
                        <td className="px-3 py-3 font-mono text-muted-foreground">{building.buildingId}</td>
                        <td className="px-3 py-3">{building.unitCount}</td>
                        <td className="px-3 py-3">{building.roomCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="交互式物权边界图"
            desc="按当前物业区域、楼栋名册、车位与公共空间基数生成可旋转的 3D 边界地图。"
            extra={<BoundaryViewerDialog data={data} asset={asset} />}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="物业区域编码" value={asset.propertyAreaCode || "-"} />
              <Metric label="在册楼栋" value={`${asset.buildings.length} 栋`} />
              <Metric label="在册单元" value={`${asset.buildings.reduce((sum, building) => sum + building.unitCount, 0)} 个`} />
              <Metric label="车位数量" value={`${asset.parkingSpaceCount} 个`} />
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="denominator" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <SectionCard
              title="法定计票基数底座"
              desc="投票进行时仍以议题快照为准；这里维护的是当前租户最新基数版本。"
              extra={<StatusChip tone="info">第 {data.denominator.statisticsVersion} 版</StatusChip>}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      {["资产类型", "登记单元", "投票业主", "建筑面积", "基数占比", "操作状态"].map((head) => (
                        <th key={head} className="px-3 py-2 font-medium">{head}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.denominator.breakdown.map((row) => (
                      <tr key={row.assetType} className="border-b">
                        <td className="px-3 py-3 font-semibold">{row.assetType}</td>
                        <td className="px-3 py-3">{row.registeredUnitCount}</td>
                        <td className="px-3 py-3">{row.votingOwnerCount}</td>
                        <td className="px-3 py-3">{row.buildingArea} ㎡</td>
                        <td className="px-3 py-3">{row.baseRatio}%</td>
                        <td className="px-3 py-3">
                          <StatusChip tone={row.operationStatus === "正常纳入" ? "success" : "danger"}>{row.operationStatus}</StatusChip>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard title="基数复核控制" desc={`最后校对：${displayTime(data.header.statisticsUpdatedAt)}`}>
              <div className="space-y-3">
                {data.denominator.pendingReviewRequests.length > 0 ? (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                    <div className="flex items-center gap-2 text-amber-900">
                      <AlertTriangle className="size-4" />
                      <span className="font-semibold">待复核申请</span>
                    </div>
                    <p className="mt-2 text-sm text-amber-900">{data.denominator.pendingReviewRequests[0].reason}</p>
                  </div>
                ) : (
                  <div className="rounded-md border p-3 text-sm text-muted-foreground">暂无待复核申请</div>
                )}
                {permissions.canReconcileDenominator && (
                  <Button className="w-full" onClick={recalculate} disabled={saving === "recalculate"}>
                    <RefreshCcw className="size-4 mr-2" />
                    重新对账校对基数
                  </Button>
                )}
                {permissions.canRequestDenominatorReview && (
                  <div className="space-y-2">
                    <Input placeholder="填写基数复核原因" value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} />
                    <Button variant="outline" className="w-full" onClick={submitReview} disabled={saving === "review"}>
                      提交复核申请
                    </Button>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>

          <SectionCard
            title="实时名册动态参考"
            desc="实时聚合业主房产台账，与当前发布的法定基数版本并列展示。"
            extra={
              <Button variant="outline" onClick={exportDenominatorReport}>
                <Download className="size-4 mr-2" />
                导出审计报告
              </Button>
            }
          >
            {liveAreaGap > 0.01 && (
              <div className="mb-4 flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <span>
                  实时名册面积与当前法定基数版本相差 {formatArea(liveAreaGap)} ㎡，需经复核后才会发布为新版本。
                </span>
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="实时名册面积" value={`${data.assetLedger.liveLedgerStats.totalArea} ㎡`} />
              <Metric label="实时投票权业主" value={`${data.assetLedger.liveLedgerStats.ownerCount} 人`} />
              <Metric label="实时登记单元" value={`${data.assetLedger.liveLedgerStats.unitCount} 套`} />
              <Metric label="实时楼栋覆盖" value={`${data.assetLedger.liveLedgerStats.buildingCount} 栋`} />
            </div>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    {["资产类型", "登记单元数", "具有投票权业主", "建筑面积", "基数占比", "操作状态"].map((head) => (
                      <th key={head} className="px-3 py-2 font-medium">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.denominator.breakdown.map((row) => (
                    <tr key={`live-${row.assetType}`} className="border-b">
                      <td className="px-3 py-3 font-semibold">{row.assetType}</td>
                      <td className="px-3 py-3">{row.registeredUnitCount}</td>
                      <td className="px-3 py-3">{row.votingOwnerCount}</td>
                      <td className="px-3 py-3">{row.buildingArea} ㎡</td>
                      <td className="px-3 py-3">{row.baseRatio}%</td>
                      <td className="px-3 py-3">
                        <StatusChip tone={row.operationStatus === "正常纳入" ? "success" : "danger"}>
                          {row.operationStatus}
                        </StatusChip>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/60 font-semibold text-primary">
                    <td className="px-3 py-3">统计汇总</td>
                    <td className="px-3 py-3">{data.assetLedger.liveLedgerStats.unitCount} 套</td>
                    <td className="px-3 py-3">{data.assetLedger.liveLedgerStats.ownerCount} 人</td>
                    <td className="px-3 py-3">{data.assetLedger.liveLedgerStats.totalArea} ㎡</td>
                    <td className="px-3 py-3">100.00%</td>
                    <td className="px-3 py-3">实时参考</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <OwnersAssemblyRuleManagement />

          {rules && (
            <SectionCard
              title="公共收益公示提醒"
              desc="按上海市现行规定提示季度公示日期；实际是否完成公示，以财务监督中的发布记录为准。"
              extra={<StatusChip tone="info">法定期限</StatusChip>}
            >
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-muted-foreground">公示要求</dt><dd className="mt-1 font-medium">每季度第一个月 15 日前</dd></div>
                <div><dt className="text-muted-foreground">下一次期限</dt><dd className="mt-1 font-medium">{rules.nextPublicIncomeDisclosureDeadline}</dd></div>
                <div><dt className="text-muted-foreground">剩余时间</dt><dd className="mt-1 font-medium">{rules.daysUntilDisclosureDeadline} 天</dd></div>
              </dl>
            </SectionCard>
          )}
        </TabsContent>

        <TabsContent value="propertyMode" className="space-y-4">
          <PropertyManagementModeGovernance />
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <SectionCard
            title="社区设置变更记录"
            desc="记录组织备案、建筑名册、计票基数和维修筹备要求的变更，供追溯与复核。"
            extra={<StatusChip tone="neutral">最近 {data.auditLogs.length} 条</StatusChip>}
          >
            {data.auditLogs.length === 0 ? (
              <EmptyState title="暂无变更记录" />
            ) : (
              <div className="divide-y overflow-hidden rounded-md border">
                {data.auditLogs.map((log) => {
                  const section = auditSectionMeta(log.sectionCode);
                  return (
                    <button
                      key={log.auditId}
                      type="button"
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                      onClick={() => setSelectedAuditLog(log)}
                      aria-label={`查看${log.operationLabel}详情`}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                        <FileClock className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <StatusChip tone={section.tone}>{section.label}</StatusChip>
                          <span className="font-medium text-foreground">{log.summary || log.operationLabel}</span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {auditActor(log)}
                          {log.operatorAccountId ? ` · 账号 ${log.operatorAccountId}` : ""}
                          {` · ${displayTime(log.createTime)}`}
                        </span>
                      </span>
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <Dialog open={selectedAuditLog !== null} onOpenChange={(open) => !open && setSelectedAuditLog(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          {selectedAuditLog && (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <History className="size-5 text-primary" />
                  {selectedAuditLog.operationLabel}
                </DialogTitle>
                <DialogDescription>{selectedAuditLog.summary}</DialogDescription>
              </DialogHeader>

              <div className="grid gap-3 rounded-md border bg-muted/20 p-3 text-sm sm:grid-cols-2">
                <AuditMeta label="配置分区" value={auditSectionMeta(selectedAuditLog.sectionCode).label} />
                <AuditMeta label="操作时间" value={displayTime(selectedAuditLog.createTime)} />
                <AuditMeta label="操作人" value={auditActor(selectedAuditLog)} />
                <AuditMeta
                  label="操作账号"
                  value={selectedAuditLog.operatorAccountId ? String(selectedAuditLog.operatorAccountId) : "未记录"}
                />
              </div>

              {selectedAuditLog.reason && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <div className="text-xs font-medium text-amber-800">操作原因 / 复核意见</div>
                  <div className="mt-1 text-sm leading-6 text-amber-950">{selectedAuditLog.reason}</div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-semibold">变更内容</div>
                {selectedAuditLog.changes.length === 0 ? (
                  <div className="rounded-md border px-3 py-4 text-sm text-muted-foreground">
                    该历史记录仅保存了操作事件，未保存可展示的字段差异。
                  </div>
                ) : (
                  <div className="divide-y overflow-hidden rounded-md border">
                    {selectedAuditLog.changes.map((change) => (
                      <div key={`${change.fieldCode}-${change.afterValue}`} className="grid gap-2 px-3 py-3 text-sm sm:grid-cols-[160px_1fr_1fr] sm:gap-3">
                        <div className="font-medium text-foreground">{change.fieldLabel}</div>
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">变更前</div>
                          <div className="mt-1 break-words text-foreground">
                            {change.beforeValue ?? "历史记录未保存"}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs text-muted-foreground">变更后</div>
                          <div className="mt-1 break-words font-medium text-primary">
                            {change.afterValue ?? "未填写"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AuditMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium text-foreground">{value}</div>
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  disabled,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-2">
        {checked ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Landmark className="size-4 text-muted-foreground" />}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <StatusChip tone={booleanTone(checked)}>{checked ? "已备案" : "未备案"}</StatusChip>
        <Switch checked={checked} disabled={disabled} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <SectionCard bodyClassName="p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-md bg-muted text-muted-foreground">
          {label.includes("楼栋") ? <Building2 className="size-4" /> : <MapPinned className="size-4" />}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 break-words text-lg font-semibold">{value}</p>
        </div>
      </div>
    </SectionCard>
  );
}

function BoundaryViewerDialog({
  data,
  asset,
}: {
  data: CommunitySettingsResponse;
  asset: CommunityAssetLedger;
}) {
  const nodes = useMemo(() => buildBoundaryNodes(asset), [asset]);
  const [selectedId, setSelectedId] = useState(nodes[0]?.id ?? "");
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MapPinned className="size-4 mr-2" />
          打开 3D 地图
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>交互式物权边界图</DialogTitle>
          <DialogDescription>
            {asset.propertyAreaName || data.header.tenantName} · {asset.propertyAreaCode || data.header.tenantCode} · 3D 台账地图
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="overflow-hidden rounded-lg border bg-slate-50">
            <ThreeBoundaryMap nodes={nodes} selectedId={selected?.id ?? ""} onSelect={setSelectedId} />
          </div>

          <div className="space-y-3">
            <div className="rounded-lg border p-4">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-primary" />
                <span className="font-semibold">当前选中边界</span>
              </div>
              <p className="mt-3 text-lg font-semibold">{selected?.label ?? "无边界节点"}</p>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">节点类型</dt>
                  <dd className="mt-1 font-medium">{selected?.type === "parking" ? "车位/地下空间" : selected?.type === "public" ? "公共服务空间" : "楼栋"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">单元数量</dt>
                  <dd className="mt-1 font-medium">{selected?.unitCount ?? 0}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">计入面积</dt>
                  <dd className="mt-1 font-medium">{formatArea(selected?.area ?? 0)} ㎡</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-lg border p-4">
              <p className="font-semibold">边界总览</p>
              <div className="mt-3 grid gap-2 text-sm">
                <BoundaryLine label="法定专有面积" value={`${formatArea(asset.totalExclusiveArea)} ㎡`} />
                <BoundaryLine label="登记可计票面积" value={`${formatArea(asset.registeredVotingTotalArea)} ㎡`} />
                <BoundaryLine label="在册楼栋" value={`${asset.buildings.length} 栋`} />
                <BoundaryLine label="车位数量" value={`${asset.parkingSpaceCount} 个`} />
              </div>
            </div>

            <div className="grid gap-2">
              {nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedId(node.id)}
                  className={[
                    "flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm",
                    selected?.id === node.id ? "border-primary bg-blue-50 text-primary" : "hover:bg-muted",
                  ].join(" ")}
                >
                  <span className="font-medium">{node.label}</span>
                  <span className="text-xs text-muted-foreground">{formatArea(node.area)} ㎡</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ThreeBoundaryMap({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: BoundaryNode[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0xf8fafc, 1);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf8fafc, 13, 26);

    const camera = new THREE.PerspectiveCamera(43, 1, 0.1, 100);
    camera.position.set(5.4, 5.5, 7.2);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 5.2;
    controls.maxDistance = 13;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 0.45, 0.4);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xdbeafe, 1.9));
    const sun = new THREE.DirectionalLight(0xffffff, 2.25);
    sun.position.set(5, 8, 4);
    scene.add(sun);

    const maxX = Math.max(4, ...nodes.map((node) => Math.abs(node.mapX) + node.width / 2 + 1.15));
    const maxZ = Math.max(3.2, ...nodes.map((node) => Math.abs(node.mapZ) + node.depth / 2 + 1.1));
    const baseWidth = maxX * 2;
    const baseDepth = maxZ * 2;

    const base = new THREE.Mesh(
      new THREE.PlaneGeometry(baseWidth, baseDepth),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.86 })
    );
    base.rotation.x = -Math.PI / 2;
    base.position.y = -0.02;
    scene.add(base);

    const grid = new THREE.GridHelper(Math.max(baseWidth, baseDepth), 12, 0x94a3b8, 0xe2e8f0);
    grid.position.y = 0.01;
    scene.add(grid);

    const boundary = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-maxX, 0.04, -maxZ),
        new THREE.Vector3(maxX, 0.04, -maxZ),
        new THREE.Vector3(maxX, 0.04, maxZ),
        new THREE.Vector3(-maxX, 0.04, maxZ),
      ]),
      new THREE.LineBasicMaterial({ color: 0x0f4c81, linewidth: 2 })
    );
    scene.add(boundary);

    const selectable: THREE.Object3D[] = [];
    let selectedMesh: THREE.Mesh | null = null;

    nodes.forEach((node) => {
      const isSelected = node.id === selectedId;
      const color = node.type === "parking" ? 0xf59e0b : node.type === "public" ? 0x10b981 : 0x60a5fa;
      const selectedColor = node.type === "parking" ? 0xd97706 : node.type === "public" ? 0x059669 : 0x0f4c81;
      const material = new THREE.MeshStandardMaterial({
        color: isSelected ? selectedColor : color,
        roughness: node.type === "building" ? 0.48 : 0.72,
        metalness: node.type === "parking" ? 0.12 : 0.03,
        emissive: isSelected ? new THREE.Color(selectedColor) : new THREE.Color(0x000000),
        emissiveIntensity: isSelected ? 0.12 : 0,
      });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(node.width, node.height, node.depth), material);
      mesh.position.set(node.mapX, node.height / 2, node.mapZ);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.boundaryId = node.id;
      scene.add(mesh);
      selectable.push(mesh);
      if (isSelected) selectedMesh = mesh;

      const edge = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry),
        new THREE.LineBasicMaterial({ color: isSelected ? 0xffffff : 0x334155 })
      );
      edge.position.copy(mesh.position);
      scene.add(edge);

      const label = createBoundaryLabel(node.label, isSelected);
      label.position.set(node.mapX, node.height + 0.35, node.mapZ);
      scene.add(label);
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let downX = 0;
    let downY = 0;
    let moved = false;

    function hitTest(event: PointerEvent) {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      return raycaster.intersectObjects(selectable, false)[0]?.object.userData.boundaryId as string | undefined;
    }

    function handlePointerDown(event: PointerEvent) {
      downX = event.clientX;
      downY = event.clientY;
      moved = false;
    }

    function handlePointerMove(event: PointerEvent) {
      if (Math.abs(event.clientX - downX) + Math.abs(event.clientY - downY) > 5) moved = true;
      canvas.style.cursor = hitTest(event) ? "pointer" : "grab";
    }

    function handleClick(event: PointerEvent) {
      if (moved) return;
      const id = hitTest(event);
      if (id) onSelect(id);
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("click", handleClick);

    function resize() {
      const { width } = host.getBoundingClientRect();
      const height = Math.max(360, Math.min(520, width * 0.62));
      renderer.setSize(Math.max(320, width), height, false);
      camera.aspect = Math.max(320, width) / height;
      camera.updateProjectionMatrix();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    let frameId = 0;
    function animate(time: number) {
      if (selectedMesh) {
        selectedMesh.scale.y = 1 + Math.sin(time / 360) * 0.025;
      }
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    }
    animate(0);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("click", handleClick);
      controls.dispose();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material;
        if (Array.isArray(material)) {
          material.forEach((item) => item.dispose());
        } else if (material) {
          const map = (material as THREE.Material & { map?: THREE.Texture }).map;
          if (map) map.dispose();
          material.dispose();
        }
      });
      renderer.dispose();
    };
  }, [nodes, onSelect, selectedId]);

  return (
    <div className="relative min-h-[360px] w-full">
      <canvas ref={canvasRef} className="block h-full w-full" data-testid="community-boundary-3d-map" />
      <div className="pointer-events-none absolute left-4 top-4 rounded-md border bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm">
        拖拽旋转地图，滚轮缩放，点击建筑或区域查看边界详情
      </div>
    </div>
  );
}

function createBoundaryLabel(label: string, selected: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 88;
  const context = canvas.getContext("2d");
  if (context) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = selected ? "rgba(15, 76, 129, 0.92)" : "rgba(255, 255, 255, 0.92)";
    context.strokeStyle = selected ? "rgba(15, 47, 96, 0.9)" : "rgba(148, 163, 184, 0.9)";
    context.lineWidth = 3;
    roundRect(context, 20, 14, 216, 54, 14);
    context.fill();
    context.stroke();
    context.fillStyle = selected ? "#ffffff" : "#0f172a";
    context.font = "600 24px sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(label, 128, 42);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(1.55, 0.54, 1);
  return sprite;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function BoundaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
