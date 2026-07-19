// 关联业务：物业提出维修责任、资金承担和执行依据，治理主体确认后才允许冻结授权提案或锁定最终实施方案。
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Label } from "../../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { Textarea } from "../../ui/textarea";
import { StatusChip } from "../../gov/common";
import {
  confirmRepairProjectResponsibilityDetermination,
  proposeRepairProjectResponsibilityDetermination,
  type RepairExecutionAuthorityType,
  type RepairFundingSourceType,
  type RepairProjectAttachment,
  type RepairProjectDetails,
  type RepairResponsibilityDetermination,
  type RepairResponsibilityPath,
} from "../../../lib/repair-project";
import { RepairProjectFileUpload } from "./RepairProjectFileUpload";

const RESPONSIBILITY_PATH_LABEL: Record<RepairResponsibilityPath, string> = {
  PROPERTY_SERVICE_CONTRACT: "物业服务合同责任",
  DEVELOPER_WARRANTY: "建设单位保修责任",
  LIABLE_PARTY: "责任人或第三方责任",
  SHARED_COMMON_REPAIR: "共有部位维修",
};

const FUNDING_SOURCE_LABEL: Record<RepairFundingSourceType, string> = {
  SPECIAL_MAINTENANCE_LEDGER: "专项维修资金",
  PUBLIC_REVENUE_LEDGER: "公共收益",
  PROPERTY_SERVICE_CONTRACT: "物业服务合同费用",
  LIABLE_PARTY: "责任人或第三方承担",
  DEVELOPER_WARRANTY: "建设单位保修承担",
  OWNER_SELF_FUNDING: "业主自筹资金",
};

const EXECUTION_AUTHORITY_LABEL: Record<RepairExecutionAuthorityType, string> = {
  CONTRACTUAL_EXECUTION: "按物业服务合同履行",
  WARRANTY_EXECUTION: "按保修责任履行",
  LIABILITY_EXECUTION: "按责任认定履行",
  OWNER_DECISION: "经相关业主决定后执行",
  EXISTING_AUTHORIZATION: "按既有有效授权执行",
  EMERGENCY_REPAIR: "按紧急维修依据执行",
};

const DETERMINATION_STATUS_LABEL: Record<RepairResponsibilityDetermination["status"], string> = {
  PENDING_CONFIRMATION: "待治理确认",
  CONFIRMED: "已确认",
  SUPERSEDED: "已被后续版本替代",
  REJECTED: "未获确认",
};

function isDirectResponsibility(path: RepairResponsibilityPath | ""): boolean {
  return path !== "" && path !== "SHARED_COMMON_REPAIR";
}

function directPathDefaults(path: RepairResponsibilityPath | ""): {
  fundingSourceType: RepairFundingSourceType | "";
  executionAuthorityType: RepairExecutionAuthorityType | "";
} {
  switch (path) {
    case "PROPERTY_SERVICE_CONTRACT":
      return {
        fundingSourceType: "PROPERTY_SERVICE_CONTRACT",
        executionAuthorityType: "CONTRACTUAL_EXECUTION",
      };
    case "DEVELOPER_WARRANTY":
      return {
        fundingSourceType: "DEVELOPER_WARRANTY",
        executionAuthorityType: "WARRANTY_EXECUTION",
      };
    case "LIABLE_PARTY":
      return {
        fundingSourceType: "LIABLE_PARTY",
        executionAuthorityType: "LIABILITY_EXECUTION",
      };
    default:
      return { fundingSourceType: "", executionAuthorityType: "" };
  }
}

