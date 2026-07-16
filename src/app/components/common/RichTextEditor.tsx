// 关联业务：为公告、议题、报修和维修方案提供基于 Tiptap 的语义化富文本录入与可信展示。
import type { Editor } from "@tiptap/core";
import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Eraser,
  Heading3,
  Heading4,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Loader2,
  Pilcrow,
  Quote,
  Redo2,
  Underline,
  Undo2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { toMiniappRichText } from "../../lib/richText";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

type ImageUploadHandler = (file: File) => Promise<string>;
type ImagePreviewHandler = (source: string) => Promise<string>;

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

interface ToolbarButtonProps {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** 编辑器展示临时预览地址，但输出只保留 imageId，避免把签名地址写入锁定方案。 */
const RepairImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      repairImageId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-repair-image-id"),
        renderHTML: (attributes) => attributes.repairImageId
          ? { "data-repair-image-id": String(attributes.repairImageId) }
          : {},
      },
    };
  },
  parseHTML() {
    return [
      { tag: 'img[src]:not([src^="data:"])' },
      { tag: "img[data-repair-image-id]" },
    ];
  },
});

function imageAlt(fileName: string) {
  return fileName.replace(/[\[\]\\]/g, " ").trim() || "现场图片";
}

function repairImageId(source: string) {
  const match = /^repair-image:\/\/(\d+)$/.exec(source);
  return match ? match[1] : null;
}

