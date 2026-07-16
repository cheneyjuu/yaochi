// 关联业务：供应商与物业按锁定工程项填写材料、人工、运输等结构化维修报价，并核对报价原件总额。
import { Plus, Trash2 } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import type {
  RepairProjectQuoteLineInput,
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
  specificationModel: string;
  brand: string;
  quantity: string;
  unit: string;
  taxIncludedUnitPrice: string;
  taxRate: string;
  remark: string;
}

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
    specificationModel: "",
    brand: "",
    quantity: initial ? String(item.quantity) : "1",
    unit: initial ? item.unit : "项",
    taxIncludedUnitPrice: "",
    taxRate: "9",
    remark: "",
  };
}

export function createRepairQuoteDraftLines(items: RepairQuoteScopeItem[]): RepairQuoteLineDraft[] {
  return items.map((item) => draftForItem(item));
}

function lineAmount(line: RepairQuoteLineDraft): number {
  const quantity = Number(line.quantity);
  const unitPrice = Number(line.taxIncludedUnitPrice);
  if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice) || quantity <= 0 || unitPrice < 0) {
    return 0;
  }
  return Math.round((quantity * unitPrice + Number.EPSILON) * 100) / 100;
}

export function calculateRepairQuoteTotal(lines: RepairQuoteLineDraft[]): number {
  return Math.round((lines.reduce((total, line) => total + lineAmount(line), 0) + Number.EPSILON) * 100) / 100;
}

export function validateRepairQuoteDraft(
  lines: RepairQuoteLineDraft[],
  items: RepairQuoteScopeItem[],
): string | null {
  if (lines.length === 0) return "请填写报价明细";
  if (lines.length > 200) return "单个报价版本最多填写 200 条明细";
  const covered = new Set(lines.map((line) => line.projectItemId));
  const missing = items.filter((item) => !covered.has(item.itemId));
  if (missing.length > 0) return `报价明细尚未覆盖工程项：${missing.map((item) => item.itemNo).join("、")}`;
  for (const line of lines) {
    if (!line.itemName.trim()) return "每条报价明细都要填写项目名称";
    if (!line.unit.trim()) return "每条报价明细都要填写单位";
    if (!Number.isFinite(Number(line.quantity)) || Number(line.quantity) <= 0) return "报价明细数量必须大于 0";
    if (line.taxIncludedUnitPrice === "" || !Number.isFinite(Number(line.taxIncludedUnitPrice)) || Number(line.taxIncludedUnitPrice) < 0) return "含税单价不能小于 0";
    if (line.taxRate.trim() === "" || !Number.isFinite(Number(line.taxRate)) || Number(line.taxRate) < 0 || Number(line.taxRate) > 100) return "税率必须在 0% 至 100% 之间";
  }
  if (calculateRepairQuoteTotal(lines) <= 0) return "报价明细含税合计必须大于 0";
  return null;
}

export function toRepairQuoteLineInputs(lines: RepairQuoteLineDraft[]): RepairProjectQuoteLineInput[] {
  return lines.map((line) => ({
    projectItemId: line.projectItemId,
    itemName: line.itemName.trim(),
    specificationModel: line.specificationModel.trim() || undefined,
    brand: line.brand.trim() || undefined,
    quantity: Number(line.quantity),
    unit: line.unit.trim(),
    taxIncludedUnitPrice: Number(line.taxIncludedUnitPrice),
    taxRate: Number(line.taxRate),
    remark: line.remark.trim() || undefined,
  }));
}

