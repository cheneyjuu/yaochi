// 关联业务：提供 B/G/S 工作身份登录、供应商账号激活和小区注册申请入口。
import { useState, type FormEvent } from "react";
import { useStore } from "../lib/store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  CircleHelp,
  Hash,
  KeyRound,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { activateSupplierAccount } from "../lib/auth";
import communityIllustration from "../../assets/community-governance.svg";
import communityRail from "../../assets/community-rail.webp";

const COLLABORATION_AREAS = [
  "业主自治",
  "物业协同",
  "属地监管",
];

const SEED_ACCOUNTS = [
  { phone: "13800000001", role: "街道办超管 (G)" },
  { phone: "13800000002", role: "党组织书记 (G)" },
  { phone: "13800000003", role: "居委会管理员 (G)" },
  { phone: "13800000004", role: "网格员 (G)" },
  { phone: "13800000011", role: "业委会主任 (B)" },
  { phone: "13800000013", role: "业委会委员 (B)" },
  { phone: "13800000012", role: "业主代表 (B)" },
  { phone: "13800000014", role: "志愿者 (B)" },
  { phone: "13800000021", role: "物业经理 (S)" },
  { phone: "13800000022", role: "物业员工 (S)" },
  { phone: "13800000031", role: "供应商报价经办人 (S)" },
];

const FIELD_GROUP_CLASS = "space-y-2";
const FIELD_LABEL_CLASS = "block text-[13px] font-medium leading-5 text-foreground";
const FIELD_INPUT_CLASS = "h-12 rounded-md border-[#d8e0ec] bg-white pl-11 text-[14px] shadow-none transition-colors placeholder:text-[var(--gov-placeholder)] hover:border-primary/40 focus-visible:border-primary focus-visible:ring-primary/15";

function BrandMark({ inverse = false }: { inverse?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`grid size-10 place-items-center rounded-md text-[18px] font-semibold ${inverse ? "bg-white text-primary" : "bg-primary text-white"}`}>
        盘
      </div>
      <div>
        <div className={`text-[17px] font-semibold leading-5 ${inverse ? "text-white" : "text-[#1d2925]"}`}>盘古</div>
        <div className={`mt-0.5 text-[11px] leading-4 ${inverse ? "text-white/70" : "text-[#6f7d78]"}`}>社区治理工作台</div>
      </div>
    </div>
  );
}

function BrandRail() {
  return (
    <aside className="relative hidden h-[100dvh] self-start overflow-hidden bg-[#0f4b99] lg:sticky lg:top-0 lg:flex" aria-label="盘古品牌标识">
      <img
        src={communityRail}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 size-full object-cover opacity-50"
      />
      <div className="relative z-10 flex w-full flex-col items-center py-12 text-white">
        <div className="relative grid size-12 place-items-center text-[26px] font-semibold">
          <span className="absolute -left-1 h-10 w-1 bg-[#e88932]" aria-hidden="true" />
          盘
        </div>
        <div className="mt-auto pb-6 text-[12px] font-medium leading-none text-white/88 [writing-mode:vertical-rl]">
          盘古社区治理
        </div>
      </div>
    </aside>
  );
}

