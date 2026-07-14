// 关联业务：定义管理端角色、数据范围和后端确认的互斥物业管理模式类型。

export type Side = "B" | "G" | "S";

export type RoleId =
  | "street_admin" // 街道办管理员 (G)
  | "community_admin" // 居委会管理员 / 社区一把手 (G)
  | "party_secretary" // 社区党组织书记 (G)
  | "gov_operator" // 基层经办员 (G) —— 选举立项执行人
  | "committee_director" // 业委会主任 (B)
  | "committee_member" // 业委会委员 (B)
  | "building_rep" // 楼栋代表 / 网格员 (B)
  | "property_manager" // 物业经理 (B)
  | "property_service" // 物业客服 (B)
  | "supplier_service" // 供应商报价经办人 (S)
  | "auditor"; // 第三方审计师 (B)

export interface Role {
  id: RoleId;
  name: string;
  side: Side;
  scope: string; // 数据范围描述
  desc: string;
}

// 物业治理模式。unconfigured 仅表示尚未由注册审核或属地执行写入，不能作为业务规则的默认值。
export type PropertyMode = "unconfigured" | "package" | "reward" | "trust";

/** 后端租户事实中的物业管理模式枚举。 */
export type BackendPropertyManagementMode = "LUMP_SUM" | "FUND_RAISING" | "TRUST";

/** 仅在后端已明确返回模式时映射；缺失值必须保持为待配置。 */
export function mapPropertyMode(
  mode: BackendPropertyManagementMode | null | undefined,
): PropertyMode {
  switch (mode) {
    case "LUMP_SUM":
      return "package";
    case "FUND_RAISING":
      return "reward";
    case "TRUST":
      return "trust";
    default:
      return "unconfigured";
  }
}

// 菜单可见性三态
export type Visibility = "full" | "readonly" | "hidden";

// 数据范围
export type DataScope =
  | "ALL_DISTRICT" // 辖区全部小区
  | "ALL_COMMUNITY" // 本小区全量
  | "CUSTOM_BUILDING" // 仅责任田楼栋
  | "ORG_ONLY" // 仅本物业组织
  | "SELF"; // 仅本人

export const ROLES: Role[] = [
  { id: "street_admin", name: "街道办管理员", side: "G", scope: "辖区全部小区", desc: "监管辖区多个小区、大额审查、强制撤销" },
  { id: "community_admin", name: "居委会管理员", side: "G", scope: "本小区全量", desc: "候选人资格最终审查、议题立项 / 公示、放宽申请审批" },
  { id: "party_secretary", name: "社区党组织书记", side: "G", scope: "单小区全量", desc: "候选人党组前置审查、大额资金前置审查、换届熔断处置、监管看板" },
  { id: "gov_operator", name: "基层经办员", side: "G", scope: "本小区全量", desc: "选举立项执行人、候选人提名、Waiver 申请（业委会全员封死时的 G 端代办）" },
  { id: "committee_director", name: "业委会主任", side: "B", scope: "本小区全量", desc: "议题、核销审批（密码B签名）、选举、委员会" },
  { id: "committee_member", name: "业委会委员", side: "B", scope: "本小区全量（部分只读）", desc: "议题、报告、沟通" },
  { id: "building_rep", name: "楼栋代表 / 网格员", side: "B", scope: "仅责任田楼栋", desc: "本楼栋议题催票、线下核销、维修工单" },
  { id: "property_manager", name: "物业经理", side: "B", scope: "仅本物业组织", desc: "公共收益录入、开支单提交（密码A签名）、维修工单" },
  { id: "property_service", name: "物业客服", side: "B", scope: "仅本物业组织", desc: "报修受理、工单处理" },
  { id: "supplier_service", name: "供应商经办人", side: "S", scope: "仅本企业邀价", desc: "查看本企业邀价并提交报价" },
  { id: "auditor", name: "第三方审计师", side: "B", scope: "本小区财务只读", desc: "财务监督 + 内账导出（按需激活）" },
];

export const MODE_META: Record<PropertyMode, { label: string; color: string; bg: string; desc: string }> = {
  unconfigured: {
    label: "待配置",
    color: "#5a6677",
    bg: "#eef2f8",
    desc: "该小区尚未由注册审核或属地执行确认物业管理模式，模式化财务规则暂不启用。",
  },
  package: {
    label: "包干制",
    color: "#2e9e5b",
    bg: "#e8f6ee",
    desc: "物业自负盈亏，数据严格锁死本组织，隐藏物业内部行政开支与外包合同等商业机密，仅录入代收公共收益。",
  },
  reward: {
    label: "酬金制",
    color: "#1b4f9c",
    bg: "#e8f0fb",
    desc: "全小区财务对委员会只读，物业经理可发起物业费开支单，进入“待业委会初审”状态机后由主任核销。",
  },
  trust: {
    label: "信托制",
    color: "#19a0c4",
    bg: "#e6f6fa",
    desc: "物业降级为职业经理人，关联信托公共共有基金账户，每笔资金动用须双密码双签并实时穿透上链。",
  },
};
