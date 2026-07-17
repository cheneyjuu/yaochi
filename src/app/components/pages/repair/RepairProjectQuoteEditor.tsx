// 关联业务：供应商与物业按锁定工程项填写差异化维修报价明细，并按整份报价单统一计税。
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import type {
  RepairProjectQuoteLineInput,
  RepairProjectQuoteLineType,
  RepairProjectSupplierQuote,
} from "../../../lib/repair-project";

export interface RepairQuoteScopeItem {
  itemId: number;
  itemNo: string;
  locationText: string;
  workContent: string;
  quantity: number;
  unit: string;
}

export interface RepairQuoteLineDraft {
  clientId: string;
  projectItemId: number;
  itemName: string;
  lineType: RepairProjectQuoteLineType;
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

function draftForItem(item: RepairQuoteScopeItem, initial = true): RepairQuoteLineDraft {
  return {
    clientId: nextDraftId(),
    projectItemId: item.itemId,
    itemName: initial ? item.workContent : "",
    lineType: "CONSTRUCTION_MEASURE",
    workDescription: "",
    specificationModel: "",
    brand: "",
    procurementMethod: "",
    quantity: initial ? String(item.quantity) : "1",
    unit: initial ? item.unit : "项",
    unitPriceExcludingTax: "",
    remark: "",
  };
}

export function createRepairQuoteDraftLines(items: RepairQuoteScopeItem[]): RepairQuoteLineDraft[] {
  return items.map((item) => draftForItem(item));
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
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
  items: RepairQuoteScopeItem[],
  taxRate: string,
): string | null {
  if (lines.length === 0) return "请填写报价明细";
  if (lines.length > 200) return "单个报价版本最多填写 200 条明细";
  const rate = Number(taxRate);
  if (taxRate.trim() === "" || !Number.isFinite(rate) || rate < 0 || rate > 100) {
    return "整份报价单税率必须在 0% 至 100% 之间";
  }
  const covered = new Set(lines.map((line) => line.projectItemId));
  const missing = items.filter((item) => !covered.has(item.itemId));
  if (missing.length > 0) return `报价明细尚未覆盖工程项：${missing.map((item) => item.itemNo).join("、")}`;
  for (const line of lines) {
    if (!line.itemName.trim()) return "每条报价明细都要填写明细名称";
    if (!line.lineType) return "每条报价明细都要选择类别";
    if (!line.unit.trim()) return "每条报价明细都要填写单位";
    if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) return "报价明细数量必须大于 0";
    if (line.unitPriceExcludingTax === "" || !Number.isFinite(Number(line.unitPriceExcludingTax)) || Number(line.unitPriceExcludingTax) < 0) {
      return "不含税单价不能小于 0";
    }
  }
  if (calculateRepairQuoteSubtotal(lines) <= 0) return "报价明细不含税合计必须大于 0";
  return null;
}

