import { useMemo, useState } from "react";
import { ArrowLeft, Building2, FileUp, Loader2, Send, Wrench } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RichTextEditor, RichTextView } from "../common/RichTextEditor";
import { createRepairWorkOrder } from "../../lib/repair";
import { richTextToPlain, toMiniappRichText } from "../../lib/richText";
import { useStore } from "../../lib/store";

const BUILDINGS = [30001, 30002, 30003, 30005];

const CATEGORY_LABEL: Record<string, string> = {
  PUBLIC_FACILITY: "公共设施",
  ELEVATOR: "电梯",
  FIRE: "消防",
  PLUMBING: "给排水",
};

export function WorkOrderEditor() {
  const { hasPermission, setPage } = useStore();
  const [title, setTitle] = useState("");
  const [buildingId, setBuildingId] = useState<string>("manual");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("PUBLIC_FACILITY");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const descriptionHtml = useMemo(() => toMiniappRichText(description), [description]);
  const scopeLabel = buildingId === "manual" ? "待现场定位" : `楼栋 ${buildingId}`;
  const canIntake = hasPermission("repair:workorder:intake");

  async function submit() {
    if (!title.trim()) {
      toast.error("请填写工单标题");
      return;
    }
    if (!richTextToPlain(descriptionHtml)) {
      toast.error("请填写问题描述");
      return;
    }
    setSubmitting(true);
    try {
      await createRepairWorkOrder({
        title: title.trim(),
        buildingId: buildingId === "manual" ? null : Number(buildingId),
        locationText: location.trim(),
        category,
        description: descriptionHtml,
      });
      toast.success("工单已登记");
      setPage("work-orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "工单登记失败");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canIntake) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="登记工单"
          desc="当前角色没有维修工单登记权限"
          actions={
            <Button variant="ghost" onClick={() => setPage("work-orders")}>
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
        title="登记工单"
        desc="用于后台补录公共区域报修，问题描述支持富文本，便于 C 端和现场人员阅读。"
        actions={
          <>
            <Button variant="ghost" onClick={() => setPage("work-orders")}>
              <ArrowLeft className="size-4" />
              返回列表
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              提交工单
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="space-y-5">
          <SectionCard title="工单标题">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="如：2号楼大堂门禁滴水"
              maxLength={120}
              className="h-12 text-base"
            />
          </SectionCard>

          <SectionCard title="位置与分类" desc="无法确认楼栋时保持待现场定位，后续由物业或网格员现场补充。">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>楼栋</Label>
                <Select value={buildingId} onValueChange={setBuildingId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">待现场定位</SelectItem>
                    {BUILDINGS.map((id) => (
                      <SelectItem key={id} value={String(id)}>
                        楼栋 {id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>分类</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC_FACILITY">公共设施</SelectItem>
                    <SelectItem value="ELEVATOR">电梯</SelectItem>
                    <SelectItem value="FIRE">消防</SelectItem>
                    <SelectItem value="PLUMBING">给排水</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Label>位置线索</Label>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="如：2号楼大堂门禁、地下车库 B 区排水沟"
              />
            </div>
          </SectionCard>

          <SectionCard title="问题描述" desc="记录故障现象、影响范围、现场线索和已采取措施。">
            <RichTextEditor
              label="描述正文"
              value={description}
              onChange={setDescription}
              rows={14}
              placeholder="填写故障现象、影响范围、现场线索；支持列表、加粗和引用，C 端会按 RichText 展示。"
            />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="登记信息">
            <div className="space-y-3 text-sm">
              <InfoRow label="工单范围" value="公共区域" />
              <InfoRow label="位置状态" value={scopeLabel} />
              <InfoRow label="问题分类" value={CATEGORY_LABEL[category] ?? category} />
            </div>
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-xs leading-6 text-muted-foreground">
              <Building2 className="mr-1 inline size-3.5" />
              公共区域工单创建后进入受理链路；位置不足时会进入待补充位置状态。
            </div>
          </SectionCard>

          <SectionCard title="资金闸门">
            <div className="flex items-center gap-2">
              <StatusChip tone="warning" dot>
                未打开
              </StatusChip>
              <span className="text-sm text-muted-foreground">需核验位置并形成方案后打开</span>
            </div>
            <div className="mt-4 rounded-md border bg-muted/30 p-3 text-xs leading-6 text-muted-foreground">
              <Wrench className="mr-1 inline size-3.5" />
              后续预算、资金来源和审批路径由工单状态机在方案阶段判定。
            </div>
          </SectionCard>

          <SectionCard title="附件">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30"
              onClick={() => toast.info("附件上传能力待接入后端存储")}
            >
              <FileUp className="size-4" />
              点击上传现场照片 / PDF
            </button>
          </SectionCard>

          <SectionCard title="描述预览">
            <div className="rounded-md border bg-background p-4">
              <div className="mb-3 text-base font-semibold">{title.trim() || "工单标题"}</div>
              <RichTextView html={descriptionHtml} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
