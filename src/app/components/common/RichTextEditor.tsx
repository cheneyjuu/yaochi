// 关联业务：为公告、议题、报修和维修方案提供可预览、可限制工具集的富文本录入。
import { type ComponentType, type ReactNode, useMemo } from "react";
import {
  Bold,
  CheckSquare2,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
  Table2,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { toMiniappRichText } from "../../lib/richText";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  attachmentArea?: ReactNode;
  toolbar?: "full" | "basic";
}

interface ToolbarAction {
  label: string;
  template: string;
  icon: ComponentType<{ className?: string }>;
  basic?: boolean;
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: "一级标题", template: "# 一级标题", icon: Heading1 },
  { label: "二级标题", template: "## 小标题", icon: Heading2 },
  { label: "三级标题", template: "### 小标题", icon: Heading3, basic: true },
  { label: "四级标题", template: "#### 四级标题", icon: Heading4, basic: true },
  { label: "加粗", template: "**重点文字**", icon: Bold, basic: true },
  { label: "斜体", template: "*强调文字*", icon: Italic, basic: true },
  { label: "删除线", template: "~~删除线~~", icon: Strikethrough },
  { label: "行内代码", template: "`行内代码`", icon: Code2 },
  { label: "链接", template: "[链接文字](https://example.com)", icon: Link2 },
  { label: "无序列表", template: "- 要点", icon: List, basic: true },
  { label: "有序列表", template: "1. 要点", icon: ListOrdered, basic: true },
  { label: "待办事项", template: "- [ ] 待办事项", icon: CheckSquare2 },
  { label: "引用", template: "> 引用说明", icon: Quote, basic: true },
  { label: "分隔线", template: "---", icon: Minus },
  {
    label: "表格",
    template: "| 项目 | 内容 |\n| --- | --- |\n| 示例 | 说明 |",
    icon: Table2,
  },
];

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 7,
  attachmentArea,
  toolbar = "full",
}: RichTextEditorProps) {
  const preview = useMemo(() => toMiniappRichText(value), [value]);
  const actions = toolbar === "basic"
    ? TOOLBAR_ACTIONS.filter((action) => action.basic)
    : TOOLBAR_ACTIONS;

  function append(template: string) {
    onChange(value.trim() ? `${value}\n${template}` : template);
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="overflow-hidden rounded-md border bg-background shadow-sm">
        <div className="flex flex-wrap items-center gap-1 border-b bg-slate-100 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  type="button"
                  variant="ghost"
                  size="icon"
                  title={action.label}
                  aria-label={action.label}
                  onClick={() => append(action.template)}
                >
                  <Icon className="size-3.5" />
                </Button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 bg-slate-200/70 md:grid-cols-2 md:gap-px">
          <div className="border-b bg-amber-50/70 md:border-b-0">
            <div className="flex items-center justify-between border-b border-amber-200 bg-amber-100/80 px-4 py-2 text-xs font-semibold text-amber-900">
              <span>编辑区</span>
            </div>
            <Textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={rows}
              placeholder={placeholder ?? "支持段落、标题、列表、待办、链接、引用、代码块和表格；将自动转换为小程序 RichText 友好的 HTML。"}
              className="min-h-[300px] resize-y rounded-none border-0 bg-amber-50/70 font-mono text-sm leading-7 text-slate-900 placeholder:text-amber-900/45 focus-visible:ring-2 focus-visible:ring-amber-400"
            />
          </div>
          <div className="min-h-[300px] bg-white">
            <div className="flex items-center justify-between border-b border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold text-sky-900">
              <span>实时预览</span>
            </div>
            <div className="min-h-[300px] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4">
              {preview ? (
                <RichTextContent html={preview} />
              ) : (
                <div className="text-sm leading-7 text-muted-foreground">
                  实时预览区，输入正文后显示排版效果。
                </div>
              )}
            </div>
          </div>
        </div>
        {attachmentArea && (
          <div className="border-t bg-slate-50/80 px-4 py-3">
            {attachmentArea}
          </div>
        )}
      </div>
    </div>
  );
}

function RichTextContent({ html }: { html: string }) {
  return (
    <div
      className="text-sm leading-7 text-foreground/90 [&_a]:font-medium [&_a]:text-primary [&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_del]:text-muted-foreground [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:font-semibold [&_hr]:my-3 [&_hr]:border-border [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-50 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td[data-align='center']]:text-center [&_td[data-align='right']]:text-right [&_th]:border [&_th]:border-border [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th[data-align='center']]:text-center [&_th[data-align='right']]:text-right [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function RichTextView({ html }: { html?: string | null }) {
  const safe = useMemo(() => toMiniappRichText(html ?? ""), [html]);
  if (!safe) {
    return <div className="text-sm text-muted-foreground">无正文</div>;
  }
  return <RichTextContent html={safe} />;
}
