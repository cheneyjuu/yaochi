// 关联业务：为公告、议题、报修和维修方案提供可视化富文本录入，并按业务权限支持私有图片上传。
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  MDXEditor,
  Separator,
  UndoRedo,
  headingsPlugin,
  imagePlugin,
  linkDialogPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  thematicBreakPlugin,
  toolbarPlugin,
  type ImagePreviewHandler,
  type ImageUploadHandler,
  type MDXEditorMethods,
} from "@mdxeditor/editor";
import "@mdxeditor/editor/style.css";
import { ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { toMiniappRichText } from "../../lib/richText";

interface RichTextEditorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  attachmentArea?: ReactNode;
  toolbar?: "full" | "basic";
  imageUploadHandler?: ImageUploadHandler;
  imagePreviewHandler?: ImagePreviewHandler;
}

function markdownImageAlt(fileName: string) {
  return fileName.replace(/[\[\]\\]/g, " ").trim() || "现场图片";
}

export function RichTextEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 7,
  attachmentArea,
  toolbar = "full",
  imageUploadHandler,
  imagePreviewHandler,
}: RichTextEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const lastValueRef = useRef(value);
  const [uploadingImage, setUploadingImage] = useState(false);
  const contentHeightClass = rows >= 8 ? "min-h-[360px]" : "min-h-[260px]";

  const plugins = useMemo(() => {
    const configured = [
      headingsPlugin(),
      listsPlugin(),
      quotePlugin(),
      thematicBreakPlugin(),
      linkPlugin(),
      linkDialogPlugin(),
      tablePlugin(),
      markdownShortcutPlugin(),
    ];
    if (imageUploadHandler) {
      configured.push(imagePlugin({
        imageUploadHandler,
        imagePreviewHandler,
        disableImageResize: true,
        disableImageSettingsButton: true,
      }));
    }
    configured.push(toolbarPlugin({
      toolbarContents: () => (
        <>
          <UndoRedo />
          <Separator />
          <BlockTypeSelect />
          <BoldItalicUnderlineToggles />
          <ListsToggle />
          {toolbar === "full" && (
            <>
              <Separator />
              <CreateLink />
              <InsertTable />
              <InsertThematicBreak />
            </>
          )}
        </>
      ),
    }));
    return configured;
  }, [imagePreviewHandler, imageUploadHandler, toolbar]);

  useEffect(() => {
    if (value === lastValueRef.current) return;
    lastValueRef.current = value;
    if (editorRef.current?.getMarkdown() !== value) {
      editorRef.current?.setMarkdown(value);
    }
  }, [value]);

  async function uploadImage(file?: File) {
    if (!file || !imageUploadHandler) return;
    setUploadingImage(true);
    try {
      const source = await imageUploadHandler(file);
      editorRef.current?.focus(() => {
        editorRef.current?.insertMarkdown(`\n![${markdownImageAlt(file.name)}](${source})\n`);
      }, { defaultSelection: "rootEnd", preventScroll: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "正文图片上传失败");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <Label>{label}</Label>
        {imageUploadHandler && (
          <>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(event) => void uploadImage(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              title="上传图片"
              disabled={uploadingImage}
              onClick={() => imageInputRef.current?.click()}
            >
              {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              上传图片
            </Button>
          </>
        )}
      </div>
      <div className="overflow-hidden rounded-md border bg-background shadow-sm">
        <MDXEditor
          ref={editorRef}
          markdown={value}
          plugins={plugins}
          placeholder={placeholder ?? "填写正文"}
          contentEditableClassName={`${contentHeightClass} max-w-none px-5 py-4 text-sm leading-7 text-slate-900 focus:outline-none [&_img]:h-auto [&_img]:max-h-[420px] [&_img]:max-w-full [&_img]:object-contain`}
          className="repair-rich-text-editor"
          onChange={(markdown) => {
            lastValueRef.current = markdown;
            onChange(markdown);
          }}
          onError={({ error }) => toast.error(`正文格式无法解析：${error}`)}
        />
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
      className="text-sm leading-7 text-foreground/90 [&_a]:font-medium [&_a]:text-primary [&_blockquote]:mb-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_del]:text-muted-foreground [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:text-base [&_h3]:font-semibold [&_h4]:font-semibold [&_hr]:my-3 [&_hr]:border-border [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-md [&_ol]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-2 [&_pre]:mb-3 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-slate-50 [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1.5 [&_td[data-align='center']]:text-center [&_td[data-align='right']]:text-right [&_th]:border [&_th]:border-border [&_th]:bg-slate-100 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th[data-align='center']]:text-center [&_th[data-align='right']]:text-right [&_ul]:mb-2 [&_ul]:list-disc [&_ul]:pl-5"
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
