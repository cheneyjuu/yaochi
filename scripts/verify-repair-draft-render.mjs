// 关联业务：校验维修草稿只呈现责任意见和前期询价；相关业主表决通过后才出现施工单位选择。
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const draftDetails = {
  project: {
    projectId: 4,
    status: "DRAFT",
    workflowType: "BUILDING_REPAIR",
    scopeType: "BUILDING",
    version: 1,
    activePlanId: null,
  },
  plans: [{ planId: 4, status: "DRAFT", budgetTotal: 5000 }],
  attachments: [],
  responsibilityDetermination: null,
  responsibilityDeterminationHistory: [],
  currentPlanWorkPoints: [{
    workPointId: 4,
    businessName: "46号楼前休闲区带孔大理石盖板",
    locationType: "COMMON_AREA",
    commonAreaName: "46号楼前休闲区",
    symptom: "盖板破损",
    proposedMeasure: "更换破损盖板",
    linkedWorkOrderIds: [],
  }],
  fundingSlices: [],
  currentPlanAffectedOwners: [],
};

const vite = await createServer({
  server: { middlewareMode: true },
  appType: "custom",
});

try {
  const { RepairProjectOperationPanel } = await vite.ssrLoadModule(
    "/src/app/components/pages/repair/RepairProjectOperationPanel.tsx",
  );
  const html = renderToStaticMarkup(
    React.createElement(RepairProjectOperationPanel, {
      details: draftDetails,
      execution: null,
      suppliers: [],
      hasPermission: () => true,
      roleKey: "PROPERTY_MANAGER",
      onChanged: async () => {},
      onOpenSupplierDirectory: () => {},
    }),
  );

  const requiredCopy = [
    "填写责任与费用初步意见",
    "本次维修由谁负责",
    "判断依据附件",
    "前期询价",
  ];
  const forbiddenCopy = [
    "选择执行依据",
    "责任承担上限",
    "责任路径",
    "资金承担路径",
    "当前授权状态",
    "定商",
    "服务端",
    "后端",
    "快照",
    "资金切片",
    "冻结",
    "锁定",
    "受阻",
  ];
  const missingCopy = requiredCopy.filter((copy) => !html.includes(copy));
  const exposedTechnicalCopy = forbiddenCopy.filter((copy) => html.includes(copy));
  if (missingCopy.length > 0 || exposedTechnicalCopy.length > 0) {
    throw new Error(`草稿项目文案校验失败：缺少 ${missingCopy.join("、") || "无"}；暴露 ${exposedTechnicalCopy.join("、") || "无"}`);
  }

  const responsibilityIndex = html.indexOf("填写责任与费用初步意见");
  const preparationIndex = html.indexOf("前期询价");
  if (!(responsibilityIndex < preparationIndex) || html.includes("确定施工单位")) {
    throw new Error("草稿项目应先办理责任意见和前期询价，不能提前显示施工单位选择");
  }

  const { RepairProjectSourcingOperation, getRepairSourcingStepNumbers } = await vite.ssrLoadModule(
    "/src/app/components/pages/repair/RepairProjectSourcingOperation.tsx",
  );
  const draftSteps = getRepairSourcingStepNumbers(true);
  const authorizedSteps = getRepairSourcingStepNumbers(false);
  if (JSON.stringify(draftSteps) !== JSON.stringify({ invitation: 1, response: 2, comparison: 3, selection: 4 })
      || JSON.stringify(authorizedSteps) !== JSON.stringify({ invitation: null, response: 1, comparison: 2, selection: 3 })) {
    throw new Error("询价与施工单位选择的步骤编号必须连续，不能在确定施工单位时重新从 1 开始");
  }
  const selectionHtml = renderToStaticMarkup(
    React.createElement(RepairProjectSourcingOperation, {
      mode: "SELECTION",
      details: draftDetails,
      sourcing: {
        projectId: 4,
        planId: 4,
        invitations: [],
        quotes: [],
        selection: null,
        eligibleFrameworkRelations: [],
        selectionAuthorization: {
          status: "PENDING_AUTHORIZATION",
          blockingReason: "请先完成责任与费用确认、实施方案公示和相关业主表决，再确定施工单位",
          currentActorMayConfirm: false,
        },
      },
      sourcingLoading: false,
      sourcingError: null,
      suppliers: [],
      remember: () => {},
      busy: null,
      run: async () => true,
      onReload: async () => {},
      onOpenSupplierDirectory: () => {},
      canManageReferenceQuotes: false,
    }),
  );
  const missingSelectionCopy = ["尚未到确定施工单位环节", "后续办理"]
    .filter((copy) => !selectionHtml.includes(copy));
  const exposedSelectionCopy = forbiddenCopy.filter((copy) => selectionHtml.includes(copy));
  if (missingSelectionCopy.length > 0 || exposedSelectionCopy.length > 0) {
    throw new Error(`施工单位等待状态文案校验失败：缺少 ${missingSelectionCopy.join("、") || "无"}；暴露 ${exposedSelectionCopy.join("、") || "无"}`);
  }

  console.log("维修草稿业务顺序和施工单位选择文案校验通过");
} finally {
  await vite.close();
}
