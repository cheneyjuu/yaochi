import { useMemo } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  Italic,
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
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 7,
}: RichTextEditorProps) {
  const preview = useMemo(() => toMiniappRichText(value), [value]);

  function append(template: string) {
    onChange(value.trim() ? `${value}\n${template}` : template);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">支持 Markdown 语法</span>
      </div>
      <div className="overflow-hidden rounded-md border bg-background shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-slate-100 px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => append("## 小标题")}>
              <Heading2 className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("### 小标题")}>
              <Heading3 className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("**重点文字**")}>
              <Bold className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("*强调文字*")}>
              <Italic className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("~~删除线~~")}>
              <Strikethrough className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("`行内代码`")}>
              <Code2 className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("- 要点")}>
              <List className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("1. 要点")}>
              <ListOrdered className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("> 引用说明")}>
              <Quote className="size-3.5" />
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => append("---")}>
              <Minus className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => append("| 项目 | 内容 |\n| --- | --- |\n| 示例 | 说明 |")}
            >
              <Table2 className="size-3.5" />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">左侧编辑，右侧实时预览</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="border-b bg-slate-50 md:border-b-0 md:border-r">
            <div className="border-b px-4 py-2 text-xs font-medium text-slate-600">编辑区</div>
            <Textarea
              value={value}
              onChange={(event) => onChange(event.target.value)}
              rows={rows}
              placeholder={placeholder ?? "支持段落、小标题、列表、加粗、引用和表格；将自动转换为小程序 RichText 友好的 HTML。"}
              className="min-h-[300px] resize-y rounded-none border-0 bg-slate-50 font-mono text-sm leading-7 focus-visible:ring-0"
            />
          </div>
          <div className="min-h-[300px] bg-white">
            <div className="border-b bg-white px-4 py-2 text-xs font-medium text-slate-600">实时预览</div>
            <div className="p-4">
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
      </div>
    </div>
  );
}

function RichTextContent({ html }: { html: string }) {
  return (
    <div
      className="text-sm leading-7 text-foreground/90 [&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_del]:text-muted-foreground [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:font-semibold [&_hr]:my-3 [&_hr]:border-border [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
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
