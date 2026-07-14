"use client";

// 关联业务：展示当前小区已导入的产权登记名册，用于核对导入结果；不将登记信息虚构为已认证业主档案。

import { useCallback, useEffect, useMemo, useState } from "react";
import { Home, Lock, RefreshCw, Search, Users } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, KpiCard, PageHeader, SectionCard, StatusChip } from "../gov/common";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import {
  getRegisteredOwnerRosters,
  type RegisteredOwnerRoster,
} from "../../lib/property-binding";

function formatArea(area: number) {
  return area.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function maskPhone(phone: string) {
  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function OwnerDrawer({ owner }: { owner: RegisteredOwnerRoster }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">详情</Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] overflow-y-auto sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle>产权登记详情</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <SectionCard title="登记信息">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">登记产权人</span>
                <p className="mt-0.5 font-medium">{owner.registeredOwnerName}</p>
              </div>
              <div>
                <span className="text-muted-foreground">登记手机号</span>
                <p className="mt-0.5 flex items-center gap-1 font-mono-num">
                  <Lock className="size-3 text-muted-foreground" />
                  {maskPhone(owner.registeredOwnerPhone)}
                </p>
              </div>
            </div>
            <p className="mt-3 rounded-md border border-[#e8f0fb] bg-[#f4f7fd] px-3 py-2 text-xs leading-5 text-[#2a4f8a]">
              此处为导入时登记的信息，需经业主实名认证和房产绑定审核后，才能形成可用的业主身份与投票资格。
            </p>
          </SectionCard>
          <SectionCard title="已登记房屋" bodyClassName="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">楼栋</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">单元</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">房号</th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">登记面积(㎡)</th>
                  </tr>
                </thead>
                <tbody>
                  {owner.properties.map((property) => (
                    <tr key={`${property.buildingName}-${property.unitName}-${property.roomName}`} className="border-b last:border-0">
                      <td className="px-4 py-2">{property.buildingName}</td>
                      <td className="px-4 py-2">{property.unitName}</td>
                      <td className="px-4 py-2 font-mono-num">{property.roomName}</td>
                      <td className="px-4 py-2 text-right font-mono-num">{formatArea(property.buildArea)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Owners() {
  const [owners, setOwners] = useState<RegisteredOwnerRoster[]>([]);
  const [building, setBuilding] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);

  const loadOwners = useCallback(async () => {
    setLoading(true);
    try {
      setOwners(await getRegisteredOwnerRosters());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "产权登记名册加载失败");
      setOwners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOwners();
  }, [loadOwners]);

  const buildings = useMemo(
    () => [...new Set(owners.flatMap((owner) => owner.properties.map((property) => property.buildingName)))],
    [owners],
  );
  const filtered = useMemo(() => owners.filter((owner) => {
    const matchesBuilding = building === "all" || owner.properties.some((property) => property.buildingName === building);
    const normalizedKeyword = keyword.trim();
    const matchesKeyword = !normalizedKeyword
      || owner.registeredOwnerName.includes(normalizedKeyword)
      || owner.registeredOwnerPhone.includes(normalizedKeyword);
    return matchesBuilding && matchesKeyword;
  }), [building, keyword, owners]);
  const propertyCount = owners.reduce((total, owner) => total + owner.propertyCount, 0);
  const multiPropertyCount = owners.filter((owner) => owner.propertyCount > 1).length;

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="产权登记名册"
        desc="展示当前小区已导入的登记产权人和房屋，用于核对导入结果；不等同于实名认证业主档案或法定计票基数。"
        actions={
          <Button variant="outline" size="sm" onClick={() => void loadOwners()} disabled={loading}>
            <RefreshCw className={`mr-1.5 size-4 ${loading ? "animate-spin" : ""}`} />
            刷新
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="登记产权人" value={owners.length} unit="人" icon={<Users className="size-4" />} tone="primary" />
        <KpiCard label="已登记房屋" value={propertyCount} unit="套" icon={<Home className="size-4" />} tone="tech" />
        <KpiCard label="一人多房" value={multiPropertyCount} unit="人" icon={<Home className="size-4" />} tone="warning" />
      </div>

      <SectionCard title="登记产权人">
        <div className="mb-4 flex flex-wrap gap-3">
          <Select value={building} onValueChange={setBuilding}>
            <SelectTrigger className="w-40"><SelectValue placeholder="楼栋" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部楼栋</SelectItem>
              {buildings.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="搜索登记姓名或手机号" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </div>
        </div>

        {loading ? (
          <EmptyState title="正在加载产权登记名册" />
        ) : filtered.length === 0 ? (
          <EmptyState title={owners.length === 0 ? "尚未导入产权登记名册" : "暂无匹配登记记录"} />
        ) : (
          <div className="rounded-md border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">登记产权人</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">登记手机号</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">已登记房屋</th>
                  <th className="px-4 py-2 text-right font-medium text-muted-foreground">登记面积合计(㎡)</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">核验状态</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((owner) => (
                  <tr key={`${owner.registeredOwnerName}-${owner.registeredOwnerPhone}`} className="border-b last:border-0">
                    <td className="px-4 py-2 font-medium">{owner.registeredOwnerName}</td>
                    <td className="px-4 py-2"><span className="flex items-center gap-1 font-mono-num text-sm"><Lock className="size-3 text-muted-foreground" />{maskPhone(owner.registeredOwnerPhone)}</span></td>
                    <td className="px-4 py-2 text-right"><span className="font-mono-num">{owner.propertyCount}</span> 套</td>
                    <td className="px-4 py-2 text-right font-mono-num">{formatArea(owner.totalBuildArea)}</td>
                    <td className="px-4 py-2"><StatusChip tone="neutral">待业主认证</StatusChip></td>
                    <td className="px-4 py-2 text-right"><OwnerDrawer owner={owner} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
