"use client";

// 关联业务：由经授权管理端人员导入或逐户登记房屋产权基础名册，不预填任何虚构住户数据。

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Upload, ClipboardList, Database } from "lucide-react";
import { PageHeader, SectionCard, KpiCard, EmptyState } from "../gov/common";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { importPropertyRoster, parseRosterText, readRosterFile, type RosterImportRow } from "../../lib/property-binding";
import { useStore } from "../../lib/store";

const ROSTER_HEADER = "楼栋\t单元\t房号\t专有面积\t登记业主姓名\t登记手机号";

export function PropertyRosterImport() {
  const { setPage } = useStore();
  const [raw, setRaw] = useState("");
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
      const result = await importPropertyRoster(undefined, rows);
      toast.success(`已导入 ${result.importedCount} 条`);
      setPage("topology");
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
        title="房屋/产权基础名册"
        desc="上传或逐户录入当前小区的房屋、登记业主信息；该基础名册不等同于法定计票基数。"
        actions={
          <Button onClick={submit} disabled={importing || rows.length === 0}>
            <Upload className="size-4 mr-2" />
            导入名册
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="可导入行" value={rows.length} tone="primary" icon={<Database className="size-4" />} />
        <KpiCard label="待跳过行" value={invalidCount} tone={invalidCount > 0 ? "warning" : "success"} icon={<ClipboardList className="size-4" />} />
      </div>

      <SectionCard
        title="上传或逐户登记"
        desc="字段顺序：楼栋、单元、房号、专有面积、登记业主姓名、登记手机号。系统按当前工作小区写入。"
        extra={
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setRaw((value) => value.trim() ? value : `${ROSTER_HEADER}\n`)}>
              <ClipboardList className="mr-1.5 size-4" />
              填入字段行
            </Button>
            <label className="inline-flex items-center justify-center h-9 px-3 rounded-md border text-sm cursor-pointer hover:bg-accent">
              <Upload className="mr-1.5 size-4" />
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
          placeholder={`${ROSTER_HEADER}\n1号楼\t1单元\t101\t89.25\t登记业主姓名\t登记手机号`}
        />
        <div className="mt-3 rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 text-xs leading-5 text-[#2a4f8a]">
          当前导入需要完整的产权基础信息。仅包含楼栋、房号和面积的文件不能直接导入，以避免虚构产权人、手机号或单元信息。
        </div>
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
