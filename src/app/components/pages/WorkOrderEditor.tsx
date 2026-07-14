import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronsUpDown,
  FileText,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Paperclip,
  Send,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../ui/command";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { RichTextEditor, RichTextView } from "../common/RichTextEditor";
import {
  createRepairWorkOrder,
  listRepairLocationOptions,
  uploadRepairIntakeAttachment,
  type RepairLocationBuildingOption,
  type RepairLocationCommunityOption,
} from "../../lib/repair";
import { richTextToPlain, toMiniappRichText } from "../../lib/richText";
import { useStore } from "../../lib/store";
import { cn } from "../ui/utils";

type LocationMode = "BUILDING" | "COMMUNITY" | "PENDING";

type BuildingChoice = RepairLocationBuildingOption & {
  communityName: string;
};

const CATEGORY_LABEL: Record<string, string> = {
  ELECTRICAL: "电气",
  ELEVATOR: "电梯",
  FIRE_PROTECTION: "消防",
  PLUMBING: "给排水",
  WATERPROOFING: "防水",
  STRUCTURAL: "房屋结构",
  ACCESS_CONTROL: "门禁",
  PUBLIC_LIGHTING: "公共照明",
  ROAD: "道路",
  GREENING: "绿化",
  SANITATION: "环卫",
  DOOR_WINDOW: "门窗",
  OTHER: "其他",
};

