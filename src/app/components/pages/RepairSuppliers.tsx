"use client";

// 关联业务：供物业经理统一登记、核验维修供应商并办理供应商后台账号激活。
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader, SectionCard, StatusChip, type Tone } from "../gov/common";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  createSupplierActivationInvitation,
  getEnterpriseVerificationProvider,
  listRepairSupplierOrganizations,
  listSupplierEnterpriseVerifications,
  registerSupplierOrganization,
  verifySupplierEnterpriseManually,
  verifySupplierEnterpriseWithPlatform,
  type EnterpriseVerificationProviderDescriptor,
  type RepairSupplierOrganization,
  type SupplierEnterpriseVerificationRecord,
} from "../../lib/repair";

type VerificationFilter = "ALL" | RepairSupplierOrganization["verificationStatus"];
type VerificationMode = "PROPERTY_MANUAL" | "PLATFORM_API";

const VERIFICATION_META: Record<RepairSupplierOrganization["verificationStatus"], { label: string; tone: Tone }> = {
  PENDING_VERIFICATION: { label: "待企业核验", tone: "warning" },
  VERIFIED: { label: "核验通过", tone: "success" },
  REJECTED: { label: "核验未通过", tone: "danger" },
  DISABLED: { label: "已停用", tone: "neutral" },
};

const ACCOUNT_META: Record<RepairSupplierOrganization["accountStatus"], { label: string; tone: Tone }> = {
  CONTACT_MISSING: { label: "联系人待补充", tone: "warning" },
  NOT_INVITED: { label: "账号未邀请", tone: "neutral" },
  PENDING_ACTIVATION: { label: "账号待激活", tone: "info" },
  ACTIVATED: { label: "账号已激活", tone: "success" },
};

const EMPTY_REGISTRATION = {
  legalName: "",
  unifiedSocialCreditCode: "",
  contactName: "",
  contactPhone: "",
};

function formatDate(value?: string): string {
  return value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "-";
}

function verificationMethodLabel(record: SupplierEnterpriseVerificationRecord): string {
  if (record.verificationMethod === "PROPERTY_MANUAL") {
    return record.sourceCode === "GSXT_WEB" ? "国家企业信用信息公示系统" : "其他政府信息来源";
  }
  return record.providerCode ? `平台核验 · ${record.providerCode}` : "平台核验";
}

