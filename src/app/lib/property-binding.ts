// 关联业务：封装房屋产权基础名册导入、结构展示和业主房产绑定审核接口。

import { apiGet, apiPost } from "./api";
import { strFromU8, unzipSync } from "fflate";

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface RosterImportRow {
  tenantId?: number;
  buildingName: string;
  unitName: string;
  roomName: string;
  buildArea?: number;
  registeredOwnerName: string;
  registeredOwnerPhone: string;
}

/** 关联业务：描述产权基础名册文本中不能安全导入的行，供管理端在提交前逐行修正。 */
export interface RosterParseIssue {
  lineNumber: number;
  message: string;
}

/** 关联业务：将名册文本解析结果和逐行校验问题一并返回，避免前端静默跳过产权数据。 */
export interface RosterParseResult {
  rows: RosterImportRow[];
  issues: RosterParseIssue[];
}

export interface RosterImportResult {
  importBatchNo: string;
  importedCount: number;
}

export interface PropertyRosterTopology {
  tenantId: number;
  communityName: string;
  householdCount: number;
  totalArea: number;
  buildings: PropertyRosterBuildingTopology[];
}

export interface PropertyRosterBuildingTopology {
  buildingId: number;
  buildingName: string;
  householdCount: number;
  totalArea: number;
  units: PropertyRosterUnitTopology[];
}

export interface PropertyRosterUnitTopology {
  unitName: string;
  householdCount: number;
  totalArea: number;
}

/** 关联业务：管理端核对导入产权基础名册中的登记产权人和房屋，非实名认证业主档案。 */
export interface RegisteredOwnerRoster {
  registeredOwnerName: string;
  registeredOwnerPhone: string;
  propertyCount: number;
  totalBuildArea: number;
  properties: RegisteredOwnerProperty[];
}

export interface RegisteredOwnerProperty {
  buildingName: string;
  unitName: string;
  roomName: string;
  buildArea: number;
}

export interface PropertyClaim {
  claimId: number;
  tenantId: number;
  buildingName: string;
  unitName: string;
  roomName: string;
  applicantRealName: string;
  applicantPhone: string;
  rosterOwnerName: string | null;
  rosterOwnerPhone: string | null;
  matchResult: "EXACT" | "MISMATCH" | "MISSING";
  claimStatus: "AUTO_APPROVED" | "PENDING_VERIFY" | "APPROVED" | "REJECTED";
  jointOwnership: boolean;
  votingDelegate: boolean;
  proofType: string | null;
  proofMaterialJson: string | null;
  rejectReasonCode: string | null;
  rejectReason: string | null;
  boundOpid: number | null;
  createTime: string;
  reviewedAt: string | null;
}

export function importPropertyRoster(tenantId: number | undefined, rows: RosterImportRow[]) {
  return apiPost<RosterImportResult>("/admin/property-roster/import", { tenantId, rows });
}

export function getPropertyRosterTopology() {
  return apiGet<PropertyRosterTopology>("/admin/property-roster/topology");
}

export function getRegisteredOwnerRosters() {
  return apiGet<RegisteredOwnerRoster[]>("/admin/property-roster/registered-owners");
}

export function listPropertyClaims(status = "PENDING_VERIFY", page = 1, size = 20) {
  return apiGet<PageResponse<PropertyClaim>>(
    `/admin/property-binding-claims?status=${encodeURIComponent(status)}&page=${page}&size=${size}`,
  );
}

export function approvePropertyClaim(claimId: number) {
  return apiPost<PropertyClaim>(`/admin/property-binding-claims/${claimId}/approve`);
}

export function rejectPropertyClaim(claimId: number, reason: string, reasonCode = "MATERIAL_INVALID") {
  return apiPost<PropertyClaim>(`/admin/property-binding-claims/${claimId}/reject`, { reasonCode, reason });
}

export function parseRosterText(text: string): RosterImportRow[] {
  return inspectRosterText(text).rows;
}

