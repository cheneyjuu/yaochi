// 关联业务：供属地街镇或平台受控审核人核验小区注册、申报身份并开通冷启动工作区。
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Eye,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  UserRoundCheck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState, KpiCard, PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Textarea } from "../ui/textarea";
import { useStore } from "../../lib/store";
import { mapPropertyMode, MODE_META } from "../../lib/types";
import {
  listCommunityRegistrationsForReview,
  previewCommunityRegistrationMaterial,
  reviewCommunityRegistration,
  type CommunityMaterialPreview,
  type CommunityRegistration,
  type CommunityRegistrationStatus,
} from "../../lib/community-registration";

const STATUS_OPTIONS: Array<{ value: CommunityRegistrationStatus; label: string }> = [
  { value: "SUBMITTED", label: "待审核" },
  { value: "RETURNED", label: "已退回" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已拒绝" },
  { value: "WITHDRAWN", label: "已撤回" },
];

const STATUS_LABEL: Record<CommunityRegistrationStatus, string> = {
  DRAFT: "草稿",
  SUBMITTED: "待审核",
  RETURNED: "已退回",
  APPROVED: "已通过",
  REJECTED: "已拒绝",
  WITHDRAWN: "已撤回",
};

const IDENTITY_LABEL: Record<CommunityRegistration["claimedIdentity"], string> = {
  COMMITTEE_DIRECTOR: "业委会主任",
  COMMITTEE_VICE_DIRECTOR: "业委会副主任",
  COMMITTEE_MEMBER: "业委会委员",
  OWNER: "业主",
  COMMUNITY_STAFF: "居委会工作人员",
};

const MATERIAL_LABEL: Record<string, string> = {
  COMMUNITY_EXISTENCE_PROOF: "小区存在证明",
  COMMITTEE_FILING: "业委会备案材料",
  POSITION_PROOF: "任职证明",
  OWNER_IDENTITY_PROOF: "业主身份材料",
  COMMUNITY_STAFF_PROOF: "居委会工作证明",
  OTHER: "其他材料",
};

export function CommunityRegistrationReview() {
  const { roleKey } = useStore();
  const [status, setStatus] = useState<CommunityRegistrationStatus>("SUBMITTED");
  const [items, setItems] = useState<CommunityRegistration[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [fallbackReason, setFallbackReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);
  const [preview, setPreview] = useState<CommunityMaterialPreview | null>(null);

  const isPlatformFallback = roleKey === "PLATFORM_OPERATOR";
  const selected = useMemo(
    () => items.find((item) => item.applicationId === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  async function load() {
    setLoading(true);
    try {
      const next = await listCommunityRegistrationsForReview(status);
      setItems(next);
      setSelectedId((current) => (
        current && next.some((item) => item.applicationId === current)
          ? current
          : next[0]?.applicationId ?? null
      ));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "小区注册审核队列加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [status]);

  useEffect(() => {
    setComment("");
    setFallbackReason("");
  }, [selected?.applicationId]);

  async function decide(decision: "RETURN" | "APPROVE" | "REJECT") {
    if (!selected || selected.status !== "SUBMITTED") return;
    if ((decision === "RETURN" || decision === "REJECT") && comment.trim().length < 2) {
      toast.error("退回或拒绝必须填写明确审核意见");
      return;
    }
    if (isPlatformFallback && fallbackReason.trim().length < 10) {
      toast.error("平台代审必须说明街镇未接入情况和代审依据");
      return;
    }
    setActing(true);
    try {
      await reviewCommunityRegistration(selected.applicationId, {
        decision,
        reviewMode: isPlatformFallback ? "PLATFORM_FALLBACK" : "STREET",
        reviewComment: comment.trim() || undefined,
        fallbackReason: isPlatformFallback ? fallbackReason.trim() : undefined,
        expectedVersion: selected.version,
      });
      toast.success(decision === "APPROVE" ? "审核通过，冷启动工作区已创建" : decision === "RETURN" ? "已退回申请人补充" : "申请已拒绝");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "审核处理失败");
    } finally {
      setActing(false);
    }
  }

  async function openPreview(materialId: number) {
    if (!selected) return;
    try {
      setPreview(await previewCommunityRegistrationMaterial(selected.applicationId, materialId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "材料预览失败");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="小区注册审核"
        desc="核验小区真实性、属地关系和注册人申报身份；审核通过后事务性创建冷启动工作区。"
        actions={
          <>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as CommunityRegistrationStatus)}
            >
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />刷新
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="当前队列" value={items.length} tone="primary" />
        <KpiCard label="审核路径" value={isPlatformFallback ? "平台代审" : "属地街镇"} tone="tech" />
        <KpiCard label="当前申请" value={selected?.applicationNo ?? "-"} tone="neutral" />
      </div>

      {isPlatformFallback && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-950">
          <ShieldAlert className="size-4" />
          <AlertTitle>平台代审属于冷启动兜底路径</AlertTitle>
          <AlertDescription>
            仅在属地街镇尚未接入时使用。必须记录代审原因；创建租户后，官方归属仍待属地确认。
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(430px,0.95fr)]">
        <SectionCard title="注册申请队列" bodyClassName="p-0">
          {items.length === 0 ? (
            <EmptyState title="当前状态下暂无注册申请" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>申请</TableHead>
                  <TableHead>小区</TableHead>
                  <TableHead>注册人</TableHead>
                  <TableHead>区域</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.applicationId}
                    className={selected?.applicationId === item.applicationId ? "bg-muted/60" : "cursor-pointer"}
                    onClick={() => setSelectedId(item.applicationId)}
                  >
                    <TableCell>
                      <div className="font-medium">{item.applicationNo}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{formatDate(item.submittedAt ?? item.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{item.communityName}</div>
                      <div className="mt-1 max-w-[220px] truncate text-xs text-muted-foreground">{item.communityAddress}</div>
                    </TableCell>
                    <TableCell>
                      <div>{item.applicantName}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{IDENTITY_LABEL[item.claimedIdentity]}</div>
                    </TableCell>
                    <TableCell>{item.districtName}</TableCell>
                    <TableCell><RegistrationStatusChip status={item.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SectionCard>

        <SectionCard
          title="申请核验"
          desc={selected ? `${selected.communityName} · ${selected.applicationNo}` : undefined}
        >
          {!selected ? (
            <EmptyState title="请选择一条注册申请" />
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Info icon={Building2} label="小区" value={selected.communityName} />
                <Info icon={MapPin} label="行政区" value={`${selected.provinceName} ${selected.cityName} ${selected.districtName}`} />
                <Info icon={UserRoundCheck} label="注册人" value={`${selected.applicantName} · ${IDENTITY_LABEL[selected.claimedIdentity]}`} />
                <Info icon={Building2} label="申报户数" value={`${selected.declaredHouseholdCount} 户`} />
                <Info icon={Building2} label="申报模式" value={propertyModeLabel(selected.declaredPropertyMode)} />
              </div>

              <div className="rounded-md bg-muted/50 px-4 py-3 text-sm">
                <div className="text-xs text-muted-foreground">小区地址</div>
                <div className="mt-1 leading-6">{selected.communityAddress}</div>
                <div className="mt-2 text-xs text-muted-foreground">概况标签</div>
                <div className="mt-1">{selected.housingTags.map(housingTagLabel).join("、")}</div>
              </div>

              <div>
                <div className="mb-2 text-sm font-medium">审核材料</div>
                {selected.materials.length === 0 ? (
                  <div className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">未上传材料</div>
                ) : (
                  <div className="divide-y rounded-md border">
                    {selected.materials.map((material) => (
                      <div key={material.materialId} className="flex items-center gap-3 px-3 py-2.5">
                        <FileText className="size-4 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{material.originalFileName}</div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {MATERIAL_LABEL[material.materialType] ?? material.materialType} · {formatFileSize(material.fileSize)}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => openPreview(material.materialId)}>
                          <Eye className="mr-1.5 size-4" />预览
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selected.reviews.length > 0 && (
                <div>
                  <div className="mb-2 text-sm font-medium">历史审核</div>
                  <div className="space-y-2">
                    {selected.reviews.map((review) => (
                      <div key={review.reviewId} className="rounded-md border px-3 py-2.5 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{decisionLabel(review.decision)}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</span>
                        </div>
                        {review.reviewComment && <div className="mt-1.5 leading-5 text-muted-foreground">{review.reviewComment}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.onboarding && (
                <Alert className="border-emerald-300 bg-emerald-50 text-emerald-950">
                  <CheckCircle2 className="size-4" />
                  <AlertTitle>冷启动工作区已创建</AlertTitle>
                  <AlertDescription>
                    租户 {selected.onboarding.tenantId} 已建立；空间底册、产权名册和计票基数仍需分别初始化和发布。
                  </AlertDescription>
                </Alert>
              )}

              {selected.status === "SUBMITTED" && (
                <div className="space-y-3 border-t pt-4">
                  <Textarea
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="填写审核意见；退回或拒绝时必填"
                    rows={3}
                  />
                  {isPlatformFallback && (
                    <Textarea
                      value={fallbackReason}
                      onChange={(event) => setFallbackReason(event.target.value)}
                      placeholder="说明街镇未接入情况、代审依据和后续归属确认安排"
                      rows={3}
                    />
                  )}
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="outline" onClick={() => decide("RETURN")} disabled={acting}>
                      <RotateCcw className="mr-2 size-4" />退回补充
                    </Button>
                    <Button variant="outline" onClick={() => decide("REJECT")} disabled={acting} className="text-destructive hover:text-destructive">
                      <XCircle className="mr-2 size-4" />拒绝申请
                    </Button>
                    <Button onClick={() => decide("APPROVE")} disabled={acting}>
                      {acting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                      审核通过
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </div>

      <MaterialPreviewDialog preview={preview} onOpenChange={(open) => !open && setPreview(null)} />
    </div>
  );
}

function MaterialPreviewDialog({
  preview,
  onOpenChange,
}: {
  preview: CommunityMaterialPreview | null;
  onOpenChange: (open: boolean) => void;
}) {
  const image = preview?.contentType.startsWith("image/");
  return (
    <Dialog open={!!preview} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4 pr-12">
          <DialogTitle>{preview?.originalFileName ?? "审核材料"}</DialogTitle>
          <DialogDescription>
            私有材料临时预览 · 链接于 {preview ? formatDate(preview.expiresAt) : "-"} 失效
          </DialogDescription>
        </DialogHeader>
        <div className="h-[72vh] min-h-[420px] bg-slate-100 p-4">
          {preview && image ? (
            <img src={preview.previewUrl} alt={preview.originalFileName} className="size-full object-contain" />
          ) : preview ? (
            <iframe title={preview.originalFileName} src={preview.previewUrl} className="size-full border-0 bg-white" />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RegistrationStatusChip({ status }: { status: CommunityRegistrationStatus }) {
  const tone = status === "SUBMITTED" ? "warning" : status === "APPROVED" ? "success" : status === "REJECTED" ? "danger" : "neutral";
  return <StatusChip tone={tone} dot>{STATUS_LABEL[status]}</StatusChip>;
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" />{label}</div>
      <div className="mt-1.5 break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function housingTagLabel(value: string): string {
  return ({
    SHOP: "商铺",
    RELOCATION_HOUSING: "动迁房",
    COMMERCIAL_HOUSING: "商品房",
    VILLA: "别墅",
  } as Record<string, string>)[value] ?? value;
}

function propertyModeLabel(mode: CommunityRegistration["declaredPropertyMode"]): string {
  return MODE_META[mapPropertyMode(mode)].label;
}

function decisionLabel(value: string): string {
  return ({ RETURN: "退回补充", APPROVE: "审核通过", REJECT: "拒绝申请" } as Record<string, string>)[value] ?? value;
}

function formatFileSize(size: number): string {
  return size >= 1024 * 1024
    ? `${(size / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}
