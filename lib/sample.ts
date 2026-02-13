import fs from "node:fs/promises";
import path from "node:path";
import { createProject, listAssets, listProjects, replaceSteps, addAsset, setProjectStatus } from "@/lib/repo";
import { assetDir } from "@/lib/paths";
import type { TutorialSchema } from "@/lib/types";

function crmSvg(stepTitle: string, subtitle: string, accent: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1366" height="768" viewBox="0 0 1366 768">
  <rect width="1366" height="768" fill="#f4f7fb"/>
  <rect x="0" y="0" width="220" height="768" fill="#113355"/>
  <text x="24" y="46" font-family="Arial" font-size="28" fill="#ffffff" font-weight="700">FlowCRM</text>
  <text x="24" y="90" font-family="Arial" font-size="17" fill="#a8c4e6">Dashboard</text>
  <text x="24" y="124" font-family="Arial" font-size="17" fill="#a8c4e6">Leads</text>
  <rect x="250" y="28" width="1088" height="80" rx="14" fill="#ffffff"/>
  <text x="278" y="72" font-family="Arial" font-size="30" fill="#1b2d42" font-weight="700">${stepTitle}</text>
  <rect x="250" y="130" width="1088" height="600" rx="14" fill="#ffffff"/>
  <rect x="980" y="158" width="320" height="56" rx="10" fill="${accent}"/>
  <text x="1032" y="194" font-family="Arial" font-size="22" fill="#ffffff" font-weight="700">${subtitle}</text>
</svg>`;
}

export async function getOrCreateSampleProject(): Promise<string> {
  const existing = listProjects().find((p) => p.title === "Sample CRM Lead Registration");
  if (existing) {
    return existing.id;
  }

  const project = createProject("Sample CRM Lead Registration");

  const sampleFiles = [
    { name: "sample-1.svg", svg: crmSvg("Dashboard", "Open Leads", "#2b6cb0") },
    { name: "sample-2.svg", svg: crmSvg("Leads", "Add Lead", "#2f855a") },
    { name: "sample-3.svg", svg: crmSvg("Create Lead", "Required Fields", "#805ad5") },
    { name: "sample-4.svg", svg: crmSvg("Create Lead", "Save", "#d69e2e") },
    { name: "sample-5.svg", svg: crmSvg("Lead List", "Success Toast", "#dd6b20") },
    { name: "sample-6.svg", svg: crmSvg("Lead List", "Verify Added", "#2c5282") }
  ];

  for (let i = 0; i < sampleFiles.length; i += 1) {
    const file = sampleFiles[i];
    const targetPath = path.join(assetDir, `${project.id}-${file.name}`);
    await fs.writeFile(targetPath, file.svg, "utf-8");
    addAsset({
      projectId: project.id,
      kind: "image",
      filePath: targetPath,
      mimeType: "image/svg+xml",
      sortOrder: i
    });
  }

  const assets = listAssets(project.id);

  const tutorial: TutorialSchema = {
    tutorial_title: "CRM 리드 등록 튜토리얼",
    language: "ko-KR",
    steps: [
      { step_no: 1, title: "대시보드 진입", instruction: "CRM 대시보드에 진입해 현재 상태를 확인합니다.", highlight: { x: 20, y: 9, w: 18, h: 6 } },
      { step_no: 2, title: "Leads 이동", instruction: "좌측 메뉴에서 Leads를 눌러 리드 관리 화면으로 이동합니다.", highlight: { x: 2, y: 14, w: 12, h: 5 } },
      { step_no: 3, title: "Add Lead 클릭", instruction: "우측 상단의 Add Lead 버튼을 클릭해 등록 폼을 엽니다.", highlight: { x: 72, y: 20, w: 23, h: 8 } },
      { step_no: 4, title: "필수 필드 입력", instruction: "이름, 회사, 이메일, 상태 등 필수 입력값을 작성합니다.", highlight: { x: 33, y: 25, w: 52, h: 45 } },
      { step_no: 5, title: "Save 실행", instruction: "입력을 확인한 뒤 Save 버튼을 눌러 저장합니다.", highlight: { x: 72, y: 20, w: 23, h: 8 } },
      { step_no: 6, title: "성공 여부 확인", instruction: "성공 토스트와 목록 반영 여부를 확인해 등록 완료를 검증합니다.", highlight: { x: 58, y: 20, w: 37, h: 12 } }
    ]
  };

  replaceSteps(project.id, tutorial, assets.map((a) => a.id));
  setProjectStatus(project.id, "ready");
  return project.id;
}
