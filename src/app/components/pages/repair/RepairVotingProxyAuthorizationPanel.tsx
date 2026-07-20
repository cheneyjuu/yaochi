// 关联业务：登记、核对和撤销维修表决的书面委托，并保持代理纸票仍归入原业主房屋。
import { useEffect, useState } from "react";
import { Eye, FileUp, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { StatusChip } from "../../gov/common";
import {
  getVotingProxyAuthorizationPreviewTicket,
  listVotingProxyAuthorizations,
  registerVotingProxyAuthorization,
  reviewVotingProxyAuthorization,
  revokeVotingProxyAuthorization,
  type RepairVotingWorkbench,
  type VotingProxyAuthorization,
} from "../../../lib/repair-project";

const STATUS_LABEL: Record<VotingProxyAuthorization["status"], string> = {
  PENDING_REVIEW: "待另一人核对",
  CONFIRMED: "已核对，可代办",
  REJECTED: "未通过核对",
  REVOKED: "已撤销",
};

function propertyLabel(item: RepairVotingWorkbench["electorate"][number] | undefined): string {
  if (!item) return "本次表决房屋";
  return [item.buildingName, item.unitName, item.roomName].filter(Boolean).join(" · ");
}

function toLocalInput(value: string): string {
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function RepairVotingProxyAuthorizationPanel({
  packageId,
  electorate,
  currentActorUserId,
  voteStartAt,
  voteEndAt,
  onChanged,
}: {
  packageId: number;
  electorate: RepairVotingWorkbench["electorate"];
  currentActorUserId: number;
  voteStartAt: string;
  voteEndAt: string;
  onChanged: (items: VotingProxyAuthorization[]) => void;
}) {
  const [items, setItems] = useState<VotingProxyAuthorization[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [principalOpid, setPrincipalOpid] = useState("");
  const [agentName, setAgentName] = useState("");
  const [identityType, setIdentityType] = useState<VotingProxyAuthorization["agentIdentityDocumentType"]>("CHINESE_RESIDENT_ID");
  const [identityNumber, setIdentityNumber] = useState("");
  const [validFrom, setValidFrom] = useState(() => toLocalInput(voteStartAt));
  const [validUntil, setValidUntil] = useState(() => toLocalInput(voteEndAt));
  const [file, setFile] = useState<File | null>(null);
  const [handlingNote, setHandlingNote] = useState("");

  async function reload() {
    setLoading(true);
    try {
      const next = await listVotingProxyAuthorizations(packageId);
      setItems(next);
      onChanged(next);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "读取书面委托失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, [packageId]);

  async function run(key: string, action: () => Promise<unknown>, successMessage: string) {
    setBusy(key);
    try {
      await action();
      toast.success(successMessage);
      setHandlingNote("");
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  async function preview(item: VotingProxyAuthorization) {
    try {
      const ticket = await getVotingProxyAuthorizationPreviewTicket(packageId, item.authorizationId);
      window.open(ticket.previewUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "打开委托原件失败");
    }
  }

  const canRegister = principalOpid && agentName.trim() && identityNumber.trim() && validFrom && validUntil && file;

  return (
    <section className="mb-6 border-y py-5" aria-labelledby="repair-proxy-heading">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h5 id="repair-proxy-heading" className="text-sm font-medium">书面委托办理</h5>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            业主无法本人办理时，可凭书面委托由代理人提交纸质表决票。本人线上或纸质表决不需要登记委托。
          </p>
        </div>
        <Button type="button" size="icon" variant="ghost" title="刷新书面委托" onClick={() => void reload()}>
          <RotateCcw className="size-4" />
        </Button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label>委托业主房屋 *</Label>
          <Select value={principalOpid} onValueChange={setPrincipalOpid}>
            <SelectTrigger className="mt-2"><SelectValue placeholder="选择表决房屋" /></SelectTrigger>
            <SelectContent>{electorate.map((item) => (
              <SelectItem key={item.representativeOpid} value={String(item.representativeOpid)}>
                {propertyLabel(item)} · {item.certifiedArea} ㎡
              </SelectItem>
            ))}</SelectContent>
          </Select>
        </div>
        <div><Label>代理人姓名 *</Label><Input className="mt-2" value={agentName} onChange={(event) => setAgentName(event.target.value)} /></div>
        <div>
          <Label>代理人证件类型 *</Label>
          <Select value={identityType} onValueChange={(value) => setIdentityType(value as typeof identityType)}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="CHINESE_RESIDENT_ID">居民身份证</SelectItem><SelectItem value="PASSPORT">护照</SelectItem><SelectItem value="OTHER">其他有效证件</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>代理人证件号码 *</Label><Input className="mt-2" value={identityNumber} onChange={(event) => setIdentityNumber(event.target.value)} /></div>
        <div><Label>委托生效时间 *</Label><Input className="mt-2" type="datetime-local" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} /></div>
        <div><Label>委托截止时间 *</Label><Input className="mt-2" type="datetime-local" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} /></div>
        <div className="md:col-span-2 lg:col-span-3">
          <Label>书面委托原件 *</Label>
          <label className="mt-2 flex min-h-10 cursor-pointer items-center gap-2 border border-dashed px-3 text-sm hover:bg-muted/40">
            <FileUp className="size-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{file?.name ?? "选择 PDF、JPG 或 PNG 原件，不超过 20 MB"}</span>
            <Input className="hidden" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
          </label>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <Button disabled={busy !== null || !canRegister} onClick={() => void run("register", () => registerVotingProxyAuthorization(packageId, {
          principalOpid: Number(principalOpid),
          agentName: agentName.trim(),
          agentIdentityDocumentType: identityType,
          agentIdentityNumber: identityNumber.trim(),
          validFrom: new Date(validFrom).toISOString(),
          validUntil: new Date(validUntil).toISOString(),
          file: file!,
        }), "书面委托已登记，等待另一名工作人员核对")}>
          {busy === "register" ? <Loader2 className="mr-1 size-4 animate-spin" /> : <ShieldCheck className="mr-1 size-4" />}登记书面委托
        </Button>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />正在读取已登记委托</div>
      ) : items.length > 0 ? (
        <div className="mt-5 space-y-3">
          <div><Label>核对或撤销说明</Label><Input className="mt-2 max-w-2xl" value={handlingNote} onChange={(event) => setHandlingNote(event.target.value)} placeholder="核对通过、退回或撤销时填写依据" /></div>
          {items.map((item) => (
            <div key={item.authorizationId} className="flex flex-wrap items-center justify-between gap-3 border-t pt-3 text-sm">
              <div className="min-w-0">
                <div className="font-medium">{propertyLabel(electorate.find((candidate) => candidate.representativeOpid === item.principalOpid))} · 代理人 {item.agentName}</div>
                <div className="mt-1 text-xs text-muted-foreground">{item.agentIdentityNumberMasked} · {item.originalFileName}</div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={item.status === "CONFIRMED" ? "success" : item.status === "PENDING_REVIEW" ? "warning" : "neutral"}>{STATUS_LABEL[item.status]}</StatusChip>
                <Button type="button" size="icon" variant="ghost" title="查看委托原件" onClick={() => void preview(item)}><Eye className="size-4" /></Button>
                {item.status === "PENDING_REVIEW" && item.registeredByUserId !== currentActorUserId && (
                  <><Button size="sm" variant="outline" disabled={!handlingNote.trim() || busy !== null} onClick={() => void run(`confirm-${item.authorizationId}`, () => reviewVotingProxyAuthorization(packageId, item.authorizationId, "CONFIRM", handlingNote.trim()), "书面委托已核对")}>核对通过</Button><Button size="sm" variant="outline" disabled={!handlingNote.trim() || busy !== null} onClick={() => void run(`reject-${item.authorizationId}`, () => reviewVotingProxyAuthorization(packageId, item.authorizationId, "REJECT", handlingNote.trim()), "书面委托已退回")}>退回</Button></>
                )}
                {item.status === "PENDING_REVIEW" && item.registeredByUserId === currentActorUserId && <span className="text-xs text-muted-foreground">需由另一名工作人员核对</span>}
                {item.status === "CONFIRMED" && <Button size="sm" variant="outline" disabled={!handlingNote.trim() || busy !== null} onClick={() => void run(`revoke-${item.authorizationId}`, () => revokeVotingProxyAuthorization(packageId, item.authorizationId, handlingNote.trim()), "书面委托已撤销")}>撤销</Button>}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