export function WorkOrderEditor() {
  const { hasPermission, setPage } = useStore();
  const [title, setTitle] = useState("");
  const [locationMode, setLocationMode] = useState<LocationMode>("BUILDING");
  const [buildingId, setBuildingId] = useState("");
  const [buildingPickerOpen, setBuildingPickerOpen] = useState(false);
  const [buildingSearch, setBuildingSearch] = useState("");
  const [locationCommunities, setLocationCommunities] = useState<RepairLocationCommunityOption[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const descriptionHtml = useMemo(() => toMiniappRichText(description), [description]);
  const canIntake = hasPermission("repair:workorder:intake");
  const buildings = useMemo<BuildingChoice[]>(() => locationCommunities.flatMap((community) =>
    community.buildings.map((building) => ({
      ...building,
      communityName: community.communityName,
    }))), [locationCommunities]);
  const filteredLocationCommunities = useMemo(() => {
    const keyword = buildingSearch.trim().toLocaleLowerCase();
    if (!keyword) return locationCommunities;
    return locationCommunities
      .map((community) => ({
        ...community,
        buildings: community.buildings.filter((building) =>
          `${community.communityName} ${building.buildingName} ${building.buildingId}`
            .toLocaleLowerCase()
            .includes(keyword)),
      }))
      .filter((community) => community.buildings.length > 0);
  }, [buildingSearch, locationCommunities]);
  const selectedBuilding = buildings.find((building) => String(building.buildingId) === buildingId);
  const scopeLabel = locationMode === "PENDING"
    ? "待现场定位"
    : locationMode === "COMMUNITY"
      ? "小区公共区域"
      : selectedBuilding
        ? `楼栋公共部位 · ${selectedBuilding.communityName} · ${selectedBuilding.buildingName}`
        : "楼栋公共部位 · 尚未选择楼栋";

  useEffect(() => {
    if (!canIntake) return;
    let active = true;
    setBuildingsLoading(true);
    listRepairLocationOptions()
      .then((options) => {
        if (active) setLocationCommunities(options.communities);
      })
      .catch((error) => {
        if (active) toast.error(error instanceof Error ? error.message : "楼栋信息加载失败");
      })
      .finally(() => {
        if (active) setBuildingsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [canIntake]);

  async function submit() {
    if (!title.trim()) {
      toast.error("请填写工单标题");
      return;
    }
    if (!richTextToPlain(descriptionHtml)) {
      toast.error("请填写问题描述");
      return;
    }
    if (locationMode === "BUILDING" && !buildingId) {
      toast.error("请选择维修楼栋，无法确认时可改为待现场定位");
      return;
    }
    if (locationMode === "COMMUNITY" && !location.trim()) {
      toast.error("请填写小区公共区域的具体位置");
      return;
    }
    if (!category) {
      toast.error("请选择维修专业");
      return;
    }
    setSubmitting(true);
    try {
      const order = await createRepairWorkOrder({
        title: title.trim(),
        publicAreaScope: locationMode === "PENDING" ? null : locationMode,
        buildingId: locationMode === "BUILDING" ? Number(buildingId) : null,
        locationText: location.trim(),
        category,
        description: descriptionHtml,
      });
      const failedAttachments: string[] = [];
      for (const file of attachmentFiles) {
        try {
          await uploadRepairIntakeAttachment(order.workOrderId, file);
        } catch {
          failedAttachments.push(file.name);
        }
      }
      if (failedAttachments.length > 0) {
        toast.warning(`工单已登记，${failedAttachments.length} 个附件上传失败`);
      } else {
        toast.success(attachmentFiles.length > 0 ? "工单与附件已登记" : "工单已登记");
      }
      setPage("work-orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "工单登记失败");
    } finally {
      setSubmitting(false);
    }
  }

  function addAttachments(files: FileList | null) {
    if (!files) return;
    const next = Array.from(files);
    const accepted: File[] = [];
    for (const file of next) {
      const supported = file.type === "application/pdf" || [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ].includes(file.type);
      if (!supported) {
        toast.error(`${file.name} 不是支持的图片或 PDF 文件`);
        continue;
      }
      if (file.size <= 0 || file.size > 20 * 1024 * 1024) {
        toast.error(`${file.name} 大小必须在 20MB 以内`);
        continue;
      }
      accepted.push(file);
    }
    setAttachmentFiles((current) => {
      const combined = [...current];
      for (const file of accepted) {
        const duplicate = combined.some((item) =>
          item.name === file.name && item.size === file.size && item.lastModified === file.lastModified);
        if (!duplicate) combined.push(file);
      }
      if (combined.length > 5) {
        toast.error("登记工单最多上传 5 个附件");
      }
      return combined.slice(0, 5);
    });
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

          <SectionCard title="位置与维修专业" desc="位置范围决定维修资金和后续治理路径；维修专业用于派单和匹配供应商。">
            <div className="space-y-2">
              <Label>公共区域范围</Label>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-3" role="group" aria-label="公共区域范围">
                <button
                  type="button"
                  aria-pressed={locationMode === "BUILDING"}
                  onClick={() => setLocationMode("BUILDING")}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                    locationMode === "BUILDING"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background hover:bg-muted/40",
                  )}
                >
                  <Building2 className="size-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium">楼栋公共部位</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">楼道、外墙、屋面等共有部位</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={locationMode === "COMMUNITY"}
                  onClick={() => {
                    setLocationMode("COMMUNITY");
                    setBuildingId("");
                    setBuildingPickerOpen(false);
                  }}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                    locationMode === "COMMUNITY"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background hover:bg-muted/40",
                  )}
                >
                  <MapPin className="size-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium">小区公共区域</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">道路、门岗、中心花园等区域</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-pressed={locationMode === "PENDING"}
                  onClick={() => {
                    setLocationMode("PENDING");
                    setBuildingId("");
                    setBuildingPickerOpen(false);
                  }}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                    locationMode === "PENDING"
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border bg-background hover:bg-muted/40",
                  )}
                >
                  <MapPin className="size-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium">待现场定位</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">范围暂不确定，由现场核验补充</span>
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {locationMode === "BUILDING" ? (
                <div className="space-y-1.5">
                  <Label>维修楼栋</Label>
                  <Popover
                    open={buildingPickerOpen}
                    onOpenChange={(open) => {
                      setBuildingPickerOpen(open);
                      if (!open) setBuildingSearch("");
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={buildingPickerOpen}
                        className="w-full justify-between px-3 font-normal"
                        disabled={buildingsLoading}
                      >
                        <span className={cn("truncate", !selectedBuilding && "text-muted-foreground")}>
                          {buildingsLoading
                            ? "正在加载楼栋…"
                            : selectedBuilding
                              ? selectedBuilding.buildingName
                              : buildings.length > 0
                                ? `搜索 ${buildings.length} 栋楼`
                                : "暂无可选楼栋"}
                        </span>
                        {buildingsLoading
                          ? <Loader2 className="size-4 animate-spin opacity-60" />
                          : <ChevronsUpDown className="size-4 opacity-50" />}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command shouldFilter={false}>
                        <CommandInput
                          value={buildingSearch}
                          onValueChange={setBuildingSearch}
                          placeholder="输入楼栋名称或编号"
                        />
                        <CommandList>
                          <CommandEmpty>未找到匹配楼栋</CommandEmpty>
                          {filteredLocationCommunities.map((community) => (
                            <CommandGroup key={community.tenantId} heading={community.communityName}>
                              {community.buildings.map((building) => (
                                <CommandItem
                                  key={building.buildingId}
                                  value={`${community.communityName} ${building.buildingName} ${building.buildingId}`}
                                  onSelect={() => {
                                    setBuildingId(String(building.buildingId));
                                    setBuildingPickerOpen(false);
                                  }}
                                  className="min-h-11"
                                >
                                  <Building2 className="size-4" />
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate">{building.buildingName}</span>
                                    <span className="block text-xs text-muted-foreground">楼栋编号 {building.buildingId}</span>
                                  </span>
                                  <Check className={cn(
                                    "size-4",
                                    buildingId === String(building.buildingId) ? "opacity-100" : "opacity-0",
                                  )} />
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              ) : locationMode === "PENDING" ? (
                <div className="flex min-h-16 items-center rounded-md border bg-muted/20 px-3 text-xs leading-5 text-muted-foreground">
                  提交后进入待补充位置状态，物业或网格员需现场核验并锁定楼栋。
                </div>
              ) : (
                <div className="flex min-h-16 items-center rounded-md border bg-muted/20 px-3 text-xs leading-5 text-muted-foreground">
                  小区公共区域不绑定具体楼栋，请在下方填写可现场识别的准确位置。
                </div>
              )}
              <div className="space-y-1.5">
                <Label>维修专业</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择维修专业" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ELECTRICAL">电气</SelectItem>
                    <SelectItem value="ELEVATOR">电梯</SelectItem>
                    <SelectItem value="FIRE_PROTECTION">消防</SelectItem>
                    <SelectItem value="PLUMBING">给排水</SelectItem>
                    <SelectItem value="WATERPROOFING">防水</SelectItem>
                    <SelectItem value="STRUCTURAL">房屋结构</SelectItem>
                    <SelectItem value="ACCESS_CONTROL">门禁</SelectItem>
                    <SelectItem value="PUBLIC_LIGHTING">公共照明</SelectItem>
                    <SelectItem value="ROAD">道路</SelectItem>
                    <SelectItem value="GREENING">绿化</SelectItem>
                    <SelectItem value="SANITATION">环卫</SelectItem>
                    <SelectItem value="DOOR_WINDOW">门窗</SelectItem>
                    <SelectItem value="OTHER">其他</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Label>{locationMode === "COMMUNITY" ? "具体位置" : "位置线索（选填）"}</Label>
              <Input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder={locationMode === "COMMUNITY"
                  ? "如：小区东门内侧、中心花园北侧主路"
                  : "如：2号楼大堂门禁、地下车库 B 区排水沟"}
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
              attachmentArea={(
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Paperclip className="size-4 text-muted-foreground" />
                      附件
                      <span className="text-xs font-normal text-muted-foreground">
                        图片或 PDF，最多 5 个，单个不超过 20MB
                      </span>
                    </div>
                    <label>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/*,application/pdf"
                        multiple
                        className="sr-only"
                        disabled={submitting || attachmentFiles.length >= 5}
                        onChange={(event) => {
                          addAttachments(event.currentTarget.files);
                          event.currentTarget.value = "";
                        }}
                      />
                      <span className={cn(
                        "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium shadow-sm transition-colors hover:bg-muted",
                        (submitting || attachmentFiles.length >= 5) && "pointer-events-none opacity-50",
                      )}>
                        <Paperclip className="size-3.5" />
                        添加附件
                      </span>
                    </label>
                  </div>
                  {attachmentFiles.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {attachmentFiles.map((file) => (
                        <div
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                          className="flex min-w-0 items-center gap-2 rounded-md border bg-background px-3 py-2"
                        >
                          {file.type === "application/pdf"
                            ? <FileText className="size-4 shrink-0 text-rose-600" />
                            : <ImageIcon className="size-4 shrink-0 text-sky-600" />}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-medium">{file.name}</span>
                            <span className="block text-[11px] text-muted-foreground">{formatFileSize(file.size)}</span>
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0"
                            aria-label={`移除附件 ${file.name}`}
                            disabled={submitting}
                            onClick={() => setAttachmentFiles((current) => current.filter((item) => item !== file))}
                          >
                            <X className="size-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            />
          </SectionCard>
        </div>

        <div className="space-y-5">
          <SectionCard title="登记信息">
            <div className="space-y-3 text-sm">
              <InfoRow label="工单范围" value="公共报修" />
              <InfoRow label="位置范围" value={scopeLabel} />
              <InfoRow label="具体位置" value={location.trim() || "未填写"} />
              <InfoRow label="维修专业" value={category ? CATEGORY_LABEL[category] ?? category : "未选择"} />
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

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
