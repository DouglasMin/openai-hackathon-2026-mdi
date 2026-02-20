type RepoApi = typeof import("@/lib/repo-dynamodb");

let cachedRepoPromise: Promise<RepoApi> | null = null;

async function resolveRepo(): Promise<RepoApi> {
  if (cachedRepoPromise) return cachedRepoPromise;
  if (process.env.DB_BACKEND === "dynamodb") {
    cachedRepoPromise = import("./repo-dynamodb") as Promise<RepoApi>;
    return cachedRepoPromise;
  }
  cachedRepoPromise = import("./repo-sqlite-async") as Promise<RepoApi>;
  return cachedRepoPromise;
}

export const createProject: RepoApi["createProject"] = async (...args) => (await resolveRepo()).createProject(...args);
export const listProjects: RepoApi["listProjects"] = async (...args) => (await resolveRepo()).listProjects(...args);
export const getProject: RepoApi["getProject"] = async (...args) => (await resolveRepo()).getProject(...args);
export const setProjectStatus: RepoApi["setProjectStatus"] = async (...args) => (await resolveRepo()).setProjectStatus(...args);
export const setProjectMode: RepoApi["setProjectMode"] = async (...args) => (await resolveRepo()).setProjectMode(...args);
export const setProjectTutorialTitle: RepoApi["setProjectTutorialTitle"] = async (...args) =>
  (await resolveRepo()).setProjectTutorialTitle(...args);
export const setProjectTitle: RepoApi["setProjectTitle"] = async (...args) => (await resolveRepo()).setProjectTitle(...args);
export const addAsset: RepoApi["addAsset"] = async (...args) => (await resolveRepo()).addAsset(...args);
export const listAssets: RepoApi["listAssets"] = async (...args) => (await resolveRepo()).listAssets(...args);
export const getAsset: RepoApi["getAsset"] = async (...args) => (await resolveRepo()).getAsset(...args);
export const reorderAssets: RepoApi["reorderAssets"] = async (...args) => (await resolveRepo()).reorderAssets(...args);
export const replaceSteps: RepoApi["replaceSteps"] = async (...args) => (await resolveRepo()).replaceSteps(...args);
export const setStepTtsAsset: RepoApi["setStepTtsAsset"] = async (...args) => (await resolveRepo()).setStepTtsAsset(...args);
export const saveEditedSteps: RepoApi["saveEditedSteps"] = async (...args) => (await resolveRepo()).saveEditedSteps(...args);
export const listSteps: RepoApi["listSteps"] = async (...args) => (await resolveRepo()).listSteps(...args);
export const createScanRun: RepoApi["createScanRun"] = async (...args) => (await resolveRepo()).createScanRun(...args);
export const updateScanRunStatus: RepoApi["updateScanRunStatus"] = async (...args) =>
  (await resolveRepo()).updateScanRunStatus(...args);
export const getLatestScanRun: RepoApi["getLatestScanRun"] = async (...args) => (await resolveRepo()).getLatestScanRun(...args);
export const listScanRuns: RepoApi["listScanRuns"] = async (...args) => (await resolveRepo()).listScanRuns(...args);
export const getScanRun: RepoApi["getScanRun"] = async (...args) => (await resolveRepo()).getScanRun(...args);
export const addIssue: RepoApi["addIssue"] = async (...args) => (await resolveRepo()).addIssue(...args);
export const clearIssuesForRun: RepoApi["clearIssuesForRun"] = async (...args) => (await resolveRepo()).clearIssuesForRun(...args);
export const listIssuesForRun: RepoApi["listIssuesForRun"] = async (...args) => (await resolveRepo()).listIssuesForRun(...args);
export const listIssuesFiltered: RepoApi["listIssuesFiltered"] = async (...args) => (await resolveRepo()).listIssuesFiltered(...args);
export const countIssuesFiltered: RepoApi["countIssuesFiltered"] = async (...args) => (await resolveRepo()).countIssuesFiltered(...args);
export const upsertScoreSummary: RepoApi["upsertScoreSummary"] = async (...args) => (await resolveRepo()).upsertScoreSummary(...args);
export const getScoreSummary: RepoApi["getScoreSummary"] = async (...args) => (await resolveRepo()).getScoreSummary(...args);
export const getScormCloudRegistration: RepoApi["getScormCloudRegistration"] = async (...args) =>
  (await resolveRepo()).getScormCloudRegistration(...args);
export const upsertScormCloudRegistration: RepoApi["upsertScormCloudRegistration"] = async (...args) =>
  (await resolveRepo()).upsertScormCloudRegistration(...args);
export const clearScormCloudRegistration: RepoApi["clearScormCloudRegistration"] = async (...args) =>
  (await resolveRepo()).clearScormCloudRegistration(...args);
