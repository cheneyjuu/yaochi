// 关联业务：登记并确认小区实际生效的业主大会议事规则，供维修和其他共同决定共用。
"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Eye, FileCheck2, FileUp, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { SectionCard, StatusChip } from "../gov/common";
import { useStore } from "../../lib/store";
import {
  RULE_CONFIGURATION_FIELDS,
  activateOwnersAssemblyRule,
  confirmRuleField,
  createOwnersAssemblyRuleDraft,
  getOwnersAssemblyRulePreviewTicket,
  listOwnersAssemblyRules,
  listRuleFieldConfirmations,
  submitOwnersAssemblyRule,
  type CountingRule,
  type DecisionType,
  type DeliveryMethod,
  type MeetingForm,
  type OwnersAssemblyRule,
  type OwnersAssemblyRuleConfiguration,
  type RuleConfigurationField,
  type RuleFieldConfirmation,
  type ThresholdComparison,
  type VotingThreshold,
} from "../../lib/owners-assembly-rule";

const MEETING_FORMS: Array<{ value: MeetingForm; label: string; detail: string }> = [
  { value: "WRITTEN_CONSULTATION", label: "纸质书面征询", detail: "逐户送达、回收、录入并复核纸质表决票" },
  { value: "INTERNET", label: "互联网表决并提供纸质协助", detail: "实名线上办理；有困难且提出要求的业主改用纸票" },
  { value: "ONLINE_AND_OFFLINE", label: "纸质与线上并行", detail: "仅在规则原件明确允许时向全体同时开放两个渠道" },
  { value: "OFFLINE_MEETING", label: "线下集体讨论", detail: "可如实登记；当前平台尚未接入签到、代理和现场收票证据链" },
];

const DELIVERY_METHODS: Array<{ value: DeliveryMethod; label: string }> = [
  { value: "DOOR_TO_DOOR", label: "上门送达" },
  { value: "POSTAL", label: "邮寄送达" },
  { value: "ELECTRONIC", label: "电子送达" },
  { value: "PUBLIC_NOTICE_BOARD", label: "公告栏送达" },
];

const SOURCE_LABEL: Record<RuleConfigurationField, string> = {
  ALLOWED_MEETING_FORMS: "允许的会议和表决方式",
  PLAN_PUBLICITY_DAYS: "方案公示期限",
  MEETING_NOTICE_DAYS: "会议通知期限",
  VALID_DELIVERY_METHODS: "有效送达方式",
  NON_RESPONSE_POLICY: "未反馈表决票的认定",
  PROXY_VOTING_POLICY: "委托代理规则",
  VOTING_CHANNEL_POLICY: "纸质与线上渠道约束",
  ONLINE_IDENTITY_VERIFICATION: "线上实名核验要求",
  PAPER_BALLOT_SEAL: "纸质表决票用印要求",
  DUPLICATE_VOTE_POLICY: "跨渠道重复票处理",
  COUNTING_RULES: "一般及重大事项计票门槛",
  RESULT_ANNOUNCEMENT_DAYS: "结果公告期限",
};

const DECISION_LABEL: Record<DecisionType, string> = { GENERAL: "一般共同决定事项", MAJOR: "重大共同决定事项" };
const THRESHOLD_LABEL: Array<{ key: keyof CountingRule; label: string }> = [
  { key: "participationOwnerThreshold", label: "参与人数" },
  { key: "participationAreaThreshold", label: "参与面积" },
  { key: "approvalOwnerThreshold", label: "同意人数" },
  { key: "approvalAreaThreshold", label: "同意面积" },
];

interface DraftState {
  ruleName: string;
  ruleVersion: string;
  effectiveDate: string;
  changeReason: string;
  configuration: OwnersAssemblyRuleConfiguration;
}

function emptyConfiguration(): OwnersAssemblyRuleConfiguration {
  return {
    allowedMeetingForms: [],
    planPublicityDays: null,
    meetingNoticeDays: null,
    validDeliveryMethods: [],
    nonResponsePolicy: null,
    proxyVotingPolicy: null,
    votingChannelPolicy: null,
    onlineIdentityVerificationRequired: null,
    paperBallotSealRequired: null,
    duplicateVotePolicy: null,
    countingRules: {},
    resultAnnouncementDays: null,
    sourceClauseReferences: {},
  };
}

function emptyDraft(): DraftState {
  return { ruleName: "", ruleVersion: "", effectiveDate: "", changeReason: "", configuration: emptyConfiguration() };
}

