// 关联业务：让业委会主任凭业主大会决议发起模式配置或变更，并由街道办审核执行。
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Eye,
  FileText,
  History,
  Loader2,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, ModeChip, SectionCard, StatusChip, type Tone } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";
import {
  createPropertyManagementModeChange,
  deletePropertyManagementModeChangeMaterial,
  listPropertyManagementModeChanges,
  previewPropertyManagementModeChangeMaterial,
  reviewPropertyManagementModeChange,
  revisePropertyManagementModeChange,
  submitPropertyManagementModeChange,
  uploadPropertyManagementModeChangeMaterial,
  type PropertyManagementModeChange,
  type PropertyManagementModeChangeDecision,
  type PropertyManagementModeChangeMaterialType,
} from "../../lib/property-management-mode";
import { useStore } from "../../lib/store";
import { mapPropertyMode, MODE_META, type BackendPropertyManagementMode } from "../../lib/types";

const MODE_OPTIONS: Array<{ value: BackendPropertyManagementMode; label: string; description: string }> = [
  { value: "LUMP_SUM", label: MODE_META.package.label, description: "物业自负盈亏，按规则公示公共收益。" },
  { value: "FUND_RAISING", label: MODE_META.reward.label, description: "物业酬金与开支按业主大会决议和规则监督。" },
  { value: "TRUST", label: MODE_META.trust.label, description: "公共资金按信托规则管理并穿透公示。" },
];

const MATERIAL_OPTIONS: Array<{ value: PropertyManagementModeChangeMaterialType; label: string }> = [
  { value: "OWNERS_ASSEMBLY_RESOLUTION", label: "业主大会决议材料" },
  { value: "SUPPORTING_EVIDENCE", label: "补充证明材料" },
];

const STATUS_LABEL: Record<PropertyManagementModeChange["status"], string> = {
  DRAFT: "草稿待完善",
  SUBMITTED: "待属地审核",
  RETURNED: "已退回补正",
  REJECTED: "已驳回",
  EXECUTED: "已执行生效",
};

function isEditable(status: PropertyManagementModeChange["status"]): boolean {
  return status === "DRAFT" || status === "RETURNED";
}

function isActive(status: PropertyManagementModeChange["status"]): boolean {
  return status === "DRAFT" || status === "SUBMITTED" || status === "RETURNED";
}

function statusTone(status: PropertyManagementModeChange["status"]): Tone {
  switch (status) {
    case "EXECUTED":
      return "success";
    case "SUBMITTED":
      return "warning";
    case "RETURNED":
      return "info";
    case "REJECTED":
      return "danger";
    default:
      return "neutral";
  }
}

