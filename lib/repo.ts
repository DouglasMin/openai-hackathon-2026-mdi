type RepoApi = typeof import("@/lib/repo-dynamodb");

let cachedRepo: RepoApi | null = null;

function resolveRepo(): RepoApi {
  if (cachedRepo) return cachedRepo;

  const req = eval("require") as NodeRequire;
  if (process.env.DB_BACKEND === "dynamodb") {
    cachedRepo = req("./repo-dynamodb") as RepoApi;
    return cachedRepo;
  }

  cachedRepo = req("./repo-sqlite-async") as RepoApi;
  return cachedRepo;
}

export const createProject: RepoApi["createProject"] = (...args) => resolveRepo().createProject(...args);
export const listProjects: RepoApi["listProjects"] = (...args) => resolveRepo().listProjects(...args);
export const getProject: RepoApi["getProject"] = (...args) => resolveRepo().getProject(...args);
export const setProjectStatus: RepoApi["setProjectStatus"] = (...args) => resolveRepo().setProjectStatus(...args);
export const setProjectMode: RepoApi["setProjectMode"] = (...args) => resolveRepo().setProjectMode(...args);
export const setProjectTutorialTitle: RepoApi["setProjectTutorialTitle"] = (...args) => resolveRepo().setProjectTutorialTitle(...args);
export const setProjectTitle: RepoApi["setProjectTitle"] = (...args) => resolveRepo().setProjectTitle(...args);
export const addAsset: RepoApi["addAsset"] = (...args) => resolveRepo().addAsset(...args);
export const listAssets: RepoApi["listAssets"] = (...args) => resolveRepo().listAssets(...args);
export const getAsset: RepoApi["getAsset"] = (...args) => resolveRepo().getAsset(...args);
export const reorderAssets: RepoApi["reorderAssets"] = (...args) => resolveRepo().reorderAssets(...args);
export const replaceSteps: RepoApi["replaceSteps"] = (...args) => resolveRepo().replaceSteps(...args);
export const setStepTtsAsset: RepoApi["setStepTtsAsset"] = (...args) => resolveRepo().setStepTtsAsset(...args);
export const saveEditedSteps: RepoApi["saveEditedSteps"] = (...args) => resolveRepo().saveEditedSteps(...args);
export const listSteps: RepoApi["listSteps"] = (...args) => resolveRepo().listSteps(...args);
export const createScanRun: RepoApi["createScanRun"] = (...args) => resolveRepo().createScanRun(...args);
export const updateScanRunStatus: RepoApi["updateScanRunStatus"] = (...args) => resolveRepo().updateScanRunStatus(...args);
export const getLatestScanRun: RepoApi["getLatestScanRun"] = (...args) => resolveRepo().getLatestScanRun(...args);
export const listScanRuns: RepoApi["listScanRuns"] = (...args) => resolveRepo().listScanRuns(...args);
export const getScanRun: RepoApi["getScanRun"] = (...args) => resolveRepo().getScanRun(...args);
export const addIssue: RepoApi["addIssue"] = (...args) => resolveRepo().addIssue(...args);
export const clearIssuesForRun: RepoApi["clearIssuesForRun"] = (...args) => resolveRepo().clearIssuesForRun(...args);
export const listIssuesForRun: RepoApi["listIssuesForRun"] = (...args) => resolveRepo().listIssuesForRun(...args);
export const listIssuesFiltered: RepoApi["listIssuesFiltered"] = (...args) => resolveRepo().listIssuesFiltered(...args);
export const countIssuesFiltered: RepoApi["countIssuesFiltered"] = (...args) => resolveRepo().countIssuesFiltered(...args);
export const upsertScoreSummary: RepoApi["upsertScoreSummary"] = (...args) => resolveRepo().upsertScoreSummary(...args);
export const getScoreSummary: RepoApi["getScoreSummary"] = (...args) => resolveRepo().getScoreSummary(...args);
export const getScormCloudRegistration: RepoApi["getScormCloudRegistration"] = (...args) => resolveRepo().getScormCloudRegistration(...args);
export const upsertScormCloudRegistration: RepoApi["upsertScormCloudRegistration"] = (...args) =>
  resolveRepo().upsertScormCloudRegistration(...args);
export const clearScormCloudRegistration: RepoApi["clearScormCloudRegistration"] = (...args) =>
  resolveRepo().clearScormCloudRegistration(...args);
