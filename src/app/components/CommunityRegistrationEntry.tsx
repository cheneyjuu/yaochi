// 关联业务：承载注册人短信验证、小区申请填报、审核材料上传和申请进度查询。
import {
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  FileCheck2,
  FileText,
  Loader2,
  LockKeyhole,
  Phone,
  RefreshCw,
  Send,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  createCommunityApplicantClient,
  loginCommunityApplicant,
  type CommunityApplicantIdentity,
  type CommunityApplicantSession,
  type CommunityHousingTag,
  type CommunityRegistration,
  type CommunityRegistrationInput,
  type CommunityRegistrationMaterialType,
} from "../lib/community-registration";

const SHANGHAI_DISTRICTS = [
  { code: "310101", name: "黄浦区" },
  { code: "310104", name: "徐汇区" },
  { code: "310105", name: "长宁区" },
  { code: "310106", name: "静安区" },
  { code: "310107", name: "普陀区" },
  { code: "310109", name: "虹口区" },
  { code: "310110", name: "杨浦区" },
  { code: "310112", name: "闵行区" },
  { code: "310113", name: "宝山区" },
  { code: "310114", name: "嘉定区" },
  { code: "310115", name: "浦东新区" },
  { code: "310116", name: "金山区" },
  { code: "310117", name: "松江区" },
  { code: "310118", name: "青浦区" },
  { code: "310120", name: "奉贤区" },
  { code: "310151", name: "崇明区" },
] as const;

const IDENTITIES: Array<{ value: CommunityApplicantIdentity; label: string }> = [
  { value: "COMMITTEE_DIRECTOR", label: "业委会主任" },
  { value: "COMMITTEE_VICE_DIRECTOR", label: "业委会副主任" },
  { value: "COMMITTEE_MEMBER", label: "业委会委员" },
  { value: "OWNER", label: "业主" },
  { value: "COMMUNITY_STAFF", label: "居委会工作人员" },
];

const HOUSING_TAGS: Array<{ value: CommunityHousingTag; label: string }> = [
  { value: "COMMERCIAL_HOUSING", label: "商品房" },
  { value: "RELOCATION_HOUSING", label: "动迁房" },
  { value: "SHOP", label: "商铺" },
  { value: "VILLA", label: "别墅" },
];

const MATERIAL_TYPES: Array<{ value: CommunityRegistrationMaterialType; label: string }> = [
  { value: "COMMUNITY_EXISTENCE_PROOF", label: "小区存在证明" },
  { value: "COMMITTEE_FILING", label: "业委会备案材料" },
  { value: "POSITION_PROOF", label: "任职证明" },
  { value: "OWNER_IDENTITY_PROOF", label: "业主身份材料" },
  { value: "COMMUNITY_STAFF_PROOF", label: "居委会工作证明" },
  { value: "OTHER", label: "其他补充材料" },
];

const STATUS_LABEL: Record<CommunityRegistration["status"], string> = {
  DRAFT: "待完善",
  SUBMITTED: "审核中",
  RETURNED: "待补充",
  APPROVED: "审核通过",
  REJECTED: "审核未通过",
  WITHDRAWN: "已撤回",
};

const REGISTRATION_STEPS = [
  { number: 1, title: "验证手机", desc: "确认注册申请归属" },
  { number: 2, title: "填写资料", desc: "小区与注册人信息" },
  { number: 3, title: "证明材料", desc: "提交属地审核依据" },
  { number: 4, title: "审核进度", desc: "查看退回或开通结果" },
] as const;

interface RegistrationFormState {
  applicantName: string;
  claimedIdentity: CommunityApplicantIdentity;
  districtCode: string;
  communityName: string;
  communityAddress: string;
  declaredHouseholdCount: string;
  housingTags: CommunityHousingTag[];
}

const EMPTY_FORM: RegistrationFormState = {
  applicantName: "",
  claimedIdentity: "COMMITTEE_DIRECTOR",
  districtCode: "310112",
  communityName: "",
  communityAddress: "",
  declaredHouseholdCount: "",
  housingTags: ["COMMERCIAL_HOUSING"],
};

