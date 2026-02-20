import { createProject, listAssets, listProjects, replaceSteps, addAsset, setProjectStatus } from "@/lib/repo";
import { writeStorageObject } from "@/lib/storage";
import type { TutorialSchema } from "@/lib/types";

function crmSvg(stepTitle: string, subtitle: string, accent: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1366" height="768" viewBox="0 0 1366 768">
  <rect width="1366" height="768" fill="#f4f7fb"/>
  <rect x="0" y="0" width="220" height="768" fill="#113355"/>
  <text x="24" y="46" font-family="Arial" font-size="28" fill="#ffffff" font-weight="700">FlowTutor</text>
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
  const existing = (await listProjects()).find((p) => p.title === "Sample Workflow Tutorial" || p.title === "Sample CRM Lead Registration");
  if (existing) {
    return existing.id;
  }

  const project = await createProject("Sample Workflow Tutorial");

  const sampleFiles = [
    { name: "sample-1.svg", svg: crmSvg("Dashboard", "Open Leads", "#2b6cb0") },
    { name: "sample-2.svg", svg: crmSvg("Workflow List", "Add Item", "#2f855a") },
    { name: "sample-3.svg", svg: crmSvg("Create Item", "Required Fields", "#805ad5") },
    { name: "sample-4.svg", svg: crmSvg("Create Item", "Save", "#d69e2e") },
    { name: "sample-5.svg", svg: crmSvg("Item List", "Success Toast", "#dd6b20") },
    { name: "sample-6.svg", svg: crmSvg("Item List", "Verify Added", "#2c5282") }
  ];

  for (let i = 0; i < sampleFiles.length; i += 1) {
    const file = sampleFiles[i];
    const targetPath = await writeStorageObject({
      category: "assets",
      projectId: project.id,
      fileName: `${project.id}-${file.name}`,
      body: file.svg,
      contentType: "image/svg+xml"
    });
    await addAsset({
      projectId: project.id,
      kind: "image",
      filePath: targetPath,
      mimeType: "image/svg+xml",
      imageWidth: 1366,
      imageHeight: 768,
      sortOrder: i
    });
  }

  const assets = await listAssets(project.id);

  const tutorial: TutorialSchema = {
    tutorial_title: "샘플 워크플로우 튜토리얼",
    language: "ko-KR",
    steps: [
      {
        step_no: 1,
        asset_index: 0,
        title: "대시보드 진입",
        instruction: "대시보드 화면에 진입해 현재 상태를 확인합니다.",
        highlight: { x: 270, y: 32, w: 420, h: 56 },
        tts_script: "대시보드 화면에 진입해 현재 상태를 확인합니다.",
        notes: ""
      },
      {
        step_no: 2,
        asset_index: 1,
        title: "목록 메뉴 이동",
        instruction: "좌측 메뉴에서 목록 메뉴를 눌러 관리 화면으로 이동합니다.",
        highlight: { x: 22, y: 108, w: 170, h: 30 },
        tts_script: "좌측 메뉴에서 목록 메뉴를 눌러 이동합니다.",
        notes: ""
      },
      {
        step_no: 3,
        asset_index: 2,
        title: "신규 항목 추가",
        instruction: "우측 상단의 Add Item 버튼을 클릭해 등록 폼을 엽니다.",
        highlight: { x: 980, y: 158, w: 320, h: 56 },
        tts_script: "우측 상단 Add Item 버튼을 클릭합니다.",
        notes: ""
      },
      {
        step_no: 4,
        asset_index: 3,
        title: "필수 필드 입력",
        instruction: "이름, 회사, 이메일, 상태 등 필수 입력값을 작성합니다.",
        highlight: { x: 340, y: 210, w: 660, h: 300 },
        tts_script: "필수 입력값을 차례대로 작성합니다.",
        notes: ""
      },
      {
        step_no: 5,
        asset_index: 3,
        title: "Save 실행",
        instruction: "입력을 확인한 뒤 Save 버튼을 눌러 저장합니다.",
        highlight: { x: 980, y: 158, w: 320, h: 56 },
        tts_script: "Save 버튼으로 저장합니다.",
        notes: ""
      },
      {
        step_no: 6,
        asset_index: 5,
        title: "성공 여부 확인",
        instruction: "성공 토스트와 목록 반영 여부를 확인해 등록 완료를 검증합니다.",
        highlight: { x: 790, y: 150, w: 490, h: 90 },
        tts_script: "성공 토스트와 목록 반영 여부를 확인합니다.",
        notes: ""
      }
    ]
  };

  await replaceSteps(project.id, tutorial, assets);
  await setProjectStatus(project.id, "ready");
  return project.id;
}