export function RepairSuppliers() {
  const { hasPermission, roleKey } = useStore();
  const canManage = roleKey === "PROPERTY_MANAGER" && hasPermission("repair:supplier:manage");
  const canVerify = roleKey === "PROPERTY_MANAGER" && hasPermission("repair:supplier:verify");
  const [suppliers, setSuppliers] = useState<RepairSupplierOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [filter, setFilter] = useState<VerificationFilter>("ALL");
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [registration, setRegistration] = useState(EMPTY_REGISTRATION);
  const [verificationOpen, setVerificationOpen] = useState(false);
  const [verificationSupplier, setVerificationSupplier] = useState<RepairSupplierOrganization | null>(null);
  const [provider, setProvider] = useState<EnterpriseVerificationProviderDescriptor | null>(null);
  const [history, setHistory] = useState<SupplierEnterpriseVerificationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>("PROPERTY_MANUAL");
  const [verificationUscc, setVerificationUscc] = useState("");
  const [manualSource, setManualSource] = useState<"GSXT_WEB" | "OTHER_GOVERNMENT_SOURCE">("GSXT_WEB");
  const [manualResult, setManualResult] = useState<"PASSED" | "REJECTED">("PASSED");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [verificationRemark, setVerificationRemark] = useState("");
  const [authorizationConfirmed, setAuthorizationConfirmed] = useState(false);

  const filteredSuppliers = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      if (filter !== "ALL" && supplier.verificationStatus !== filter) return false;
      if (!normalizedKeyword) return true;
      return [
        supplier.legalName,
        supplier.unifiedSocialCreditCode,
        supplier.contactName,
        supplier.contactPhone,
      ].some((value) => value?.toLowerCase().includes(normalizedKeyword));
    });
  }, [filter, keyword, suppliers]);

  async function load() {
    setLoading(true);
    try {
      setSuppliers(await listRepairSupplierOrganizations());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "维修供应商库加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canManage && !canVerify) {
      setLoading(false);
      return;
    }
    void load();
  }, [canManage, canVerify]);

  async function submitRegistration() {
    const legalName = registration.legalName.trim();
    const uscc = registration.unifiedSocialCreditCode.trim().toUpperCase();
    const contactName = registration.contactName.trim();
    const contactPhone = registration.contactPhone.trim();
    if (!legalName || !uscc || !contactName || !contactPhone) {
      toast.error("请完整填写企业名称、统一社会信用代码和联系人信息");
      return;
    }
    if (!/^[0-9A-Z]{18}$/.test(uscc)) {
      toast.error("统一社会信用代码必须为 18 位数字或大写字母");
      return;
    }
    if (!/^1[3-9][0-9]{9}$/.test(contactPhone)) {
      toast.error("联系人手机号格式不正确");
      return;
    }
    setActing(true);
    try {
      await registerSupplierOrganization({
        legalName,
        unifiedSocialCreditCode: uscc,
        contactName,
        contactPhone,
      });
      setRegistration(EMPTY_REGISTRATION);
      setRegistrationOpen(false);
      await load();
      toast.success("维修供应商已登记，请继续完成企业主体核验");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "维修供应商登记失败");
    } finally {
      setActing(false);
    }
  }

  async function openVerification(supplier: RepairSupplierOrganization) {
    setVerificationSupplier(supplier);
    setVerificationUscc(supplier.unifiedSocialCreditCode ?? "");
    setVerificationMode("PROPERTY_MANUAL");
    setManualSource("GSXT_WEB");
    setManualResult("PASSED");
    setEvidenceReference("");
    setVerificationRemark("");
    setAuthorizationConfirmed(false);
    setProvider(null);
    setHistory([]);
    setHistoryLoading(true);
    setVerificationOpen(true);
    try {
      const [providerDescriptor, records] = await Promise.all([
        getEnterpriseVerificationProvider().catch(() => null),
        listSupplierEnterpriseVerifications(supplier.supplierDeptId),
      ]);
      setProvider(providerDescriptor);
      setHistory(records);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "企业核验记录加载失败");
    } finally {
      setHistoryLoading(false);
    }
  }

  async function submitVerification() {
    if (!verificationSupplier) return;
    const uscc = verificationUscc.trim().toUpperCase();
    if (!/^[0-9A-Z]{18}$/.test(uscc)) {
      toast.error("统一社会信用代码必须为 18 位数字或大写字母");
      return;
    }
    setActing(true);
    try {
      if (verificationMode === "PROPERTY_MANUAL") {
        await verifySupplierEnterpriseManually(verificationSupplier.supplierDeptId, {
          unifiedSocialCreditCode: uscc,
          sourceCode: manualSource,
          verificationResult: manualResult,
          evidenceReference: evidenceReference.trim() || undefined,
          remark: verificationRemark.trim() || undefined,
        });
      } else {
        await verifySupplierEnterpriseWithPlatform(verificationSupplier.supplierDeptId, {
          unifiedSocialCreditCode: uscc,
          supplierAuthorizationConfirmed: authorizationConfirmed,
        });
      }
      setVerificationOpen(false);
      await load();
      toast.success(verificationMode === "PROPERTY_MANUAL" ? "企业核验结论已记录" : "平台核验已完成");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "企业主体核验失败");
    } finally {
      setActing(false);
    }
  }

  async function inviteAccount(supplier: RepairSupplierOrganization) {
    setActing(true);
    try {
      const invitation = await createSupplierActivationInvitation(supplier.supplierDeptId);
      await load();
      toast.success(`账号激活邀请已创建，邀请编号 ${invitation.invitationId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "供应商账号激活邀请创建失败");
    } finally {
      setActing(false);
    }
  }

  if (!canManage && !canVerify) {
    return (
      <div className="space-y-6">
        <PageHeader title="维修供应商库" desc="当前工作身份没有维修供应商管理权限" />
        <SectionCard><EmptyState title="无权查看维修供应商库" desc="请切换到已授权的物业经理工作身份" /></SectionCard>
      </div>
    );
  }

  const verifiedCount = suppliers.filter((supplier) => supplier.verificationStatus === "VERIFIED").length;
  const activationCount = suppliers.filter((supplier) => supplier.accountStatus === "ACTIVATED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="维修供应商库"
        desc="物业经理在这里统一登记、核验维修企业并办理账号激活；只有本小区核验通过的企业可进入工程邀价。"
        actions={
          <>
            <Button variant="outline" onClick={() => void load()} disabled={loading || acting}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />刷新
            </Button>
            {canManage && (
              <Button onClick={() => setRegistrationOpen(true)} disabled={acting}>
                <Plus className="mr-2 size-4" />登记供应商
              </Button>
            )}
          </>
        }
      />

      <div className="grid border bg-card sm:grid-cols-3">
        <div className="px-5 py-4"><div className="text-xs text-muted-foreground">已登记</div><div className="mt-1 text-2xl font-semibold">{suppliers.length}</div></div>
        <div className="border-t px-5 py-4 sm:border-l sm:border-t-0"><div className="text-xs text-muted-foreground">本小区核验通过</div><div className="mt-1 text-2xl font-semibold text-emerald-700">{verifiedCount}</div></div>
        <div className="border-t px-5 py-4 sm:border-l sm:border-t-0"><div className="text-xs text-muted-foreground">账号已激活</div><div className="mt-1 text-2xl font-semibold text-primary">{activationCount}</div></div>
      </div>

      <SectionCard
        title="供应商名录"
        desc="企业主体核验与供应商账号激活分别留痕，邀价时只读取核验通过状态。"
        bodyClassName="p-0"
      >
        <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="pl-9"
              placeholder="搜索企业名称、信用代码或联系人"
            />
          </div>
          <Select value={filter} onValueChange={(value) => setFilter(value as VerificationFilter)}>
            <SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部核验状态</SelectItem>
              <SelectItem value="PENDING_VERIFICATION">待企业核验</SelectItem>
              <SelectItem value="VERIFIED">核验通过</SelectItem>
              <SelectItem value="REJECTED">核验未通过</SelectItem>
              <SelectItem value="DISABLED">已停用</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" />加载供应商名录
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <EmptyState
            title={suppliers.length === 0 ? "尚未登记维修供应商" : "没有符合条件的供应商"}
            desc={suppliers.length === 0 ? "登记并完成企业核验后，工程项目即可发出邀价" : "请调整搜索词或核验状态"}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/35 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">企业</th>
                  <th className="px-4 py-3 font-medium">企业核验</th>
                  <th className="px-4 py-3 font-medium">联系人</th>
                  <th className="px-4 py-3 font-medium">供应商账号</th>
                  <th className="px-5 py-3 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredSuppliers.map((supplier) => {
                  const verification = VERIFICATION_META[supplier.verificationStatus];
                  const account = ACCOUNT_META[supplier.accountStatus];
                  return (
                    <tr key={supplier.supplierDeptId} className="align-top hover:bg-muted/20">
                      <td className="px-5 py-4">
                        <div className="font-medium">{supplier.legalName}</div>
                        <div className="mt-1 font-mono text-xs text-muted-foreground">
                          {supplier.unifiedSocialCreditCode || "统一社会信用代码待补充"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusChip tone={verification.tone}>{verification.label}</StatusChip>
                        {supplier.verifiedAt && (
                          <div className="mt-2 text-xs text-muted-foreground">{formatDate(supplier.verifiedAt)}</div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div>{supplier.contactName || "待补充"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{supplier.contactPhone || "-"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusChip tone={account.tone}>{account.label}</StatusChip>
                        {supplier.loginPhone && (
                          <div className="mt-2 text-xs text-muted-foreground">登录手机号 {supplier.loginPhone}</div>
                        )}
                        {supplier.accountStatus === "PENDING_ACTIVATION" && supplier.activationInvitationExpiresAt && (
                          <div className="mt-2 text-xs text-muted-foreground">有效至 {formatDate(supplier.activationInvitationExpiresAt)}</div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {canVerify && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="办理企业主体核验并查看历史"
                              onClick={() => void openVerification(supplier)}
                              disabled={acting || supplier.verificationStatus === "DISABLED"}
                            >
                              <ShieldCheck className="size-4" />
                            </Button>
                          )}
                          {canManage && supplier.contactName && supplier.contactPhone && supplier.accountStatus !== "ACTIVATED" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title={supplier.accountStatus === "PENDING_ACTIVATION" ? "重新生成账号激活邀请" : "发送账号激活邀请"}
                              onClick={() => void inviteAccount(supplier)}
                              disabled={acting}
                            >
                              <Send className="size-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <Dialog open={registrationOpen} onOpenChange={(open) => !acting && setRegistrationOpen(open)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>登记维修供应商</DialogTitle>
            <DialogDescription>完整登记企业和联系人信息后，再办理本小区企业主体核验。</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="repair-supplier-name">企业法定名称</Label>
              <Input id="repair-supplier-name" value={registration.legalName} onChange={(event) => setRegistration((current) => ({ ...current, legalName: event.target.value }))} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="repair-supplier-uscc">统一社会信用代码</Label>
              <Input id="repair-supplier-uscc" maxLength={18} className="font-mono uppercase" value={registration.unifiedSocialCreditCode} onChange={(event) => setRegistration((current) => ({ ...current, unifiedSocialCreditCode: event.target.value.toUpperCase() }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repair-supplier-contact">企业联系人</Label>
              <Input id="repair-supplier-contact" value={registration.contactName} onChange={(event) => setRegistration((current) => ({ ...current, contactName: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="repair-supplier-phone">联系人手机号</Label>
              <Input id="repair-supplier-phone" inputMode="tel" maxLength={11} value={registration.contactPhone} onChange={(event) => setRegistration((current) => ({ ...current, contactPhone: event.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrationOpen(false)} disabled={acting}>取消</Button>
            <Button onClick={() => void submitRegistration()} disabled={acting}>
              {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Building2 className="mr-2 size-4" />}
              确认登记
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={verificationOpen} onOpenChange={(open) => !acting && setVerificationOpen(open)}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>企业主体核验</DialogTitle>
            <DialogDescription>
              {verificationSupplier?.legalName ?? "维修供应商"} · 核验结论仅对当前小区生效，每次操作均保留审计记录。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>核验方式</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  className={`min-h-16 border px-3 py-2 text-left ${verificationMode === "PROPERTY_MANUAL" ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/40"}`}
                  onClick={() => setVerificationMode("PROPERTY_MANUAL")}
                >
                  <span className="block text-sm font-medium">物业手工核验</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">查询政府公示信息后记录核验结论</span>
                </button>
                <button
                  type="button"
                  className={`min-h-16 border px-3 py-2 text-left ${verificationMode === "PLATFORM_API" ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/40"}`}
                  onClick={() => setVerificationMode("PLATFORM_API")}
                  disabled={!provider}
                >
                  <span className="block text-sm font-medium">{provider?.displayName ?? "平台核验未配置"}{provider?.simulated ? "（模拟）" : ""}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">经供应商授权后调用已配置的企业核验服务</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="repair-supplier-verification-uscc">统一社会信用代码</Label>
              <Input id="repair-supplier-verification-uscc" maxLength={18} className="font-mono uppercase" value={verificationUscc} onChange={(event) => setVerificationUscc(event.target.value.toUpperCase())} />
            </div>

            {verificationMode === "PROPERTY_MANUAL" ? (
              <div className="grid gap-4 border-t pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>核验来源</Label>
                  <Select value={manualSource} onValueChange={(value) => setManualSource(value as typeof manualSource)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GSXT_WEB">国家企业信用信息公示系统</SelectItem>
                      <SelectItem value="OTHER_GOVERNMENT_SOURCE">其他政府信息来源</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>核验结论</Label>
                  <Select value={manualResult} onValueChange={(value) => setManualResult(value as typeof manualResult)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PASSED">核验通过</SelectItem>
                      <SelectItem value="REJECTED">核验不通过</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {manualSource === "OTHER_GOVERNMENT_SOURCE" && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="repair-supplier-evidence">查询来源或凭证编号</Label>
                    <Input id="repair-supplier-evidence" value={evidenceReference} onChange={(event) => setEvidenceReference(event.target.value)} />
                  </div>
                )}
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="repair-supplier-verification-remark">核验说明{manualResult === "REJECTED" ? "（必填）" : "（选填）"}</Label>
                  <Textarea id="repair-supplier-verification-remark" rows={3} maxLength={500} value={verificationRemark} onChange={(event) => setVerificationRemark(event.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-3 border-t pt-4">
                {provider?.simulated && (
                  <Alert className="border-amber-300 bg-amber-50 text-amber-950">
                    <ShieldAlert className="size-4" />
                    <AlertTitle>当前为模拟核验</AlertTitle>
                    <AlertDescription>模拟结果仅供开发测试，不代表企业主体真实有效。</AlertDescription>
                  </Alert>
                )}
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
                  <Checkbox className="mt-1" checked={authorizationConfirmed} onCheckedChange={(checked) => setAuthorizationConfirmed(checked === true)} />
                  <span>已确认供应商授权本次企业要素核验，并同意提交企业名称和统一社会信用代码。</span>
                </label>
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-medium"><History className="size-4" />核验记录</div>
                <span className="text-xs text-muted-foreground">{history.length} 条</span>
              </div>
              {historyLoading ? (
                <div className="flex min-h-20 items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-4 animate-spin" />读取审计记录</div>
              ) : history.length === 0 ? (
                <div className="border px-3 py-5 text-sm text-muted-foreground">暂无核验记录</div>
              ) : (
                <div className="max-h-48 divide-y overflow-y-auto border">
                  {history.map((record) => (
                    <div key={record.verificationId} className="flex items-start gap-3 px-3 py-3 text-sm">
                      <StatusChip tone={record.verificationResult === "PASSED" ? "success" : record.verificationResult === "REJECTED" ? "danger" : "warning"}>
                        {record.verificationResult === "PASSED" ? "通过" : record.verificationResult === "REJECTED" ? "未通过" : "调用失败"}
                      </StatusChip>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{verificationMethodLabel(record)}</div>
                        <div className="mt-1 text-xs text-muted-foreground">核验账号 {record.operatorAccountId} · {formatDate(record.verifiedAt)}</div>
                        {record.resultMessage && <div className="mt-1 text-xs text-muted-foreground">{record.resultMessage}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerificationOpen(false)} disabled={acting}>取消</Button>
            <Button
              onClick={() => void submitVerification()}
              disabled={acting
                || verificationUscc.trim().length !== 18
                || (verificationMode === "PROPERTY_MANUAL"
                  && ((manualSource === "OTHER_GOVERNMENT_SOURCE" && !evidenceReference.trim())
                    || (manualResult === "REJECTED" && !verificationRemark.trim())))
                || (verificationMode === "PLATFORM_API" && !authorizationConfirmed)}
            >
              {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ShieldCheck className="mr-2 size-4" />}
              {verificationMode === "PROPERTY_MANUAL" ? "记录核验结论" : "发起平台核验"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
