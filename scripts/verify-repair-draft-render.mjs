// 关联业务：校验物业打开维修草稿时，页面按责任意见、前期询价、方案表决、施工单位选择的业务顺序呈现。
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
    "确定施工单位",
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
  if (requiredCopy.some((copy) => !html.includes(copy))
    || forbiddenCopy.some((copy) => html.includes(copy))) {
    throw new Error("草稿项目没有按真实业务顺序渲染，或仍暴露内部技术用语");
  }

  const responsibilityIndex = html.indexOf("填写责任与费用初步意见");
  const preparationIndex = html.indexOf("前期询价");
  const selectionIndex = html.indexOf("确定施工单位");
  if (!(responsibilityIndex < preparationIndex && preparationIndex < selectionIndex)) {
    throw new Error("草稿项目的责任意见、前期询价和施工单位选择顺序不正确");
  }

  const { RepairProjectSourcingOperation } = await vite.ssrLoadModule(
    "/src/app/components/pages/repair/RepairProjectSourcingOperation.tsx",
  );
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
  if (!selectionHtml.includes("尚未到确定施工单位环节")
    || !selectionHtml.includes("后续办理")
    || forbiddenCopy.some((copy) => selectionHtml.includes(copy))) {
    throw new Error("施工单位选择的等待状态仍像操作错误，或仍暴露内部技术用语");
  }

  console.log("维修草稿业务顺序和施工单位选择文案校验通过");
} finally {
  await vite.close();
}