export function inspectRosterText(text: string): RosterParseResult {
  const matrix = text
    .split(/\r?\n/)
    .map((line, index) => ({ cells: splitLine(line.trim()), lineNumber: index + 1 }))
    .filter(({ cells }) => cells.some(Boolean));

  if (matrix.length === 0) return { rows: [], issues: [] };

  const hasHeader = matrix[0].cells.some((cell) => /楼栋|房号|姓名|手机|面积/.test(cell));
  const dataRows = hasHeader ? matrix.slice(1) : matrix;
  const rows: RosterImportRow[] = [];
  const issues: RosterParseIssue[] = [];

  dataRows.forEach(({ cells, lineNumber }) => {
    if (cells.length < 6) {
      issues.push({
        lineNumber,
        message: `第 ${lineNumber} 行仅识别到 ${cells.length} 列，需要 6 列：楼栋、单元、房号、专有面积、登记业主姓名、登记手机号。`,
      });
      return;
    }

    const [buildingName, unitName, roomName, buildAreaText, registeredOwnerName, registeredOwnerPhone] = cells;
    const missingFields = [
      !buildingName && "楼栋",
      !unitName && "单元",
      !roomName && "房号",
      !registeredOwnerName && "登记业主姓名",
      !registeredOwnerPhone && "登记手机号",
    ].filter(Boolean);
    if (missingFields.length > 0) {
      issues.push({
        lineNumber,
        message: `第 ${lineNumber} 行缺少${missingFields.join("、")}。`,
      });
      return;
    }

    const buildArea = Number(buildAreaText);
    if (!buildAreaText || !Number.isFinite(buildArea) || buildArea < 0) {
      issues.push({
        lineNumber,
        message: `第 ${lineNumber} 行的专有面积必须是大于或等于 0 的数字。`,
      });
      return;
    }
    if (!/^1\d{10}$/.test(registeredOwnerPhone)) {
      issues.push({
        lineNumber,
        message: `第 ${lineNumber} 行的登记手机号须为 11 位中国大陆手机号。`,
      });
      return;
    }

    rows.push({
      buildingName,
      unitName,
      roomName,
      buildArea,
      registeredOwnerName,
      registeredOwnerPhone,
    });
  });

  return { rows, issues };
}

export async function readRosterFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx")) {
    const rows = readXlsxRows(new Uint8Array(await file.arrayBuffer()));
    return rows.map((row) => row.join("\t")).join("\n");
  }
  if (name.endsWith(".xls")) {
    throw new Error("请使用 .xlsx，或将 Excel 另存为 CSV 后导入");
  }
  return file.text();
}

function splitLine(line: string) {
  return line.split(/[\t,，]/).map((cell) => cell.trim());
}

function readXlsxRows(input: Uint8Array): string[][] {
  const files = unzipSync(input);
  const sharedStrings = readSharedStrings(files);
  const sheetName = Object.keys(files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort(naturalSheetSort)[0];
  if (!sheetName) throw new Error("Excel 文件中未找到工作表");
  const xml = strFromU8(files[sheetName]);
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  return Array.from(doc.getElementsByTagName("row"))
    .map((row) => {
      const values: string[] = [];
      Array.from(row.getElementsByTagName("c")).forEach((cell) => {
        const ref = cell.getAttribute("r") ?? "";
        const index = columnIndex(ref.replace(/\d/g, ""));
        values[index] = readCell(cell, sharedStrings);
      });
      return values.map((value) => value ?? "");
    })
    .filter((row) => row.some((value) => value.trim()));
}

function readSharedStrings(files: Record<string, Uint8Array>): string[] {
  const raw = files["xl/sharedStrings.xml"];
  if (!raw) return [];
  const doc = new DOMParser().parseFromString(strFromU8(raw), "application/xml");
  return Array.from(doc.getElementsByTagName("si")).map((item) =>
    Array.from(item.getElementsByTagName("t"))
      .map((node) => node.textContent ?? "")
      .join(""),
  );
}

function readCell(cell: Element, sharedStrings: string[]): string {
  const type = cell.getAttribute("t");
  if (type === "inlineStr") {
    return Array.from(cell.getElementsByTagName("t"))
      .map((node) => node.textContent ?? "")
      .join("")
      .trim();
  }
  const raw = cell.getElementsByTagName("v")[0]?.textContent ?? "";
  if (type === "s") return (sharedStrings[Number(raw)] ?? "").trim();
  return raw.trim();
}

function columnIndex(column: string): number {
  return column.split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0) - 1;
}

function naturalSheetSort(a: string, b: string): number {
  return Number(a.match(/sheet(\d+)\.xml/)?.[1] ?? 0) - Number(b.match(/sheet(\d+)\.xml/)?.[1] ?? 0);
}
