// 关联业务：施工单位按已生效合同查看维修工程，并提交施工取证、材料进场和结构化竣工结算。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  FileUp,
  Inbox,
  Loader2,
  PackageCheck,
  Plus,
  RefreshCw,
  Trash2,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextView } from "../../common/RichTextEditor";
import { Money, SectionCard, StatusChip, type Tone } from "../../gov/common";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";
import {
  getSupplierRepairProject,
  listSupplierRepairProjects,
  postRepairProjectAction,
  uploadRepairProjectAttachment,
  type RepairProjectAttachment,
  type RepairProjectStage,
  type RepairProjectStatus,
  type RepairWorkPoint,
  type RepairSupplierProjectDetails,
  type RepairSupplierProjectSummary,
} from "../../../lib/repair-project";

const STATUS_META: Record<RepairProjectStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "方案编制", tone: "neutral" },
  PLAN_LOCKED: { label: "方案已锁定", tone: "info" },
  GOVERNANCE_IN_PROGRESS: { label: "业主决策中", tone: "warning" },
  AUTHORIZED: { label: "已授权", tone: "info" },
  CONTRACT_EFFECTIVE: { label: "待开工", tone: "warning" },
  IN_PROGRESS: { label: "施工中", tone: "primary" },
  PENDING_ACCEPTANCE: { label: "待验收", tone: "warning" },
  COMPLETED: { label: "已验收", tone: "success" },
  WARRANTY: { label: "质保期", tone: "success" },
  ARCHIVED: { label: "已归档", tone: "neutral" },
  CANCELLED: { label: "已取消", tone: "danger" },
};

const STAGE_LABEL: Record<RepairProjectStage, string> = {
  BEFORE_CONSTRUCTION: "施工前",
  MATERIAL_ENTRY: "材料进场",
  DURING_CONSTRUCTION: "施工中",
  CONCEALED_WORK: "隐蔽工程",
  COMPLETION: "完工",
  ACCEPTANCE: "验收",
};

type OperationMode = "EXECUTION" | "MATERIAL" | "SETTLEMENT";

function nowLocal(): string {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return date.toISOString().slice(0, 16);
}

function isPercentageTaxRate(value: string): boolean {
  const normalized = value.trim();
  return /^(?:0|[1-9]\d*)(?:\.\d{1,3})?$/.test(normalized)
    && Number(normalized) >= 0
    && Number(normalized) <= 100;
}

function ProjectFileField({
  projectId,
  label,
  value,
  accept = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx",
  onUploaded,
}: {
  projectId: number;
  label: string;
  value: RepairProjectAttachment | null;
  accept?: string;
  onUploaded: (attachment: RepairProjectAttachment) => void;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div>
      <Label>{label}</Label>
      <label className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 text-sm hover:bg-muted/40">
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate">{value?.originalFileName ?? "选择并上传原始文件"}</span>
        <Input
          className="hidden"
          type="file"
          accept={accept}
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setUploading(true);
            uploadRepairProjectAttachment(projectId, file)
              .then(onUploaded)
              .catch((error) => toast.error(error instanceof Error ? error.message : "文件上传失败"))
              .finally(() => setUploading(false));
          }}
        />
      </label>
    </div>
  );
}

function OperationSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t pt-5 first:border-t-0 first:pt-0">
      <h4 className="mb-4 text-sm font-semibold">{title}</h4>
      {children}
    </section>
  );
}

