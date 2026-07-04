import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RichTextEditor, RichTextView } from "../common/RichTextEditor";
import { loadSession } from "../../lib/auth";
import { listBuildings, type Building } from "../../lib/building-assignment";
import { richTextToPlain, toMiniappRichText } from "../../lib/richText";
import { useStore } from "../../lib/store";
import {
  proposeSubject,
  type SubjectType,
  type VotingScope,
} from "../../lib/voting";

const TYPE_LABEL: Record<SubjectType, string> = {
  GENERAL: "一般决议",
  MAJOR: "重大决议",
  ELECTION: "选举",
};

const SCOPE_LABEL: Record<VotingScope, string> = {
  COMMUNITY: "全小区",
  BUILDING: "单栋",
  UNIT: "单元",
};

export function SubjectProposalEditor() {
  const { hasPermission, roleKey, setPage } = useStore();
  const sessionUser = loadSession()?.user;
  const currentDeptType = sessionUser?.dept_type ?? null;

  const canCreate = hasPermission("voting:subject:create");
  const canCreateElection = hasPermission("voting:subject:create:election");
  const canProposeElection =
    canCreateElection && roleKey === "GOV_OPERATOR" && (currentDeptType === 2 || currentDeptType === 5);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subjectType, setSubjectType] = useState<SubjectType>(canCreate ? "GENERAL" : "ELECTION");
  const [scope, setScope] = useState<VotingScope>("COMMUNITY");
  const [buildingId, setBuildingId] = useState("");
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [partyFloor, setPartyFloor] = useState("");
  const [maxWinners, setMaxWinners] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isElection = subjectType === "ELECTION";
  const isBuilding = scope === "BUILDING";
  const contentHtml = useMemo(() => toMiniappRichText(content), [content]);
  const canSubmit =
    (subjectType === "ELECTION" ? canProposeElection : canCreate) &&
    title.trim().length > 0 &&
    (isElection || richTextToPlain(contentHtml).length > 0) &&
    start !== "" &&
    end !== "" &&
    (!isBuilding || buildingId.trim() !== "") &&
    (!isElection || (maxWinners.trim() !== "" && Number(maxWinners) >= 1));

  useEffect(() => {
    if (!isBuilding || buildings.length > 0 || buildingsLoading) return;
    setBuildingsLoading(true);
    listBuildings()
      .then((items) => {
        setBuildings(items);
        if (!buildingId && items[0]) setBuildingId(String(items[0].buildingId));
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "楼栋列表加载失败");
      })
      .finally(() => setBuildingsLoading(false));
  }, [buildingId, buildings.length, buildingsLoading, isBuilding]);

  async function submit() {
    if (!canSubmit) {
      toast.error("请补齐必填信息");
      return;
    }
    setSubmitting(true);
    try {
      await proposeSubject({
        title: title.trim(),
        content: contentHtml || null,
        subjectType,
        scope,
        scopeReferenceId: isBuilding ? Number(buildingId) : null,
        voteStartAt: new Date(start).toISOString(),
        voteEndAt: new Date(end).toISOString(),
        partyRatioFloor: partyFloor.trim() !== "" ? Number(partyFloor) : null,
        maxWinners: isElection ? Number(maxWinners) : null,
      });
      toast.success(isElection ? "选举议题已创建，待提交初审" : "议题已草稿落库，待公示");
      setPage("subject-proposal");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "立项失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canCreate && !canProposeElection) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="立项议题"
          desc="当前角色没有议题立项权限。"
          actions={
            <Button variant="ghost" onClick={() => setPage("subject-proposal")}>
              <ArrowLeft className="size-4" />
              返回列表
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="立项议题"
        desc="一般决议和重大决议必须填写正文，正文会转换为 C 端小程序 RichText 友好的格式。"
        actions={
          <>
            <Button variant="ghost" onClick={() => setPage("subject-proposal")}>
              <ArrowLeft className="size-4" />
              返回列表
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              创建草稿
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="space-y-5">
          <SectionCard title="议题标题">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="如：小区电梯更新改造专项维修资金使用"
              maxLength={200}
              className="h-12 text-base"
            />
          </SectionCard>

          {!isElection && (
            <SectionCard title="议题正文" desc="填写表决事项背景、依据、预算、执行安排和业主需知。">
              <RichTextEditor
                label="正文内容"
                value={content}
                onChange={setContent}
                rows={14}
                placeholder="填写表决事项背景、依据、预算、执行安排和业主需知。支持 ## 小标题、- 列表、加粗和引用。"
              />
            </SectionCard>
          )}

          <SectionCard title="投票时间">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>投票开始</Label>
                <Input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>投票截止</Label>
                <Input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} />
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="议题类型" desc={TYPE_LABEL[subjectType]}>
            <Select value={subjectType} onValueChange={(value) => setSubjectType(value as SubjectType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {canCreate && <SelectItem value="GENERAL">一般决议</SelectItem>}
                {canCreate && <SelectItem value="MAJOR">重大决议</SelectItem>}
                {canProposeElection && <SelectItem value="ELECTION">选举</SelectItem>}
              </SelectContent>
            </Select>
            {isElection && (
              <div className="mt-4 rounded-md border bg-muted/30 p-3 text-xs leading-6 text-muted-foreground">
                <ShieldCheck className="mr-1 inline size-3.5" />
                选举议题创建后需走候选人提名、居委会初审、街道办终审，再进入公示。
              </div>
            )}
          </SectionCard>

          <SectionCard title="表决范围" desc={SCOPE_LABEL[scope]}>
            <div className="space-y-3">
              <Select value={scope} onValueChange={(value) => setScope(value as VotingScope)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMMUNITY">全小区</SelectItem>
                  <SelectItem value="BUILDING">单栋</SelectItem>
                </SelectContent>
              </Select>
              {isBuilding && (
                <div className="space-y-1.5">
                  <Label>楼栋</Label>
                  <Select
                    value={buildingId}
                    onValueChange={setBuildingId}
                    disabled={buildingsLoading || buildings.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={buildingsLoading ? "楼栋加载中" : "请选择楼栋"} />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((building) => (
                        <SelectItem key={building.buildingId} value={String(building.buildingId)}>
                          楼栋 #{building.buildingId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {buildings.length === 0 && !buildingsLoading && (
                    <div className="text-xs text-muted-foreground">暂无可选楼栋，请先确认当前小区楼栋数据。</div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="治理参数">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>党员比例下限（可空）</Label>
                <Input
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={partyFloor}
                  onChange={(event) => setPartyFloor(event.target.value)}
                  placeholder="如 0.5"
                />
              </div>
              {isElection && (
                <div className="space-y-1.5">
                  <Label>应选名额</Label>
                  <Input
                    type="number"
                    min="1"
                    value={maxWinners}
                    onChange={(event) => setMaxWinners(event.target.value)}
                    placeholder="至少 1 人"
                  />
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="提交检查">
            <div className="space-y-2 text-sm">
              <CheckRow ok={title.trim().length > 0} label="已填写标题" />
              <CheckRow ok={isElection || richTextToPlain(contentHtml).length > 0} label="已填写正文" />
              <CheckRow ok={start !== "" && end !== ""} label="已填写投票时间" />
              <CheckRow ok={!isBuilding || buildingId.trim() !== ""} label="范围信息完整" />
              <CheckRow ok={!isElection || (maxWinners.trim() !== "" && Number(maxWinners) >= 1)} label="选举名额有效" />
            </div>
          </SectionCard>

          {!isElection && (
            <SectionCard title="C 端预览">
              <div className="rounded-md border bg-background p-4">
                <div className="mb-3 text-base font-semibold">{title.trim() || "议题标题"}</div>
                <RichTextView html={contentHtml} />
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <StatusChip tone={ok ? "success" : "neutral"}>{ok ? "已完成" : "待补齐"}</StatusChip>
    </div>
  );
}
