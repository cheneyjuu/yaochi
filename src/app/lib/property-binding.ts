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
  const matrix = text
    .split(/\r?\n/)
    .map((line) => splitLine(line.trim()))
    .filter((row) => row.some(Boolean));
  return parseRosterMatrix(matrix);
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

function parseRosterMatrix(matrix: string[][]): RosterImportRow[] {
  if (matrix.length === 0) return [];
  const first = matrix[0];
  const hasHeader = first.some((cell) => /楼栋|房号|姓名|手机|面积/.test(cell));
  const body = hasHeader ? matrix.slice(1) : matrix;
  return body.map((cells) => {
    return {
      buildingName: cells[0] ?? "",
      unitName: cells[1] ?? "默认单元",
      roomName: cells[2] ?? "",
      buildArea: Number(cells[3] || 0),
      registeredOwnerName: cells[4] ?? "",
      registeredOwnerPhone: cells[5] ?? "",
    };
  }).filter((row) => row.buildingName && row.roomName && row.registeredOwnerName && row.registeredOwnerPhone);
}

function splitLine(line: string) {
  return line.split(/\t|,/).map((cell) => cell.trim());
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
