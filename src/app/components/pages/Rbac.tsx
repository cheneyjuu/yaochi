"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, SectionCard } from "../gov/common";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import {
  ShieldAlert,
  ShieldCheck,
  Save,
  Users,
  Building2,
  Landmark,
  Vote,
  BarChart3,
  Wrench,
  FileText,
  LayoutDashboard,
} from "lucide-react";

/* ─── 角色数据 ─── */
const ROLES = [
  { id: "street_admin", label: "街道办管理员", desc: "最高权限，辖区全量管理" },
  { id: "community_secretary", label: "社区党组织书记", desc: "社区治理协调" },
  { id: "committee_chair", label: "业委会主任", desc: "小区最高自治决策" },
  { id: "committee_member", label: "委员", desc: "参与议题表决与监督" },
  { id: "building_rep", label: "楼栋代表", desc: "负责楼栋事务协调" },
  { id: "grid_worker", label: "网格员", desc: "网格化日常巡查上报" },
  { id: "property_manager", label: "物业经理", desc: "物业整体运营管理" },
  { id: "property_service", label: "物业客服", desc: "业主服务与工单处理" },
  { id: "third_audit", label: "第三方审计师", desc: "财务只读审计权限" },
];

/* ─── 权限点定义 ─── */
interface Permission {
  id: string;
  label: string;
  redline?: boolean;
}

interface PermModule {
  id: string;
  label: string;
  icon: React.ReactNode;
  perms: Permission[];
}

const PERM_MODULES: PermModule[] = [
  {
    id: "dashboard",
    label: "工作台",
    icon: <LayoutDashboard className="size-4" />,
    perms: [
      { id: "dashboard.view", label: "查看工作台" },
      { id: "dashboard.stats", label: "查看统计概览" },
      { id: "dashboard.announce", label: "发布公告" },
    ],
  },
  {
    id: "users",
    label: "用户权限",
    icon: <Users className="size-4" />,
    perms: [
      { id: "users.view", label: "查看业主名册" },
      { id: "users.edit", label: "编辑业主信息" },
      { id: "users.cert", label: "管理认证等级" },
      { id: "users.rbac", label: "配置角色权限" },
    ],
  },
  {
    id: "property",
    label: "物业管理",
    icon: <Building2 className="size-4" />,
    perms: [
      { id: "property.view", label: "查看物业档案" },
      { id: "property.edit", label: "编辑物业信息" },
      { id: "property.topology", label: "管理楼栋拓扑" },
      { id: "property.workorder", label: "处理报修工单" },
    ],
  },
  {
    id: "committee",
    label: "委员会",
    icon: <Landmark className="size-4" />,
    perms: [
      { id: "committee.view", label: "查看委员会信息" },
      { id: "committee.roster", label: "管理委员名册" },
      { id: "committee.election_init", label: "发起换届选举" },
      { id: "committee.dissolve", label: "解散委员会" },
    ],
  },
  {
    id: "election",
    label: "选举",
    icon: <Vote className="size-4" />,
    perms: [
      { id: "election.view", label: "查看选举信息" },
      { id: "election.vote", label: "参与投票表决" },
      { id: "election.result", label: "查看计票结果" },
      { id: "election.override", label: "强制结束选举", redline: true },
    ],
  },
  {
    id: "topic",
    label: "议题表决",
    icon: <FileText className="size-4" />,
    perms: [
      { id: "topic.view", label: "查看议题列表" },
      { id: "topic.create", label: "创建议题" },
      { id: "topic.vote", label: "参与表决" },
      { id: "topic.revoke", label: "强制撤销议题", redline: true },
    ],
  },
  {
    id: "finance",
    label: "财务监督",
    icon: <BarChart3 className="size-4" />,
    perms: [
      { id: "finance.view", label: "查看财务报告" },
      { id: "finance.audit", label: "审计导出" },
      { id: "finance.large_approve", label: "大额资金放行", redline: true },
      { id: "finance.trust_sign", label: "信托双签授权", redline: true },
    ],
  },
  {
    id: "maintenance",
    label: "资产维修",
    icon: <Wrench className="size-4" />,
    perms: [
      { id: "maintenance.view", label: "查看维修项目" },
      { id: "maintenance.approve", label: "审批维修申请" },
      { id: "maintenance.meltdown", label: "换届熔断处置", redline: true },
    ],
  },
];

/* ─── 数据范围选项 ─── */
const DATA_SCOPES = [
  {
    id: "ALL_COMMUNITY",
    label: "辖区全部小区",
    desc: "可访问本街道辖区内所有小区的数据，适用于街道级管理员。",
    count: "约 12 个小区 / 6,800 户",
  },
  {
    id: "OWN_COMMUNITY",
    label: "本小区全量",
    desc: "仅可访问本小区全部业主、档案、财务数据。",
    count: "约 468 户",
  },
  {
    id: "CUSTOM_BUILDING",
    label: "仅责任田楼栋",
    desc: "仅可访问分配到的楼栋(可多选)，适用于楼栋代表、网格员。",
    count: "按楼栋分配，约 72–96 户/栋",
  },
  {
    id: "ORG_ONLY",
    label: "仅本物业组织",
    desc: "只能看到本物业公司相关合同、工单、收费记录，不含业主隐私数据。",
    count: "物业管理范围内",
  },
  {
    id: "SELF",
    label: "仅本人",
    desc: "只能查看并操作与本账号关联的数据，最小权限原则。",
    count: "本人账号数据",
  },
];

