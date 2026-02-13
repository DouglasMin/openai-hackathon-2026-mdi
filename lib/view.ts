import { getProject, listAssets, listSteps } from "@/lib/repo";

export function getProjectView(projectId: string) {
  const project = getProject(projectId);
  if (!project) {
    return null;
  }

  const assets = listAssets(projectId).map((asset) => ({
    ...asset,
    url: `/api/assets/${asset.id}`
  }));

  const steps = listSteps(projectId).map((step) => {
    const asset = assets.find((a) => a.id === step.assetId);
    const ttsAsset = assets.find((a) => a.id === step.ttsAssetId);
    return {
      ...step,
      assetUrl: asset?.url ?? null,
      ttsUrl: ttsAsset?.url ?? null
    };
  });

  return {
    project,
    assets,
    steps
  };
}
