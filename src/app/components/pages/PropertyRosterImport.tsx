"use client";

// 关联业务：由经授权管理端人员导入或逐户登记房屋产权基础名册，不预填任何虚构住户数据。

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, ClipboardList, Database, Plus, Upload } from "lucide-react";
import { PageHeader, SectionCard, KpiCard, EmptyState } from "../gov/common";
import { Button } from "../ui/button";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { importPropertyRoster, inspectRosterText, readRosterFile, type RosterImportRow } from "../../lib/property-binding";
import { useStore } from "../../lib/store";

const ROSTER_HEADER = "楼栋\t单元\t房号\t专有面积\t登记业主姓名\t登记手机号";

interface ManualRosterDraft {
  buildingName: string;
  unitName: string;
  roomName: string;
  buildArea: string;
  registeredOwnerName: string;
  registeredOwnerPhone: string;
}

function createManualRosterDraft(): ManualRosterDraft {
  return {
    buildingName: "",
    unitName: "",
    roomName: "",
    buildArea: "",
    registeredOwnerName: "",
    registeredOwnerPhone: "",
  };
}

export function PropertyRosterImport() {
  const { setPage } = useStore();
  const [raw, setRaw] = useState("");
  const [importing, setImporting] = useState(false);
  const [manualDraft, setManualDraft] = useState<ManualRosterDraft>(createManualRosterDraft);
  const parsedRoster = useMemo(() => inspectRosterText(raw), [raw]);
  const { rows, issues } = parsedRoster;

  function updateManualDraft(field: keyof ManualRosterDraft, value: string) {
    setManualDraft((current) => ({ ...current, [field]: value }));
  }

  function appendManualRow() {
    const values = [
      manualDraft.buildingName.trim(),
      manualDraft.unitName.trim(),
      manualDraft.roomName.trim(),
      manualDraft.buildArea.trim(),
      manualDraft.registeredOwnerName.trim(),
      manualDraft.registeredOwnerPhone.trim(),
    ];
    const preview = inspectRosterText(`${ROSTER_HEADER}\n${values.join("\t")}`);
    if (preview.issues.length > 0) {
      toast.error(preview.issues[0].message);
      return;
    }
    setRaw((current) => {
      const draft = current.trim();
      return draft ? `${draft}\n${values.join("\t")}` : `${ROSTER_HEADER}\n${values.join("\t")}`;
    });
    setManualDraft(createManualRosterDraft());
    toast.success("已加入导入预览");
  }

  async function submit() {
    if (rows.length === 0) {
      toast.error("名册为空或字段不完整");
      return;
    }
    if (issues.length > 0) {
      toast.error(`请先修正 ${issues.length} 行字段错误后再导入`);
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
          <Button onClick={submit} disabled={importing || rows.length === 0 || issues.length > 0}>
            <Upload className="size-4 mr-2" />
            导入名册
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard label="可导入行" value={rows.length} tone="primary" icon={<Database className="size-4" />} />
        <KpiCard label="待修复行" value={issues.length} tone={issues.length > 0 ? "warning" : "success"} icon={<ClipboardList className="size-4" />} />
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
        <div className="border-b pb-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">逐户登记</h3>
            <p className="mt-1 text-xs text-muted-foreground">登记一套房屋及对应产权名册信息后，系统会将其加入下方导入预览。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="roster-building">楼栋</Label>
              <Input id="roster-building" value={manualDraft.buildingName} onChange={(event) => updateManualDraft("buildingName", event.target.value)} placeholder="如：2号楼" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roster-unit">单元</Label>
              <Input id="roster-unit" value={manualDraft.unitName} onChange={(event) => updateManualDraft("unitName", event.target.value)} placeholder="如：3单元" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roster-room">房号</Label>
              <Input id="roster-room" value={manualDraft.roomName} onChange={(event) => updateManualDraft("roomName", event.target.value)} placeholder="如：302" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roster-area">专有面积（㎡）</Label>
              <Input id="roster-area" inputMode="decimal" value={manualDraft.buildArea} onChange={(event) => updateManualDraft("buildArea", event.target.value)} placeholder="如：120.85" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roster-owner">登记业主姓名</Label>
              <Input id="roster-owner" value={manualDraft.registeredOwnerName} onChange={(event) => updateManualDraft("registeredOwnerName", event.target.value)} placeholder="请输入登记业主姓名" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roster-phone">登记手机号</Label>
              <Input id="roster-phone" inputMode="numeric" value={manualDraft.registeredOwnerPhone} onChange={(event) => updateManualDraft("registeredOwnerPhone", event.target.value)} placeholder="11 位中国大陆手机号" />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="button" variant="outline" onClick={appendManualRow}>
              <Plus className="size-4" />
              加入导入预览
            </Button>
          </div>
        </div>

        <div className="pt-5">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-foreground">批量导入内容</h3>
            <p className="mt-1 text-xs text-muted-foreground">每行请使用 Tab、英文逗号或中文逗号分隔字段。</p>
          </div>
        <Textarea
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="min-h-[220px] font-mono text-sm"
          placeholder={`${ROSTER_HEADER}\n1号楼\t1单元\t101\t89.25\t登记业主姓名\t登记手机号`}
        />
        </div>

        {issues.length > 0 && (
          <Alert className="mt-4 border-amber-300 bg-amber-50 text-amber-900">
            <AlertCircle />
            <AlertTitle>当前有 {issues.length} 行不能导入</AlertTitle>
            <AlertDescription className="text-amber-800">
              <p>房号不可省略。请补齐字段后再导入，系统不会静默跳过错误行。</p>
              <ul className="list-disc space-y-1 pl-4">
                {issues.slice(0, 3).map((issue) => <li key={`${issue.lineNumber}-${issue.message}`}>{issue.message}</li>)}
              </ul>
              {issues.length > 3 && <p>另有 {issues.length - 3} 行待修复。</p>}
              <Button type="button" variant="link" size="sm" className="h-auto px-0 text-amber-800" onClick={() => setRaw("")}>清除当前文本草稿</Button>
            </AlertDescription>
          </Alert>
        )}
        <div className="mt-3 rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 text-xs leading-5 text-[#2a4f8a]">
          每行必须包含楼栋、单元、房号、专有面积、登记业主姓名、登记手机号。系统不会补造房号、产权人或手机号。
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