/* ─── 默认权限配置 ─── */
const DEFAULT_PERMS: Record<string, string[]> = {
  street_admin: PERM_MODULES.flatMap((m) => m.perms.map((p) => p.id)),
  community_secretary: [
    "dashboard.view", "dashboard.stats", "dashboard.announce",
    "users.view", "users.cert",
    "committee.view", "committee.roster",
    "topic.view", "topic.create",
    "finance.view", "finance.audit",
    "maintenance.view",
  ],
  committee_chair: [
    "dashboard.view", "dashboard.stats",
    "users.view", "users.edit", "users.cert",
    "property.view", "property.topology",
    "committee.view", "committee.roster", "committee.election_init",
    "election.view", "election.vote", "election.result",
    "topic.view", "topic.create", "topic.vote",
    "finance.view", "finance.audit", "finance.large_approve", "finance.trust_sign",
    "maintenance.view", "maintenance.approve",
  ],
  committee_member: [
    "dashboard.view",
    "users.view",
    "committee.view",
    "election.view", "election.vote",
    "topic.view", "topic.vote",
    "finance.view",
    "maintenance.view",
  ],
  building_rep: [
    "dashboard.view",
    "users.view",
    "property.view", "property.workorder",
    "topic.view", "topic.vote",
  ],
  grid_worker: [
    "dashboard.view",
    "property.view", "property.workorder",
    "maintenance.view",
  ],
  property_manager: [
    "dashboard.view", "dashboard.stats",
    "property.view", "property.edit", "property.workorder",
    "finance.view",
    "maintenance.view", "maintenance.approve",
  ],
  property_service: [
    "dashboard.view",
    "property.workorder",
    "maintenance.view",
  ],
  third_audit: [
    "finance.view", "finance.audit",
    "maintenance.view",
  ],
};

const DEFAULT_SCOPES: Record<string, string> = {
  street_admin: "ALL_COMMUNITY",
  community_secretary: "OWN_COMMUNITY",
  committee_chair: "OWN_COMMUNITY",
  committee_member: "OWN_COMMUNITY",
  building_rep: "CUSTOM_BUILDING",
  grid_worker: "CUSTOM_BUILDING",
  property_manager: "ORG_ONLY",
  property_service: "ORG_ONLY",
  third_audit: "OWN_COMMUNITY",
};

