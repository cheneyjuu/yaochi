"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload, ClipboardList, Database } from "lucide-react";
import { PageHeader, SectionCard, KpiCard, EmptyState } from "../gov/common";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { importPropertyRoster, parseRosterText, readRosterFile, type RosterImportRow } from "../../lib/property-binding";

const SAMPLE = [
  "楼栋\t单元\t房号\t专有面积\t登记业主姓名\t登记手机号",
  "1号楼\t1单元\t101\t89.25\t张三\t13800000101",
  "1号楼\t1单元\t102\t92.10\t李四\t13800000102",
].join("\n");

export function PropertyRosterImport() {
  const [tenantId, setTenantId] = useState("10001");
  const [raw, setRaw] = useState(SAMPLE);
  const [importing, setImporting] = useState(false);
  const rows = useMemo(() => parseRosterText(raw), [raw]);
  const invalidCount = raw.trim() ? Math.max(raw.split(/\r?\n/).filter(Boolean).length - 1 - rows.length, 0) : 0;

  async function submit() {
    if (rows.length === 0) {
      toast.error("名册为空或字段不完整");
      return;
    }
    setImporting(true);
    try {
      const result = await importPropertyRoster(Number(tenantId) || undefined, rows);
      toast.success(`已导入 ${result.importedCount} 条`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "导入失败");
    } finally {
      setImporting(false);
    }
  }

  async function loadFile(file: File | null) {
    if (!file) return;
    try {
      setRaw(await readRosterFile(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "文件读取失败");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="小区空间名册导入"
        desc="导入房屋、房号、登记业主姓名和手机号，作为 C 端绑定房产的冷启动对账底座。"
        actions={
          <Button onClick={submit} disabled={importing || rows.length === 0}>
            <Upload className="size-4 mr-2" />
            导入名册
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="可导入行" value={rows.length} tone="primary" icon={<Database className="size-4" />} />
        <KpiCard label="待跳过行" value={invalidCount} tone={invalidCount > 0 ? "warning" : "success"} icon={<ClipboardList className="size-4" />} />
        <KpiCard label="租户编号" value={tenantId || "-"} tone="neutral" />
      </div>

      <SectionCard
        title="名册数据"
        desc="字段顺序：楼栋、单元、房号、专有面积、登记业主姓名、登记手机号。"
        extra={
          <div className="flex items-center gap-2">
            <Input value={tenantId} onChange={(event) => setTenantId(event.target.value)} className="w-32" />
            <label className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-accent">
              选择 Excel/CSV
              <input
                type="file"
                accept=".xlsx,.csv,.txt"
                className="hidden"
                onChange={(event) => loadFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        }
      >
        <Textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="min-h-[220px] font-mono text-sm"
        />
      </SectionCard>

      <SectionCard title="导入预览" bodyClassName="p-0">
        {rows.length === 0 ? (
          <EmptyState title="暂无有效名册行" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>楼栋</TableHead>
                <TableHead>单元</TableHead>
                <TableHead>房号</TableHead>
                <TableHead>专有面积</TableHead>
                <TableHead>登记业主</TableHead>
                <TableHead>手机号</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, 20).map((row: RosterImportRow, index) => (
                <TableRow key={`${row.buildingName}-${row.roomName}-${index}`}>
                  <TableCell>{row.buildingName}</TableCell>
                  <TableCell>{row.unitName}</TableCell>
                  <TableCell>{row.roomName}</TableCell>
                  <TableCell className="font-mono-num">{row.buildArea ?? 0}</TableCell>
                  <TableCell>{row.registeredOwnerName}</TableCell>
                  <TableCell className="font-mono-num">{row.registeredOwnerPhone}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </div>
  );
}