export function CommunityRegistrationEntry({ onBack }: { onBack: () => void }) {
  const [session, setSession] = useState<CommunityApplicantSession | null>(null);
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [application, setApplication] = useState<CommunityRegistration | null>(null);
  const [form, setForm] = useState<RegistrationFormState>(EMPTY_FORM);
  const [materialType, setMaterialType] = useState<CommunityRegistrationMaterialType>(
    "COMMITTEE_FILING",
  );
  const [materialFile, setMaterialFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [working, setWorking] = useState(false);

  const editable = application?.status === "DRAFT" || application?.status === "RETURNED";
  const statusOnly = application && !editable;
  const client = useMemo(
    () => (session ? createCommunityApplicantClient(session.token) : null),
    [session],
  );

  async function verifyPhone(event: FormEvent) {
    event.preventDefault();
    if (!/^1\d{10}$/.test(phone) || !smsCode.trim()) {
      toast.error("请输入正确手机号和短信验证码");
      return;
    }
    setWorking(true);
    try {
      const nextSession = await loginCommunityApplicant(phone, smsCode);
      const nextClient = createCommunityApplicantClient(nextSession.token);
      const applications = await nextClient.listMine();
      const latest = applications[0] ?? null;
      setSession(nextSession);
      setApplication(latest);
      if (latest && (latest.status === "DRAFT" || latest.status === "RETURNED")) {
        setForm(toForm(latest));
        setMaterialType(defaultMaterialType(latest.claimedIdentity));
      }
      toast.success(latest ? "已读取您的注册申请" : "手机号验证成功");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "手机号验证失败");
    } finally {
      setWorking(false);
    }
  }

  async function refreshApplication() {
    if (!client || !application) return;
    setWorking(true);
    try {
      const refreshed = await client.get(application.applicationId);
      setApplication(refreshed);
      if (refreshed.status === "DRAFT" || refreshed.status === "RETURNED") {
        setForm(toForm(refreshed));
      }
      toast.success("申请状态已刷新");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setWorking(false);
    }
  }

  async function saveApplication(event?: FormEvent): Promise<CommunityRegistration | null> {
    event?.preventDefault();
    if (!client) return null;
    const input = buildInput(form, application?.version);
    if (!input) return null;
    setWorking(true);
    try {
      const saved = application
        ? await client.revise(application.applicationId, input)
        : await client.create(input);
      setApplication(saved);
      setMaterialType(defaultMaterialType(saved.claimedIdentity));
      toast.success(application ? "申请信息已更新" : "申请草稿已创建，请上传审核材料");
      return saved;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存申请失败");
      return null;
    } finally {
      setWorking(false);
    }
  }

  async function uploadMaterial() {
    if (!client || !application || !editable) return;
    if (!materialFile) {
      toast.error("请选择要上传的证明材料");
      return;
    }
    setWorking(true);
    try {
      await client.uploadMaterial(application.applicationId, materialType, materialFile);
      const refreshed = await client.get(application.applicationId);
      setApplication(refreshed);
      setMaterialFile(null);
      setFileInputKey((value) => value + 1);
      toast.success("审核材料已上传");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "材料上传失败");
    } finally {
      setWorking(false);
    }
  }

  async function deleteMaterial(materialId: number) {
    if (!client || !application || !editable) return;
    setWorking(true);
    try {
      await client.deleteMaterial(application.applicationId, materialId);
      setApplication(await client.get(application.applicationId));
      toast.success("材料已删除");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setWorking(false);
    }
  }

  async function submitApplication() {
    if (!client || !application || !editable) return;
    if (application.materials.length === 0) {
      toast.error("请至少上传一份小区或注册人证明材料");
      return;
    }
    setWorking(true);
    try {
      const submitted = await client.submit(application.applicationId, application.version);
      setApplication(submitted);
      toast.success("手机号验证成功，注册申请已提交");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setWorking(false);
    }
  }

  async function withdrawApplication() {
    if (!client || !application) return;
    setWorking(true);
    try {
      setApplication(await client.withdraw(application.applicationId, application.version));
      toast.success("申请已撤回");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤回失败");
    } finally {
      setWorking(false);
    }
  }

  function startAnotherApplication() {
    setApplication(null);
    setForm(EMPTY_FORM);
    setMaterialType("COMMITTEE_FILING");
    setMaterialFile(null);
  }

  const step = !session ? 1 : application && statusOnly ? 4 : application ? 3 : 2;

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-foreground">
      <header className="h-16 border-b bg-white">
        <div className="mx-auto flex h-full max-w-[1180px] items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="grid size-9 place-items-center rounded-md border bg-white text-muted-foreground hover:text-foreground"
              aria-label="返回登录"
              title="返回登录"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="grid size-9 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
              盘
            </div>
            <div>
              <div className="text-sm font-semibold">小区注册申请</div>
              <div className="text-xs text-muted-foreground">盘古社区治理平台</div>
            </div>
          </div>
          {session && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="size-4" />
              {maskPhone(phone)}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-[1180px] grid-cols-1 gap-6 px-5 py-8 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="lg:pt-2">
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-1 lg:gap-0">
            {REGISTRATION_STEPS.map(({ number, title, desc }) => (
              <div key={number} className="relative flex min-w-0 gap-3 pb-0 lg:pb-7">
                <div
                  className={`grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold ${
                    step > number
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : step === number
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-white text-muted-foreground"
                  }`}
                >
                  {step > number ? <Check className="size-3.5" /> : number}
                </div>
                <div className="min-w-0 pt-0.5">
                  <div className="truncate text-sm font-medium">{title}</div>
                  <div className="mt-1 hidden text-xs leading-5 text-muted-foreground lg:block">{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 hidden border-t pt-5 text-xs leading-5 text-muted-foreground lg:block">
            短信验证只确认手机号控制权。小区真实性、行政归属和申报身份需由属地审核，审核前不会授予管理权限。
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border bg-white shadow-sm">
          {!session ? (
            <PhoneVerification
              phone={phone}
              smsCode={smsCode}
              working={working}
              onPhoneChange={setPhone}
              onSmsCodeChange={setSmsCode}
              onSubmit={verifyPhone}
            />
          ) : statusOnly && application ? (
            <RegistrationStatus
              application={application}
              working={working}
              onRefresh={refreshApplication}
              onWithdraw={withdrawApplication}
              onStartAnother={startAnotherApplication}
            />
          ) : (
            <RegistrationForm
              form={form}
              application={application}
              materialType={materialType}
              fileInputKey={fileInputKey}
              working={working}
              onFormChange={setForm}
              onMaterialTypeChange={setMaterialType}
              onMaterialFileChange={setMaterialFile}
              onSave={saveApplication}
              onUpload={uploadMaterial}
              onDeleteMaterial={deleteMaterial}
              onSubmit={submitApplication}
              onWithdraw={withdrawApplication}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function PhoneVerification({
  phone,
  smsCode,
  working,
  onPhoneChange,
  onSmsCodeChange,
  onSubmit,
}: {
  phone: string;
  smsCode: string;
  working: boolean;
  onPhoneChange: (value: string) => void;
  onSmsCodeChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
}) {
  return (
    <div className="grid min-h-[500px] place-items-center p-6 sm:p-10">
      <form onSubmit={onSubmit} className="w-full max-w-[430px] space-y-6">
        <div>
          <div className="mb-4 grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </div>
          <h1 className="text-xl font-semibold">验证注册手机号</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            验证后可以创建、补充和查询本人提交的小区注册申请。
          </p>
        </div>
        <Field label="手机号">
          <Input
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value.replace(/\D/g, "").slice(0, 11))}
            inputMode="tel"
            autoComplete="tel"
            placeholder="请输入本人手机号"
            className="h-11"
          />
        </Field>
        <Field label="短信验证码">
          <Input
            value={smsCode}
            onChange={(event) => onSmsCodeChange(event.target.value.trim())}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="请输入短信验证码"
            className="h-11"
          />
        </Field>
        <Button type="submit" className="h-11 w-full" disabled={working}>
          {working ? <Loader2 className="mr-2 size-4 animate-spin" /> : <LockKeyhole className="mr-2 size-4" />}
          验证并继续
        </Button>
        <div className="rounded-md bg-muted/50 px-4 py-3 text-xs leading-5 text-muted-foreground">
          开发环境短信验证码为 123456。生产环境由已配置的短信服务校验。
        </div>
      </form>
    </div>
  );
}

function RegistrationForm({
  form,
  application,
  materialType,
  fileInputKey,
  working,
  onFormChange,
  onMaterialTypeChange,
  onMaterialFileChange,
  onSave,
  onUpload,
  onDeleteMaterial,
  onSubmit,
  onWithdraw,
}: {
  form: RegistrationFormState;
  application: CommunityRegistration | null;
  materialType: CommunityRegistrationMaterialType;
  fileInputKey: number;
  working: boolean;
  onFormChange: (value: RegistrationFormState) => void;
  onMaterialTypeChange: (value: CommunityRegistrationMaterialType) => void;
  onMaterialFileChange: (value: File | null) => void;
  onSave: (event?: FormEvent) => Promise<CommunityRegistration | null>;
  onUpload: () => void;
  onDeleteMaterial: (materialId: number) => void;
  onSubmit: () => void;
  onWithdraw: () => void;
}) {
  const returned = application?.status === "RETURNED";
  return (
    <form onSubmit={onSave}>
      <div className="border-b px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{application ? "补充注册申请" : "填写注册申请"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              小区审核通过后才会创建租户，并按核验结果授予最小工作身份。
            </p>
          </div>
          {application && <Badge variant="secondary">{application.applicationNo}</Badge>}
        </div>
        {returned && application?.reviewComment && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <span className="font-medium">退回原因：</span>{application.reviewComment}
          </div>
        )}
      </div>

      <div className="space-y-8 px-6 py-6 sm:px-8">
        <FormSection icon={Building2} title="小区信息">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="省份"><Input value="上海市" disabled className="h-10" /></Field>
            <Field label="城市"><Input value="上海市" disabled className="h-10" /></Field>
            <Field label="区县" required>
              <Select
                value={form.districtCode}
                onValueChange={(value) => onFormChange({ ...form, districtCode: value })}
              >
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHANGHAI_DISTRICTS.map((district) => (
                    <SelectItem key={district.code} value={district.code}>{district.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid gap-4 md:grid-cols-[1fr_180px]">
            <Field label="小区名称" required>
              <Input
                value={form.communityName}
                onChange={(event) => onFormChange({ ...form, communityName: event.target.value })}
                placeholder="请输入物业管理区域常用名称"
                className="h-10"
              />
            </Field>
            <Field label="户数" required>
              <Input
                value={form.declaredHouseholdCount}
                onChange={(event) => onFormChange({
                  ...form,
                  declaredHouseholdCount: event.target.value.replace(/\D/g, "").slice(0, 7),
                })}
                inputMode="numeric"
                placeholder="请输入户数"
                className="h-10"
              />
            </Field>
          </div>
          <Field label="小区地址" required>
            <Input
              value={form.communityAddress}
              onChange={(event) => onFormChange({ ...form, communityAddress: event.target.value })}
              placeholder="请输入完整道路、弄号等地址"
              className="h-10"
            />
          </Field>
          <Field label="房屋类型" required>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {HOUSING_TAGS.map((tag) => {
                const checked = form.housingTags.includes(tag.value);
                return (
                  <label
                    key={tag.value}
                    className={`flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm ${
                      checked ? "border-primary bg-primary/5 text-primary" : "bg-white"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => onFormChange({
                        ...form,
                        housingTags: next
                          ? [...form.housingTags, tag.value]
                          : form.housingTags.filter((value) => value !== tag.value),
                      })}
                    />
                    {tag.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              此处仅作为小区概况标签，具体房屋属性需在空间底册中逐套核验。
            </p>
          </Field>
        </FormSection>

        <FormSection icon={ShieldCheck} title="注册人信息">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="姓名" required>
              <Input
                value={form.applicantName}
                onChange={(event) => onFormChange({ ...form, applicantName: event.target.value })}
                autoComplete="name"
                placeholder="请输入本人真实姓名"
                className="h-10"
              />
            </Field>
            <Field label="申报身份" required>
              <Select
                value={form.claimedIdentity}
                onValueChange={(value) => onFormChange({
                  ...form,
                  claimedIdentity: value as CommunityApplicantIdentity,
                })}
              >
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IDENTITIES.map((identity) => (
                    <SelectItem key={identity.value} value={identity.value}>{identity.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="rounded-md bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            短信验证不能证明业委会或居委会身份。属地审核人将根据备案、任职或产权材料独立核验，申请人不得自审自批。
          </div>
        </FormSection>

        <div className="flex justify-end gap-2 border-t pt-5">
          {application && (
            <Button type="button" variant="outline" onClick={onWithdraw} disabled={working}>
              撤回申请
            </Button>
          )}
          <Button type="submit" disabled={working}>
            {working ? <Loader2 className="mr-2 size-4 animate-spin" /> : <FileCheck2 className="mr-2 size-4" />}
            {application ? "保存修改" : "保存并上传材料"}
          </Button>
        </div>

        {application && (
          <FormSection icon={FileText} title="审核材料">
            <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
              <Select
                value={materialType}
                onValueChange={(value) => onMaterialTypeChange(value as CommunityRegistrationMaterialType)}
              >
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MATERIAL_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                key={fileInputKey}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="h-10"
                onChange={(event) => onMaterialFileChange(event.target.files?.[0] ?? null)}
              />
              <Button type="button" variant="outline" onClick={onUpload} disabled={working}>
                <Upload className="mr-2 size-4" />上传
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">支持 PDF、JPG、PNG、WebP，单个文件不超过 20MB。</p>

            {application.materials.length === 0 ? (
              <div className="rounded-md border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                尚未上传审核材料
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {application.materials.map((material) => (
                  <div key={material.materialId} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="size-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{material.originalFileName}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {materialTypeLabel(material.materialType)} · {formatFileSize(material.fileSize)}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteMaterial(material.materialId)}
                      disabled={working}
                      title="删除材料"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end border-t pt-5">
              <Button type="button" onClick={onSubmit} disabled={working || application.materials.length === 0}>
                <Send className="mr-2 size-4" />提交属地审核
              </Button>
            </div>
          </FormSection>
        )}
      </div>
    </form>
  );
}

function RegistrationStatus({
  application,
  working,
  onRefresh,
  onWithdraw,
  onStartAnother,
}: {
  application: CommunityRegistration;
  working: boolean;
  onRefresh: () => void;
  onWithdraw: () => void;
  onStartAnother: () => void;
}) {
  const approved = application.status === "APPROVED";
  const canWithdraw = application.status === "SUBMITTED";
  return (
    <div>
      <div className="border-b px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">注册申请进度</h1>
            <p className="mt-1 text-sm text-muted-foreground">{application.applicationNo}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onRefresh} disabled={working}>
            <RefreshCw className={`mr-2 size-4 ${working ? "animate-spin" : ""}`} />刷新
          </Button>
        </div>
      </div>
      <div className="space-y-6 px-6 py-6 sm:px-8">
        <div className={`rounded-md border px-5 py-5 ${approved ? "border-emerald-300 bg-emerald-50" : "bg-slate-50"}`}>
          <div className="flex items-start gap-4">
            <div className={`grid size-10 shrink-0 place-items-center rounded-full ${approved ? "bg-emerald-600 text-white" : "bg-primary/10 text-primary"}`}>
              {approved ? <Check className="size-5" /> : <FileCheck2 className="size-5" />}
            </div>
            <div>
              <div className="text-base font-semibold">{STATUS_LABEL[application.status]}</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{statusDescription(application)}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Info label="小区" value={application.communityName} />
          <Info label="行政区" value={`${application.provinceName} ${application.cityName} ${application.districtName}`} />
          <Info label="地址" value={application.communityAddress} />
          <Info label="注册人" value={`${application.applicantName} · ${identityLabel(application.claimedIdentity)}`} />
          <Info label="申报户数" value={`${application.declaredHouseholdCount} 户`} />
          <Info label="提交时间" value={formatDate(application.submittedAt ?? application.createdAt)} />
        </div>

        {application.reviewComment && (
          <div className="rounded-md border px-4 py-3 text-sm leading-6">
            <div className="text-xs text-muted-foreground">审核意见</div>
            <div className="mt-1">{application.reviewComment}</div>
          </div>
        )}

        {application.onboarding && (
          <div className="rounded-md border px-4 py-4">
            <div className="text-sm font-medium">冷启动工作区</div>
            <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <Info label="租户编号" value={String(application.onboarding.tenantId)} compact />
              <Info label="基础数据" value="待初始化" compact />
              <Info label="产权名册" value="待导入并核验" compact />
              <Info label="业主接入二维码" value="尚未启用" compact />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              空间底册和产权人基础名册激活后，才会启用业主接入二维码；审核通过不代表计票基数已经发布。
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-5">
          {canWithdraw && <Button variant="outline" onClick={onWithdraw} disabled={working}>撤回申请</Button>}
          {(application.status === "REJECTED" || application.status === "WITHDRAWN") && (
            <Button onClick={onStartAnother}>重新申请</Button>
          )}
        </div>
      </div>
    </div>
  );
}

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 border-b pb-3">
        <Icon className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">
        {label}{required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Info({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className={compact ? "" : "rounded-md bg-slate-50 px-4 py-3"}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function buildInput(
  form: RegistrationFormState,
  expectedVersion?: number,
): CommunityRegistrationInput | null {
  const district = SHANGHAI_DISTRICTS.find((item) => item.code === form.districtCode);
  const households = Number(form.declaredHouseholdCount);
  if (!form.applicantName.trim() || !form.communityName.trim() || !form.communityAddress.trim()) {
    toast.error("请完整填写注册人、小区名称和小区地址");
    return null;
  }
  if (!district || !Number.isSafeInteger(households) || households < 1) {
    toast.error("请选择区县并填写正确户数");
    return null;
  }
  if (form.housingTags.length === 0) {
    toast.error("至少选择一种小区房屋类型");
    return null;
  }
  return {
    applicantName: form.applicantName.trim(),
    claimedIdentity: form.claimedIdentity,
    provinceCode: "310000",
    provinceName: "上海市",
    cityCode: "310100",
    cityName: "上海市",
    districtCode: district.code,
    districtName: district.name,
    communityName: form.communityName.trim(),
    communityAddress: form.communityAddress.trim(),
    declaredHouseholdCount: households,
    housingTags: form.housingTags,
    expectedVersion,
  };
}

function toForm(application: CommunityRegistration): RegistrationFormState {
  return {
    applicantName: application.applicantName,
    claimedIdentity: application.claimedIdentity,
    districtCode: application.districtCode,
    communityName: application.communityName,
    communityAddress: application.communityAddress,
    declaredHouseholdCount: String(application.declaredHouseholdCount),
    housingTags: application.housingTags,
  };
}

function defaultMaterialType(identity: CommunityApplicantIdentity): CommunityRegistrationMaterialType {
  if (identity === "OWNER") return "OWNER_IDENTITY_PROOF";
  if (identity === "COMMUNITY_STAFF") return "COMMUNITY_STAFF_PROOF";
  return "COMMITTEE_FILING";
}

function identityLabel(identity: CommunityApplicantIdentity): string {
  return IDENTITIES.find((item) => item.value === identity)?.label ?? identity;
}

function materialTypeLabel(type: CommunityRegistrationMaterialType): string {
  return MATERIAL_TYPES.find((item) => item.value === type)?.label ?? type;
}

function statusDescription(application: CommunityRegistration): string {
  switch (application.status) {
    case "SUBMITTED":
      return "申请已进入属地审核。审核期间不能修改资料，如需变更请先撤回。";
    case "APPROVED":
      return "小区注册和申报身份已审核通过，系统已建立冷启动工作区。";
    case "REJECTED":
      return "本次申请未通过审核。请查看审核意见，确认事实变化后可以重新申请。";
    case "WITHDRAWN":
      return "本次申请已由申请人撤回，未创建小区租户或管理权限。";
    default:
      return "申请状态已更新。";
  }
}

function maskPhone(phone: string): string {
  return /^1\d{10}$/.test(phone) ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
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
