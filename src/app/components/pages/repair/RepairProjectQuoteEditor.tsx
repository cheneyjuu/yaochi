// 关联业务：供应商与物业按维修点位或项目通用事项填写专业报价明细，报价行不等同于维修点位。
import { useState } from "react";
import { ChevronDown, Copy, Plus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import type {
  RepairProjectQuoteLineInput,
  RepairProjectQuoteLineType,
  RepairProjectSupplierQuote,
} from "../../../lib/repair-project";

/** 报价编辑只需要点位的稳定标识与业务名称，不把点位数量或暂估金额复制为报价事实。 */
export interface RepairQuoteWorkPoint {
  workPointId: number;
  businessName: string;
}

export interface RepairQuoteLineDraft {
  clientId: string;
  workPointId: number | null;
  itemName: string;
  lineType: RepairProjectQuoteLineType | "";
  workDescription: string;
  specificationModel: string;
  brand: string;
  procurementMethod: string;
  quantity: string;
  unit: string;
  unitPriceExcludingTax: string;
  remark: string;
}

const LINE_TYPE_LABEL: Record<RepairProjectQuoteLineType, string> = {
  MATERIAL_EQUIPMENT: "材料 / 设备",
  LABOR_SERVICE: "人工 / 服务",
  CONSTRUCTION_MEASURE: "施工项目",
  TRANSPORT_CLEANUP: "运输 / 清运",
  OTHER: "其他",
};

const LINE_TYPES = Object.entries(LINE_TYPE_LABEL) as Array<[RepairProjectQuoteLineType, string]>;

let draftSequence = 0;

function nextDraftId(): string {
  draftSequence += 1;
  return `quote-line-${draftSequence}`;
}

function emptyQuoteLine(): RepairQuoteLineDraft {
  return {
    clientId: nextDraftId(),
    workPointId: null,
    itemName: "",
    lineType: "",
    workDescription: "",
    specificationModel: "",
    brand: "",
    procurementMethod: "",
    quantity: "",
    unit: "",
    unitPriceExcludingTax: "",
    remark: "",
  };
}

/** 新报价不从维修点位自动生成数量、单价或专业明细。 */
export function createRepairQuoteDraftLines(): RepairQuoteLineDraft[] {
  return [];
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function hasAtMostDecimalPlaces(value: string, maxDecimalPlaces: number): boolean {
  const match = /^(?:0|[1-9]\d*)(?:\.(\d+))?$/.exec(value.trim());
  return Boolean(match) && (match?.[1]?.length ?? 0) <= maxDecimalPlaces;
}

function lineAmountExcludingTax(line: RepairQuoteLineDraft): number {
  const quantity = Number(line.quantity);
  const unitPrice = Number(line.unitPriceExcludingTax);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity <= 0 || unitPrice < 0) {
    return 0;
  }
  return roundCurrency(quantity * unitPrice);
}

export function calculateRepairQuoteSubtotal(lines: RepairQuoteLineDraft[]): number {
  return roundCurrency(lines.reduce((total, line) => total + lineAmountExcludingTax(line), 0));
}

export function calculateRepairQuoteTax(lines: RepairQuoteLineDraft[], taxRate: string | number): number {
  const rate = Number(taxRate);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return 0;
  return roundCurrency(calculateRepairQuoteSubtotal(lines) * rate / 100);
}

export function calculateRepairQuoteTotal(
  lines: RepairQuoteLineDraft[],
  taxRate: string | number,
): number {
  return roundCurrency(calculateRepairQuoteSubtotal(lines) + calculateRepairQuoteTax(lines, taxRate));
}

export function validateRepairQuoteDraft(
  lines: RepairQuoteLineDraft[],
  workPoints: RepairQuoteWorkPoint[],
  taxRate: string,
): string | null {
  if (lines.length === 0) return "请新增并填写报价明细";
  if (lines.length > 200) return "单个报价版本最多填写 200 条明细";
  const rate = Number(taxRate);
  if (taxRate.trim() === "" || !Number.isFinite(rate) || rate < 0 || rate > 100 || !hasAtMostDecimalPlaces(taxRate, 3)) {
    return "整份报价单税率必须在 0% 至 100% 之间，且最多 3 位小数";
  }
  for (const line of lines) {
    if (line.workPointId != null && !workPoints.some((point) => point.workPointId === line.workPointId)) {
      return "报价明细关联了当前方案外的维修点位";
    }
    if (!line.itemName.trim()) return "每条报价明细都要填写明细名称";
    if (!line.lineType) return "每条报价明细都要选择类别";
    if (!line.unit.trim()) return "每条报价明细都要填写单位";
    if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0 || !hasAtMostDecimalPlaces(line.quantity, 3)) return "报价明细数量必须是最多 3 位小数的正数";
    if (line.unitPriceExcludingTax.trim() === "") return "请填写不含税单价";
    if (!Number.isFinite(Number(line.unitPriceExcludingTax)) || Number(line.unitPriceExcludingTax) < 0 || !hasAtMostDecimalPlaces(line.unitPriceExcludingTax, 2)) {
      return "不含税单价必须是最多 2 位小数的非负数";
    }
  }
  if (calculateRepairQuoteSubtotal(lines) <= 0) return "报价明细不含税合计必须大于 0";
  return null;
}