function money(value: number): string {
  return `¥${Number(value).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
}

function DeterminationFacts({
  determination,
  attachments,
}: {
  determination: RepairResponsibilityDetermination;
  attachments: RepairProjectAttachment[];
}) {
  const basisAttachment = attachments.find((item) => item.attachmentId === determination.basisAttachmentId);
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
      <div>
        <dt className="text-xs text-muted-foreground">责任路径</dt>
        <dd className="mt-1 font-medium">{RESPONSIBILITY_PATH_LABEL[determination.responsibilityPath]}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">资金承担</dt>
        <dd className="mt-1 font-medium">{FUNDING_SOURCE_LABEL[determination.fundingSourceType]}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">执行依据</dt>
        <dd className="mt-1 font-medium">{EXECUTION_AUTHORITY_LABEL[determination.executionAuthorityType]}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">责任承担上限</dt>
        <dd className="mt-1">{money(Number(determination.approvedAmount))}</dd>
      </div>
      {determination.responsiblePartyName && (
        <div>
          <dt className="text-xs text-muted-foreground">责任承担方</dt>
          <dd className="mt-1">{determination.responsiblePartyName}</dd>
        </div>
      )}
      <div>
        <dt className="text-xs text-muted-foreground">依据附件</dt>
        <dd className="mt-1 flex items-center gap-1 break-all">
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          {basisAttachment?.originalFileName ?? `附件 #${determination.basisAttachmentId}`}
        </dd>
      </div>
      <div className="sm:col-span-2 xl:col-span-3">
        <dt className="text-xs text-muted-foreground">依据说明</dt>
        <dd className="mt-1 leading-6">{determination.basisReference}</dd>
      </div>
      {determination.confirmationNote && (
        <div className="sm:col-span-2 xl:col-span-3">
          <dt className="text-xs text-muted-foreground">确认意见</dt>
          <dd className="mt-1 leading-6">{determination.confirmationNote}</dd>
        </div>
      )}
    </dl>
  );
}

