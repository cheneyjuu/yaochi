import { PageHeader, SectionCard, StatusChip, Stepper, ProgressRing } from "../gov/common";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";

const STEPS = [
  { key: "apply", label: "申报" },
  { key: "qualify", label: "资格审查" },
  { key: "setup", label: "立项" },
  { key: "vote", label: "投票" },
  { key: "count", label: "计票" },
  { key: "publish", label: "公示" },
];

type Cand = { id: string; name: string; building: string; bio: string; status: "pass" | "review" | "reject"; votes: number };
const CANDS: Cand[] = [
  { id: "1", name: "李建华", building: "1 号楼", bio: "退休工程师，曾任企业行政主管", status: "pass", votes: 318 },
  { id: "2", name: "王秀英", building: "3 号楼", bio: "社区志愿者，热心公益事务", status: "pass", votes: 286 },
  { id: "3", name: "张伟", building: "5 号楼", bio: "律师，擅长合同与法务", status: "review", votes: 0 },
  { id: "4", name: "刘洋", building: "2 号楼", bio: "财务从业者，关注资金透明", status: "pass", votes: 241 },
  { id: "5", name: "陈静", building: "4 号楼", bio: "教师，沟通协调能力强", status: "reject", votes: 0 },
  { id: "6", name: "赵强", building: "6 号楼", bio: "物业管理背景，熟悉社区运维", status: "pass", votes: 198 },
];

const STATUS = { pass: { label: "资格通过", tone: "success" as const }, review: { label: "审查中", tone: "warning" as const }, reject: { label: "未通过", tone: "danger" as const } };

export function Election() {
  return (
    <div className="space-y-5">
      <PageHeader title="选举投票看板（换届）" desc="组织业委会换届选举：候选人申报、资格审查、选举立项、选举投票、当选公示。注：本模块对物业角色整组隐藏。" />

      <SectionCard title="换届进度总览" desc="第三届业委会换届 · 任期 2026–2029">
        <Stepper steps={STEPS} current={3} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="选举投票看板" desc="复用双过半进度逻辑（选举得票维度）" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4">
            <ProgressRing value={68.4} threshold={66.7} label="参与专有面积率" passed />
            <ProgressRing value={64.2} threshold={50} label="参与人数率" passed sub="选举有效门槛 50%" />
          </div>
          <div className="mt-4 rounded-lg px-4 py-3 text-center text-sm bg-[#e8f6ee]" style={{ color: "#1f7a45", fontWeight: 600 }}>
            ✓ 选举有效 —— 参与率达标，可进入计票公示
          </div>
        </SectionCard>

        <SectionCard title="当选公示" desc="公示期 7 天 · 倒计时 3 天 14:22">
          <div className="space-y-2.5">
            {CANDS.filter((c) => c.status === "pass").sort((a, b) => b.votes - a.votes).slice(0, 5).map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border p-2.5">
                <span className="grid place-items-center size-6 rounded-full text-xs text-white" style={{ backgroundColor: i < 3 ? "#1b4f9c" : "#9aa5b5" }}>{i + 1}</span>
                <span className="text-sm flex-1" style={{ fontWeight: 500 }}>{c.name}</span>
                <span className="font-mono-num text-sm" style={{ color: "#19a0c4" }}>{c.votes} 票</span>
                {i < 3 && <StatusChip tone="success">拟当选</StatusChip>}
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="候选人名册 / 资格审查" desc="逐个候选人资格审查（带审查依据）">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CANDS.map((c) => (
            <div key={c.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="size-11"><AvatarFallback className="gov-primary-gradient text-white">{c.name.slice(0, 1)}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.building}</div>
                </div>
                <StatusChip tone={STATUS[c.status].tone}>{STATUS[c.status].label}</StatusChip>
              </div>
              <p className="text-sm text-muted-foreground mb-3 min-h-[40px]">{c.bio}</p>
              {c.status === "review" ? (
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1">资格通过</Button>
                  <Button size="sm" variant="outline" className="flex-1">驳回</Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">得票 <span className="font-mono-num" style={{ color: "#19a0c4" }}>{c.votes}</span></div>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