export function toRepairQuoteLineInputs(lines: RepairQuoteLineDraft[]): RepairProjectQuoteLineInput[] {
  return lines.map((line) => ({
    projectItemId: line.projectItemId,
    itemName: line.itemName.trim(),
    lineType: line.lineType,
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

function workDescriptionLabel(lineType: RepairProjectQuoteLineType): string {
  if (lineType === "LABOR_SERVICE") return "工种 / 服务说明";
  if (lineType === "TRANSPORT_CLEANUP") return "运输 / 清运说明";
  return "项目特征 / 工作内容";
}

function showsWorkDescription(lineType: RepairProjectQuoteLineType): boolean {
  return lineType !== "MATERIAL_EQUIPMENT";
}

function showsMaterialFields(lineType: RepairProjectQuoteLineType): boolean {
  return lineType === "MATERIAL_EQUIPMENT";
}

function showsProcurementMethod(lineType: RepairProjectQuoteLineType): boolean {
  return lineType === "MATERIAL_EQUIPMENT" || lineType === "CONSTRUCTION_MEASURE";
}

export function RepairProjectQuoteEditor({
  items,
  lines,
  taxRate,
  onChange,
  onTaxRateChange,
}: {
  items: RepairQuoteScopeItem[];
  lines: RepairQuoteLineDraft[];
  taxRate: string;
  onChange: (lines: RepairQuoteLineDraft[]) => void;
  onTaxRateChange: (value: string) => void;
}) {
  function updateLine<K extends keyof RepairQuoteLineDraft>(
    clientId: string,
    field: K,
    value: RepairQuoteLineDraft[K],
  ) {
    onChange(lines.map((line) => line.clientId === clientId ? { ...line, [field]: value } : line));
  }

  function removeLine(clientId: string, projectItemId: number) {
    if (lines.filter((line) => line.projectItemId === projectItemId).length <= 1) return;
    onChange(lines.filter((line) => line.clientId !== clientId));
  }

  const subtotal = calculateRepairQuoteSubtotal(lines);
  const tax = calculateRepairQuoteTax(lines, taxRate);
  const total = calculateRepairQuoteTotal(lines, taxRate);

  return (
    <div className="border-y">
      {items.map((item, itemIndex) => {
        const itemLines = lines.filter((line) => line.projectItemId === item.itemId);
        return (
          <section key={item.itemId} className={itemIndex > 0 ? "border-t" : undefined}>
            <div className="flex flex-wrap items-start justify-between gap-3 bg-muted/30 px-3 py-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{item.itemNo} · {item.workContent}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.locationText} · 方案数量 {item.quantity} {item.unit}</div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => onChange([...lines, draftForItem(item, false)])}>
                <Plus className="mr-1 size-4" />增加明细
              </Button>
            </div>
            <div className="divide-y">
              {itemLines.map((line) => (
                <div key={line.clientId} className="grid gap-3 px-3 py-4 md:grid-cols-4 xl:grid-cols-8">
                  <div className="md:col-span-2 xl:col-span-2">
                    <Label>明细名称</Label>
                    <Input value={line.itemName} onChange={(event) => updateLine(line.clientId, "itemName", event.target.value)} placeholder="材料、人工、运输或施工项目" />
                  </div>
                  <div className="md:col-span-2 xl:col-span-2">
                    <Label>明细类别</Label>
                    <Select value={line.lineType} onValueChange={(value) => updateLine(line.clientId, "lineType", value as RepairProjectQuoteLineType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{LINE_TYPES.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>

                  {showsWorkDescription(line.lineType) && (
                    <div className="md:col-span-4 xl:col-span-4">
                      <Label>{workDescriptionLabel(line.lineType)}</Label>
                      <Input value={line.workDescription} onChange={(event) => updateLine(line.clientId, "workDescription", event.target.value)} placeholder="按报价原件填写，没有可不填" />
                    </div>
                  )}
                  {showsMaterialFields(line.lineType) && (
                    <>
                      <div className="md:col-span-2 xl:col-span-2">
                        <Label>规格型号</Label>
                        <Input value={line.specificationModel} onChange={(event) => updateLine(line.clientId, "specificationModel", event.target.value)} placeholder="没有可不填" />
                      </div>
                      <div className="md:col-span-2 xl:col-span-2">
                        <Label>品牌 / 厂家</Label>
                        <Input value={line.brand} onChange={(event) => updateLine(line.clientId, "brand", event.target.value)} placeholder="没有可不填" />
                      </div>
                    </>
                  )}
                  {showsProcurementMethod(line.lineType) && (
                    <div className="md:col-span-2 xl:col-span-2">
                      <Label>采购 / 实施方式</Label>
                      <Input value={line.procurementMethod} onChange={(event) => updateLine(line.clientId, "procurementMethod", event.target.value)} placeholder="按报价原件填写" />
                    </div>
                  )}

                  <div>
                    <Label>数量</Label>
                    <Input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(line.clientId, "quantity", event.target.value)} />
                  </div>
                  <div>
                    <Label>单位</Label>
                    <Input value={line.unit} onChange={(event) => updateLine(line.clientId, "unit", event.target.value)} />
                  </div>
                  <div className="md:col-span-2 xl:col-span-2">
                    <Label>不含税单价</Label>
                    <Input type="number" min="0" step="0.01" value={line.unitPriceExcludingTax} onChange={(event) => updateLine(line.clientId, "unitPriceExcludingTax", event.target.value)} placeholder="0.00" />
                  </div>
                  <div className="md:col-span-2 xl:col-span-3">
                    <Label>备注</Label>
                    <Input value={line.remark} onChange={(event) => updateLine(line.clientId, "remark", event.target.value)} placeholder="产地、施工边界等" />
                  </div>
                  <div className="flex items-end justify-between gap-2 md:col-span-2 xl:col-span-2">
                    <div><div className="text-xs text-muted-foreground">不含税金额</div><div className="mt-2 text-sm font-semibold tabular-nums">{money(lineAmountExcludingTax(line))}</div></div>
                    <Button type="button" size="icon" variant="ghost" title="删除本条明细" disabled={itemLines.length <= 1} onClick={() => removeLine(line.clientId, item.itemId)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <div className="grid items-end gap-3 border-t bg-muted/20 px-3 py-3 text-sm sm:grid-cols-[minmax(10rem,16rem)_1fr]">
        <div>
          <Label>整份报价单税率</Label>
          <div className="relative">
            <Input className="pr-8" type="number" min="0" max="100" step="0.001" value={taxRate} onChange={(event) => onTaxRateChange(event.target.value)} />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right">
          <div><div className="text-xs text-muted-foreground">不含税合计</div><div className="mt-1 font-medium tabular-nums">{money(subtotal)}</div></div>
          <div><div className="text-xs text-muted-foreground">税额</div><div className="mt-1 font-medium tabular-nums">{money(tax)}</div></div>
          <div><div className="text-xs text-muted-foreground">含税总额</div><div className="mt-1 text-base font-semibold tabular-nums">{money(total)}</div></div>
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
      <div className="grid gap-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
        <div><span className="text-muted-foreground">不含税：</span>{money(quote.amountExcludingTax)}</div>
        <div><span className="text-muted-foreground">税率：</span>{quote.taxRate}%</div>
        <div><span className="text-muted-foreground">税额：</span>{money(quote.taxAmount)}</div>
        <div><span className="text-muted-foreground">含税总额：</span>{money(quote.quoteAmount)}</div>
        <div><span className="text-muted-foreground">施工工期：</span>{quote.constructionPeriodDays ?? "-"} 天</div>
        <div><span className="text-muted-foreground">质保期：</span>{quote.warrantyDays ?? "-"} 天</div>
      </div>
      <div className="overflow-x-auto border-y">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-muted/40"><tr><th className="p-2 text-left">工程项</th><th className="p-2 text-left">类别</th><th className="p-2 text-left">明细 / 工作内容</th><th className="p-2 text-left">规格 / 品牌 / 方式</th><th className="p-2 text-right">数量</th><th className="p-2 text-right">不含税单价</th><th className="p-2 text-right">不含税金额</th><th className="p-2 text-left">备注</th></tr></thead>
          <tbody>{quote.quoteLines.map((line) => {
            const attributes = [line.specificationModel, line.brand, line.procurementMethod].filter(Boolean).join(" / ") || "-";
            return <tr key={line.quoteLineId} className="border-t"><td className="p-2">{line.projectItemNo}</td><td className="p-2">{LINE_TYPE_LABEL[line.lineType]}</td><td className="p-2"><div className="font-medium">{line.itemName}</div>{line.workDescription && <div className="mt-1 text-xs text-muted-foreground">{line.workDescription}</div>}</td><td className="p-2">{attributes}</td><td className="p-2 text-right">{line.quantity} {line.unit}</td><td className="p-2 text-right tabular-nums">{money(line.unitPriceExcludingTax)}</td><td className="p-2 text-right font-medium tabular-nums">{money(line.amountExcludingTax)}</td><td className="p-2">{line.remark || "-"}</td></tr>;
          })}</tbody>
        </table>
      </div>
    </div>
  );
}