function formatTime(value?: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function materialLabel(type: PropertyManagementModeChangeMaterialType): string {
  return MATERIAL_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

function auditLabel(eventType: string): string {
  return ({
    REQUEST_CREATED: "已创建申请草稿",
    REQUEST_REVISED: "已更新申请资料",
    MATERIAL_UPLOADED: "已上传证明材料",
    MATERIAL_REMOVED: "已删除证明材料",
    REQUEST_SUBMITTED: "已提交属地审核",
    REQUEST_RETURNED: "属地审核退回补正",
    REQUEST_REJECTED: "属地审核驳回",
    MODE_EXECUTED: "属地审核并执行模式",
  } as Record<string, string>)[eventType] ?? eventType;
}

export function PropertyManagementModeGovernance() {
  const {
    community,
    mode,
    hasPermission,
    applyAuthoritativePropertyMode,
  } = useStore();
  const [changes, setChanges] = useState<PropertyManagementModeChange[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [requestedMode, setRequestedMode] = useState<BackendPropertyManagementMode | null>(null);
  const [resolutionReference, setResolutionReference] = useState("");
  const [changeReason, setChangeReason] = useState("");
  const [materialType, setMaterialType] = useState<PropertyManagementModeChangeMaterialType>(
    "OWNERS_ASSEMBLY_RESOLUTION",
  );
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);

  const activeRequest = useMemo(
    () => changes.find((change) => isActive(change.status)) ?? null,
    [changes],
  );
  const selected = useMemo(
    () => changes.find((change) => change.requestId === selectedId) ?? activeRequest ?? changes[0] ?? null,
    [activeRequest, changes, selectedId],
  );
  const canSubmit = hasPermission("property:management-mode:submit");
  const canReview = hasPermission("property:management-mode:review");
  const canExecute = hasPermission("property:management-mode:execute");
  const editableRequest = activeRequest && isEditable(activeRequest.status) ? activeRequest : null;
  const hasResolution = editableRequest?.materials.some(
    (material) => material.materialType === "OWNERS_ASSEMBLY_RESOLUTION",
  ) ?? false;
  const isInitialConfiguration = mode === "unconfigured";

  async function load(preferredId?: number) {
    setLoading(true);
    try {
      const next = await listPropertyManagementModeChanges();
      setChanges(next);
      setSelectedId((current) => {
        if (preferredId && next.some((item) => item.requestId === preferredId)) return preferredId;
        if (current && next.some((item) => item.requestId === current)) return current;
        return next.find((item) => isActive(item.status))?.requestId ?? next[0]?.requestId ?? null;
      });
      const effectiveMode = next[0]?.effectivePropertyMode;
      if (effectiveMode !== undefined) applyAuthoritativePropertyMode(effectiveMode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "物业管理模式记录加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [community.id]);

  useEffect(() => {
    if (!editableRequest) {
      setRequestedMode(null);
      setResolutionReference("");
      setChangeReason("");
      return;
    }
    setRequestedMode(editableRequest.requestedPropertyMode);
    setResolutionReference(editableRequest.ownersAssemblyResolutionReference);
    setChangeReason(editableRequest.changeReason);
  }, [editableRequest?.requestId]);

  function updateChange(updated: PropertyManagementModeChange) {
    setChanges((current) => [
      updated,
      ...current.filter((item) => item.requestId !== updated.requestId),
    ]);
    setSelectedId(updated.requestId);
  }

  function validateDraft(): BackendPropertyManagementMode | null {
    if (!requestedMode) {
      toast.error("请选择拟采用的唯一物业管理模式");
      return null;
    }
    if (!resolutionReference.trim()) {
      toast.error("请填写业主大会决议文件编号或归档标识");
      return null;
    }
    if (changeReason.trim().length < 5) {
      toast.error("请说明模式配置或变更原因");
      return null;
    }
    return requestedMode;
  }

  async function saveDraft() {
    const target = validateDraft();
    if (!target) return;
    setWorking("save");
    try {
      const input = {
        requestedPropertyMode: target,
        ownersAssemblyResolutionReference: resolutionReference.trim(),
        changeReason: changeReason.trim(),
        expectedVersion: editableRequest?.version,
      };
      const updated = editableRequest
        ? await revisePropertyManagementModeChange(editableRequest.requestId, input)
        : await createPropertyManagementModeChange(input);
      updateChange(updated);
      toast.success(editableRequest ? "模式申请已保存" : "模式申请草稿已创建，请上传业主大会决议材料");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存模式申请失败");
    } finally {
      setWorking(null);
    }
  }

  async function uploadMaterial() {
    if (!editableRequest || !materialFile) {
      toast.error("请先选择要上传的证明材料");
      return;
    }
    setWorking("upload");
    try {
      await uploadPropertyManagementModeChangeMaterial(
        editableRequest.requestId,
        materialType,
        materialFile,
      );
      setMaterialFile(null);
      setFileInputKey((value) => value + 1);
      await load(editableRequest.requestId);
      toast.success("证明材料已上传");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传证明材料失败");
    } finally {
      setWorking(null);
    }
  }

  async function deleteMaterial(materialId: number) {
    if (!editableRequest) return;
    setWorking(`delete-${materialId}`);
    try {
      await deletePropertyManagementModeChangeMaterial(editableRequest.requestId, materialId);
      await load(editableRequest.requestId);
      toast.success("证明材料已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除证明材料失败");
    } finally {
      setWorking(null);
    }
  }

  async function previewMaterial(requestId: number, materialId: number) {
    try {
      const preview = await previewPropertyManagementModeChangeMaterial(requestId, materialId);
      window.open(preview.previewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "材料预览失败");
    }
  }

  async function submit() {
    if (!editableRequest) return;
    if (!hasResolution) {
      toast.error("提交前必须上传业主大会决议材料");
      return;
    }
    setWorking("submit");
    try {
      const updated = await submitPropertyManagementModeChange(
        editableRequest.requestId,
        editableRequest.version,
      );
      updateChange(updated);
      toast.success("模式申请已提交属地审核");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交模式申请失败");
    } finally {
      setWorking(null);
    }
  }

  async function review(decision: PropertyManagementModeChangeDecision) {
    if (!selected || selected.status !== "SUBMITTED") return;
    if (decision !== "EXECUTE" && reviewComment.trim().length < 1) {
      toast.error("退回或驳回时必须填写审核意见");
      return;
    }
    if (decision === "EXECUTE" && !canExecute) {
      toast.error("当前工作身份没有执行物业管理模式的权限");
      return;
    }
    setWorking(`review-${decision}`);
    try {
      const updated = await reviewPropertyManagementModeChange(selected.requestId, {
        decision,
        reviewComment: reviewComment.trim() || undefined,
        expectedVersion: selected.version,
      });
      updateChange(updated);
      setReviewComment("");
      if (decision === "EXECUTE") {
        applyAuthoritativePropertyMode(updated.effectivePropertyMode);
      }
      toast.success(
        decision === "EXECUTE" ? "物业管理模式已由属地执行生效" : decision === "RETURN" ? "申请已退回补正" : "申请已驳回",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "审核处理失败");
    } finally {
      setWorking(null);
    }
  }

  if (loading) {
    return <div className="grid min-h-72 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="物业管理模式"
        desc="同一小区任一时点只能生效一种模式。注册审核确认初始模式；后续仅业委会主任可凭业主大会决议申请变更，街道办审核并执行。"
        extra={<div className="flex items-center gap-2"><ModeChip mode={mode} /><Button variant="outline" size="sm" onClick={() => void load()} disabled={working !== null}><RefreshCw className="size-4" />刷新</Button></div>}
      >
        <div className={`rounded-md border px-4 py-3 text-sm ${isInitialConfiguration ? "border-amber-200 bg-amber-50 text-amber-950" : "bg-muted/40"}`}>
          {isInitialConfiguration
            ? "当前小区尚未配置物业管理模式，不会以信托制或其他模式作为默认规则。"
            : `当前生效模式：${MODE_META[mode].label}。任何新申请均需由街道办审核执行后才会替换该模式。`}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(340px,0.9fr)]">
        <SectionCard
          title={isInitialConfiguration ? "模式配置申请" : "模式变更申请"}
          desc={canSubmit ? "填写决议归档信息并上传业主大会决议材料后，提交属地审核。" : "只有业委会主任可以新建、补正和提交该申请。"}
        >
          {!canSubmit ? (
            <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              当前工作身份只能查看模式记录和审核结果。
            </div>
          ) : activeRequest?.status === "SUBMITTED" ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-5 text-sm text-amber-950">
              申请已提交属地审核，审核期间不能修改决议材料或模式选择。
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>拟采用的物业管理模式</Label>
                <Select value={requestedMode ?? undefined} onValueChange={(value) => setRequestedMode(value as BackendPropertyManagementMode)}>
                  <SelectTrigger><SelectValue placeholder="请选择唯一模式" /></SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.filter((option) => option.value !== editableRequest?.currentPropertyMode).map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {requestedMode && <p className="text-xs text-muted-foreground">{MODE_OPTIONS.find((item) => item.value === requestedMode)?.description}</p>}
              </div>
              <div className="space-y-2">
                <Label>业主大会决议文件编号或归档标识</Label>
                <Input value={resolutionReference} onChange={(event) => setResolutionReference(event.target.value)} placeholder="例如：业主大会决议 2026-07-001" />
              </div>
              <div className="space-y-2">
                <Label>配置或变更原因</Label>
                <Textarea value={changeReason} onChange={(event) => setChangeReason(event.target.value)} placeholder="说明业主大会形成决议的事项和执行依据" rows={4} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => void saveDraft()} disabled={working !== null}>
                  {working === "save" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
                  {editableRequest ? "保存申请" : "创建申请"}
                </Button>
              </div>

              {editableRequest && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex flex-wrap gap-3">
                    <Select value={materialType} onValueChange={(value) => setMaterialType(value as PropertyManagementModeChangeMaterialType)}>
                      <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                      <SelectContent>{MATERIAL_OPTIONS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input key={fileInputKey} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="max-w-sm" onChange={(event) => setMaterialFile(event.target.files?.[0] ?? null)} />
                    <Button variant="outline" onClick={() => void uploadMaterial()} disabled={working !== null}><Upload className="mr-2 size-4" />上传</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">支持 PDF、JPG、PNG、WebP，单个文件不超过 20MB。提交前必须上传业主大会决议材料。</p>
                  {editableRequest.materials.length === 0 ? (
                    <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">尚未上传证明材料</div>
                  ) : (
                    <div className="divide-y rounded-md border">
                      {editableRequest.materials.map((material) => (
                        <div key={material.materialId} className="flex items-center gap-3 px-3 py-2.5">
                          <FileText className="size-4 shrink-0 text-primary" />
                          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{material.originalFileName}</p><p className="text-xs text-muted-foreground">{materialLabel(material.materialType)} · {formatTime(material.createdAt)}</p></div>
                          <Button variant="ghost" size="icon" title="预览材料" onClick={() => void previewMaterial(editableRequest.requestId, material.materialId)}><Eye className="size-4" /></Button>
                          <Button variant="ghost" size="icon" title="删除材料" onClick={() => void deleteMaterial(material.materialId)} disabled={working !== null}><Trash2 className="size-4" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-end"><Button onClick={() => void submit()} disabled={working !== null || !hasResolution}>{working === "submit" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}提交属地审核</Button></div>
                </div>
              )}
            </div>
          )}
        </SectionCard>

        <SectionCard title="申请记录" desc="同一小区仅可保留一条待处理申请。">
          {changes.length === 0 ? <EmptyState title="暂无模式配置或变更记录" /> : (
            <div className="space-y-2">
              {changes.map((change) => (
                <button key={change.requestId} type="button" onClick={() => setSelectedId(change.requestId)} className={`w-full rounded-md border px-3 py-3 text-left transition-colors ${selected?.requestId === change.requestId ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}>
                  <div className="flex items-center justify-between gap-3"><span className="font-medium">{MODE_META[mapPropertyMode(change.currentPropertyMode)].label} → {MODE_META[mapPropertyMode(change.requestedPropertyMode)].label}</span><StatusChip tone={statusTone(change.status)}>{STATUS_LABEL[change.status]}</StatusChip></div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{change.ownersAssemblyResolutionReference} · {formatTime(change.updatedAt)}</p>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {selected && (
        <SectionCard
          title="申请详情与审核记录"
          desc={`申请编号 ${selected.requestId} · 当前状态：${STATUS_LABEL[selected.status]}`}
          extra={<StatusChip tone={statusTone(selected.status)}>{STATUS_LABEL[selected.status]}</StatusChip>}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <Detail label="当前模式" value={MODE_META[mapPropertyMode(selected.currentPropertyMode)].label} />
            <Detail label="申请模式" value={MODE_META[mapPropertyMode(selected.requestedPropertyMode)].label} />
            <Detail label="决议归档标识" value={selected.ownersAssemblyResolutionReference} />
            <Detail label="提交时间" value={formatTime(selected.submittedAt)} />
          </div>
          <div className="mt-4 rounded-md bg-muted/40 px-4 py-3 text-sm leading-6"><span className="text-muted-foreground">申请原因：</span>{selected.changeReason}</div>
          {selected.reviewComment && <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"><span className="font-medium">审核意见：</span>{selected.reviewComment}</div>}

          {canReview && selected.status === "SUBMITTED" && (
            <div className="mt-5 space-y-3 border-t pt-4">
              <Label>属地审核意见</Label>
              <Textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="退回或驳回时必须说明原因；执行时可补充说明。" rows={3} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="outline" onClick={() => void review("RETURN")} disabled={working !== null}><RotateCcw className="mr-2 size-4" />退回补正</Button>
                <Button variant="outline" className="text-destructive hover:text-destructive" onClick={() => void review("REJECT")} disabled={working !== null}><XCircle className="mr-2 size-4" />驳回申请</Button>
                <Button onClick={() => void review("EXECUTE")} disabled={working !== null || !canExecute}>{working === "review-EXECUTE" ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}审核并执行</Button>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">留存材料</p>
              {selected.materials.length === 0 ? <div className="rounded-md border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">无留存材料</div> : <div className="divide-y rounded-md border">{selected.materials.map((material) => <div key={material.materialId} className="flex items-center gap-3 px-3 py-2.5"><FileText className="size-4 shrink-0 text-primary" /><span className="min-w-0 flex-1 truncate text-sm">{material.originalFileName}</span><StatusChip tone="neutral">{materialLabel(material.materialType)}</StatusChip><Button variant="ghost" size="icon" title="预览材料" onClick={() => void previewMaterial(selected.requestId, material.materialId)}><Eye className="size-4" /></Button></div>)}</div>}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">不可变审核审计</p>
              {selected.audits.length === 0 ? <div className="rounded-md border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">暂无审计记录</div> : <div className="space-y-2">{selected.audits.map((audit) => <div key={audit.auditId} className="rounded-md border px-3 py-2.5"><div className="flex items-center gap-2"><History className="size-4 text-muted-foreground" /><span className="text-sm font-medium">{auditLabel(audit.eventType)}</span></div><p className="mt-1 text-xs text-muted-foreground">账号 {audit.actorAccountId} · {formatTime(audit.createdAt)}</p></div>)}</div>}
            </div>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-md bg-muted/40 px-3 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm font-medium">{value}</p></div>;
}
