"use client";

// 关联业务：让新小区在物业角色授权前完成物业服务组织登记、材料留存和属地企业核验。
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Building2,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  FileUp,
  Landmark,
  Loader2,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
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
import { useStore } from "../../lib/store";
import {
  createPropertyServiceOrganization,
  deletePropertyServiceOrganizationMaterial,
  getPropertyServiceEnterpriseVerificationProvider,
  listPropertyServiceOrganizations,
  previewPropertyServiceOrganizationMaterial,
  revisePropertyServiceOrganization,
  submitPropertyServiceOrganization,
  uploadPropertyServiceOrganizationMaterial,
  verifyPropertyServiceOrganizationManually,
  verifyPropertyServiceOrganizationWithPlatform,
  type ManualPropertyServiceOrganizationVerificationInput,
  type PropertyServiceEnterpriseVerificationProvider,
  type PropertyServiceOrganization,
  type PropertyServiceOrganizationInput,
  type PropertyServiceOrganizationMaterial,
  type PropertyServiceOrganizationMaterialPreview,
  type PropertyServiceOrganizationMaterialType,
  type PropertyServiceOrganizationStatus,
} from "../../lib/property-service-organization";

const EMPTY_FORM: PropertyServiceOrganizationInput = {
  legalName: "",
  unifiedSocialCreditCode: "",
  projectDeptName: "",
  serviceContactName: "",
  serviceContactPhone: "",
  serviceBasis: "PRELIMINARY_PROPERTY_SERVICE",
  serviceStartDate: new Date().toISOString().slice(0, 10),
  serviceEndDate: "",
};

const STATUS_LABEL: Record<PropertyServiceOrganizationStatus, string> = {
  DRAFT: "草稿待提交",
  PENDING_VERIFICATION: "待属地核验",
  ACTIVE: "已启用",
  REJECTED: "核验退回",
};

const MATERIAL_LABEL: Record<PropertyServiceOrganizationMaterialType, string> = {
  BUSINESS_LICENSE: "营业执照",
  PROPERTY_SERVICE_CONTRACT: "物业服务合同 / 前期物业服务协议",
  OWNERS_ASSEMBLY_DECISION: "业主大会选聘决定",
  OTHER: "其他材料",
};

const BASIS_LABEL = {
  PRELIMINARY_PROPERTY_SERVICE: "前期物业服务",
  OWNERS_ASSEMBLY_SELECTED: "业主大会选聘",
} as const;

function formFromOrganization(organization: PropertyServiceOrganization): PropertyServiceOrganizationInput {
  return {
    legalName: organization.legalName,
    unifiedSocialCreditCode: organization.unifiedSocialCreditCode,
    projectDeptName: organization.projectDeptName,
    serviceContactName: organization.serviceContactName,
    serviceContactPhone: organization.serviceContactPhone,
    serviceBasis: organization.serviceBasis,
    serviceStartDate: organization.serviceStartDate,
    serviceEndDate: organization.serviceEndDate ?? "",
    expectedVersion: organization.version,
  };
}