function ToolbarButton({ label, active = false, disabled = false, onClick, children }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      size="icon"
      variant={active ? "secondary" : "ghost"}
      className="size-8 shrink-0"
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function ToolbarSeparator() {
  return <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-border" />;
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
  const imageInputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const lastValueRef = useRef(toMiniappRichText(value));
  const [pendingUploads, setPendingUploads] = useState(0);
  const contentHeightClass = rows >= 8 ? "min-h-[360px]" : "min-h-[260px]";
  const uploadingImage = pendingUploads > 0;

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const insertImageFiles = useCallback(async (editor: Editor, files: File[], position?: number) => {
    if (!imageUploadHandler || files.length === 0) return;
    setPendingUploads((count) => count + 1);
    try {
      if (position !== undefined) editor.chain().focus().setTextSelection(position).run();
      for (const file of files) {
        const source = await imageUploadHandler(file);
        const imageId = repairImageId(source);
        const previewSource = imagePreviewHandler ? await imagePreviewHandler(source) : source;
        editor.chain().focus().insertContent({
          type: "image",
          attrs: {
            src: previewSource,
            alt: imageAlt(file.name),
            repairImageId: imageId,
          },
        }).run();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "正文图片上传失败");
    } finally {
      setPendingUploads((count) => Math.max(0, count - 1));
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }, [imagePreviewHandler, imageUploadHandler]);

  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: { levels: [3, 4] },
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      link: {
        autolink: true,
        openOnClick: false,
        protocols: ["http", "https"],
      },
    }),
    Placeholder.configure({ placeholder: placeholder ?? "填写正文" }),
    RepairImage.configure({ inline: false, allowBase64: false }),
    ...(imageUploadHandler ? [FileHandler.configure({
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      consumePasteEvent: true,
      onPaste: (editor, files) => void insertImageFiles(editor, files),
      onDrop: (editor, files, position) => void insertImageFiles(editor, files, position),
    })] : []),
  ], [imageUploadHandler, insertImageFiles, placeholder]);

  const editor = useEditor({
    extensions,
    content: lastValueRef.current,
    editorProps: {
      attributes: {
        class: `${contentHeightClass} max-w-none px-5 py-4 text-sm leading-7 text-slate-800 focus:outline-none [&_a]:font-medium [&_a]:text-primary [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:bg-amber-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-amber-950 [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:border-l-4 [&_h3]:border-primary [&_h3]:pl-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-slate-700 [&_img]:my-5 [&_img]:h-auto [&_img]:max-h-[480px] [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-slate-200 [&_img]:bg-slate-50 [&_img]:object-contain [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      const html = toMiniappRichText(currentEditor.getHTML());
      lastValueRef.current = html;
      onChangeRef.current(html);
    },
  });

  const editorState = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      paragraph: currentEditor?.isActive("paragraph") ?? false,
      heading3: currentEditor?.isActive("heading", { level: 3 }) ?? false,
      heading4: currentEditor?.isActive("heading", { level: 4 }) ?? false,
      bold: currentEditor?.isActive("bold") ?? false,
      italic: currentEditor?.isActive("italic") ?? false,
      underline: currentEditor?.isActive("underline") ?? false,
      bulletList: currentEditor?.isActive("bulletList") ?? false,
      orderedList: currentEditor?.isActive("orderedList") ?? false,
      blockquote: currentEditor?.isActive("blockquote") ?? false,
      canUndo: currentEditor?.can().undo() ?? false,
      canRedo: currentEditor?.can().redo() ?? false,
    }),
  });

  useEffect(() => {
    if (!editor) return;
    const normalized = toMiniappRichText(value);
    if (normalized === lastValueRef.current) return;
    lastValueRef.current = normalized;
    editor.commands.setContent(normalized, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (!editor || !imagePreviewHandler) return;
    const imageIds = new Set<string>();
    editor.state.doc.descendants((node) => {
      if (node.type.name === "image" && node.attrs.repairImageId && !node.attrs.src) {
        imageIds.add(String(node.attrs.repairImageId));
      }
    });
    if (imageIds.size === 0) return;

    void Promise.all(Array.from(imageIds).map(async (imageId) => {
      const previewSource = await imagePreviewHandler(`repair-image://${imageId}`);
      const { state, view } = editor;
      let transaction = state.tr;
      let changed = false;
      state.doc.descendants((node, position) => {
        if (node.type.name === "image" && String(node.attrs.repairImageId) === imageId && !node.attrs.src) {
          transaction = transaction.setNodeMarkup(position, undefined, { ...node.attrs, src: previewSource });
          changed = true;
        }
      });
      if (changed) view.dispatch(transaction);
    })).catch(() => toast.error("正文中的部分图片暂时无法预览"));
  }, [editor, imagePreviewHandler, value]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="overflow-hidden rounded-md border bg-background shadow-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
        <div className="flex min-h-11 items-center gap-0.5 overflow-x-auto border-b bg-slate-50 px-2 py-1.5">
          <ToolbarButton label="撤销" disabled={!editorState?.canUndo} onClick={() => editor?.chain().focus().undo().run()}><Undo2 className="size-4" /></ToolbarButton>
          <ToolbarButton label="重做" disabled={!editorState?.canRedo} onClick={() => editor?.chain().focus().redo().run()}><Redo2 className="size-4" /></ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton label="正文" active={editorState?.paragraph} onClick={() => editor?.chain().focus().setParagraph().run()}><Pilcrow className="size-4" /></ToolbarButton>
          {toolbar === "full" && (
            <>
              <ToolbarButton label="三级标题" active={editorState?.heading3} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></ToolbarButton>
              <ToolbarButton label="四级标题" active={editorState?.heading4} onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}><Heading4 className="size-4" /></ToolbarButton>
            </>
          )}
          <ToolbarSeparator />
          <ToolbarButton label="加粗" active={editorState?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="size-4" /></ToolbarButton>
          <ToolbarButton label="斜体" active={editorState?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="size-4" /></ToolbarButton>
          <ToolbarButton label="下划线" active={editorState?.underline} onClick={() => editor?.chain().focus().toggleUnderline().run()}><Underline className="size-4" /></ToolbarButton>
          <ToolbarSeparator />
          <ToolbarButton label="无序列表" active={editorState?.bulletList} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="size-4" /></ToolbarButton>
          <ToolbarButton label="有序列表" active={editorState?.orderedList} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered className="size-4" /></ToolbarButton>
          {toolbar === "full" && <ToolbarButton label="重点说明" active={editorState?.blockquote} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote className="size-4" /></ToolbarButton>}
          <ToolbarButton label="清除格式" onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}><Eraser className="size-4" /></ToolbarButton>
          {imageUploadHandler && (
            <>
              <ToolbarSeparator />
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => editor && void insertImageFiles(editor, Array.from(event.target.files ?? []))}
              />
              <ToolbarButton label="插入图片" disabled={!editor || uploadingImage} onClick={() => imageInputRef.current?.click()}>
                {uploadingImage ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
              </ToolbarButton>
            </>
          )}
        </div>
        <EditorContent editor={editor} />
        {attachmentArea && <div className="border-t bg-slate-50/80 px-4 py-3">{attachmentArea}</div>}
      </div>
    </div>
  );
}

function RichTextContent({ html }: { html: string }) {
  return (
    <div
      className="text-[15px] leading-7 text-slate-700 [&_a]:font-medium [&_a]:text-primary [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-amber-400 [&_blockquote]:bg-amber-50 [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:text-amber-950 [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-3 [&_h3]:mt-6 [&_h3]:border-l-4 [&_h3]:border-primary [&_h3]:pl-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h4]:mb-2 [&_h4]:mt-5 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:text-slate-700 [&_img]:mx-auto [&_img]:my-5 [&_img]:h-auto [&_img]:max-h-[520px] [&_img]:max-w-full [&_img]:rounded-md [&_img]:border [&_img]:border-slate-200 [&_img]:bg-slate-50 [&_img]:object-contain [&_li]:my-1.5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-slate-950 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function RichTextView({ html }: { html?: string | null }) {
  const safe = useMemo(() => toMiniappRichText(html ?? ""), [html]);
  if (!safe) return <div className="text-sm text-muted-foreground">无正文</div>;
  return <RichTextContent html={safe} />;
}
