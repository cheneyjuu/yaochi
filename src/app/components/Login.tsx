import { useState, type FormEvent } from "react";
import { useStore } from "../lib/store";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import {
  Smartphone, ShieldCheck, Vote, Building2, Landmark,
  BarChart3, Network,
} from "lucide-react";
import { toast } from "sonner";

type SideTab = "B" | "G";

// 各端示例账号（seed 手机号，短信码统一 123456）
const SIDE_SAMPLE: Record<SideTab, { phone: string; label: string }> = {
  B: { phone: "13800000011", label: "业委会主任 周主任" },
  G: { phone: "13800000001", label: "街道办超管 王街道" },
};

const HIGHLIGHTS = [
  { icon: Vote, title: "双过半表决", desc: "专有面积与人数双红线，分母随议题范围动态计算" },
  { icon: ShieldCheck, title: "双签上链存证", desc: "信托资金双密码签名，写入最高院司法链" },
  { icon: Network, title: "ABAC 数据范围", desc: "辖区 / 小区 / 楼栋 / 物业组织五级权限穿透" },
  { icon: BarChart3, title: "监管看板", desc: "大额前置审查、换届熔断、千人千面定向推送" },
];

const SEED_ACCOUNTS = [
  { phone: "13800000001", role: "街道办超管 (G)" },
  { phone: "13800000002", role: "党组织书记 (G)" },
  { phone: "13800000011", role: "业委会主任 (B)" },
  { phone: "13800000021", role: "物业经理 (B)" },
];

export function Login() {
  const { login } = useStore();
  const [side, setSide] = useState<SideTab>("B");
  const [phone, setPhone] = useState(SIDE_SAMPLE.B.phone);
  const [smsCode, setSmsCode] = useState("123456");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const isG = side === "G";

  const switchSide = (s: SideTab) => {
    setSide(s);
    setPhone(SIDE_SAMPLE[s].phone);
  };

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

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      {/* 左侧品牌区 */}
      <div className="relative hidden lg:flex flex-col w-[46%] xl:w-1/2 gov-primary-gradient text-white overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }} />
        <div className="absolute -bottom-32 -right-24 size-[460px] rounded-full opacity-20 gov-tech-gradient blur-2xl" />
        <div className="absolute top-1/3 -left-20 size-72 rounded-full opacity-20 bg-[#19a0c4] blur-3xl" />

        <div className="relative z-10 flex flex-col h-full p-12 xl:p-16">
          <div className="flex items-center gap-3">
            <div className="grid place-items-center size-11 rounded-lg bg-white/15 backdrop-blur" style={{ fontWeight: 700, fontSize: 22 }}>盘</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 20 }}>盘古</div>
              <div className="text-xs text-white/70">社区治理 · 业主自治后台</div>
            </div>
          </div>

          <div className="mt-auto mb-10">
            <h1 className="text-white" style={{ fontSize: 34, fontWeight: 700, lineHeight: 1.3 }}>
              让社区治理<br />阳光、透明、可追溯
            </h1>
            <p className="mt-4 text-white/80 max-w-md leading-relaxed">
              面向「业委会自治 + 物业协同 + 街道办监管」的多租户治理平台，
              一套角色自适应外壳，贯穿议题表决、资金双签、司法链存证与全流程监管。
            </p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-3">
            {HIGHLIGHTS.map((h) => {
              const Icon = h.icon;
              return (
                <div key={h.title} className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-4">
                  <Icon className="size-5 mb-2 text-[#7fe9d8]" />
                  <div style={{ fontWeight: 600 }}>{h.title}</div>
                  <div className="text-xs text-white/70 mt-1 leading-relaxed">{h.desc}</div>
                </div>
              );
            })}
          </div>

          <div className="relative z-10 mt-10 text-xs text-white/50">
            © 2026 盘古社区治理平台 · 数据接入最高院司法链存证
          </div>
        </div>
      </div>

      {/* 右侧登录区 */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {isG && <div className="absolute top-0 inset-x-0 h-1.5" style={{ backgroundColor: "var(--gov-g-deep)" }} />}

        <div className="w-full max-w-[400px]">
          {/* 移动端 logo */}
          <div className="flex lg:hidden items-center gap-2 justify-center mb-6">
            <div className="grid place-items-center size-9 rounded-md gov-primary-gradient text-white" style={{ fontWeight: 700 }}>盘</div>
            <span style={{ fontWeight: 700, fontSize: 18 }}>盘古社区治理后台</span>
          </div>

          <div className="mb-6">
            <h2 style={{ fontSize: 22, fontWeight: 600 }}>手机号登录</h2>
            <p className="text-sm text-muted-foreground mt-1">使用机构手机号 + 短信验证码登录，角色与权限由后端身份决定</p>
          </div>

          {/* 端切换（仅用于预填示例账号，真实角色由后端返回） */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            <button
              type="button"
              onClick={() => switchSide("B")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all ${side === "B" ? "border-primary bg-accent ring-1 ring-primary" : "border-border hover:border-primary/40"}`}
            >
              <span className="grid place-items-center size-9 rounded-md bg-[#e8f0fb] text-primary shrink-0"><Building2 className="size-4.5" /></span>
              <span>
                <span className="block text-sm" style={{ fontWeight: 600 }}>B 端工作台</span>
                <span className="block text-xs text-muted-foreground">业委会 / 物业</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchSide("G")}
              className={`flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all ${side === "G" ? "border-[var(--gov-g-deep)] bg-accent ring-1 ring-[var(--gov-g-deep)]" : "border-border hover:border-primary/40"}`}
            >
              <span className="grid place-items-center size-9 rounded-md text-white shrink-0" style={{ backgroundColor: "var(--gov-g-deep)" }}><Landmark className="size-4.5" /></span>
              <span>
                <span className="block text-sm" style={{ fontWeight: 600 }}>G 端监管</span>
                <span className="block text-xs text-muted-foreground">街道办 / 党组织</span>
              </span>
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* 手机号 */}
            <div className="space-y-1.5">
              <label className="text-sm">手机号</label>
              <div className="relative">
                <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入登录手机号" className="pl-9 bg-input-background" />
              </div>
            </div>

            {/* 短信验证码 */}
            <div className="space-y-1.5">
              <label className="text-sm">短信验证码</label>
              <div className="relative">
                <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input value={smsCode} onChange={(e) => setSmsCode(e.target.value)} placeholder="请输入短信验证码" className="pl-9 bg-input-background" />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
                <span className="text-muted-foreground">记住本机登录</span>
              </label>
              <button type="button" className="text-primary hover:underline" onClick={() => toast("请联系小区管理员或街道办重置")}>
                收不到验证码？
              </button>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading} style={isG ? { backgroundColor: "var(--gov-g-deep)" } : undefined}>
              {loading ? "登录中…" : isG ? "进入监管端" : "登录工作台"}
            </Button>
          </form>

          <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
            <div className="mb-1.5"><span style={{ fontWeight: 600 }}>开发环境提示：</span>短信验证码统一为 <code className="font-mono-num">123456</code>，可点选以下种子账号：</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {SEED_ACCOUNTS.map((a) => (
                <button
                  key={a.phone}
                  type="button"
                  onClick={() => setPhone(a.phone)}
                  className="text-left hover:text-primary transition-colors"
                  title="点击填入手机号"
                >
                  <code className="font-mono-num">{a.phone}</code> · {a.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