/* ─── 主页面 ─── */
export function Rbac() {
  const [selectedRole, setSelectedRole] = useState("committee_chair");
  const [perms, setPerms] = useState<Record<string, string[]>>(DEFAULT_PERMS);
  const [scopes, setScopes] = useState<Record<string, string>>(DEFAULT_SCOPES);

  const rolePerms = perms[selectedRole] ?? [];
  const roleScope = scopes[selectedRole] ?? "OWN_COMMUNITY";

  function togglePerm(permId: string) {
    setPerms((prev) => {
      const current = prev[selectedRole] ?? [];
      const next = current.includes(permId)
        ? current.filter((p) => p !== permId)
        : [...current, permId];
      return { ...prev, [selectedRole]: next };
    });
  }

  function setScope(scope: string) {
    setScopes((prev) => ({ ...prev, [selectedRole]: scope }));
  }

  function handleSave() {
    toast.success(`已保存「${ROLES.find((r) => r.id === selectedRole)?.label}」权限配置`, {
      description: `已授予 ${rolePerms.length} 个权限点，数据范围：${DATA_SCOPES.find((s) => s.id === roleScope)?.label}`,
    });
  }

  const redlinePerms = PERM_MODULES.flatMap((m) =>
    m.perms.filter((p) => p.redline)
  );
  const grantedRedlines = redlinePerms.filter((p) => rolePerms.includes(p.id));

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="角色与数据范围配置"
        desc="RBAC + ABAC 核心 — 配置各角色可操作的权限点及数据可见范围"
      />

      <div className="grid lg:grid-cols-12 gap-4 items-start">
        {/* ── 左：角色列表 ── */}
        <div className="lg:col-span-3">
          <SectionCard title="角色列表" bodyClassName="p-2">
            <div className="space-y-0.5">
              {ROLES.map((role) => {
                const active = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    className="w-full text-left rounded-md px-3 py-2.5 transition-colors"
                    style={{
                      backgroundColor: active ? "#e8f0fb" : undefined,
                      color: active ? "#143c78" : undefined,
                    }}
                    onClick={() => setSelectedRole(role.id)}
                  >
                    <div className="text-sm font-medium">{role.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">
                      {role.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* ── 中：权限点 ── */}
        <div className="lg:col-span-5 space-y-3">
          {/* 法律红线区 */}
          <div className="rounded-lg border border-red-200 bg-red-50 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-red-200 bg-red-100/60">
              <ShieldAlert className="size-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">法律红线权限</span>
              <span className="ml-auto text-xs text-red-500">
                已授予 {grantedRedlines.length}/{redlinePerms.length}
              </span>
            </div>
            <div className="px-4 py-2">
              <p className="text-xs text-red-600 mb-3">
                ⚠️ 红线权限授予需谨慎，强制撤销议题、大额放行、信托双签、换届熔断处置等操作将被区块链存证，不可逆。
              </p>
              <div className="space-y-2">
                {redlinePerms.map((perm) => (
                  <label
                    key={perm.id}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <Checkbox
                      checked={rolePerms.includes(perm.id)}
                      onCheckedChange={() => togglePerm(perm.id)}
                      className="border-red-300 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                    <span className="text-sm text-red-700 font-medium">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* 普通权限模块 */}
          <SectionCard title="权限模块配置">
            <div className="space-y-5">
              {PERM_MODULES.map((mod) => {
                const normalPerms = mod.perms.filter((p) => !p.redline);
                if (normalPerms.length === 0) return null;
                const allChecked = normalPerms.every((p) =>
                  rolePerms.includes(p.id)
                );
                const someChecked = normalPerms.some((p) =>
                  rolePerms.includes(p.id)
                );

                return (
                  <div key={mod.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-primary">{mod.icon}</span>
                      <span className="text-sm font-semibold">{mod.label}</span>
                      <button
                        className="ml-auto text-xs text-primary underline"
                        onClick={() => {
                          if (allChecked) {
                            // uncheck all
                            setPerms((prev) => ({
                              ...prev,
                              [selectedRole]: (prev[selectedRole] ?? []).filter(
                                (p) => !normalPerms.find((np) => np.id === p)
                              ),
                            }));
                          } else {
                            // check all
                            setPerms((prev) => {
                              const current = prev[selectedRole] ?? [];
                              const toAdd = normalPerms
                                .map((np) => np.id)
                                .filter((id) => !current.includes(id));
                              return {
                                ...prev,
                                [selectedRole]: [...current, ...toAdd],
                              };
                            });
                          }
                        }}
                      >
                        {allChecked ? "全不选" : someChecked ? "全选" : "全选"}
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 pl-6">
                      {normalPerms.map((perm) => (
                        <label
                          key={perm.id}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <Checkbox
                            checked={rolePerms.includes(perm.id)}
                            onCheckedChange={() => togglePerm(perm.id)}
                          />
                          <span className="text-sm">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {/* ── 右：数据范围 ── */}
        <div className="lg:col-span-4 space-y-3">
          <SectionCard
            title="数据范围"
            desc="决定该角色能访问哪些数据记录"
          >
            <RadioGroup value={roleScope} onValueChange={setScope}>
              <div className="space-y-2">
                {DATA_SCOPES.map((scope) => {
                  const checked = roleScope === scope.id;
                  return (
                    <label
                      key={scope.id}
                      className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors"
                      style={{
                        borderColor: checked ? "#1b4f9c" : undefined,
                        backgroundColor: checked ? "#f0f5ff" : undefined,
                      }}
                    >
                      <RadioGroupItem
                        value={scope.id}
                        className="mt-0.5 shrink-0"
                      />
                      <div>
                        <div className="text-sm font-medium">{scope.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {scope.desc}
                        </div>
                        <div
                          className="text-xs font-mono-num mt-1"
                          style={{ color: "#1b4f9c" }}
                        >
                          {scope.count}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </RadioGroup>
          </SectionCard>

          {/* 权限摘要 */}
          <SectionCard title="当前配置摘要">
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">角色</span>
                <span className="font-medium">
                  {ROLES.find((r) => r.id === selectedRole)?.label}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">授权点数</span>
                <span className="font-mono-num font-semibold text-primary">
                  {rolePerms.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">红线权限</span>
                <span
                  className="font-mono-num font-semibold"
                  style={{ color: grantedRedlines.length > 0 ? "#d14343" : "#2e9e5b" }}
                >
                  {grantedRedlines.length} 项
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">数据范围</span>
                <span className="font-medium text-xs">
                  {DATA_SCOPES.find((s) => s.id === roleScope)?.label}
                </span>
              </div>
            </div>
          </SectionCard>

          <Button className="w-full" onClick={handleSave}>
            <Save className="size-4 mr-2" />
            保存配置
          </Button>

          {grantedRedlines.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              <ShieldAlert className="size-3.5 mt-0.5 shrink-0" />
              <span>
                已授予 {grantedRedlines.length} 个红线权限：
                {grantedRedlines.map((p) => p.label).join("、")}。保存后将记录操作日志。
              </span>
            </div>
          )}

          {grantedRedlines.length === 0 && (
            <div className="flex items-start gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
              <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
              <span>当前未授予任何红线权限，符合最小权限原则。</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
