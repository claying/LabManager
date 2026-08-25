import { PIPELINE_STAGES, type ProjectStage } from "@pi-os/types";

export interface PipelineCount {
  stage: ProjectStage;
  count: number;
}

/** Number of (non-archived) projects in each pipeline stage, in display order. */
export function calculatePipelineCounts(
  projects: { stage: ProjectStage; archived: boolean }[],
): PipelineCount[] {
  const counts = new Map<ProjectStage, number>(PIPELINE_STAGES.map((s) => [s, 0]));
  for (const project of projects) {
    if (project.archived) continue;
    if (!counts.has(project.stage)) continue; // paused projects excluded from the pipeline view
    counts.set(project.stage, (counts.get(project.stage) ?? 0) + 1);
  }
  return PIPELINE_STAGES.map((stage) => ({ stage, count: counts.get(stage) ?? 0 }));
}
