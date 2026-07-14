import { useMemo, useState } from "react";
import { ArrowLeft, FileUp, Send } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard } from "../gov/common";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { RichTextEditor, RichTextView } from "../common/RichTextEditor";
import { richTextToPlain, toMiniappRichText } from "../../lib/richText";
import { useStore } from "../../lib/store";

type ScopeType = "全小区" | "指定楼栋" | "指定角色";

const BUILDINGS = ["1号楼", "2号楼", "3号楼", "4号楼", "5号楼", "6号楼", "7号楼", "8号楼"];
const ROLES = ["楼栋长", "网格员", "业委会委员", "监事", "物业管理员"];

export function AnnouncementEditor() {
  const { setPage } = useStore();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [pushScope, setPushScope] = useState<ScopeType>("全小区");
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const contentHtml = useMemo(() => toMiniappRichText(content), [content]);
  const scopeLabel =
    pushScope === "指定楼栋"
      ? `指定楼栋（${selectedBuildings.length || 0} 栋）`
      : pushScope === "指定角色"
        ? `指定角色（${selectedRoles.length || 0} 类）`
        : "全小区（1240 户）";

  function toggleBuilding(building: string) {
    setSelectedBuildings((prev) =>
      prev.includes(building) ? prev.filter((item) => item !== building) : [...prev, building],
    );
  }

  function toggleRole(role: string) {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role],
    );
  }

  function publish() {
    if (!title.trim()) {
      toast.error("请填写公告标题");
      return;
    }
    if (!richTextToPlain(contentHtml)) {
      toast.error("请填写公告正文");
      return;
    }
    if (pushScope === "指定楼栋" && selectedBuildings.length === 0) {
      toast.error("请选择推送楼栋");
      return;
    }
    if (pushScope === "指定角色" && selectedRoles.length === 0) {
      toast.error("请选择推送角色");
      return;
    }
    toast.success(`公告「${title.trim()}」已发布，推送范围：${scopeLabel}`);
    setPage("announcements");
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="发布公告"
        desc="正文支持富文本排版，发布内容会转换为 C 端小程序 RichText 友好的格式。"
        actions={
          <>
            <Button variant="ghost" onClick={() => setPage("announcements")}>
              <ArrowLeft className="size-4" />
              返回列表
            </Button>
            <Button onClick={publish}>
              <Send className="size-4" />
              确认发布
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">
        <div className="space-y-5">
          <SectionCard title="公告标题">
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="请输入公告标题"
              maxLength={120}
              className="h-12 text-base"
            />
          </SectionCard>

          <SectionCard title="公告正文" desc="支持小标题、列表、加粗、引用等排版。">
            <RichTextEditor
              label="正文内容"
              value={content}
              onChange={setContent}
              rows={16}
              placeholder="在此撰写公告正文。可使用 ## 小标题、- 列表、<strong>加粗</strong> 和引用等格式。"
            />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="推送范围" desc={scopeLabel}>
            <RadioGroup
              value={pushScope}
              onValueChange={(value) => setPushScope(value as ScopeType)}
              className="space-y-3"
            >
              <ScopeOption value="全小区" id="ann-scope-all" label="全小区（1240 户）" />
              <ScopeOption value="指定楼栋" id="ann-scope-building" label="指定楼栋" />
              {pushScope === "指定楼栋" && (
                <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/20 p-3">
                  {BUILDINGS.map((building) => (
                    <label key={building} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedBuildings.includes(building)}
                        onCheckedChange={() => toggleBuilding(building)}
                      />
                      {building}
                    </label>
                  ))}
                </div>
              )}
              <ScopeOption value="指定角色" id="ann-scope-role" label="指定角色" />
              {pushScope === "指定角色" && (
                <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                  {ROLES.map((role) => (
                    <label key={role} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={selectedRoles.includes(role)}
                        onCheckedChange={() => toggleRole(role)}
                      />
                      {role}
                    </label>
                  ))}
                </div>
              )}
            </RadioGroup>
          </SectionCard>

          <SectionCard title="附件">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/30"
              onClick={() => toast.info("附件上传能力待接入后端存储")}
            >
              <FileUp className="size-4" />
              点击上传附件（PDF / 图片，最大 20MB）
            </button>
          </SectionCard>

          <SectionCard title="小程序预览">
            <div className="rounded-md border bg-background p-4">
              <div className="mb-3 text-base font-semibold">{title.trim() || "公告标题"}</div>
              <RichTextView html={contentHtml} />
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function ScopeOption({ value, id, label }: { value: ScopeType; id: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-3">
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id} className="cursor-pointer font-normal">
        {label}
      </Label>
    </div>
  );
}