function money(value: number): string {
  return `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function RepairProjectQuoteEditor({
  items,
  lines,
  onChange,
}: {
  items: RepairQuoteScopeItem[];
  lines: RepairQuoteLineDraft[];
  onChange: (lines: RepairQuoteLineDraft[]) => void;
}) {
  function updateLine(clientId: string, field: keyof RepairQuoteLineDraft, value: string) {
    onChange(lines.map((line) => line.clientId === clientId ? { ...line, [field]: value } : line));
  }

  function removeLine(clientId: string, projectItemId: number) {
    if (lines.filter((line) => line.projectItemId === projectItemId).length <= 1) return;
    onChange(lines.filter((line) => line.clientId !== clientId));
  }

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
                    <Label>报价项目</Label>
                    <Input value={line.itemName} onChange={(event) => updateLine(line.clientId, "itemName", event.target.value)} placeholder="材料、人工、运输或施工内容" />
                  </div>
                  <div className="md:col-span-2 xl:col-span-2">
                    <Label>规格型号</Label>
                    <Input value={line.specificationModel} onChange={(event) => updateLine(line.clientId, "specificationModel", event.target.value)} placeholder="没有可不填" />
                  </div>
                  <div className="md:col-span-2 xl:col-span-2">
                    <Label>品牌</Label>
                    <Input value={line.brand} onChange={(event) => updateLine(line.clientId, "brand", event.target.value)} placeholder="没有可不填" />
                  </div>
                  <div>
                    <Label>数量</Label>
                    <Input type="number" min="0.001" step="0.001" value={line.quantity} onChange={(event) => updateLine(line.clientId, "quantity", event.target.value)} />
                  </div>
                  <div>
                    <Label>单位</Label>
                    <Input value={line.unit} onChange={(event) => updateLine(line.clientId, "unit", event.target.value)} />
                  </div>
                  <div className="md:col-span-2 xl:col-span-2">
                    <Label>含税单价</Label>
                    <Input type="number" min="0" step="0.01" value={line.taxIncludedUnitPrice} onChange={(event) => updateLine(line.clientId, "taxIncludedUnitPrice", event.target.value)} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>税率</Label>
                    <div className="relative"><Input className="pr-8" type="number" min="0" max="100" step="0.001" value={line.taxRate} onChange={(event) => updateLine(line.clientId, "taxRate", event.target.value)} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span></div>
                  </div>
                  <div className="md:col-span-2 xl:col-span-3">
                    <Label>备注</Label>
                    <Input value={line.remark} onChange={(event) => updateLine(line.clientId, "remark", event.target.value)} placeholder="材料产地、施工边界等" />
                  </div>
                  <div className="flex items-end justify-between gap-2 md:col-span-2 xl:col-span-2">
                    <div><div className="text-xs text-muted-foreground">明细金额</div><div className="mt-2 text-sm font-semibold tabular-nums">{money(lineAmount(line))}</div></div>
                    <Button type="button" size="icon" variant="ghost" title="删除本条明细" disabled={itemLines.length <= 1} onClick={() => removeLine(line.clientId, item.itemId)}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <div className="flex items-center justify-between gap-4 border-t bg-muted/20 px-3 py-3 text-sm">
        <span className="text-muted-foreground">含税报价合计</span>
        <span className="text-base font-semibold tabular-nums">{money(calculateRepairQuoteTotal(lines))}</span>
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
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <div><span className="text-muted-foreground">含税总额：</span>{money(quote.quoteAmount)}</div>
        <div><span className="text-muted-foreground">施工工期：</span>{quote.constructionPeriodDays ?? "-"} 天</div>
        <div><span className="text-muted-foreground">质保期：</span>{quote.warrantyDays ?? "-"} 天</div>
      </div>
      <div className="overflow-x-auto border-y">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-muted/40"><tr><th className="p-2 text-left">工程项</th><th className="p-2 text-left">报价项目</th><th className="p-2 text-left">规格 / 品牌</th><th className="p-2 text-right">数量</th><th className="p-2 text-right">含税单价</th><th className="p-2 text-right">税率</th><th className="p-2 text-right">金额</th><th className="p-2 text-left">备注</th></tr></thead>
          <tbody>{quote.quoteLines.map((line) => <tr key={line.quoteLineId} className="border-t"><td className="p-2">{line.projectItemNo}</td><td className="p-2 font-medium">{line.itemName}</td><td className="p-2">{[line.specificationModel, line.brand].filter(Boolean).join(" / ") || "-"}</td><td className="p-2 text-right">{line.quantity} {line.unit}</td><td className="p-2 text-right tabular-nums">{money(line.taxIncludedUnitPrice)}</td><td className="p-2 text-right">{line.taxRate}%</td><td className="p-2 text-right font-medium tabular-nums">{money(line.taxIncludedAmount)}</td><td className="p-2">{line.remark || "-"}</td></tr>)}</tbody>
        </table>
      </div>
    </div>
  );
}