function emptyThreshold(): VotingThreshold {
  return { numerator: null, denominator: null, comparison: null };
}

function emptyCountingRule(): CountingRule {
  return {
    participationOwnerThreshold: emptyThreshold(),
    participationAreaThreshold: emptyThreshold(),
    approvalOwnerThreshold: emptyThreshold(),
    approvalAreaThreshold: emptyThreshold(),
  };
}

function toggleValue<T extends string>(values: T[], value: T, checked: boolean): T[] {
  return checked ? Array.from(new Set([...values, value])) : values.filter((item) => item !== value);
}

function statusLabel(status: OwnersAssemblyRule["status"]): string {
  return { DRAFT: "草稿", PENDING_CONFIRMATION: "待逐项核对", ACTIVE: "当前生效", SUPERSEDED: "历史版本" }[status];
}

function modeLabels(rule: OwnersAssemblyRule): string {
  return rule.configuration.allowedMeetingForms
    .map((value) => MEETING_FORMS.find((item) => item.value === value)?.label ?? value)
    .join("、") || "尚未填写";
}

function validateDraft(draft: DraftState, file: File | null): string | null {
  const c = draft.configuration;
  if (!draft.ruleName.trim() || !draft.ruleVersion.trim() || !draft.effectiveDate || !draft.changeReason.trim() || !file) {
    return "请填写规则名称、版本、生效日期、变更说明并上传规则原件";
  }
  if (c.allowedMeetingForms.length === 0 || c.validDeliveryMethods.length === 0) return "请按原件勾选允许的办理方式和有效送达方式";
  if (c.planPublicityDays == null || c.planPublicityDays < 0 || c.meetingNoticeDays == null || c.meetingNoticeDays < 0 || c.resultAnnouncementDays == null || c.resultAnnouncementDays < 0) return "请填写公示、通知和结果公告期限";
  if (!c.nonResponsePolicy || !c.proxyVotingPolicy || !c.votingChannelPolicy || c.onlineIdentityVerificationRequired == null || c.paperBallotSealRequired == null || !c.duplicateVotePolicy) return "请完整核对未反馈、代理、渠道、实名、用印和重复票规则";
  for (const type of ["GENERAL", "MAJOR"] as DecisionType[]) {
    const rule = c.countingRules[type];
    if (!rule) return `请填写${DECISION_LABEL[type]}的计票门槛`;
    for (const item of THRESHOLD_LABEL) {
      const threshold = rule[item.key];
      if (threshold.numerator == null || threshold.denominator == null || !threshold.comparison || threshold.numerator < 0 || threshold.denominator <= 0 || threshold.numerator > threshold.denominator) return `请核对${DECISION_LABEL[type]}的${item.label}门槛`;
    }
  }
  for (const field of RULE_CONFIGURATION_FIELDS) {
    const source = c.sourceClauseReferences[field];
    if (!source?.pageNumber || source.pageNumber <= 0 || !source.clause.trim()) return `请填写“${SOURCE_LABEL[field]}”对应的原件页码和条款`;
  }
  if ((c.allowedMeetingForms.includes("INTERNET") || c.allowedMeetingForms.includes("ONLINE_AND_OFFLINE")) && c.onlineIdentityVerificationRequired !== true) return "包含线上办理时，规则必须明确实名身份和房屋表决权核验";
  return null;
}

