"use client";

import { useState } from "react";
import {
  PageHeader,
  KpiCard,
  SectionCard,
  StatusChip,
  EmptyState,
  type Tone,
} from "../gov/common";
import { Button } from "../ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../ui/table";
import { Input } from "../ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../ui/select";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "../ui/sheet";
import {
  Users,
  ShieldCheck,
  Home,
  Building2,
  Search,
  Lock,
  Download,
  Bell,
} from "lucide-react";

/* ─── 类型 ─── */
type CertLevel = "L1" | "L3" | "L4";
type OwnerType = "普通业主" | "开发商存量" | "委员";
type AccountStatus = "正常" | "冻结" | "注销";

interface Property {
  roomNo: string;
  building: string;
  area: number;
  nature: string;
}

interface Owner {
  id: string;
  name: string;
  phone: string;
  propertyCount: number;
  totalArea: number;
  certLevel: CertLevel;
  ownerType: OwnerType;
  accountStatus: AccountStatus;
  properties: Property[];
  certHistory: { date: string; level: CertLevel; remark: string }[];
  isProxy: boolean;
  proxyFor?: string;
}

/* ─── Mock 数据 ─── */
const OWNERS: Owner[] = [
  {
    id: "O001",
    name: "张伟",
    phone: "138****6789",
    propertyCount: 3,
    totalArea: 287.5,
    certLevel: "L4",
    ownerType: "委员",
    accountStatus: "正常",
    properties: [
      { roomNo: "101", building: "1号楼", area: 98.5, nature: "住宅" },
      { roomNo: "201", building: "2号楼", area: 103.0, nature: "住宅" },
      { roomNo: "302", building: "3号楼", area: 86.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2024-01-15", level: "L1", remark: "基础注册" },
      { date: "2024-03-20", level: "L3", remark: "人脸核身通过" },
      { date: "2024-06-10", level: "L4", remark: "更高级认证通过" },
    ],
    isProxy: true,
    proxyFor: "李秀英",
  },
  {
    id: "O002",
    name: "李秀英",
    phone: "139****4521",
    propertyCount: 1,
    totalArea: 112.0,
    certLevel: "L3",
    ownerType: "普通业主",
    accountStatus: "正常",
    properties: [
      { roomNo: "503", building: "5号楼", area: 112.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2024-02-08", level: "L1", remark: "基础注册" },
      { date: "2024-04-12", level: "L3", remark: "人脸核身通过" },
    ],
    isProxy: false,
  },
  {
    id: "O003",
    name: "王建国",
    phone: "135****8832",
    propertyCount: 2,
    totalArea: 196.0,
    certLevel: "L3",
    ownerType: "普通业主",
    accountStatus: "正常",
    properties: [
      { roomNo: "801", building: "2号楼", area: 98.0, nature: "住宅" },
      { roomNo: "402", building: "4号楼", area: 98.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2023-11-05", level: "L1", remark: "基础注册" },
      { date: "2024-01-18", level: "L3", remark: "人脸核身通过" },
    ],
    isProxy: false,
  },
  {
    id: "O004",
    name: "刘梅",
    phone: "136****0012",
    propertyCount: 1,
    totalArea: 89.5,
    certLevel: "L1",
    ownerType: "普通业主",
    accountStatus: "正常",
    properties: [
      { roomNo: "604", building: "6号楼", area: 89.5, nature: "住宅" },
    ],
    certHistory: [
      { date: "2024-05-30", level: "L1", remark: "基础注册" },
    ],
    isProxy: false,
  },
  {
    id: "O005",
    name: "陈志强",
    phone: "152****7741",
    propertyCount: 1,
    totalArea: 134.0,
    certLevel: "L3",
    ownerType: "委员",
    accountStatus: "正常",
    properties: [
      { roomNo: "1001", building: "1号楼", area: 134.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2023-09-14", level: "L1", remark: "基础注册" },
      { date: "2023-10-22", level: "L3", remark: "人脸核身通过" },
    ],
    isProxy: false,
  },
  {
    id: "O006",
    name: "某开发商(存量)",
    phone: "010****8800",
    propertyCount: 8,
    totalArea: 856.0,
    certLevel: "L1",
    ownerType: "开发商存量",
    accountStatus: "正常",
    properties: [
      { roomNo: "101-108", building: "3号楼", area: 856.0, nature: "商业" },
    ],
    certHistory: [
      { date: "2022-06-01", level: "L1", remark: "开发商系统导入" },
    ],
    isProxy: false,
  },
  {
    id: "O007",
    name: "赵雨欣",
    phone: "187****3304",
    propertyCount: 1,
    totalArea: 76.0,
    certLevel: "L3",
    ownerType: "普通业主",
    accountStatus: "正常",
    properties: [
      { roomNo: "205", building: "5号楼", area: 76.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2024-03-01", level: "L1", remark: "基础注册" },
      { date: "2024-03-28", level: "L3", remark: "人脸核身通过" },
    ],
    isProxy: false,
  },
  {
    id: "O008",
    name: "孙浩然",
    phone: "177****5568",
    propertyCount: 2,
    totalArea: 210.0,
    certLevel: "L4",
    ownerType: "委员",
    accountStatus: "正常",
    properties: [
      { roomNo: "301", building: "1号楼", area: 110.0, nature: "住宅" },
      { roomNo: "401", building: "1号楼", area: 100.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2023-07-10", level: "L1", remark: "基础注册" },
      { date: "2023-08-05", level: "L3", remark: "人脸核身通过" },
      { date: "2024-02-14", level: "L4", remark: "更高级认证通过" },
    ],
    isProxy: true,
    proxyFor: "刘梅",
  },
  {
    id: "O009",
    name: "周婷婷",
    phone: "158****9921",
    propertyCount: 1,
    totalArea: 95.0,
    certLevel: "L1",
    ownerType: "普通业主",
    accountStatus: "冻结",
    properties: [
      { roomNo: "702", building: "2号楼", area: 95.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2024-07-12", level: "L1", remark: "基础注册" },
    ],
    isProxy: false,
  },
  {
    id: "O010",
    name: "吴光明",
    phone: "133****6614",
    propertyCount: 1,
    totalArea: 88.0,
    certLevel: "L3",
    ownerType: "普通业主",
    accountStatus: "正常",
    properties: [
      { roomNo: "904", building: "4号楼", area: 88.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2023-12-01", level: "L1", remark: "基础注册" },
      { date: "2024-01-10", level: "L3", remark: "人脸核身通过" },
    ],
    isProxy: false,
  },
  {
    id: "O011",
    name: "郑丽华",
    phone: "168****4477",
    propertyCount: 1,
    totalArea: 122.0,
    certLevel: "L3",
    ownerType: "普通业主",
    accountStatus: "正常",
    properties: [
      { roomNo: "1103", building: "6号楼", area: 122.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2024-04-02", level: "L1", remark: "基础注册" },
      { date: "2024-05-15", level: "L3", remark: "人脸核身通过" },
    ],
    isProxy: false,
  },
  {
    id: "O012",
    name: "黄鑫",
    phone: "188****0023",
    propertyCount: 1,
    totalArea: 105.0,
    certLevel: "L1",
    ownerType: "普通业主",
    accountStatus: "正常",
    properties: [
      { roomNo: "308", building: "3号楼", area: 105.0, nature: "住宅" },
    ],
    certHistory: [
      { date: "2024-08-20", level: "L1", remark: "基础注册" },
    ],
    isProxy: false,
  },
];

/* ─── 辅助 ─── */
function certLevelTone(level: CertLevel): Tone {
  if (level === "L4") return "warning";
  if (level === "L3") return "primary";
  return "neutral";
}

function certLevelLabel(level: CertLevel) {
  if (level === "L4") return "L4 高级";
  if (level === "L3") return "L3 实名";
  return "L1 基础";
}

function ownerTypeTone(type: OwnerType): Tone {
  if (type === "委员") return "tech";
  if (type === "开发商存量") return "warning";
  return "neutral";
}

function accountStatusTone(status: AccountStatus): Tone {
  if (status === "冻结") return "danger";
  if (status === "注销") return "neutral";
  return "success";
}

/* ─── 详情抽屉 ─── */
function OwnerDrawer({ owner }: { owner: Owner }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          详情
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>业主详情 — {owner.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* 基本信息 */}
          <SectionCard title="基本信息">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">姓名</span>
                <p className="mt-0.5 font-medium">{owner.name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">联系方式</span>
                <p className="mt-0.5 font-mono-num flex items-center gap-1">
                  <Lock className="size-3 text-muted-foreground" />
                  {owner.phone}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">业主类型</span>
                <p className="mt-0.5">
                  <StatusChip tone={ownerTypeTone(owner.ownerType)}>
                    {owner.ownerType}
                  </StatusChip>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">认证等级</span>
                <p className="mt-0.5">
                  <StatusChip tone={certLevelTone(owner.certLevel)}>
                    {certLevelLabel(owner.certLevel)}
                  </StatusChip>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">账户状态</span>
                <p className="mt-0.5">
                  <StatusChip tone={accountStatusTone(owner.accountStatus)}>
                    {owner.accountStatus}
                  </StatusChip>
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">投票代理</span>
                <p className="mt-0.5">
                  {owner.isProxy ? (
                    <StatusChip tone="tech" dot>
                      代理 {owner.proxyFor}
                    </StatusChip>
                  ) : (
                    <span className="text-muted-foreground text-xs">未设定</span>
                  )}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* 名下房产 */}
          <SectionCard title="名下房产" bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>房号</TableHead>
                  <TableHead>楼栋</TableHead>
                  <TableHead className="text-right">面积(㎡)</TableHead>
                  <TableHead>产权性质</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {owner.properties.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-mono-num">{p.roomNo}</TableCell>
                    <TableCell>{p.building}</TableCell>
                    <TableCell className="text-right font-mono-num">
                      {p.area.toFixed(1)}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={p.nature === "商业" ? "warning" : "neutral"}>
                        {p.nature}
                      </StatusChip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>

          {/* 认证记录 */}
          <SectionCard title="认证记录">
            <div className="space-y-3">
              {owner.certHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="size-2 rounded-full mt-1.5"
                      style={{
                        backgroundColor:
                          h.level === "L4"
                            ? "#e0a310"
                            : h.level === "L3"
                            ? "#1b4f9c"
                            : "#9aa5b5",
                      }}
                    />
                    {i < owner.certHistory.length - 1 && (
                      <div className="w-px flex-1 bg-border mt-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="pb-3">
                    <div className="flex items-center gap-2">
                      <StatusChip tone={certLevelTone(h.level)}>
                        {certLevelLabel(h.level)}
                      </StatusChip>
                      <span className="text-xs text-muted-foreground font-mono-num">
                        {h.date}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {h.remark}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ─── 主页面 ─── */
export function Owners() {
  const [building, setBuilding] = useState("all");
  const [certFilter, setCertFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [keyword, setKeyword] = useState("");

  const filtered = OWNERS.filter((o) => {
    if (building !== "all" && !o.properties.some((p) => p.building === building))
      return false;
    if (certFilter !== "all" && o.certLevel !== certFilter) return false;
    if (typeFilter !== "all" && o.ownerType !== typeFilter) return false;
    if (
      keyword &&
      !o.name.includes(keyword) &&
      !o.phone.includes(keyword)
    )
      return false;
    return true;
  });

  const totalOwners = OWNERS.length;
  const verifiedL3Plus = OWNERS.filter(
    (o) => o.certLevel === "L3" || o.certLevel === "L4"
  ).length;
  const multiHouse = OWNERS.filter((o) => o.propertyCount > 1).length;
  const devStock = OWNERS.filter((o) => o.ownerType === "开发商存量").length;

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="业主名册"
        desc="维护小区全体业主档案，含一户多宅合并、开发商存量房及实名认证等级管理"
        actions={
          <>
            <Button variant="outline" size="sm">
              <Download className="size-4 mr-1.5" />
              批量导出
            </Button>
            <Button variant="outline" size="sm">
              <Bell className="size-4 mr-1.5" />
              批量发认证提醒
            </Button>
          </>
        }
      />

      {/* KPI 行 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="业主总数"
          value={totalOwners}
          unit="户"
          icon={<Users className="size-4" />}
          tone="primary"
        />
        <KpiCard
          label="已实名(L3+)"
          value={verifiedL3Plus}
          unit="户"
          icon={<ShieldCheck className="size-4" />}
          tone="success"
        />
        <KpiCard
          label="一户多宅"
          value={multiHouse}
          unit="户"
          icon={<Home className="size-4" />}
          tone="warning"
        />
        <KpiCard
          label="开发商存量房"
          value={devStock}
          unit="套"
          icon={<Building2 className="size-4" />}
          tone="neutral"
        />
      </div>

      {/* 筛选栏 */}
      <SectionCard title="业主档案">
        <div className="flex flex-wrap gap-3 mb-4">
          <Select value={building} onValueChange={setBuilding}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="楼栋/单元" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部楼栋</SelectItem>
              <SelectItem value="1号楼">1号楼</SelectItem>
              <SelectItem value="2号楼">2号楼</SelectItem>
              <SelectItem value="3号楼">3号楼</SelectItem>
              <SelectItem value="4号楼">4号楼</SelectItem>
              <SelectItem value="5号楼">5号楼</SelectItem>
              <SelectItem value="6号楼">6号楼</SelectItem>
            </SelectContent>
          </Select>

          <Select value={certFilter} onValueChange={setCertFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="认证等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部等级</SelectItem>
              <SelectItem value="L1">L1 基础</SelectItem>
              <SelectItem value="L3">L3 实名</SelectItem>
              <SelectItem value="L4">L4 高级</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="业主类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              <SelectItem value="普通业主">普通业主</SelectItem>
              <SelectItem value="开发商存量">开发商存量</SelectItem>
              <SelectItem value="委员">委员</SelectItem>
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="搜索姓名或手机号"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        {/* 数据表 */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>业主姓名</TableHead>
                <TableHead>联系方式</TableHead>
                <TableHead className="text-right">名下房产</TableHead>
                <TableHead className="text-right">专有面积合计</TableHead>
                <TableHead>认证等级</TableHead>
                <TableHead>业主类型</TableHead>
                <TableHead>账户状态</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <EmptyState title="暂无匹配业主" desc="请调整筛选条件后重试" />
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">{owner.name}</TableCell>
                    <TableCell>
                      <span className="font-mono-num flex items-center gap-1 text-sm">
                        <Lock className="size-3 text-muted-foreground" />
                        {owner.phone}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {owner.propertyCount > 1 ? (
                        <StatusChip tone="primary">
                          <span className="font-mono-num">{owner.propertyCount}</span> 套
                        </StatusChip>
                      ) : (
                        <span className="font-mono-num text-sm">
                          {owner.propertyCount} 套
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono-num">
                      {owner.totalArea.toFixed(1)} ㎡
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={certLevelTone(owner.certLevel)}>
                        {certLevelLabel(owner.certLevel)}
                      </StatusChip>
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={ownerTypeTone(owner.ownerType)}>
                        {owner.ownerType}
                      </StatusChip>
                    </TableCell>
                    <TableCell>
                      <StatusChip
                        tone={accountStatusTone(owner.accountStatus)}
                        dot
                      >
                        {owner.accountStatus}
                      </StatusChip>
                    </TableCell>
                    <TableCell>
                      <OwnerDrawer owner={owner} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SectionCard>
    </div>
  );
}
