// 关联业务：物业根据勘验和书面材料填写维修责任与费用初步意见，业委会确认后按责任类型进入相应办理流程。
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
import { RepairProjectFileUpload as FileUpload } from "./RepairProjectFileUpload";

const RESPONSIBILITY_PATH_LABEL: Record<RepairResponsibilityPath, string> = {
  PROPERTY_SERVICE_CONTRACT: "由物业服务企业按合同承担",
  DEVELOPER_WARRANTY: "由建设单位按保修责任承担",
  LIABLE_PARTY: "由责任人或第三方承担",
  SHARED_COMMON_REPAIR: "属于共有部位维修",
};

const RESPONSIBILITY_PATH_GUIDANCE: Record<RepairResponsibilityPath, { scenario: string; evidence: string }> = {
  PROPERTY_SERVICE_CONTRACT: {
    scenario: "现行物业服务合同或补充约定明确由物业承担本类维修、更新或日常养护时选择；公共区域本身不能证明物业应承担。",
    evidence: "核对合同条款、服务标准、补充协议和本次勘验记录。",
  },
  DEVELOPER_WARRANTY: {
    scenario: "质量问题仍在建设单位保修范围和保修期限内时选择；需先排除使用、改造或第三方造成的原因。",
    evidence: "核对保修文件、交付资料、质量问题勘验记录和建设单位答复。",
  },
  LIABLE_PARTY: {
    scenario: "已能识别造成损坏的单位、个人或其他责任方时选择；不能仅凭怀疑或口头说法选择。",
    evidence: "核对原因认定、责任方承诺、事故记录、保险或追偿材料。",
  },
  SHARED_COMMON_REPAIR: {
    scenario: "前三类责任经核验均不适用，且本次确属相关业主共有部位、设施设备的维修时选择。",
    evidence: "核对现场勘验、共有范围或受益范围说明，以及拟使用资金的初步依据。",
  },
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
  CONTRACTUAL_EXECUTION: "由物业服务企业按合同办理",
  WARRANTY_EXECUTION: "由建设单位按保修责任办理",
  LIABILITY_EXECUTION: "由责任人或第三方维修或赔付",
  OWNER_DECISION: "提交相关业主表决",
};

const DETERMINATION_STATUS_LABEL: Record<RepairResponsibilityDetermination["status"], string> = {
  PENDING_CONFIRMATION: "待业委会确认",
  CONFIRMED: "已确认",
  SUPERSEDED: "已被后续版本替代",
  REJECTED: "未获确认",
};

function isDirectResponsibility(path: RepairResponsibilityPath | ""): boolean {
  return path !== "" && path !== "SHARED_COMMON_REPAIR";
}

function directPathFundingSource(path: RepairResponsibilityPath | ""): RepairFundingSourceType | "" {
  switch (path) {
    case "PROPERTY_SERVICE_CONTRACT":
      return "PROPERTY_SERVICE_CONTRACT";
    case "DEVELOPER_WARRANTY":
      return "DEVELOPER_WARRANTY";
    case "LIABLE_PARTY":
      return "LIABLE_PARTY";
    default:
      return "";
  }
}

