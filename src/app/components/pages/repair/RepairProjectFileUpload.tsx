// 关联业务：为维修工程邀价、合同、施工、验收和付款上传同一项目权限边界内的原始附件。
import { useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { uploadRepairProjectAttachment, type RepairProjectAttachment } from "../../../lib/repair-project";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";

export function RepairProjectFileUpload({
  projectId,
  label,
  value,
  accept = ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx",
  onUploaded,
}: {
  projectId: number;
  label: string;
  value?: RepairProjectAttachment | null;
  accept?: string;
  onUploaded: (attachment: RepairProjectAttachment) => void;
}) {
  const [uploading, setUploading] = useState(false);

  return (
    <div>
      <Label>{label}</Label>
      <label className="mt-1 flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-dashed px-3 text-sm hover:bg-muted/40">
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4 text-muted-foreground" />}
        <span className="min-w-0 flex-1 truncate">{value?.originalFileName ?? "选择并上传原始文件"}</span>
        <Input
          className="hidden"
          type="file"
          accept={accept}
          disabled={uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            setUploading(true);
            uploadRepairProjectAttachment(projectId, file)
              .then(onUploaded)
              .catch((error) => toast.error(error instanceof Error ? error.message : "文件上传失败"))
              .finally(() => setUploading(false));
          }}
        />
      </label>
    </div>
  );
}