export function RepairProjectResponsibilityOperation({
  details,
  busy,
  run,
  remember,
  hasPermission,
  roleKey,
}: {
  details: RepairProjectDetails;
  busy: string | null;
  run: <T>(key: string, action: () => Promise<T>, success: string) => Promise<boolean>;
  remember: (attachment: RepairProjectAttachment) => void;
  hasPermission: (permission: string) => boolean;
  roleKey: string | null;
}) {
  const { project } = details;
  const draftPlan = useMemo(
    () => details.plans.find((item) => item.status === "DRAFT") ?? null,
    [details.plans],
  );
  const determination = details.responsibilityDetermination ?? null;
  const [responsibilityPath, setResponsibilityPath] = useState<RepairResponsibilityPath | "">("");
  const [fundingSourceType, setFundingSourceType] = useState<RepairFundingSourceType | "">("");
  const [executionAuthorityType, setExecutionAuthorityType] = useState<RepairExecutionAuthorityType | "">("");
  const [basisAttachment, setBasisAttachment] = useState<RepairProjectAttachment | null>(null);
  const [basisReference, setBasisReference] = useState("");
  const [responsiblePartyName, setResponsiblePartyName] = useState("");
  const [responsiblePartyReference, setResponsiblePartyReference] = useState("");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [confirmationNote, setConfirmationNote] = useState("");

  const canPropose = project.status === "DRAFT"
    && draftPlan !== null
    && ["PROPERTY_MANAGER", "PROPERTY_STAFF"].includes(roleKey ?? "")
    && hasPermission("repair:workorder:manage");
  const canConfirm = determination?.status === "PENDING_CONFIRMATION"
    && hasPermission("repair:workorder:governance");
  const directResponsibility = isDirectResponsibility(responsibilityPath);
  const approvedAmountValue = Number(approvedAmount);
  const approvedAmountValid = draftPlan !== null
    && Number.isFinite(approvedAmountValue)
    && approvedAmountValue > 0
    && approvedAmountValue >= Number(draftPlan.budgetTotal);
  const sharedFundingOptions: RepairFundingSourceType[] = [
    "SPECIAL_MAINTENANCE_LEDGER",
    ...(project.scopeType === "COMMUNITY" ? ["PUBLIC_REVENUE_LEDGER" as const] : []),
    "OWNER_SELF_FUNDING",
  ];
  const sharedAuthorityOptions: RepairExecutionAuthorityType[] = [
    "OWNER_DECISION",
    "EXISTING_AUTHORIZATION",
    "EMERGENCY_REPAIR",
  ];
  const formValid = Boolean(
    draftPlan
    && responsibilityPath
    && fundingSourceType
    && executionAuthorityType
    && basisAttachment
    && basisReference.trim()
    && approvedAmountValid
    && (!directResponsibility || responsiblePartyName.trim()),
  );

  useEffect(() => {
    const defaults = directPathDefaults(responsibilityPath);
    setFundingSourceType(defaults.fundingSourceType);
    setExecutionAuthorityType(defaults.executionAuthorityType);
    if (responsibilityPath !== "") {
      setBasisAttachment(null);
      setBasisReference("");
      setResponsiblePartyName("");
      setResponsiblePartyReference("");
      setApprovedAmount("");
    }
  }, [responsibilityPath]);

  if (determination) {
    return (
      <section className="border-t py-5 first:border-t-0 first:pt-0">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">工程责任与资金承担</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              楼栋、设备名称和报修来源不直接决定资金来源；本认定须以附件和治理确认作为后续动作依据。
            </p>
          </div>
          <StatusChip tone={determination.status === "CONFIRMED" ? "success" : "warning"}>
            {DETERMINATION_STATUS_LABEL[determination.status]}
          </StatusChip>
        </div>
        <div className="rounded-md border bg-muted/20 p-4">
          <DeterminationFacts determination={determination} attachments={details.attachments} />
        </div>
        {determination.status === "PENDING_CONFIRMATION" && (
          canConfirm ? (
            <div className="mt-4 grid gap-4 rounded-md border border-amber-200 bg-amber-50/50 p-4 md:grid-cols-[minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <Label htmlFor="responsibility-confirmation-note">确认意见（可选）</Label>
                <Textarea
                  id="responsibility-confirmation-note"
                  rows={3}
                  value={confirmationNote}
                  onChange={(event) => setConfirmationNote(event.target.value)}
                  placeholder="确认责任、资金承担和执行依据；不能通过附件上传代替本次确认"
                />
              </div>
              <div className="flex items-end">
                <Button
                  disabled={busy !== null}
                  onClick={() => void run(
                    "confirm-responsibility-determination",
                    () => confirmRepairProjectResponsibilityDetermination(
                      project.projectId,
                      determination.determinationId,
                      {
                        expectedProjectVersion: project.version,
                        confirmationNote: confirmationNote.trim() || undefined,
                      },
                    ),
                    "工程责任认定已确认",
                  )}
                >
                  <CheckCircle2 className="mr-1 size-4" />确认责任认定
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm leading-6 text-amber-950">
              待具备治理权限的经办人确认。当前认定不产生方案锁定、定商或付款资格。
            </p>
          )
        )}
      </section>
    );
  }

  if (!canPropose || !draftPlan) {
    return (
      <section className="border-t py-5 first:border-t-0 first:pt-0">
        <h4 className="text-sm font-semibold">工程责任与资金承担</h4>
        <p className="mt-1 rounded-md border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
          尚未提交责任认定。物业应先基于勘验、合同、保修或责任证据提出认定，再由具备治理权限的主体确认；当前身份仅可查看。
        </p>
      </section>
    );
  }

  return (
    <section className="border-t py-5 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <h4 className="text-sm font-semibold">提出工程责任认定</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          先明确谁承担、由何种资金或责任履行、凭何种执行依据。该提交只进入待确认状态，不能直接锁定方案。
        </p>
      </div>
      <div className="grid gap-x-4 gap-y-5 rounded-md border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>责任路径</Label>
          <Select
            value={responsibilityPath || "__UNSELECTED__"}
            onValueChange={(value) => setResponsibilityPath(
              value === "__UNSELECTED__" ? "" : value as RepairResponsibilityPath,
            )}
          >
            <SelectTrigger><SelectValue placeholder="选择经勘验判断的责任路径" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__UNSELECTED__">选择责任路径</SelectItem>
              {Object.entries(RESPONSIBILITY_PATH_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {directResponsibility ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm leading-6">
            <div className="text-xs text-muted-foreground">资金承担与执行依据</div>
            <div className="mt-1 font-medium">
              {fundingSourceType && FUNDING_SOURCE_LABEL[fundingSourceType]} · {executionAuthorityType && EXECUTION_AUTHORITY_LABEL[executionAuthorityType]}
            </div>
          </div>
        ) : responsibilityPath === "SHARED_COMMON_REPAIR" ? (
          <>
            <div className="space-y-2">
              <Label>资金承担路径</Label>
              <Select
                value={fundingSourceType || "__UNSELECTED__"}
                onValueChange={(value) => setFundingSourceType(
                  value === "__UNSELECTED__" ? "" : value as RepairFundingSourceType,
                )}
              >
                <SelectTrigger><SelectValue placeholder="选择已核验或待核验的资金路径" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__UNSELECTED__">选择资金承担路径</SelectItem>
                  {sharedFundingOptions.map((value) => (
                    <SelectItem key={value} value={value}>{FUNDING_SOURCE_LABEL[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {project.scopeType !== "COMMUNITY" && (
                <p className="text-xs leading-5 text-muted-foreground">公共收益仅适用于全体共用范围，不能作为楼栋专项维修资金不足时的替代项。</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>执行依据</Label>
              <Select
                value={executionAuthorityType || "__UNSELECTED__"}
                onValueChange={(value) => setExecutionAuthorityType(
                  value === "__UNSELECTED__" ? "" : value as RepairExecutionAuthorityType,
                )}
              >
                <SelectTrigger><SelectValue placeholder="选择已存在或待取得的执行依据" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__UNSELECTED__">选择执行依据</SelectItem>
                  {sharedAuthorityOptions.map((value) => (
                    <SelectItem key={value} value={value}>{EXECUTION_AUTHORITY_LABEL[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        ) : null}

        {directResponsibility && (
          <>
            <div className="space-y-2">
              <Label htmlFor="responsible-party-name">责任承担方名称</Label>
              <Input
                id="responsible-party-name"
                value={responsiblePartyName}
                onChange={(event) => setResponsiblePartyName(event.target.value)}
                placeholder="填写合同、保修或责任认定中的主体名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible-party-reference">责任承担方识别信息（可选）</Label>
              <Input
                id="responsible-party-reference"
                value={responsiblePartyReference}
                onChange={(event) => setResponsiblePartyReference(event.target.value)}
                placeholder="合同编号、统一社会信用代码或责任认定编号"
              />
            </div>
          </>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="responsibility-basis-reference">认定依据说明</Label>
          <Textarea
            id="responsibility-basis-reference"
            rows={3}
            value={basisReference}
            onChange={(event) => setBasisReference(event.target.value)}
            placeholder="说明勘验结论、合同或保修条款、责任认定和资金承担依据"
          />
        </div>
        <div className="space-y-2">
          <FileUpload
            projectId={project.projectId}
            label="责任认定依据附件"
            value={basisAttachment}
            onUploaded={(attachment) => {
              remember(attachment);
              setBasisAttachment(attachment);
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsibility-approved-amount">责任承担上限</Label>
          <Input
            id="responsibility-approved-amount"
            type="number"
            min={Number(draftPlan.budgetTotal)}
            step="0.01"
            value={approvedAmount}
            onChange={(event) => setApprovedAmount(event.target.value)}
            placeholder={`不得低于当前预算 ${money(Number(draftPlan.budgetTotal))}`}
          />
          {!approvedAmountValid && approvedAmount.trim() && (
            <p className="text-xs text-destructive">责任承担上限不得低于当前方案预算。</p>
          )}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          disabled={busy !== null || !formValid}
          onClick={() => {
            if (!draftPlan || !responsibilityPath || !fundingSourceType || !executionAuthorityType || !basisAttachment) return;
            void run(
              "propose-responsibility-determination",
              () => proposeRepairProjectResponsibilityDetermination(project.projectId, {
                expectedProjectVersion: project.version,
                responsibilityPath,
                fundingSourceType,
                executionAuthorityType,
                basisAttachmentId: basisAttachment.attachmentId,
                basisReference: basisReference.trim(),
                ...(responsiblePartyName.trim() ? { responsiblePartyName: responsiblePartyName.trim() } : {}),
                ...(responsiblePartyReference.trim() ? { responsiblePartyReference: responsiblePartyReference.trim() } : {}),
                approvedAmount: approvedAmountValue,
              }),
              "工程责任认定已提交治理确认",
            );
          }}
        >
          <ShieldCheck className="mr-1 size-4" />提交确认
        </Button>
      </div>
    </section>
  );
}
