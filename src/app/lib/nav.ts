// 盘古 · 导航骨架 + 菜单可见性矩阵
import {
  LayoutDashboard,
  Users,
  Building2,
  UsersRound,
  Vote,
  Gavel,
  ShieldCheck,
  Wrench,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import type { RoleId, Visibility } from "./types";

export interface NavPage {
  id: string;
  label: string;
  /** 该页要求的权限点；当前用户无此权限时菜单项隐藏（页级门控，弥补模块级矩阵）。 */
  requirePermission?: string;
  /** 该页要求的后端 role_key 白名单；命中之一才显示。与 requirePermission 复合（AND）。 */
  requireRoleKeys?: string[];
}
export interface NavModule {
  id: string;
  label: string;
  icon: LucideIcon;
  pages: NavPage[];
}

export const NAV: NavModule[] = [
  {
    id: "dashboard",
    label: "工作台 / 概览",
    icon: LayoutDashboard,
    pages: [{ id: "overview", label: "角色工作台" }],
  },
  {
    id: "users",
    label: "用户与权限管理",
    icon: Users,
    pages: [
      { id: "owners", label: "业主名册" },
      { id: "topology", label: "楼栋 / 单元结构" },
      { id: "rbac", label: "角色与数据范围", requirePermission: "admin:role:read" },
      {
        id: "building-assignment",
        label: "楼栋责任田分配",
        requireRoleKeys: [
          "GOV_SUPER_ADMIN",
          "COMMUNITY_ADMIN",
          "PARTY_SECRETARY",
          "COMMITTEE_DIRECTOR",
        ],
      },
      { id: "certification", label: "实名认证等级" },
    ],
  },
  {
    id: "property",
    label: "物业管理",
    icon: Building2,
    pages: [{ id: "property-mgmt", label: "公共收益 / 开支录入" }],
  },
  {
    id: "committee",
    label: "委员会操作",
    icon: UsersRound,
    pages: [
      { id: "committee-roster", label: "委员会名册" },
      { id: "term-management", label: "换届管理" },
      { id: "meeting-minutes", label: "会议纪要" },
      { id: "duties", label: "职责分工" },
    ],
  },
  {
    id: "election",
    label: "选举管理",
    icon: Vote,
    pages: [{ id: "election", label: "选举投票看板" }],
  },
  {
    id: "governance",
    label: "议题与表决",
    icon: Gavel,
    pages: [{ id: "voting", label: "议题表决看板" }],
  },
  {
    id: "finance",
    label: "财务监督",
    icon: ShieldCheck,
    pages: [
      { id: "finance", label: "公共收益公示" },
      { id: "dual-sign", label: "信托制双签核销台" },
      { id: "expense-approval", label: "酬金制开支审批" },
      { id: "fund-review", label: "大额资金前置审查" },
    ],
  },
  {
    id: "assets",
    label: "资产与维修",
    icon: Wrench,
    pages: [
      { id: "assets", label: "资产台账" },
      { id: "work-orders", label: "维修工单" },
      { id: "engineering", label: "工程方案与验收" },
    ],
  },
  {
    id: "comms",
    label: "沟通与报告",
    icon: Megaphone,
    pages: [
      { id: "announcements", label: "通知公告" },
      { id: "push-records", label: "定向推送记录" },
      { id: "reports", label: "统计报表导出" },
    ],
  },
];

// 模块级可见性矩阵：full=可见可操作 / readonly=只读 / hidden=隐藏
type ModuleVis = Record<string, Visibility>;
const FULL: ModuleVis = {
  dashboard: "full", users: "full", property: "full", committee: "full",
  election: "full", governance: "full", finance: "full", assets: "full", comms: "full",
};

export const VISIBILITY: Record<RoleId, ModuleVis> = {
  street_admin: { ...FULL },
  party_secretary: {
    dashboard: "full", users: "readonly", property: "readonly", committee: "full",
    election: "readonly", governance: "readonly", finance: "full", assets: "readonly", comms: "full",
  },
  committee_director: { ...FULL },
  committee_member: {
    dashboard: "full", users: "readonly", property: "readonly", committee: "full",
    election: "readonly", governance: "full", finance: "readonly", assets: "readonly", comms: "full",
  },
  building_rep: {
    dashboard: "full", users: "hidden", property: "hidden", committee: "hidden",
    election: "hidden", governance: "full", finance: "hidden", assets: "full", comms: "readonly",
  },
  property_manager: {
    dashboard: "full", users: "hidden", property: "full", committee: "hidden",
    election: "hidden", governance: "hidden", finance: "full", assets: "full", comms: "readonly",
  },
  property_service: {
    dashboard: "full", users: "hidden", property: "readonly", committee: "hidden",
    election: "hidden", governance: "hidden", finance: "hidden", assets: "full", comms: "readonly",
  },
  auditor: {
    dashboard: "full", users: "hidden", property: "hidden", committee: "hidden",
    election: "hidden", governance: "hidden", finance: "full", assets: "hidden", comms: "hidden",
  },
};

export function moduleVisibility(role: RoleId, moduleId: string): Visibility {
  return VISIBILITY[role]?.[moduleId] ?? "hidden";
}

// 所有模块（含隐藏），用于可见性矩阵图
export const MODULE_LABELS = NAV.map((m) => ({ id: m.id, label: m.label }));