function derivedExecutionAuthority(path: RepairResponsibilityPath | ""): RepairExecutionAuthorityType | "" {
  switch (path) {
    case "PROPERTY_SERVICE_CONTRACT":
      return "CONTRACTUAL_EXECUTION";
    case "DEVELOPER_WARRANTY":
      return "WARRANTY_EXECUTION";
    case "LIABLE_PARTY":
      return "LIABILITY_EXECUTION";
    case "SHARED_COMMON_REPAIR":
      return "OWNER_DECISION";
    default:
      return "";
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
        <dt className="text-xs text-muted-foreground">本次维修由谁负责</dt>
        <dd className="mt-1 font-medium">{RESPONSIBILITY_PATH_LABEL[determination.responsibilityPath]}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">费用来源</dt>
        <dd className="mt-1 font-medium">{FUNDING_SOURCE_LABEL[determination.fundingSourceType]}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">下一步办理</dt>
        <dd className="mt-1 font-medium">{EXECUTION_AUTHORITY_LABEL[determination.executionAuthorityType]}</dd>
      </div>
      {determination.responsiblePartyName && (
        <div>
          <dt className="text-xs text-muted-foreground">负责单位或责任人</dt>
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
  const [basisAttachment, setBasisAttachment] = useState<RepairProjectAttachment | null>(null);
  const [basisReference, setBasisReference] = useState("");
  const [responsiblePartyName, setResponsiblePartyName] = useState("");
  const [responsiblePartyReference, setResponsiblePartyReference] = useState("");
  const [confirmationNote, setConfirmationNote] = useState("");

  const canPropose = project.status === "DRAFT"
    && draftPlan !== null
    && ["PROPERTY_MANAGER", "PROPERTY_STAFF"].includes(roleKey ?? "")
    && hasPermission("repair:workorder:manage");
  const canConfirm = determination?.status === "PENDING_CONFIRMATION"
    && hasPermission("repair:workorder:governance");
  const directResponsibility = isDirectResponsibility(responsibilityPath);
  const derivedAuthority = derivedExecutionAuthority(responsibilityPath);
  const sharedFundingOptions: RepairFundingSourceType[] = [
    "SPECIAL_MAINTENANCE_LEDGER",
    ...(project.scopeType === "COMMUNITY" ? ["PUBLIC_REVENUE_LEDGER" as const] : []),
    "OWNER_SELF_FUNDING",
  ];
  const formValid = Boolean(
    draftPlan
    && responsibilityPath
    && fundingSourceType
    && basisAttachment
    && basisReference.trim()
    && (!directResponsibility || responsiblePartyName.trim()),
  );

  useEffect(() => {
    setFundingSourceType(directPathFundingSource(responsibilityPath));
    if (responsibilityPath !== "") {
      setBasisAttachment(null);
      setBasisReference("");
      setResponsiblePartyName("");
      setResponsiblePartyReference("");
    }
  }, [responsibilityPath]);

  if (determination) {
    return (
      <section className="border-t py-5 first:border-t-0 first:pt-0">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h4 className="text-sm font-semibold">责任与费用初步意见</h4>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              根据现场勘验、合同、保修和责任材料判断由谁负责，以及本次维修拟使用的费用来源。
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
                  placeholder="填写对维修责任和费用来源的确认意见"
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
                    "责任与费用意见已确认",
                  )}
                >
                  <CheckCircle2 className="mr-1 size-4" />业委会确认
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50/50 px-4 py-3 text-sm leading-6 text-amber-950">
              等待业委会确认。属于共有部位维修的，确认后还需将实施方案提交相关业主表决。
            </p>
          )
        )}
      </section>
    );
  }

  if (!canPropose || !draftPlan) {
    return (
      <section className="border-t py-5 first:border-t-0 first:pt-0">
        <h4 className="text-sm font-semibold">责任与费用初步意见</h4>
        <p className="mt-1 rounded-md border bg-muted/30 px-4 py-3 text-sm leading-6 text-muted-foreground">
          尚未填写初步意见。物业应先核对现场勘验、合同、保修和责任材料，再由业委会确认；仅凭“公共区域”或“楼栋范围”不能判断由谁负责。
        </p>
      </section>
    );
  }

  return (
    <section className="border-t py-5 first:border-t-0 first:pt-0">
      <div className="mb-4">
        <h4 className="text-sm font-semibold">填写责任与费用初步意见</h4>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          先根据勘验和书面材料判断由谁负责、拟使用哪类费用。提交后由业委会确认，再进入相应办理流程。
        </p>
      </div>
      <div className="grid gap-x-4 gap-y-5 rounded-md border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>本次维修由谁负责*</Label>
          <Select
            value={responsibilityPath || "__UNSELECTED__"}
            onValueChange={(value) => setResponsibilityPath(
              value === "__UNSELECTED__" ? "" : value as RepairResponsibilityPath,
            )}
          >
            <SelectTrigger><SelectValue placeholder="请选择初步判断" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__UNSELECTED__">请选择初步判断</SelectItem>
              {Object.entries(RESPONSIBILITY_PATH_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {responsibilityPath ? (
          <div className="md:col-span-2 border-l-2 border-primary/30 pl-3 text-xs leading-5 text-muted-foreground">
            <p><span className="font-medium text-foreground">适用情形：</span>{RESPONSIBILITY_PATH_GUIDANCE[responsibilityPath].scenario}</p>
            <p className="mt-1"><span className="font-medium text-foreground">请核对：</span>{RESPONSIBILITY_PATH_GUIDANCE[responsibilityPath].evidence}</p>
          </div>
        ) : (
          <p className="md:col-span-2 text-xs leading-5 text-muted-foreground">
            暂时无法判断时不要直接选择“共有部位维修”。先补充勘验、合同、保修或责任证据；公共区域和楼栋范围不能代替责任判断。
          </p>
        )}

        {directResponsibility ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm leading-6">
            <div className="text-xs text-muted-foreground">费用来源与办理方式</div>
            <div className="mt-1 font-medium">
              {fundingSourceType && FUNDING_SOURCE_LABEL[fundingSourceType]} · {derivedAuthority && EXECUTION_AUTHORITY_LABEL[derivedAuthority]}
            </div>
          </div>
        ) : responsibilityPath === "SHARED_COMMON_REPAIR" ? (
          <>
            <div className="space-y-2">
              <Label>拟使用的费用来源*</Label>
              <Select
                value={fundingSourceType || "__UNSELECTED__"}
                onValueChange={(value) => setFundingSourceType(
                  value === "__UNSELECTED__" ? "" : value as RepairFundingSourceType,
                )}
              >
                <SelectTrigger><SelectValue placeholder="请选择拟使用的费用来源" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__UNSELECTED__">请选择费用来源</SelectItem>
                  {sharedFundingOptions.map((value) => (
                    <SelectItem key={value} value={value}>{FUNDING_SOURCE_LABEL[value]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {project.scopeType !== "COMMUNITY" && (
                <p className="text-xs leading-5 text-muted-foreground">公共收益仅适用于全体共用范围，不能作为楼栋专项维修资金不足时的替代项。</p>
              )}
            </div>
            <div className="space-y-2 rounded-md border bg-muted/30 px-3 py-2 text-sm leading-6">
              <div className="text-xs text-muted-foreground">下一步办理</div>
              <div className="mt-1 font-medium">{EXECUTION_AUTHORITY_LABEL.OWNER_DECISION}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                业委会确认初步意见后，物业需提交包含维修范围、预算和费用分摊范围的实施方案，由相关业主表决。
              </p>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/30 px-3 py-2 text-sm leading-6">
              <div className="text-xs text-muted-foreground">拟提交相关业主表决的预算</div>
              <div className="mt-1 font-medium">{money(Number(draftPlan.budgetTotal))}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                这是当前实施方案预算。发起表决时，将与维修范围和费用分摊范围一起交由相关业主确认。
              </p>
            </div>
          </>
        ) : null}

        {directResponsibility && (
          <>
            <div className="space-y-2">
              <Label htmlFor="responsible-party-name">负责单位或责任人*</Label>
              <Input
                id="responsible-party-name"
                value={responsiblePartyName}
                onChange={(event) => setResponsiblePartyName(event.target.value)}
                placeholder="填写合同、保修或责任认定中的主体名称"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsible-party-reference">相关合同或责任材料编号（可选）</Label>
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
          <Label htmlFor="responsibility-basis-reference">判断依据说明*</Label>
          <Textarea
            id="responsibility-basis-reference"
            rows={3}
            value={basisReference}
            onChange={(event) => setBasisReference(event.target.value)}
            placeholder="说明现场勘验结论、合同或保修条款、责任认定事实，以及拟使用费用来源的依据"
          />
        </div>
        <div className="space-y-2">
          <FileUpload
            projectId={project.projectId}
            label="判断依据附件*"
            value={basisAttachment}
            onUploaded={(attachment) => {
              remember(attachment);
              setBasisAttachment(attachment);
            }}
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          disabled={busy !== null || !formValid}
          onClick={() => {
            if (!draftPlan || !responsibilityPath || !fundingSourceType || !basisAttachment) return;
            void run(
              "propose-responsibility-determination",
              () => proposeRepairProjectResponsibilityDetermination(project.projectId, {
                expectedProjectVersion: project.version,
                responsibilityPath,
                fundingSourceType,
                basisAttachmentId: basisAttachment.attachmentId,
                basisReference: basisReference.trim(),
                ...(responsiblePartyName.trim() ? { responsiblePartyName: responsiblePartyName.trim() } : {}),
                ...(responsiblePartyReference.trim() ? { responsiblePartyReference: responsiblePartyReference.trim() } : {}),
              }),
              "责任与费用初步意见已提交业委会确认",
            );
          }}
        >
          <ShieldCheck className="mr-1 size-4" />提交业委会确认
        </Button>
      </div>
    </section>
  );
}
