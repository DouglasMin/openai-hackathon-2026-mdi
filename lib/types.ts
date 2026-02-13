export type ProjectStatus = "uploaded" | "generating" | "ready" | "exported" | "failed";

export type Highlight = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type StepRecord = {
  id: string;
  projectId: string;
  stepNo: number;
  title: string;
  instruction: string;
  highlight: Highlight;
  ttsScript: string | null;
  notes: string | null;
  assetId: string | null;
  ttsAssetId: string | null;
  createdAt: string;
};

export type AssetRecord = {
  id: string;
  projectId: string;
  kind: "image" | "audio" | "zip";
  filePath: string;
  mimeType: string;
  sortOrder: number;
  createdAt: string;
};

export type ProjectRecord = {
  id: string;
  title: string;
  status: ProjectStatus;
  language: "ko-KR";
  tutorialTitle: string | null;
  errorText: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StepSchema = {
  step_no: number;
  title: string;
  instruction: string;
  highlight: Highlight;
  tts_script?: string;
  notes?: string;
};

export type TutorialSchema = {
  tutorial_title: string;
  language: "ko-KR";
  steps: StepSchema[];
};