export function OwnersAssemblyRuleManagement() {
  const { hasPermission } = useStore();
  const [rules, setRules] = useState<OwnersAssemblyRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(emptyDraft);
  const [file, setFile] = useState<File | null>(null);
  const [reviewRule, setReviewRule] = useState<OwnersAssemblyRule | null>(null);
  const [confirmations, setConfirmations] = useState<RuleFieldConfirmation[]>([]);

  const activeRule = useMemo(() => rules.find((rule) => rule.status === "ACTIVE") ?? null, [rules]);
  const canDraft = hasPermission("owners-assembly:rule:draft");
  const canActivate = hasPermission("owners-assembly:rule:activate");

  async function reload() {
    setLoading(true);
    try {
      setRules(await listOwnersAssemblyRules());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "议事规则加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void reload(); }, []);

  async function preview(ruleId: number) {
    setBusy(`preview-${ruleId}`);
    try {
      const ticket = await getOwnersAssemblyRulePreviewTicket(ruleId);
      window.open(ticket.previewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "规则原件暂时无法打开");
    } finally {
      setBusy(null);
    }
  }

  function updateConfiguration(updater: (current: OwnersAssemblyRuleConfiguration) => OwnersAssemblyRuleConfiguration) {
    setDraft((current) => ({ ...current, configuration: updater(current.configuration) }));
  }

  function updateThreshold(type: DecisionType, key: keyof CountingRule, patch: Partial<VotingThreshold>) {
    updateConfiguration((current) => {
      const rule = current.countingRules[type] ?? emptyCountingRule();
      return { ...current, countingRules: { ...current.countingRules, [type]: { ...rule, [key]: { ...rule[key], ...patch } } } };
    });
  }

  async function createDraft() {
    const error = validateDraft(draft, file);
    if (error || !file) { toast.error(error ?? "请上传规则原件"); return; }
    setBusy("create");
    try {
      await createOwnersAssemblyRuleDraft({ ...draft, file });
      toast.success("规则草稿已归档，请提交后由主任或副主任逐项核对");
      setDraftOpen(false);
      setDraft(emptyDraft());
      setFile(null);
      await reload();
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "规则草稿创建失败");
    } finally {
      setBusy(null);
    }
  }

  async function submitRule(ruleId: number) {
    setBusy(`submit-${ruleId}`);
    try {
      await submitOwnersAssemblyRule(ruleId);
      toast.success("规则已提交逐项核对");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally { setBusy(null); }
  }

  async function openReview(rule: OwnersAssemblyRule) {
    setBusy(`review-${rule.ruleId}`);
    try {
      setConfirmations(await listRuleFieldConfirmations(rule.ruleId));
      setReviewRule(rule);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "核对记录加载失败");
    } finally { setBusy(null); }
  }

  async function confirmField(field: RuleConfigurationField) {
    if (!reviewRule) return;
    setBusy(`confirm-${field}`);
    try {
      await confirmRuleField(reviewRule.ruleId, field);
      setConfirmations(await listRuleFieldConfirmations(reviewRule.ruleId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "条款核对失败");
    } finally { setBusy(null); }
  }

  async function activate() {
    if (!reviewRule) return;
    setBusy("activate");
    try {
      await activateOwnersAssemblyRule(reviewRule.ruleId);
      toast.success("议事规则已启用；后续表决将冻结该版本");
      setReviewRule(null);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "规则启用失败");
    } finally { setBusy(null); }
  }

  return (
    <>
      <SectionCard
        title="业主大会议事规则"
        desc="归档本小区实际生效的规则原件，并把办理方式、送达、未反馈和计票条款逐项核对后启用。维修表决与业主大会共用当前生效版本。"
        extra={canDraft ? <Button onClick={() => setDraftOpen(true)}><FileUp className="mr-2 size-4" />新建规则草稿</Button> : <StatusChip tone="warning">只读</StatusChip>}
      >
        {loading ? <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />正在读取议事规则</div> : (
          <div className="space-y-5">
            {activeRule ? (
              <div className="border-y py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-700" /><span className="font-semibold">{activeRule.ruleName}</span><StatusChip tone="success">当前生效</StatusChip></div><div className="mt-1 text-sm text-muted-foreground">{activeRule.ruleVersion} · 生效于 {activeRule.effectiveDate}</div></div>
                  <Button size="sm" variant="outline" disabled={busy === `preview-${activeRule.ruleId}`} onClick={() => void preview(activeRule.ruleId)}><Eye className="mr-1 size-4" />查看原件</Button>
                </div>
                <dl className="mt-4 grid gap-3 text-sm md:grid-cols-3"><div><dt className="text-xs text-muted-foreground">规则允许的办理方式</dt><dd className="mt-1 leading-6">{modeLabels(activeRule)}</dd></div><div><dt className="text-xs text-muted-foreground">未反馈表决票</dt><dd className="mt-1">{activeRule.configuration.nonResponsePolicy === "NOT_PARTICIPATED" ? "不计入参与" : "按原件核对结果办理"}</dd></div><div><dt className="text-xs text-muted-foreground">有效送达方式</dt><dd className="mt-1 leading-6">{activeRule.configuration.validDeliveryMethods.map((value) => DELIVERY_METHODS.find((item) => item.value === value)?.label ?? value).join("、")}</dd></div></dl>
              </div>
            ) : <div className="border-y border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">当前没有经逐项核对并启用的议事规则，系统不会用示范文本或平台默认值代替本小区规则发起正式表决。</div>}

            {rules.length > 0 && <div><div className="mb-2 text-sm font-semibold">版本记录</div><div className="divide-y border-y">{rules.map((rule) => <div key={rule.ruleId} className="grid gap-3 py-3 text-sm md:grid-cols-[minmax(0,1fr)_160px_140px_auto] md:items-center"><div><div className="font-medium">{rule.ruleName}</div><div className="mt-1 text-xs text-muted-foreground">{rule.originalFileName} · {rule.changeReason}</div></div><div><div className="text-xs text-muted-foreground">版本与日期</div><div className="mt-1">{rule.ruleVersion} · {rule.effectiveDate}</div></div><div><StatusChip tone={rule.status === "ACTIVE" ? "success" : rule.status === "PENDING_CONFIRMATION" ? "warning" : "neutral"}>{statusLabel(rule.status)}</StatusChip></div><div className="flex justify-end gap-2"><Button size="sm" variant="ghost" title="查看原件" onClick={() => void preview(rule.ruleId)}><Eye className="size-4" /></Button>{rule.status === "DRAFT" && canDraft && <Button size="sm" variant="outline" disabled={busy === `submit-${rule.ruleId}`} onClick={() => void submitRule(rule.ruleId)}><FileCheck2 className="mr-1 size-4" />提交核对</Button>}{rule.status === "PENDING_CONFIRMATION" && canActivate && <Button size="sm" variant="outline" disabled={busy === `review-${rule.ruleId}`} onClick={() => void openReview(rule)}><ShieldCheck className="mr-1 size-4" />逐项核对</Button>}</div></div>)}</div></div>}
          </div>
        )}
      </SectionCard>

      <Dialog open={draftOpen} onOpenChange={setDraftOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>新建议事规则草稿</DialogTitle><DialogDescription>所有结构化内容都应从本小区规则原件逐项核对。保存草稿不代表规则生效。</DialogDescription></DialogHeader>
          <form className="space-y-6" onSubmit={(event) => { event.preventDefault(); void createDraft(); }}>
            <section className="grid gap-4 md:grid-cols-2"><div className="space-y-1.5 md:col-span-2"><Label>规则完整名称 *</Label><Input value={draft.ruleName} onChange={(event) => setDraft((current) => ({ ...current, ruleName: event.target.value }))} /></div><div className="space-y-1.5"><Label>版本标识 *</Label><Input value={draft.ruleVersion} onChange={(event) => setDraft((current) => ({ ...current, ruleVersion: event.target.value }))} /></div><div className="space-y-1.5"><Label>生效日期 *</Label><Input type="date" value={draft.effectiveDate} onChange={(event) => setDraft((current) => ({ ...current, effectiveDate: event.target.value }))} /></div><div className="space-y-1.5 md:col-span-2"><Label>本版本形成或变更原因 *</Label><Textarea rows={2} value={draft.changeReason} onChange={(event) => setDraft((current) => ({ ...current, changeReason: event.target.value }))} /></div><div className="space-y-1.5 md:col-span-2"><Label>规则原件 *</Label><Input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></div></section>

            <section className="border-t pt-5"><h3 className="font-semibold">规则允许的会议和表决方式</h3><p className="mt-1 text-sm text-muted-foreground">可以按原件勾选多种允许方式；单次维修表决只能从这些方式中选择一种实际办理方式。</p><div className="mt-4 grid gap-3 md:grid-cols-2">{MEETING_FORMS.map((item) => <label key={item.value} className="flex items-start gap-3 border-b pb-3"><Checkbox checked={draft.configuration.allowedMeetingForms.includes(item.value)} onCheckedChange={(checked) => updateConfiguration((current) => ({ ...current, allowedMeetingForms: toggleValue(current.allowedMeetingForms, item.value, checked === true) }))} /><span><span className="block text-sm font-medium">{item.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.detail}</span></span></label>)}</div></section>

            <section className="grid gap-4 border-t pt-5 md:grid-cols-3"><div className="space-y-1.5"><Label>方案公示天数 *</Label><Input type="number" min={0} value={draft.configuration.planPublicityDays ?? ""} onChange={(event) => updateConfiguration((current) => ({ ...current, planPublicityDays: event.target.value === "" ? null : Number(event.target.value) }))} /></div><div className="space-y-1.5"><Label>会议通知天数 *</Label><Input type="number" min={0} value={draft.configuration.meetingNoticeDays ?? ""} onChange={(event) => updateConfiguration((current) => ({ ...current, meetingNoticeDays: event.target.value === "" ? null : Number(event.target.value) }))} /></div><div className="space-y-1.5"><Label>结果公告天数 *</Label><Input type="number" min={0} value={draft.configuration.resultAnnouncementDays ?? ""} onChange={(event) => updateConfiguration((current) => ({ ...current, resultAnnouncementDays: event.target.value === "" ? null : Number(event.target.value) }))} /></div></section>

            <section className="border-t pt-5"><h3 className="font-semibold">规则认可的有效送达方式</h3><div className="mt-4 flex flex-wrap gap-5">{DELIVERY_METHODS.map((item) => <label key={item.value} className="flex items-center gap-2 text-sm"><Checkbox checked={draft.configuration.validDeliveryMethods.includes(item.value)} onCheckedChange={(checked) => updateConfiguration((current) => ({ ...current, validDeliveryMethods: toggleValue(current.validDeliveryMethods, item.value, checked === true) }))} />{item.label}</label>)}</div></section>

            <section className="grid gap-4 border-t pt-5 md:grid-cols-2"><SelectField label="未反馈表决票的认定 *" value={draft.configuration.nonResponsePolicy ?? ""} onChange={(value) => updateConfiguration((current) => ({ ...current, nonResponsePolicy: value as OwnersAssemblyRuleConfiguration["nonResponsePolicy"] }))} options={[["NOT_PARTICIPATED", "未反馈不计入参与"], ["FOLLOW_MAJORITY", "未反馈按多数意见认定"], ["ABSTAIN", "未反馈认定为弃权"]]} /><SelectField label="委托代理规则 *" value={draft.configuration.proxyVotingPolicy ?? ""} onChange={(value) => updateConfiguration((current) => ({ ...current, proxyVotingPolicy: value as OwnersAssemblyRuleConfiguration["proxyVotingPolicy"] }))} options={[["NOT_ALLOWED", "本规则不允许委托代理"], ["WRITTEN_AUTHORIZATION_REQUIRED", "须有书面授权"]]} /><SelectField label="规则总体渠道约束 *" value={draft.configuration.votingChannelPolicy ?? ""} onChange={(value) => updateConfiguration((current) => ({ ...current, votingChannelPolicy: value as OwnersAssemblyRuleConfiguration["votingChannelPolicy"] }))} options={[["PAPER_ONLY", "仅允许纸质"], ["ONLINE_ONLY", "仅允许互联网表决并提供纸质协助"], ["PAPER_AND_ONLINE", "允许按勾选形式使用纸质、互联网或并行方式"]]} /><SelectField label="跨渠道重复票处理 *" value={draft.configuration.duplicateVotePolicy ?? ""} onChange={(value) => updateConfiguration((current) => ({ ...current, duplicateVotePolicy: value as OwnersAssemblyRuleConfiguration["duplicateVotePolicy"] }))} options={[["NOT_APPLICABLE", "单一渠道，不适用"], ["FIRST_VALID_WINS", "先形成的有效票生效"], ["PAPER_PREVAILS", "纸质有效票优先"], ["ONLINE_PREVAILS", "线上有效票优先"]]} /><SelectField label="线上实名及房屋表决权核验 *" value={draft.configuration.onlineIdentityVerificationRequired == null ? "" : String(draft.configuration.onlineIdentityVerificationRequired)} onChange={(value) => updateConfiguration((current) => ({ ...current, onlineIdentityVerificationRequired: value === "true" }))} options={[["true", "规则明确要求"], ["false", "规则未要求"]]} /><SelectField label="纸质表决票用印 *" value={draft.configuration.paperBallotSealRequired == null ? "" : String(draft.configuration.paperBallotSealRequired)} onChange={(value) => updateConfiguration((current) => ({ ...current, paperBallotSealRequired: value === "true" }))} options={[["true", "规则明确要求用印"], ["false", "规则未要求用印"]]} /></section>

            <section className="border-t pt-5"><h3 className="font-semibold">计票门槛</h3><p className="mt-1 text-sm text-muted-foreground">“超过”和“达到及超过”在临界票上结果不同，必须按原件分别选择。</p>{(["GENERAL", "MAJOR"] as DecisionType[]).map((type) => <div key={type} className="mt-5"><h4 className="text-sm font-semibold">{DECISION_LABEL[type]}</h4><div className="mt-2 divide-y border-y">{THRESHOLD_LABEL.map((item) => { const threshold = draft.configuration.countingRules[type]?.[item.key] ?? emptyThreshold(); return <div key={item.key} className="grid gap-3 py-3 md:grid-cols-[180px_1fr_1fr_1.4fr] md:items-center"><span className="text-sm">{item.label}</span><Input aria-label={`${item.label}分子`} type="number" min={0} placeholder="分子" value={threshold.numerator ?? ""} onChange={(event) => updateThreshold(type, item.key, { numerator: event.target.value === "" ? null : Number(event.target.value) })} /><Input aria-label={`${item.label}分母`} type="number" min={1} placeholder="分母" value={threshold.denominator ?? ""} onChange={(event) => updateThreshold(type, item.key, { denominator: event.target.value === "" ? null : Number(event.target.value) })} /><select className="h-10 rounded-md border bg-background px-3 text-sm" value={threshold.comparison ?? ""} onChange={(event) => updateThreshold(type, item.key, { comparison: event.target.value as ThresholdComparison })}><option value="">选择比较关系</option><option value="AT_LEAST">达到及超过</option><option value="GREATER_THAN">超过</option></select></div>; })}</div></div>)}</section>

            <section className="border-t pt-5"><h3 className="font-semibold">原件条款对应关系</h3><p className="mt-1 text-sm text-muted-foreground">主任或副主任将按这些页码和条款逐项核对；附件上传本身不能代替确认。</p><div className="mt-3 divide-y border-y">{RULE_CONFIGURATION_FIELDS.map((field) => { const source = draft.configuration.sourceClauseReferences[field] ?? { pageNumber: null, clause: "" }; return <div key={field} className="grid gap-3 py-3 md:grid-cols-[240px_120px_1fr] md:items-center"><span className="text-sm font-medium">{SOURCE_LABEL[field]}</span><Input aria-label={`${SOURCE_LABEL[field]}页码`} type="number" min={1} placeholder="页码" value={source.pageNumber ?? ""} onChange={(event) => updateConfiguration((current) => ({ ...current, sourceClauseReferences: { ...current.sourceClauseReferences, [field]: { ...source, pageNumber: event.target.value === "" ? null : Number(event.target.value) } } }))} /><Input aria-label={`${SOURCE_LABEL[field]}条款`} placeholder="填写原件条款号或可核对原文位置" value={source.clause} onChange={(event) => updateConfiguration((current) => ({ ...current, sourceClauseReferences: { ...current.sourceClauseReferences, [field]: { ...source, clause: event.target.value } } }))} /></div>; })}</div></section>

            <div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={() => setDraftOpen(false)}>取消</Button><Button type="submit" disabled={busy === "create"}>{busy === "create" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileUp className="mr-2 size-4" />}归档草稿</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewRule != null} onOpenChange={(open) => { if (!open) setReviewRule(null); }}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>逐项核对议事规则</DialogTitle><DialogDescription>核对原件页码、条款与结构化内容一致后逐项确认。确认人必须是当前有权的主任或副主任。</DialogDescription></DialogHeader><div className="divide-y border-y">{confirmations.map((item) => <div key={item.field} className="grid gap-3 py-3 md:grid-cols-[210px_1fr_auto] md:items-center"><div><div className="text-sm font-medium">{SOURCE_LABEL[item.field]}</div><div className="mt-1 text-xs text-muted-foreground">原件第 {item.sourcePageNumber} 页</div></div><div className="text-sm leading-6">{item.sourceClause}</div><div>{item.status === "CONFIRMED" ? <StatusChip tone="success"><CheckCircle2 className="mr-1 size-3" />已核对</StatusChip> : <Button size="sm" variant="outline" disabled={busy === `confirm-${item.field}`} onClick={() => void confirmField(item.field)}>确认一致</Button>}</div></div>)}</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setReviewRule(null)}>关闭</Button><Button disabled={confirmations.length !== RULE_CONFIGURATION_FIELDS.length || confirmations.some((item) => item.status !== "CONFIRMED") || busy === "activate"} onClick={() => void activate()}><ShieldCheck className="mr-2 size-4" />启用此版本</Button></div></DialogContent>
      </Dialog>
    </>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <div className="space-y-1.5"><Label>{label}</Label><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}><option value="">请选择</option>{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></div>;
}