export function toRepairQuoteLineInputs(lines: RepairQuoteLineDraft[]): RepairProjectQuoteLineInput[] {
  return lines.map((line) => ({
    workPointId: line.workPointId ?? undefined,
    itemName: line.itemName.trim(),
    lineType: line.lineType as RepairProjectQuoteLineType,
    workDescription: line.workDescription.trim() || undefined,
    specificationModel: line.specificationModel.trim() || undefined,
    brand: line.brand.trim() || undefined,
    procurementMethod: line.procurementMethod.trim() || undefined,
    quantity: Number(line.quantity),
    unit: line.unit.trim(),
    unitPriceExcludingTax: Number(line.unitPriceExcludingTax),
    remark: line.remark.trim() || undefined,
  }));
}

function money(value: number): string {
  return `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function workDescriptionLabel(lineType: RepairProjectQuoteLineType | ""): string {
  if (lineType === "LABOR_SERVICE") return "工种 / 服务说明";
  if (lineType === "TRANSPORT_CLEANUP") return "运输 / 清运说明";
  return "项目特征 / 工作内容";
}

function showsWorkDescription(lineType: RepairProjectQuoteLineType | ""): boolean {
  return lineType !== "MATERIAL_EQUIPMENT";
}

function showsMaterialFields(lineType: RepairProjectQuoteLineType | ""): boolean {
  return lineType === "MATERIAL_EQUIPMENT";
}

function showsProcurementMethod(lineType: RepairProjectQuoteLineType | ""): boolean {
  return lineType === "MATERIAL_EQUIPMENT" || lineType === "CONSTRUCTION_MEASURE";
}

function hasAdditionalInformation(line: RepairQuoteLineDraft): boolean {
  return Boolean(
    line.workDescription.trim()
    || line.specificationModel.trim()
    || line.brand.trim()
    || line.procurementMethod.trim()
    || line.remark.trim(),
  );
}

function DeleteQuoteLineButton({ lineName, onConfirm }: { lineName: string; onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive" title="删除本条明细">
          <Trash2 className="size-4" />删除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除「{lineName.trim() || "未命名明细"}」？</AlertDialogTitle>
          <AlertDialogDescription>本条已填写的数量、单价和补充信息都会从当前报价中移除。</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={onConfirm}>确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function RepairProjectQuoteEditor({
  workPoints,
  lines,
  taxRate,
  onChange,
  onTaxRateChange,
}: {
  workPoints: RepairQuoteWorkPoint[];
  lines: RepairQuoteLineDraft[];
  taxRate: string;
  onChange: (lines: RepairQuoteLineDraft[]) => void;
  onTaxRateChange: (value: string) => void;
}) {
  const [expandedLineIds, setExpandedLineIds] = useState<Set<string>>(() => new Set());

  function updateLine<K extends keyof RepairQuoteLineDraft>(
    clientId: string,
    field: K,
    value: RepairQuoteLineDraft[K],
  ) {
    onChange(lines.map((line) => line.clientId === clientId ? { ...line, [field]: value } : line));
  }

  function removeLine(clientId: string) {
    setExpandedLineIds((current) => {
      const next = new Set(current);
      next.delete(clientId);
      return next;
    });
    onChange(lines.filter((line) => line.clientId !== clientId));
  }

  function duplicateLine(source: RepairQuoteLineDraft) {
    const duplicated = { ...source, clientId: nextDraftId() };
    const sourceIndex = lines.findIndex((line) => line.clientId === source.clientId);
    const nextLines = [...lines];
    nextLines.splice(sourceIndex + 1, 0, duplicated);
    if (expandedLineIds.has(source.clientId)) {
      setExpandedLineIds((current) => new Set(current).add(duplicated.clientId));
    }
    onChange(nextLines);
  }

  function toggleLineDetails(clientId: string) {
    setExpandedLineIds((current) => {
      const next = new Set(current);
      if (next.has(clientId)) next.delete(clientId);
      else next.add(clientId);
      return next;
    });
  }

  const subtotal = calculateRepairQuoteSubtotal(lines);
  const tax = calculateRepairQuoteTax(lines, taxRate);
  const total = calculateRepairQuoteTotal(lines, taxRate);

  return (
    <div className="border-y">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 px-4 py-3">
        <p className="max-w-3xl text-sm leading-5 text-muted-foreground">维修点位用于定位报价范围；运输、清运等项目通用明细可以不关联点位。点位的范围量和暂估金额不会自动填入报价。</p>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, emptyQuoteLine()])}><Plus className="size-4" />新增报价明细</Button>
      </div>

      {lines.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted-foreground">尚未新增报价明细。</div>
      ) : (
        <div className="divide-y">
          {lines.map((line, index) => {
            const detailsExpanded = expandedLineIds.has(line.clientId);
            const additionalInformationFilled = hasAdditionalInformation(line);
            return (
              <section key={line.clientId} className="px-4 py-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">报价明细 {index + 1}</span>
                    {additionalInformationFilled && !detailsExpanded && <span className="text-xs font-medium text-primary">含补充信息</span>}
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    <Button type="button" size="sm" variant={detailsExpanded ? "secondary" : "ghost"} className="h-8 px-2" aria-expanded={detailsExpanded} onClick={() => toggleLineDetails(line.clientId)}><ChevronDown className={`size-4 transition-transform ${detailsExpanded ? "rotate-180" : ""}`} />补充字段</Button>
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => duplicateLine(line)}><Copy className="size-4" />复制</Button>
                    <div className="ml-2 border-l pl-2"><DeleteQuoteLineButton lineName={line.itemName} onConfirm={() => removeLine(line.clientId)} /></div>
                  </div>
                </div>

                <div className="grid items-end gap-x-4 gap-y-3 lg:grid-cols-3">
                  <div>
                    <Label htmlFor={`${line.clientId}-point`} className="mb-2">关联维修点位（可选）</Label>
                    <Select value={line.workPointId == null ? "__PROJECT_WIDE__" : String(line.workPointId)} onValueChange={(value) => updateLine(line.clientId, "workPointId", value === "__PROJECT_WIDE__" ? null : Number(value))}>
                      <SelectTrigger id={`${line.clientId}-point`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__PROJECT_WIDE__">项目通用明细（不关联点位）</SelectItem>
                        {workPoints.map((point) => <SelectItem key={point.workPointId} value={String(point.workPointId)}>{point.businessName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor={`${line.clientId}-name`} className="mb-2">明细名称</Label>
                    <Input id={`${line.clientId}-name`} value={line.itemName} onChange={(event) => updateLine(line.clientId, "itemName", event.target.value)} placeholder="材料、人工、运输或施工项目" />
                  </div>
                  <div>
                    <Label htmlFor={`${line.clientId}-type`} className="mb-2">明细类别</Label>
                    <Select value={line.lineType || "__UNSELECTED__"} onValueChange={(value) => updateLine(line.clientId, "lineType", value === "__UNSELECTED__" ? "" : value as RepairProjectQuoteLineType)}>
                      <SelectTrigger id={`${line.clientId}-type`}><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="__UNSELECTED__">选择类别</SelectItem>{LINE_TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="mt-4 grid items-end gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-[minmax(7rem,0.7fr)_minmax(6rem,0.6fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]">
                  <div><Label htmlFor={`${line.clientId}-quantity`} className="mb-2">数量</Label><Input id={`${line.clientId}-quantity`} type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(line.clientId, "quantity", event.target.value)} /></div>
                  <div><Label htmlFor={`${line.clientId}-unit`} className="mb-2">单位</Label><Input id={`${line.clientId}-unit`} value={line.unit} onChange={(event) => updateLine(line.clientId, "unit", event.target.value)} /></div>
                  <div><Label htmlFor={`${line.clientId}-unit-price`} className="mb-2">不含税单价</Label><Input id={`${line.clientId}-unit-price`} type="number" min="0" step="0.01" value={line.unitPriceExcludingTax} onChange={(event) => updateLine(line.clientId, "unitPriceExcludingTax", event.target.value)} placeholder="0.00" /></div>
                  <div><Label className="mb-2">不含税金额</Label><div className="flex h-9 items-center rounded-md border bg-muted/30 px-3 text-sm font-semibold tabular-nums">{money(lineAmountExcludingTax(line))}</div></div>
                </div>

                {detailsExpanded && (
                  <div className="mt-4 grid items-start gap-4 border-t bg-muted/10 px-3 py-4 sm:grid-cols-2 xl:grid-cols-4">
                    {showsWorkDescription(line.lineType) && <div className="sm:col-span-2 xl:col-span-4"><Label htmlFor={`${line.clientId}-description`} className="mb-2">{workDescriptionLabel(line.lineType)}</Label><Textarea id={`${line.clientId}-description`} rows={2} value={line.workDescription} onChange={(event) => updateLine(line.clientId, "workDescription", event.target.value)} placeholder="没有可不填" /></div>}
                    {showsMaterialFields(line.lineType) && <><div><Label htmlFor={`${line.clientId}-specification`} className="mb-2">规格型号</Label><Input id={`${line.clientId}-specification`} value={line.specificationModel} onChange={(event) => updateLine(line.clientId, "specificationModel", event.target.value)} placeholder="没有可不填" /></div><div><Label htmlFor={`${line.clientId}-brand`} className="mb-2">品牌 / 厂家</Label><Input id={`${line.clientId}-brand`} value={line.brand} onChange={(event) => updateLine(line.clientId, "brand", event.target.value)} placeholder="没有可不填" /></div></>}
                    {showsProcurementMethod(line.lineType) && <div><Label htmlFor={`${line.clientId}-procurement`} className="mb-2">采购 / 实施方式</Label><Input id={`${line.clientId}-procurement`} value={line.procurementMethod} onChange={(event) => updateLine(line.clientId, "procurementMethod", event.target.value)} placeholder="按报价原件填写" /></div>}
                    <div className={showsMaterialFields(line.lineType) ? undefined : showsProcurementMethod(line.lineType) ? "xl:col-span-3" : "sm:col-span-2 xl:col-span-4"}><Label htmlFor={`${line.clientId}-remark`} className="mb-2">备注</Label><Input id={`${line.clientId}-remark`} value={line.remark} onChange={(event) => updateLine(line.clientId, "remark", event.target.value)} placeholder="产地、施工边界等" /></div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      <div className="border-t bg-muted/20 px-4 py-4 text-sm">
        <div className="mb-3 font-semibold">报价汇总</div>
        <div className="grid items-end gap-4 sm:grid-cols-[minmax(10rem,16rem)_1fr]">
          <div><Label>整份报价单税率</Label><div className="relative"><Input className="pr-8" type="number" min="0" max="100" step="0.001" value={taxRate} onChange={(event) => onTaxRateChange(event.target.value)} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span></div></div>
          <div className="grid grid-cols-3 gap-3 text-right"><div><div className="text-xs text-muted-foreground">不含税合计</div><div className="mt-1 font-medium tabular-nums">{money(subtotal)}</div></div><div><div className="text-xs text-muted-foreground">税额</div><div className="mt-1 font-medium tabular-nums">{money(tax)}</div></div><div><div className="text-xs text-muted-foreground">含税总额</div><div className="mt-1 text-base font-semibold tabular-nums">{money(total)}</div></div></div>
        </div>
      </div>
    </div>
  );
}

export function RepairProjectQuoteDetail({ quote }: { quote: RepairProjectSupplierQuote }) {
  if (!quote.quoteLines?.length) {
    return <div className="border-y px-3 py-6 text-center text-sm text-muted-foreground">该历史报价提交时尚未启用结构化明细，请查看报价原件。</div>;
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6"><div><span className="text-muted-foreground">不含税：</span>{money(quote.amountExcludingTax)}</div><div><span className="text-muted-foreground">税率：</span>{quote.taxRate}%</div><div><span className="text-muted-foreground">税额：</span>{money(quote.taxAmount)}</div><div><span className="text-muted-foreground">含税总额：</span>{money(quote.quoteAmount)}</div><div><span className="text-muted-foreground">施工工期：</span>{quote.constructionPeriodDays ?? "-"} 天</div><div><span className="text-muted-foreground">质保期：</span>{quote.warrantyDays ?? "-"} 天</div></div>
      <div className="overflow-x-auto border-y">
        <table className="w-full min-w-[1180px] text-sm"><thead className="bg-muted/40"><tr><th className="p-2 text-left">关联维修点位</th><th className="p-2 text-left">类别</th><th className="p-2 text-left">明细 / 工作内容</th><th className="p-2 text-left">规格 / 品牌 / 方式</th><th className="p-2 text-right">数量</th><th className="p-2 text-right">不含税单价</th><th className="p-2 text-right">不含税金额</th><th className="p-2 text-left">备注</th></tr></thead><tbody>{quote.quoteLines.map((line) => {
          const attributes = [line.specificationModel, line.brand, line.procurementMethod].filter(Boolean).join(" / ") || "-";
          const pointLabel = line.workPointId == null ? "项目通用明细" : line.workPointName ?? `维修点位 #${line.workPointId}`;
          return <tr key={line.quoteLineId} className="border-t"><td className="p-2">{pointLabel}</td><td className="p-2">{LINE_TYPE_LABEL[line.lineType]}</td><td className="p-2"><div className="font-medium">{line.itemName}</div>{line.workDescription && <div className="mt-1 text-xs text-muted-foreground">{line.workDescription}</div>}</td><td className="p-2">{attributes}</td><td className="p-2 text-right">{line.quantity} {line.unit}</td><td className="p-2 text-right tabular-nums">{money(line.unitPriceExcludingTax)}</td><td className="p-2 text-right font-medium tabular-nums">{money(line.amountExcludingTax)}</td><td className="p-2">{line.remark || "-"}</td></tr>;
        })}</tbody></table>
      </div>
    </div>
  );
}
