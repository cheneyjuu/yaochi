// 关联业务：管理业主自治组织电子印章台账、保管责任、届期状态和用印记录。
import { useCallback, useEffect, useState } from "react";
import { Ban, Loader2, Plus, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, SectionCard, StatusChip } from "../gov/common";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import {
  createMockCommitteeSeal,
  deactivateCommitteeSeal,
  listCommitteeSeals,
  listCommitteeSealUsage,
  type CommitteeElectronicSeal,
  type CommitteeSealType,
  type CommitteeSealUsage,
} from "../../lib/committee-seals";
import { useStore } from "../../lib/store";

const SEAL_TYPE_LABEL: Record<CommitteeSealType, string> = {
  OWNERS_ASSEMBLY: "业主大会章",
  OWNERS_COMMITTEE: "业主委员会章",
  FINANCIAL: "共有资金专用章",
};

const USAGE_METHOD_LABEL: Record<CommitteeSealUsage["sealingMethod"], string> = {
  UPLOADED_PHYSICAL: "上传实物盖章文件",
  UPLOADED_EXTERNAL_ELECTRONIC: "上传外部电子签章文件",
  PLATFORM_ELECTRONIC: "平台电子签章",
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function CommitteeSeals() {
  const { hasPermission } = useStore();
  const canRead = hasPermission("committee:seal:read");
  const canManage = hasPermission("committee:seal:manage");
  const [seals, setSeals] = useState<CommitteeElectronicSeal[]>([]);
  const [usage, setUsage] = useState<CommitteeSealUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<CommitteeElectronicSeal | null>(null);
  const [sealType, setSealType] = useState<CommitteeSealType>("OWNERS_COMMITTEE");
  const [sealName, setSealName] = useState("");

  const reload = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextSeals, nextUsage] = await Promise.all([
        listCommitteeSeals(),
        listCommitteeSealUsage(50),
      ]);
      setSeals(nextSeals);
      setUsage(nextUsage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "印章台账加载失败");
    } finally {
      setLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function createMockSeal() {
    setActing(true);
    try {
      await createMockCommitteeSeal({ sealType, sealName: sealName.trim() || undefined });
      toast.success("模拟电子印章已启用");
      setCreateOpen(false);
      setSealName("");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "模拟电子印章启用失败");
    } finally {
      setActing(false);
    }
  }

  async function deactivateSeal() {
    if (!deactivateTarget) return;
    setActing(true);
    try {
      await deactivateCommitteeSeal(deactivateTarget.sealId);
      toast.success("电子印章已停用");
      setDeactivateTarget(null);
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "电子印章停用失败");
    } finally {
      setActing(false);
    }
  }

  if (!canRead) {
    return <PageHeader title="印章管理" desc="当前角色没有电子印章台账查看权限" />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="印章管理"
        desc="维护业主自治组织印章的届期、保管人和用印审计记录。"
        actions={(
          <>
            <Button variant="outline" size="icon" title="刷新印章台账" onClick={() => void reload()} disabled={loading}>
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            {canManage && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-1 size-4" />启用模拟印章
              </Button>
            )}
          </>
        )}
      />

      <div className="flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-950">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-700" />
        <div>
          <div className="text-sm font-medium">当前为开发测试模拟签章</div>
          <div className="mt-1 text-sm leading-6 text-amber-900/80">
            模拟签章文件会写入“MOCK ELECTRONIC SEAL / NO LEGAL EFFECT”标识，不具备电子印章法律效力，禁止用于正式报审或对外签署。
          </div>
        </div>
      </div>

      <SectionCard title="印章台账" desc="有效印章按类型唯一，只有登记保管人可以在维修流程中调用平台电子签章。">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>印章</TableHead>
                <TableHead>届期与保管人</TableHead>
                <TableHead>服务商与证书</TableHead>
                <TableHead>有效期</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seals.length === 0 && !loading && (
                <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground">暂无印章台账</TableCell></TableRow>
              )}
              {loading && (
                <TableRow><TableCell colSpan={6} className="h-28 text-center text-muted-foreground"><Loader2 className="mr-2 inline size-4 animate-spin" />正在加载</TableCell></TableRow>
              )}
              {!loading && seals.map((seal) => (
                <TableRow key={seal.sealId}>
                  <TableCell>
                    <div className="font-medium">{seal.sealName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{SEAL_TYPE_LABEL[seal.sealType]}</div>
                  </TableCell>
                  <TableCell>
                    <div>{seal.committeeTermName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">保管人：{seal.custodianName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{seal.providerCode}</span>
                      {seal.simulated && <StatusChip tone="warning">模拟</StatusChip>}
                    </div>
                    <div className="mt-1 max-w-48 truncate font-mono text-xs text-muted-foreground" title={seal.certificateSerial}>
                      {seal.certificateSerial}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div>{formatDate(seal.validFrom)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">至 {formatDate(seal.validUntil)}</div>
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={seal.status === "ACTIVE" ? "success" : "neutral"} dot>
                      {seal.status === "ACTIVE" ? "有效" : "已停用"}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && seal.status === "ACTIVE" && (
                      <Button variant="outline" size="icon" title="停用印章" onClick={() => setDeactivateTarget(seal)}>
                        <Ban className="size-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <SectionCard title="用印记录" desc="记录业务对象、签章方式、操作人、验签状态和签后文件标识。">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>业务对象</TableHead>
                <TableHead>签章方式</TableHead>
                <TableHead>印章与操作人</TableHead>
                <TableHead>验证结果</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usage.length === 0 && (
                <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">暂无用印记录</TableCell></TableRow>
              )}
              {usage.map((item) => (
                <TableRow key={item.usageId}>
                  <TableCell>
                    <div className="font-medium">{item.businessTitle || `${item.businessType} #${item.businessId}`}</div>
                    <div className="mt-1 text-xs text-muted-foreground">签后附件 #{item.sealedAttachmentId}</div>
                  </TableCell>
                  <TableCell>{USAGE_METHOD_LABEL[item.sealingMethod]}</TableCell>
                  <TableCell>
                    <div>{item.sealName}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{item.operatorName}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span>{item.verificationStatus}</span>
                    </div>
                    {item.simulated && <StatusChip tone="warning" className="mt-1">模拟结果</StatusChip>}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(item.createTime)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      <Dialog open={createOpen} onOpenChange={(open) => !acting && setCreateOpen(open)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>启用模拟电子印章</DialogTitle>
            <DialogDescription>当前账号会登记为印章保管人；该印章仅用于开发测试。</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>印章类型</Label>
              <Select value={sealType} onValueChange={(value) => setSealType(value as CommitteeSealType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SEAL_TYPE_LABEL).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>印章名称（选填）</Label>
              <Input value={sealName} onChange={(event) => setSealName(event.target.value)} placeholder="留空则按当前届期自动生成" maxLength={120} />
            </div>
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm leading-6 text-red-800">
              模拟印章不会生成合法数字证书，所有签章文件均明确标记“NO LEGAL EFFECT”。
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={acting}>取消</Button>
            <Button onClick={() => void createMockSeal()} disabled={acting}>
              {acting && <Loader2 className="mr-1 size-4 animate-spin" />}确认启用
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deactivateTarget != null} onOpenChange={(open) => !open && !acting && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认停用电子印章？</AlertDialogTitle>
            <AlertDialogDescription>
              停用后不能继续用于新文件签章，既有用印记录和签后文件会保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={acting}>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deactivateSeal()} disabled={acting}>确认停用</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