export function SupplierProjectWorkbench() {
  const [projects, setProjects] = useState<RepairSupplierProjectSummary[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [details, setDetails] = useState<RepairSupplierProjectDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  async function loadDetails(projectId: number) {
    setDetailLoading(true);
    try {
      setDetails(await getSupplierRepairProject(projectId));
    } catch (error) {
      setDetails(null);
      toast.error(error instanceof Error ? error.message : "工程详情加载失败");
    } finally {
      setDetailLoading(false);
    }
  }

  async function reload() {
    setLoading(true);
    try {
      const data = await listSupplierRepairProjects();
      setProjects(data);
      const nextId = data.some((item) => item.project.projectId === selectedId)
        ? selectedId
        : data[0]?.project.projectId ?? null;
      setSelectedId(nextId);
      if (nextId != null) await loadDetails(nextId);
      else setDetails(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "签约工程加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <SectionCard
        title="本企业签约工程"
        extra={(
          <Button size="icon" variant="ghost" title="刷新签约工程" onClick={() => void reload()} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          </Button>
        )}
        bodyClassName="p-0"
      >
        {loading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-14 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />加载中
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center px-5 py-14 text-center">
            <Inbox className="mb-3 size-8 text-muted-foreground/60" />
            <div className="text-sm font-medium">暂无已生效合同工程</div>
          </div>
        ) : (
          <div className="divide-y">
            {projects.map(({ project, contract }) => {
              const meta = STATUS_META[project.status];
              return (
                <button
                  key={project.projectId}
                  type="button"
                  onClick={() => {
                    setSelectedId(project.projectId);
                    void loadDetails(project.projectId);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-muted/40 ${selectedId === project.projectId ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{project.projectName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{project.projectNo}</div>
                    </div>
                    <StatusChip tone={meta.tone}>{meta.label}</StatusChip>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{project.workflowType === "BUILDING_REPAIR" ? "楼栋维修" : "小区公共维修"}</span>
                    <Money value={Number(contract.contractAmount)} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={details?.project.projectName ?? "工程执行"}
        desc={details ? `${details.project.projectNo} · ${details.contract.supplierName}` : undefined}
        bodyClassName="min-h-[420px]"
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />加载工程档案
          </div>
        ) : details ? (
          <SupplierProjectOperations details={details} onChanged={() => loadDetails(details.project.projectId)} />
        ) : (
          <div className="py-20 text-center text-sm text-muted-foreground">请选择签约工程</div>
        )}
      </SectionCard>
    </div>
  );
}

interface SettlementLineDraft {
  clientId: string;
  workPointId: number | null;
  actualQuantity: string;
  unit: string;
  actualUnitPrice: string;
  varianceReason: string;
}

let settlementLineSequence = 0;

function emptySettlementLine(): SettlementLineDraft {
  settlementLineSequence += 1;
  return {
    clientId: `settlement-line-${settlementLineSequence}`,
    workPointId: null,
    actualQuantity: "",
    unit: "",
    actualUnitPrice: "",
    varianceReason: "",
  };
}

function SupplierProjectOperations({
  details,
  onChanged,
}: {
  details: RepairSupplierProjectDetails;
  onChanged: () => Promise<void>;
}) {
  const project = details.project;
  const [mode, setMode] = useState<OperationMode>("EXECUTION");
  const [busy, setBusy] = useState<string | null>(null);
  const [workPointId, setWorkPointId] = useState("");
  const [stage, setStage] = useState<RepairProjectStage>("BEFORE_CONSTRUCTION");
  const [description, setDescription] = useState("");
  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [evidence, setEvidence] = useState<RepairProjectAttachment | null>(null);
  const [materialName, setMaterialName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [specification, setSpecification] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [manufacturer, setManufacturer] = useState("");
  const [qualification, setQualification] = useState<RepairProjectAttachment | null>(null);
  const [materialPhoto, setMaterialPhoto] = useState<RepairProjectAttachment | null>(null);
  const [settlementFile, setSettlementFile] = useState<RepairProjectAttachment | null>(null);
  const [settlementTaxRate, setSettlementTaxRate] = useState("");
  const [settlementLines, setSettlementLines] = useState<SettlementLineDraft[]>([]);
  const workPointById = useMemo(
    () => new Map(details.workPoints.map((point) => [point.workPointId, point])),
    [details.workPoints],
  );

  useEffect(() => {
    setWorkPointId("");
    setSettlementTaxRate("");
    setSettlementLines([]);
    setEvidence(null);
    setQualification(null);
    setMaterialPhoto(null);
    setSettlementFile(null);
  }, [project.projectId, project.activePlanId]);

  const verifiedRecordCount = details.execution.executionRecords
    .filter((record) => record.verificationStatus === "VERIFIED").length;
  const verifiedMaterialCount = details.execution.materialInspections
    .filter((record) => record.status === "VERIFIED").length;
  const canSubmit = project.status === "IN_PROGRESS";

  async function run<T>(key: string, action: () => Promise<T>, success: string) {
    setBusy(key);
    try {
      await action();
      toast.success(success);
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setBusy(null);
    }
  }

  function updateSettlementLine(clientId: string, field: keyof SettlementLineDraft, value: string | number | null) {
    setSettlementLines((current) => current.map((line) => line.clientId === clientId ? { ...line, [field]: value } : line));
  }

  const settlementPayload = useMemo(() => settlementLines.map((line) => ({
    workPointId: line.workPointId ?? undefined,
    actualQuantity: Number(line.actualQuantity),
    unit: line.unit.trim(),
    actualUnitPrice: Number(line.actualUnitPrice),
    varianceReason: line.varianceReason.trim() || undefined,
  })), [settlementLines]);
  const settlementTaxRateNumber = Number(settlementTaxRate);
  const settlementValid = settlementPayload.length > 0
    && isPercentageTaxRate(settlementTaxRate)
    && settlementPayload.every((line) =>
      (line.workPointId == null || workPointById.has(line.workPointId))
      && Number.isFinite(line.actualQuantity) && line.actualQuantity >= 0
      && Boolean(line.unit)
      && Number.isFinite(line.actualUnitPrice) && line.actualUnitPrice >= 0);

  const scopeLabel = project.scopeType === "COMMUNITY"
    ? "全小区公共范围"
    : project.scopeType === "BUILDING_UNIT" ? "楼栋单元范围" : "楼栋范围";

  return (
    <div className="space-y-5">
      <div className="grid gap-3 border-b pb-5 sm:grid-cols-2 lg:grid-cols-4">
        <ProjectFact icon={<Building2 className="size-4" />} label="项目范围" value={scopeLabel} />
        <ProjectFact icon={<Wrench className="size-4" />} label="维修点位" value={`${details.workPoints.length} 个`} />
        <ProjectFact icon={<PackageCheck className="size-4" />} label="已核验过程" value={`${verifiedRecordCount} 条记录 · ${verifiedMaterialCount} 条材料`} />
        <ProjectFact icon={<FileUp className="size-4" />} label="合同金额" value={`¥${Number(details.contract.contractAmount).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`} />
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div><span className="text-muted-foreground">锁定方案：</span>第 {details.activePlan.versionNo} 版</div>
        <div><span className="text-muted-foreground">维修点位关联：</span>过程、材料和结算均可记录项目通用事项</div>
        <div className="sm:col-span-2"><div className="mb-1 text-muted-foreground">问题与维修方案</div><RichTextView html={details.activePlan.planDescription} /></div>
      </div>

      {canSubmit ? (
        <>
          <ToggleGroup type="single" variant="outline" value={mode} onValueChange={(value) => value && setMode(value as OperationMode)} className="w-full sm:w-auto">
            <ToggleGroupItem value="EXECUTION">施工记录</ToggleGroupItem>
            <ToggleGroupItem value="MATERIAL">材料进场</ToggleGroupItem>
            <ToggleGroupItem value="SETTLEMENT">竣工结算</ToggleGroupItem>
          </ToggleGroup>

          {mode === "EXECUTION" && (
            <OperationSection title="提交施工阶段原始记录">
              <div className="grid gap-4 md:grid-cols-2">
                <ProjectWorkPointSelect workPoints={details.workPoints} value={workPointId} onValueChange={setWorkPointId} />
                <div><Label>施工阶段</Label><Select value={stage} onValueChange={(value) => setStage(value as RepairProjectStage)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(STAGE_LABEL).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
                <div><Label>发生时间</Label><Input type="datetime-local" value={occurredAt} onChange={(event) => setOccurredAt(event.target.value)} /></div>
                <ProjectFileField projectId={project.projectId} label="阶段原始证据" value={evidence} onUploaded={setEvidence} />
                <div className="md:col-span-2"><Label>现场记录</Label><Textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} /></div>
                <Button disabled={busy !== null || !description.trim() || !evidence} onClick={() => void run("execution", () => postRepairProjectAction(project.projectId, "execution-records", { workPointId: workPointId ? Number(workPointId) : undefined, stage, description, occurredAt, attachmentIds: [evidence?.attachmentId] }), "施工记录已提交，等待物业核验")}>{busy === "execution" && <Loader2 className="mr-1 size-4 animate-spin" />}提交施工记录</Button>
              </div>
            </OperationSection>
          )}

          {mode === "MATERIAL" && (
            <OperationSection title="提交材料进场原始记录">
              <div className="grid gap-4 md:grid-cols-3">
                <ProjectWorkPointSelect workPoints={details.workPoints} value={workPointId} onValueChange={setWorkPointId} />
                <div><Label>材料名称</Label><Input value={materialName} onChange={(event) => setMaterialName(event.target.value)} /></div>
                <div><Label>品牌</Label><Input value={brand} onChange={(event) => setBrand(event.target.value)} /></div>
                <div><Label>型号</Label><Input value={model} onChange={(event) => setModel(event.target.value)} /></div>
                <div><Label>规格</Label><Input value={specification} onChange={(event) => setSpecification(event.target.value)} /></div>
                <div><Label>生产厂家</Label><Input value={manufacturer} onChange={(event) => setManufacturer(event.target.value)} /></div>
                <div><Label>数量</Label><Input type="number" min="0.001" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></div>
                <div><Label>单位</Label><Input value={unit} onChange={(event) => setUnit(event.target.value)} /></div>
                <ProjectFileField projectId={project.projectId} label="材料合格证明" value={qualification} onUploaded={setQualification} />
                <ProjectFileField projectId={project.projectId} label="材料进场照片" value={materialPhoto} accept="image/*" onUploaded={setMaterialPhoto} />
                <div className="flex items-end"><Button disabled={busy !== null || !materialName.trim() || !brand.trim() || !model.trim() || !specification.trim() || !manufacturer.trim() || Number(quantity) <= 0 || !unit.trim() || !qualification || !materialPhoto} onClick={() => void run("material", () => postRepairProjectAction(project.projectId, "material-inspections", { workPointId: workPointId ? Number(workPointId) : undefined, materialName, brand, model, specification, quantity: Number(quantity), unit, manufacturer, qualificationAttachmentId: qualification?.attachmentId, photoAttachmentIds: [materialPhoto?.attachmentId] }), "材料记录已提交，等待物业核验")}>{busy === "material" && <Loader2 className="mr-1 size-4 animate-spin" />}提交材料记录</Button></div>
              </div>
            </OperationSection>
          )}

          {mode === "SETTLEMENT" && (
            <OperationSection title="提交结构化竣工结算">
              {details.execution.settlement ? (
                <div className="rounded-md border px-4 py-3 text-sm">第 {details.execution.settlement.versionNo} 版结算已提交，当前状态：<StatusChip tone={details.execution.settlement.status === "VERIFIED" ? "success" : details.execution.settlement.status === "REJECTED" ? "danger" : "warning"} className="ml-2">{details.execution.settlement.status === "VERIFIED" ? "物业已核验" : details.execution.settlement.status === "REJECTED" ? "已退回" : "待物业核验"}</StatusChip></div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2"><ProjectFileField projectId={project.projectId} label="竣工结算原件" value={settlementFile} onUploaded={setSettlementFile} /><div><Label>结算单税率（%）</Label><Input type="number" min="0" max="100" step="0.001" value={settlementTaxRate} onChange={(event) => setSettlementTaxRate(event.target.value)} /></div></div>
                  <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">每条结算专业明细可关联维修点位，也可如实记录项目通用事项。</p><Button type="button" size="sm" variant="outline" onClick={() => setSettlementLines((current) => [...current, emptySettlementLine()])}><Plus className="size-4" />新增结算明细</Button></div>
                  {settlementLines.length === 0 ? <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">尚未新增结算专业明细。</div> : <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[960px] text-sm"><thead className="bg-muted/50"><tr><th className="p-2 text-left">关联维修点位</th><th className="p-2 text-left">实际数量</th><th className="p-2 text-left">单位</th><th className="p-2 text-left">实际单价</th><th className="p-2 text-left">差异原因</th><th className="p-2 text-right">操作</th></tr></thead><tbody>{settlementLines.map((line) => <tr key={line.clientId} className="border-t"><td className="p-2"><ProjectWorkPointSelect compact workPoints={details.workPoints} value={line.workPointId == null ? "" : String(line.workPointId)} onValueChange={(value) => updateSettlementLine(line.clientId, "workPointId", value ? Number(value) : null)} /></td><td className="p-2"><Input type="number" min="0" value={line.actualQuantity} onChange={(event) => updateSettlementLine(line.clientId, "actualQuantity", event.target.value)} /></td><td className="p-2"><Input value={line.unit} onChange={(event) => updateSettlementLine(line.clientId, "unit", event.target.value)} /></td><td className="p-2"><Input type="number" min="0" value={line.actualUnitPrice} onChange={(event) => updateSettlementLine(line.clientId, "actualUnitPrice", event.target.value)} /></td><td className="p-2"><Input value={line.varianceReason} onChange={(event) => updateSettlementLine(line.clientId, "varianceReason", event.target.value)} /></td><td className="p-2 text-right"><Button type="button" size="icon" variant="ghost" title="删除结算明细" onClick={() => setSettlementLines((current) => current.filter((candidate) => candidate.clientId !== line.clientId))}><Trash2 className="size-4" /></Button></td></tr>)}</tbody></table></div>}
                  <Button disabled={busy !== null || !settlementFile || !settlementValid} onClick={() => void run("settlement", () => postRepairProjectAction(project.projectId, "settlement", { settlementAttachmentId: settlementFile?.attachmentId, taxRate: settlementTaxRateNumber, items: settlementPayload }), "竣工结算已提交，等待物业核验")}>{busy === "settlement" && <Loader2 className="mr-1 size-4 animate-spin" />}提交竣工结算</Button>
                </div>
              )}
            </OperationSection>
          )}
        </>
      ) : <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">当前项目处于“{STATUS_META[project.status].label}”，施工单位仅可查看已归档工程资料。</div>}

      <OperationSection title="已提交记录">
        <div className="space-y-2">
          {details.execution.executionRecords.map((record) => <div key={`record-${record.recordId}`} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0"><div className="min-w-0"><span className="font-medium">{STAGE_LABEL[record.stage]}</span><span className="ml-2 text-muted-foreground">{record.workPointId == null ? "项目通用事项" : workPointById.get(record.workPointId)?.businessName ?? `维修点位 #${record.workPointId}`} · {record.description}</span></div><VerificationChip status={record.verificationStatus} /></div>)}
          {details.execution.materialInspections.map((material) => <div key={`material-${material.inspectionId}`} className="flex items-center justify-between gap-3 border-b py-2 text-sm last:border-b-0"><div><span className="font-medium">{material.materialName}</span><span className="ml-2 text-muted-foreground">{material.workPointId == null ? "项目通用事项" : workPointById.get(material.workPointId)?.businessName ?? `维修点位 #${material.workPointId}`} · {material.brand} · {material.specification}</span></div><VerificationChip status={material.status} /></div>)}
          {details.execution.executionRecords.length === 0 && details.execution.materialInspections.length === 0 && <div className="py-5 text-center text-sm text-muted-foreground">尚未提交施工或材料记录</div>}
        </div>
      </OperationSection>
    </div>
  );
}

function ProjectFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

function ProjectWorkPointSelect({
  workPoints,
  value,
  onValueChange,
  compact = false,
}: {
  workPoints: RepairWorkPoint[];
  value: string;
  onValueChange: (value: string) => void;
  compact?: boolean;
}) {
  return (
    <div>
      {!compact && <Label>关联维修点位（可选）</Label>}
      <Select value={value || "__PROJECT_WIDE__"} onValueChange={(nextValue) => onValueChange(nextValue === "__PROJECT_WIDE__" ? "" : nextValue)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="__PROJECT_WIDE__">项目通用事项</SelectItem>{workPoints.map((point) => <SelectItem key={point.workPointId} value={String(point.workPointId)}>{point.businessName}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function VerificationChip({ status }: { status: "PENDING" | "VERIFIED" | "REJECTED" }) {
  const meta = status === "VERIFIED"
    ? { label: "物业已核验", tone: "success" as Tone }
    : status === "REJECTED"
      ? { label: "物业已退回", tone: "danger" as Tone }
      : { label: "待物业核验", tone: "warning" as Tone };
  return <StatusChip tone={meta.tone}>{meta.label}</StatusChip>;
}