export function PropertyServiceOrganization() {
  const { hasPermission, roleKey, setPage } = useStore();
  const canSubmit = hasPermission("property:service-organization:submit")
    && ["COMMITTEE_DIRECTOR", "COMMUNITY_ADMIN", "GOV_SUPER_ADMIN"].includes(roleKey ?? "");
  const canVerify = hasPermission("property:service-organization:verify")
    && ["COMMUNITY_ADMIN", "GOV_SUPER_ADMIN"].includes(roleKey ?? "");
  const [organizations, setOrganizations] = useState<PropertyServiceOrganization[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState<PropertyServiceOrganizationInput>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingType, setUploadingType] = useState<PropertyServiceOrganizationMaterialType | null>(null);
  const [preview, setPreview] = useState<PropertyServiceOrganizationMaterialPreview | null>(null);
  const [provider, setProvider] = useState<PropertyServiceEnterpriseVerificationProvider | null>(null);
  const [manualVerification, setManualVerification] = useState<ManualPropertyServiceOrganizationVerificationInput>({
    sourceCode: "GSXT_WEB",
    verificationResult: "PASSED",
    evidenceReference: "",
    remark: "",
  });
  const [platformAuthorizationConfirmed, setPlatformAuthorizationConfirmed] = useState(false);

  const selected = useMemo(
    () => organizations.find((organization) => organization.organizationId === selectedId) ?? organizations[0] ?? null,
    [organizations, selectedId],
  );
  const editable = selected?.status === "DRAFT" || selected?.status === "REJECTED";
  const requiredMaterials = useMemo<PropertyServiceOrganizationMaterialType[]>(() => {
    const basis = selected?.serviceBasis ?? form.serviceBasis;
    return basis === "OWNERS_ASSEMBLY_SELECTED"
      ? ["BUSINESS_LICENSE", "PROPERTY_SERVICE_CONTRACT", "OWNERS_ASSEMBLY_DECISION"]
      : ["BUSINESS_LICENSE", "PROPERTY_SERVICE_CONTRACT"];
  }, [form.serviceBasis, selected?.serviceBasis]);

  async function load() {
    setLoading(true);
    try {
      const next = await listPropertyServiceOrganizations();
      setOrganizations(next);
      setSelectedId((current) => current && next.some((item) => item.organizationId === current)
        ? current
        : next[0]?.organizationId ?? null);
      const nextSelected = next.find((item) => item.organizationId === selectedId) ?? next[0] ?? null;
      setForm(nextSelected ? formFromOrganization(nextSelected) : EMPTY_FORM);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "物业服务组织登记加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (selected) {
      setForm(formFromOrganization(selected));
      return;
    }
    setForm(EMPTY_FORM);
  }, [selected?.organizationId]);

  useEffect(() => {
    if (!canVerify) return;
    getPropertyServiceEnterpriseVerificationProvider().then(setProvider).catch(() => setProvider(null));
  }, [canVerify]);

  function updateForm<Key extends keyof PropertyServiceOrganizationInput>(
    key: Key,
    value: PropertyServiceOrganizationInput[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function replaceOrganization(next: PropertyServiceOrganization) {
    setOrganizations((current) => {
      const exists = current.some((item) => item.organizationId === next.organizationId);
      return exists
        ? current.map((item) => item.organizationId === next.organizationId ? next : item)
        : [next, ...current];
    });
    setSelectedId(next.organizationId);
    setForm(formFromOrganization(next));
  }

  function normalizedInput(expectedVersion?: number): PropertyServiceOrganizationInput {
    return {
      ...form,
      legalName: form.legalName.trim(),
      unifiedSocialCreditCode: form.unifiedSocialCreditCode.trim().toUpperCase(),
      projectDeptName: form.projectDeptName?.trim() || undefined,
      serviceContactName: form.serviceContactName.trim(),
      serviceContactPhone: form.serviceContactPhone.trim(),
      serviceEndDate: form.serviceEndDate || undefined,
      expectedVersion,
    };
  }

  async function saveDraft() {
    if (!canSubmit) return;
    if (!form.legalName.trim() || !form.unifiedSocialCreditCode.trim() || !form.serviceContactName.trim()
      || !form.serviceContactPhone.trim() || !form.serviceStartDate) {
      toast.error("请补全企业、联系人和服务起始日期");
      return;
    }
    setSaving(true);
    try {
      const next = selected && editable
        ? await revisePropertyServiceOrganization(selected.organizationId, normalizedInput(selected.version))
        : await createPropertyServiceOrganization(normalizedInput());
      replaceOrganization(next);
      toast.success(selected && editable ? "物业服务组织登记已保存" : "物业服务组织登记草稿已创建");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存物业服务组织登记失败");
    } finally {
      setSaving(false);
    }
  }

  async function uploadMaterial(materialType: PropertyServiceOrganizationMaterialType, file: File | null) {
    if (!file || !selected || !editable || !canSubmit) return;
    setUploadingType(materialType);
    try {
      await uploadPropertyServiceOrganizationMaterial(selected.organizationId, materialType, file);
      toast.success(`${MATERIAL_LABEL[materialType]}已上传`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "材料上传失败");
    } finally {
      setUploadingType(null);
    }
  }

  async function removeMaterial(material: PropertyServiceOrganizationMaterial) {
    if (!selected || !editable || !canSubmit) return;
    setSaving(true);
    try {
      await deletePropertyServiceOrganizationMaterial(selected.organizationId, material.materialId);
      toast.success("材料已删除");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除材料失败");
    } finally {
      setSaving(false);
    }
  }

  async function previewMaterial(material: PropertyServiceOrganizationMaterial) {
    if (!selected) return;
    try {
      setPreview(await previewPropertyServiceOrganizationMaterial(selected.organizationId, material.materialId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "材料预览失败");
    }
  }

  async function submit() {
    if (!selected || !editable || !canSubmit) return;
    setSaving(true);
    try {
      const next = await submitPropertyServiceOrganization(selected.organizationId, selected.version);
      replaceOrganization(next);
      toast.success("已提交属地企业核验");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交核验失败");
    } finally {
      setSaving(false);
    }
  }

  async function verifyManually() {
    if (!selected || selected.status !== "PENDING_VERIFICATION" || !canVerify) return;
    if (manualVerification.verificationResult === "REJECTED" && !manualVerification.remark?.trim()) {
      toast.error("退回时必须填写核验不通过原因");
      return;
    }
    setSaving(true);
    try {
      const next = await verifyPropertyServiceOrganizationManually(selected.organizationId, {
        ...manualVerification,
        evidenceReference: manualVerification.evidenceReference?.trim() || undefined,
        remark: manualVerification.remark?.trim() || undefined,
      });
      replaceOrganization(next);
      toast.success(next.status === "ACTIVE" ? "核验通过，物业项目部已启用" : "已退回补充材料");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "手工核验失败");
    } finally {
      setSaving(false);
    }
  }

  async function verifyWithPlatform() {
    if (!selected || selected.status !== "PENDING_VERIFICATION" || !canVerify || !platformAuthorizationConfirmed) return;
    setSaving(true);
    try {
      const next = await verifyPropertyServiceOrganizationWithPlatform(selected.organizationId);
      replaceOrganization(next);
      toast.success(next.status === "ACTIVE" ? "平台核验通过，物业项目部已启用" : "平台核验未通过，已退回补充");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "平台核验失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="物业服务组织"
        desc="新小区先登记物业服务企业并留存合同材料；属地核验通过后，系统才启用本小区物业项目部并允许分配物业角色。"
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading || saving}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />刷新
            </Button>
            {canSubmit && (
              <Button onClick={() => void saveDraft()} disabled={saving || !editable && selected !== null}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                {selected && editable ? "保存修改" : "创建登记草稿"}
              </Button>
            )}
          </>
        }
      />

      {!canSubmit && !canVerify && (
        <Alert className="border-blue-200 bg-blue-50 text-blue-950">
          <ShieldCheck className="size-4" />
          <AlertTitle>当前为只读查看</AlertTitle>
          <AlertDescription>物业服务组织由业委会主任、社区管理员或属地监管身份办理；物业角色只能在项目部启用后分配。</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.42fr)]">
        <SectionCard title="登记记录" desc="同一小区只能启用一个有效物业服务组织" bodyClassName="p-0">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />加载中
            </div>
          ) : organizations.length === 0 ? (
            <EmptyState title="尚未登记物业服务组织" desc="完成登记、材料上传和属地核验后，系统将自动创建本小区物业项目部。" />
          ) : (
            <div className="divide-y">
              {organizations.map((organization) => (
                <button
                  key={organization.organizationId}
                  type="button"
                  onClick={() => setSelectedId(organization.organizationId)}
                  className={`w-full px-4 py-3.5 text-left transition-colors hover:bg-muted/50 ${selected?.organizationId === organization.organizationId ? "bg-[#f0f5ff]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{organization.legalName}</div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">{organization.projectDeptName}</div>
                    </div>
                    <OrganizationStatusChip status={organization.status} />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">{BASIS_LABEL[organization.serviceBasis]} · {formatDate(organization.updatedAt)}</div>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard
            title={selected ? "物业服务组织登记" : "登记物业服务组织"}
            desc={selected
              ? `${selected.legalName} · ${STATUS_LABEL[selected.status]}`
              : "填写物业服务企业、合同依据和本小区项目部名称后保存草稿。"}
          >
            {selected?.status === "ACTIVE" ? (
              <ActiveOrganization organization={selected} canAssignRole={hasPermission("admin:role:manage")} onAssignRole={() => setPage("rbac")} />
            ) : (
              <OrganizationForm
                form={form}
                editable={canSubmit && (selected == null || editable)}
                saving={saving}
                rejectionReason={selected?.rejectionReason}
                onChange={updateForm}
              />
            )}
          </SectionCard>

          {selected && (
            <SectionCard
              title="核验材料"
              desc={editable && canSubmit
                ? "保存草稿后可上传材料。仅支持 PDF、JPG、PNG、WebP，单个文件不超过 20MB。"
                : "材料以私有临时链接预览，并保留文件摘要用于审计。"}
            >
              <MaterialList
                organization={selected}
                requiredTypes={requiredMaterials}
                editable={Boolean(editable && canSubmit)}
                saving={saving}
                uploadingType={uploadingType}
                onUpload={uploadMaterial}
                onDelete={removeMaterial}
                onPreview={previewMaterial}
              />
              {editable && canSubmit && (
                <div className="mt-4 flex justify-end border-t pt-4">
                  <Button onClick={() => void submit()} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Send className="mr-2 size-4" />}
                    提交属地核验
                  </Button>
                </div>
              )}
            </SectionCard>
          )}

          {selected?.status === "PENDING_VERIFICATION" && canVerify && (
            <VerificationWorkbench
              provider={provider}
              saving={saving}
              manualVerification={manualVerification}
              platformAuthorizationConfirmed={platformAuthorizationConfirmed}
              onManualChange={setManualVerification}
              onPlatformAuthorizationChange={setPlatformAuthorizationConfirmed}
              onVerifyManually={() => void verifyManually()}
              onVerifyWithPlatform={() => void verifyWithPlatform()}
            />
          )}

          {selected && <VerificationHistory verifications={selected.verifications} />}
        </div>
      </div>

      <MaterialPreviewDialog preview={preview} onOpenChange={(open) => !open && setPreview(null)} />
    </div>
  );
}

function OrganizationForm({
  form,
  editable,
  saving,
  rejectionReason,
  onChange,
}: {
  form: PropertyServiceOrganizationInput;
  editable: boolean;
  saving: boolean;
  rejectionReason?: string | null;
  onChange: <Key extends keyof PropertyServiceOrganizationInput>(key: Key, value: PropertyServiceOrganizationInput[Key]) => void;
}) {
  return (
    <div className="space-y-4">
      {rejectionReason && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <ShieldAlert className="size-4" />
          <AlertTitle>属地核验退回</AlertTitle>
          <AlertDescription>{rejectionReason}</AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="物业服务企业全称" required>
          <Input value={form.legalName} disabled={!editable || saving} maxLength={120} onChange={(event) => onChange("legalName", event.target.value)} placeholder="与营业执照名称一致" />
        </Field>
        <Field label="统一社会信用代码" required>
          <Input value={form.unifiedSocialCreditCode} disabled={!editable || saving} maxLength={18} className="font-mono-num uppercase" onChange={(event) => onChange("unifiedSocialCreditCode", event.target.value.toUpperCase())} placeholder="18 位统一社会信用代码" />
        </Field>
        <Field label="本小区项目部名称">
          <Input value={form.projectDeptName ?? ""} disabled={!editable || saving} maxLength={50} onChange={(event) => onChange("projectDeptName", event.target.value)} placeholder="留空时按企业名称自动生成" />
        </Field>
        <Field label="服务依据" required>
          <Select value={form.serviceBasis} onValueChange={(value) => onChange("serviceBasis", value as PropertyServiceOrganizationInput["serviceBasis"])} disabled={!editable || saving}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PRELIMINARY_PROPERTY_SERVICE">前期物业服务</SelectItem>
              <SelectItem value="OWNERS_ASSEMBLY_SELECTED">业主大会选聘</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="服务联系人" required>
          <Input value={form.serviceContactName} disabled={!editable || saving} maxLength={50} onChange={(event) => onChange("serviceContactName", event.target.value)} placeholder="姓名" />
        </Field>
        <Field label="联系人手机" required>
          <Input value={form.serviceContactPhone} disabled={!editable || saving} inputMode="numeric" maxLength={11} className="font-mono-num" onChange={(event) => onChange("serviceContactPhone", event.target.value.replace(/\D/g, ""))} placeholder="11 位手机号" />
        </Field>
        <Field label="服务开始日期" required>
          <Input type="date" value={form.serviceStartDate} disabled={!editable || saving} onChange={(event) => onChange("serviceStartDate", event.target.value)} />
        </Field>
        <Field label="服务结束日期">
          <Input type="date" value={form.serviceEndDate ?? ""} disabled={!editable || saving} onChange={(event) => onChange("serviceEndDate", event.target.value)} />
        </Field>
      </div>
      <div className="rounded-md bg-muted/60 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
        企业主体可跨小区复用；核验通过后仅创建当前小区的物业项目部。物业经理和物业员工不能挂接到企业根组织、业委会或初始化工作区。
      </div>
    </div>
  );
}

function MaterialList({
  organization,
  requiredTypes,
  editable,
  saving,
  uploadingType,
  onUpload,
  onDelete,
  onPreview,
}: {
  organization: PropertyServiceOrganization;
  requiredTypes: PropertyServiceOrganizationMaterialType[];
  editable: boolean;
  saving: boolean;
  uploadingType: PropertyServiceOrganizationMaterialType | null;
  onUpload: (type: PropertyServiceOrganizationMaterialType, file: File | null) => void;
  onDelete: (material: PropertyServiceOrganizationMaterial) => void;
  onPreview: (material: PropertyServiceOrganizationMaterial) => void;
}) {
  return (
    <div className="space-y-3">
      {requiredTypes.map((type) => {
        const materials = organization.materials.filter((material) => material.materialType === type);
        const hasMaterial = materials.length > 0;
        const inputId = `property-service-material-${organization.organizationId}-${type}`;
        return (
          <div key={type} className="rounded-md border px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                {hasMaterial ? <FileCheck2 className="size-4 text-emerald-600" /> : <FileText className="size-4 text-amber-600" />}
                {MATERIAL_LABEL[type]}
                <StatusChip tone={hasMaterial ? "success" : "warning"}>{hasMaterial ? "已上传" : "待上传"}</StatusChip>
              </div>
              {editable && (
                <>
                  <input
                    id={inputId}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      onUpload(type, event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" disabled={saving || uploadingType !== null} onClick={() => document.getElementById(inputId)?.click()}>
                    {uploadingType === type ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <FileUp className="mr-1.5 size-4" />}
                    {hasMaterial ? "追加材料" : "上传材料"}
                  </Button>
                </>
              )}
            </div>
            {materials.length > 0 && (
              <div className="mt-3 divide-y rounded-md border">
                {materials.map((material) => (
                  <div key={material.materialId} className="flex items-center gap-3 px-3 py-2.5">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm">{material.originalFileName}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{formatFileSize(material.fileSize)} · {formatDate(material.createdAt)}</div>
                    </div>
                    <Button type="button" size="sm" variant="ghost" onClick={() => onPreview(material)}>
                      <Eye className="mr-1.5 size-4" />预览
                    </Button>
                    {editable && (
                      <Button type="button" size="icon" variant="ghost" aria-label={`删除${material.originalFileName}`} disabled={saving} onClick={() => onDelete(material)}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function VerificationWorkbench({
  provider,
  saving,
  manualVerification,
  platformAuthorizationConfirmed,
  onManualChange,
  onPlatformAuthorizationChange,
  onVerifyManually,
  onVerifyWithPlatform,
}: {
  provider: PropertyServiceEnterpriseVerificationProvider | null;
  saving: boolean;
  manualVerification: ManualPropertyServiceOrganizationVerificationInput;
  platformAuthorizationConfirmed: boolean;
  onManualChange: (value: ManualPropertyServiceOrganizationVerificationInput) => void;
  onPlatformAuthorizationChange: (value: boolean) => void;
  onVerifyManually: () => void;
  onVerifyWithPlatform: () => void;
}) {
  return (
    <SectionCard title="属地企业核验" desc="核验结论、来源、操作身份和凭证编号将不可变留痕。">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium"><Landmark className="size-4 text-primary" />手工核验</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="信息来源">
              <Select value={manualVerification.sourceCode} onValueChange={(value) => onManualChange({ ...manualVerification, sourceCode: value as ManualPropertyServiceOrganizationVerificationInput["sourceCode"] })} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="GSXT_WEB">国家企业信用信息公示系统</SelectItem>
                  <SelectItem value="OTHER_GOVERNMENT_SOURCE">其他政府信息来源</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="核验结论">
              <Select value={manualVerification.verificationResult} onValueChange={(value) => onManualChange({ ...manualVerification, verificationResult: value as ManualPropertyServiceOrganizationVerificationInput["verificationResult"] })} disabled={saving}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PASSED">核验通过</SelectItem>
                  <SelectItem value="REJECTED">退回补充</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="查询凭证编号 / 链接">
            <Input value={manualVerification.evidenceReference ?? ""} disabled={saving} maxLength={500} onChange={(event) => onManualChange({ ...manualVerification, evidenceReference: event.target.value })} placeholder="建议填写查询单号、截图编号或存档地址" />
          </Field>
          <Field label={manualVerification.verificationResult === "REJECTED" ? "退回原因 *" : "核验备注"}>
            <Textarea value={manualVerification.remark ?? ""} disabled={saving} rows={3} maxLength={500} onChange={(event) => onManualChange({ ...manualVerification, remark: event.target.value })} placeholder={manualVerification.verificationResult === "REJECTED" ? "说明企业主体或材料不一致之处" : "说明名称、统一社会信用代码和经营状态核对情况"} />
          </Field>
          <Button onClick={onVerifyManually} disabled={saving}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <UserRoundCheck className="mr-2 size-4" />}
            提交手工核验结论
          </Button>
        </div>

        <div className="space-y-3 border-t pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="size-4 text-primary" />平台核验</div>
          {provider ? (
            <Alert className={provider.simulated ? "border-amber-300 bg-amber-50 text-amber-950" : "border-blue-200 bg-blue-50 text-blue-950"}>
              <ShieldAlert className="size-4" />
              <AlertTitle>{provider.displayName}{provider.simulated ? "（开发测试模拟）" : ""}</AlertTitle>
              <AlertDescription>
                {provider.simulated ? "当前结果仅用于开发测试演示，不构成真实企业核验结论；生产环境必须接入实际核验服务。" : "调用前须取得企业主体授权，调用结果将写入不可变审计记录。"}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">平台核验服务信息暂不可用，可使用手工核验。</div>
          )}
          <label className="flex items-start gap-2 rounded-md border px-3 py-3 text-sm">
            <Checkbox checked={platformAuthorizationConfirmed} disabled={saving || !provider} onCheckedChange={(checked) => onPlatformAuthorizationChange(checked === true)} />
            <span>已取得企业主体对企业要素核验的授权，并知悉核验记录将留存。</span>
          </label>
          <Button variant="outline" onClick={onVerifyWithPlatform} disabled={saving || !provider || !platformAuthorizationConfirmed}>
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
            发起平台核验
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}

function VerificationHistory({ verifications }: { verifications: PropertyServiceOrganization["verifications"] }) {
  return (
    <SectionCard title="核验记录" desc="每次核验均保留操作者、核验来源、结论和时间。">
      {verifications.length === 0 ? (
        <EmptyState title="尚无核验记录" />
      ) : (
        <div className="space-y-2">
          {verifications.map((verification) => (
            <div key={verification.verificationId} className="rounded-md border px-3 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {verification.verificationResult === "PASSED"
                    ? <CheckCircle2 className="size-4 text-emerald-600" />
                    : verification.verificationResult === "REJECTED"
                      ? <XCircle className="size-4 text-destructive" />
                      : <ShieldAlert className="size-4 text-amber-600" />}
                  {verification.verificationResult === "PASSED" ? "核验通过" : verification.verificationResult === "REJECTED" ? "核验退回" : "平台调用异常"}
                  {verification.simulated && <StatusChip tone="warning">模拟结果</StatusChip>}
                </div>
                <div className="text-xs text-muted-foreground"><Clock3 className="mr-1 inline size-3" />{formatDate(verification.verifiedAt)}</div>
              </div>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <span>方式：{verification.verificationMethod === "PROPERTY_MANUAL" ? "手工核验" : verification.providerCode ?? "平台核验"}</span>
                <span>来源：{verification.sourceCode ?? verification.providerRequestId ?? "-"}</span>
                <span>操作角色：{verification.operatorRoleKey}</span>
                {verification.evidenceReference && <span className="truncate">凭证：{verification.evidenceReference}</span>}
              </div>
              {(verification.remark || verification.resultMessage) && <div className="mt-2 text-sm leading-5 text-muted-foreground">{verification.remark ?? verification.resultMessage}</div>}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function ActiveOrganization({
  organization,
  canAssignRole,
  onAssignRole,
}: {
  organization: PropertyServiceOrganization;
  canAssignRole: boolean;
  onAssignRole: () => void;
}) {
  return (
    <div className="space-y-4">
      <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
        <CheckCircle2 className="size-4" />
        <AlertTitle>物业服务组织已启用</AlertTitle>
        <AlertDescription>企业主体已完成本小区核验，物业经理和物业员工仅可挂接到下列本小区项目部。</AlertDescription>
      </Alert>
      <div className="grid gap-3 md:grid-cols-2">
        <Info label="物业服务企业" value={organization.legalName} icon={Building2} />
        <Info label="统一社会信用代码" value={organization.unifiedSocialCreditCode} icon={FileCheck2} mono />
        <Info label="本小区物业项目部" value={organization.projectDeptName} icon={Landmark} />
        <Info label="项目部编号" value={organization.projectDeptId ? `dept ${organization.projectDeptId}` : "-"} icon={ShieldCheck} mono />
      </div>
      {canAssignRole && (
        <div className="flex justify-end border-t pt-4">
          <Button variant="outline" onClick={onAssignRole}><UserRoundCheck className="mr-2 size-4" />前往分配物业角色</Button>
        </div>
      )}
    </div>
  );
}

function MaterialPreviewDialog({
  preview,
  onOpenChange,
}: {
  preview: PropertyServiceOrganizationMaterialPreview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const image = preview?.contentType.startsWith("image/");
  return (
    <Dialog open={Boolean(preview)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4 pr-12">
          <DialogTitle>{preview?.originalFileName ?? "核验材料"}</DialogTitle>
          <DialogDescription>私有材料临时预览 · 链接于 {preview ? formatDate(preview.expiresAt) : "-"} 失效</DialogDescription>
        </DialogHeader>
        <div className="h-[72vh] min-h-[420px] bg-slate-100 p-4">
          {preview && image ? (
            <img src={preview.previewUrl} alt={preview.originalFileName} className="size-full object-contain" />
          ) : preview ? (
            <iframe title={preview.originalFileName} src={preview.previewUrl} className="size-full border-0 bg-white" />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function OrganizationStatusChip({ status }: { status: PropertyServiceOrganizationStatus }) {
  const tone = status === "ACTIVE" ? "success" : status === "PENDING_VERIFICATION" ? "warning" : status === "REJECTED" ? "danger" : "neutral";
  return <StatusChip tone={tone} dot>{STATUS_LABEL[status]}</StatusChip>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{required && <span className="ml-1 text-destructive">*</span>}</Label>
      {children}
    </div>
  );
}

function Info({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string;
  value: string;
  icon: typeof Building2;
  mono?: boolean;
}) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</div>
      <div className={`mt-1.5 break-all text-sm font-medium ${mono ? "font-mono-num" : ""}`}>{value}</div>
    </div>
  );
}

function formatFileSize(size: number): string {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatDate(value?: string | null): string {
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
