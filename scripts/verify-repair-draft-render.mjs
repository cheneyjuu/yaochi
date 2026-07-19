// 关联业务：校验物业从工程台账打开草稿项目的参考询价面板时，责任认定和附件控件能完整渲染。
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

  if (!html.includes("提出工程责任初判") || !html.includes("初判依据附件")
    || html.includes("选择执行依据") || html.includes("责任承担上限")) {
    throw new Error("草稿项目的责任初判区域没有完整渲染，或仍暴露手填执行依据、初判金额");
  }

  console.log("草稿项目参考询价面板渲染校验通过");
} finally {
  await vite.close();
}