export function Login({ onCommunityRegistration }: { onCommunityRegistration: () => void }) {
  const { login } = useStore();
  const [phone, setPhone] = useState(() => import.meta.env.DEV ? "13800000011" : "");
  const [smsCode, setSmsCode] = useState(() => import.meta.env.DEV ? "123456" : "");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"login" | "activation">("login");
  const [invitationId, setInvitationId] = useState("");
  const [operatorName, setOperatorName] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!phone || !smsCode) {
      toast.error("请输入手机号与短信验证码");
      return;
    }
    setLoading(true);
    try {
      await login(phone, smsCode);
      toast.success("登录成功，欢迎回来");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const activate = async (e: FormEvent) => {
    e.preventDefault();
    const parsedInvitationId = Number(invitationId);
    if (!Number.isSafeInteger(parsedInvitationId) || parsedInvitationId <= 0
      || !phone || !smsCode || !operatorName) {
      toast.error("请完整填写激活邀请、经办人、手机号与短信验证码");
      return;
    }
    setLoading(true);
    try {
      const result = await activateSupplierAccount({
        invitationId: parsedInvitationId,
        phone,
        smsCode,
        operatorName,
      });
      toast.success(`${result.supplierLegalName} 账号已激活，请登录`);
      setView("login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "供应商账号激活失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] w-full overflow-y-auto overscroll-y-none bg-white lg:grid lg:grid-cols-[96px_minmax(600px,1.08fr)_minmax(460px,0.92fr)]">
      <BrandRail />

      <aside className="hidden h-[100dvh] self-start overflow-hidden border-r border-[#dce3ed] bg-white lg:sticky lg:top-0 lg:flex" aria-label="盘古社区治理平台简介">
        <div className="flex w-full flex-col px-12 pb-6 pt-[clamp(44px,8vh,80px)] xl:px-20 xl:pb-8 2xl:px-24">
          <div className="flex items-center gap-4 text-[#5d6b82]">
            <span className="text-[24px] font-semibold text-[#101827]">盘古</span>
            <span className="h-6 w-px bg-[#9aa8ba]" aria-hidden="true" />
            <span className="text-[16px]">社区治理工作台</span>
          </div>

          <div className="mt-6 xl:mt-8">
            <h1 className="text-[40px] font-semibold leading-[1.18] text-[#101827] xl:text-[46px]">
              盘古社区治理平台
            </h1>
            <p className="mt-4 max-w-[620px] text-[15px] leading-7 text-[#526178]">
              让社区事务在统一身份、清晰权限和可追溯流程中协同。
            </p>

            <div className="mt-7 flex max-w-[590px] items-center text-[15px] text-[#4a5970]">
              {COLLABORATION_AREAS.map((area, index) => (
                <div
                  key={area}
                  className={`flex-1 text-center first:text-left last:text-right ${index > 0 ? "border-l border-[#d5deea]" : ""}`}
                >
                  {area}
                </div>
              ))}
            </div>
          </div>

          <div className="-mx-8 flex min-h-[360px] flex-1 items-start justify-center pt-10 xl:-mx-14 xl:min-h-[430px] xl:pt-12">
            <div className="login-illustration-motion relative w-full max-w-[820px]">
              <img
                src={communityIllustration}
                alt="现代社区住宅与公共空间的等距插画"
                className="block h-auto w-full object-contain"
              />
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-h-[100dvh] flex-col bg-white">
        <header className="flex min-h-20 items-center justify-between px-5 sm:px-10 lg:px-12 xl:px-16">
          <div className="lg:hidden">
            <BrandMark />
          </div>
          <button
            type="button"
            className="ml-auto inline-flex h-9 items-center gap-2 rounded-md px-2 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-primary"
            onClick={() => toast("请联系小区管理员或街道办获取登录帮助")}
          >
            <CircleHelp className="size-4" />
            访问帮助
          </button>
        </header>

        <div className="flex flex-1 items-center px-5 py-8 sm:px-10 lg:items-start lg:px-12 lg:pb-6 lg:pt-10 xl:px-16 xl:pt-12">
          <section className="mx-auto w-full max-w-[520px] py-2" aria-labelledby="login-title">
            <div className="mb-6">
              <div className="mb-3 flex items-center gap-2 text-[12px] font-medium text-muted-foreground">
                <span className="size-2 rounded-full bg-[#e88932]" />
                身份验证
              </div>
              <h2 id="login-title" className="text-[30px] font-semibold leading-[1.25] text-foreground sm:text-[34px]">
                {view === "login" ? "欢迎回来" : "激活供应商账号"}
              </h2>
              <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                {view === "login"
                  ? "使用机构手机号登录，角色、权限和小区范围由当前工作身份确定。"
                  : "使用物业发送的邀请编号与受邀手机号，完成经办人账号激活。"}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-md bg-muted p-1" role="tablist" aria-label="账号访问方式">
              <button
                type="button"
                role="tab"
                aria-selected={view === "login"}
                className={`h-10 rounded-[5px] text-[13px] font-medium transition-colors ${view === "login" ? "border border-primary bg-white text-primary shadow-[0_1px_3px_rgba(20,60,120,0.12)]" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setView("login")}
              >
                工作身份登录
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={view === "activation"}
                className={`h-10 rounded-[5px] text-[13px] font-medium transition-colors ${view === "activation" ? "border border-primary bg-white text-primary shadow-[0_1px_3px_rgba(20,60,120,0.12)]" : "text-muted-foreground hover:text-foreground"}`}
                onClick={() => setView("activation")}
              >
                供应商激活
              </button>
            </div>

            <form onSubmit={view === "login" ? submit : activate} className="space-y-4">
              {view === "activation" && (
                <>
                  <div className={FIELD_GROUP_CLASS}>
                    <label htmlFor="invitation-id" className={FIELD_LABEL_CLASS}>邀请编号</label>
                    <div className="relative">
                      <Hash className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="invitation-id"
                        value={invitationId}
                        onChange={(e) => setInvitationId(e.target.value)}
                        inputMode="numeric"
                        autoComplete="off"
                        placeholder="请输入邀请编号"
                        className={FIELD_INPUT_CLASS}
                      />
                    </div>
                  </div>
                  <div className={FIELD_GROUP_CLASS}>
                    <label htmlFor="operator-name" className={FIELD_LABEL_CLASS}>经办人姓名</label>
                    <div className="relative">
                      <UserPlus className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="operator-name"
                        value={operatorName}
                        onChange={(e) => setOperatorName(e.target.value)}
                        autoComplete="name"
                        placeholder="请输入本人姓名"
                        className={FIELD_INPUT_CLASS}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className={FIELD_GROUP_CLASS}>
                <label htmlFor="login-phone" className={FIELD_LABEL_CLASS}>手机号</label>
                <div className="relative">
                  <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={11}
                    placeholder="请输入登录手机号"
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
              </div>

              <div className={FIELD_GROUP_CLASS}>
                <label htmlFor="sms-code" className={FIELD_LABEL_CLASS}>短信验证码</label>
                <div className="relative">
                  <ShieldCheck className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="sms-code"
                    value={smsCode}
                    onChange={(e) => setSmsCode(e.target.value)}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    placeholder="请输入 6 位验证码"
                    className={FIELD_INPUT_CLASS}
                  />
                </div>
              </div>

              {view === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-[13px] text-primary hover:text-[var(--gov-primary-dark)] hover:underline"
                    onClick={() => toast("请联系小区管理员或街道办重置登录信息")}
                  >
                    登录遇到问题？
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full rounded-md bg-primary text-[14px] text-white shadow-none hover:bg-[var(--gov-primary-dark)] focus-visible:ring-primary/25"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? (
                  <LoaderCircle className="mr-2 size-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 size-4" />
                )}
                {loading
                  ? (view === "login" ? "正在进入工作台" : "正在激活账号")
                  : (view === "login" ? "进入工作台" : "激活账号")}
              </Button>
            </form>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <div className="text-[12px] text-muted-foreground">尚未开通小区工作区</div>
              <Button
                type="button"
                variant="outline"
                className="h-10 shrink-0 rounded-md border-primary bg-transparent px-4 text-[13px] text-primary shadow-none hover:bg-accent"
                onClick={onCommunityRegistration}
              >
                <Building2 className="size-4" />
                申请注册小区
              </Button>
            </div>

            {import.meta.env.DEV && view === "login" && (
              <details className="group mt-6 rounded-md border border-dashed border-border bg-white/60 text-[12px] text-muted-foreground">
                <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-3 font-medium text-foreground/75">
                  <KeyRound className="size-4" />
                  开发账号
                  <code className="ml-1 font-mono-num text-muted-foreground">验证码 123456</code>
                  <ChevronDown className="ml-auto size-4 transition-transform group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-1 gap-1 border-t border-dashed border-border p-3 sm:grid-cols-2">
                  {SEED_ACCOUNTS.map((account) => (
                    <button
                      key={account.phone}
                      type="button"
                      onClick={() => setPhone(account.phone)}
                      className="min-w-0 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-primary"
                      title="点击填入手机号"
                    >
                      <code className="font-mono-num">{account.phone}</code>
                      <span className="ml-1 text-muted-foreground">{account.role}</span>
                    </button>
                  ))}
                </div>
              </details>
            )}
          </section>
        </div>

        <footer className="px-5 pb-4 text-center text-[11px] text-muted-foreground/65 sm:px-10 lg:px-12 xl:px-16">
          © 2026 盘古社区治理平台
        </footer>
      </main>
    </div>
  );
}
