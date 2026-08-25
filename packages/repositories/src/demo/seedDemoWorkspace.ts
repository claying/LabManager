import { workspaceRepository } from "../repositories/workspaceRepository";
import { peopleRepository } from "../repositories/peopleRepository";
import { projectRepository } from "../repositories/projectRepository";
import { projectUpdatesRepository } from "../repositories/projectUpdatesRepository";
import { milestoneRepository } from "../repositories/milestoneRepository";
import { meetingRepository } from "../repositories/meetingRepository";
import { actionItemRepository } from "../repositories/actionItemRepository";
import { publicationRepository } from "../repositories/publicationRepository";
import { grantRepository } from "../repositories/grantRepository";
import { venueRepository, venueCycleRepository } from "../repositories/venueRepository";
import { researchQuestionRepository } from "../repositories/researchQuestionRepository";
import { hypothesisRepository } from "../repositories/hypothesisRepository";
import { evidenceRepository } from "../repositories/evidenceRepository";
import { submissionPlanRepository } from "../repositories/submissionPlanRepository";
import { paperReadinessRepository } from "../repositories/paperReadinessRepository";
import { getDb } from "../db/client";
import { nowIso } from "../db/util";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function daysFromNow(n: number): string {
  return daysAgo(-n);
}
function dateOnly(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Populates a realistic demo lab ("SIM Lab" — Structural Intelligence and
 * Modeling Lab) so first-run has something to explore immediately (SPEC
 * section 29/33). Only ever called from onboarding, on an empty database —
 * never mixed into a real workspace. Uses relative dates so the "18 days
 * stale, milestone overdue by 4 days" attention example always looks fresh,
 * whenever this is actually run.
 */
export async function seedDemoWorkspace(): Promise<void> {
  const existing = await workspaceRepository.get();
  if (existing)
    throw new Error("A workspace already exists — demo data can only be loaded on first run.");

  const workspace = await workspaceRepository.create({
    name: "SIM Lab",
    institution: "State University",
    pi_name: "Dr. Sarah Chen",
    description:
      "We study geometric and generative machine learning methods for protein structure, function, and design.",
  });

  await peopleRepository.update(workspace.pi_person_id!, {
    email: "sarah.chen@simlab.edu",
    research_interests: ["geometric deep learning", "protein design", "generative models"],
    skills: ["PyTorch", "JAX"],
    bio: "PI of SIM Lab. Broadly interested in geometry-aware ML for biomolecules.",
  });
  const pi = workspace.pi_person_id!;

  const alice = await peopleRepository.create({
    name: "Alice Kim",
    email: "alice.kim@simlab.edu",
    role: "PhD",
    start_date: daysAgo(3 * 365),
    expected_graduation: daysFromNow(365),
    research_interests: ["graph neural networks", "protein folding"],
    skills: ["PyTorch Geometric", "CUDA"],
    bio: "3rd-year PhD student working on graph foundation models for structural biology.",
    github_url: "https://github.com/example-alice",
  });
  const marcus = await peopleRepository.create({
    name: "Marcus Rodriguez",
    email: "marcus.r@simlab.edu",
    role: "PhD",
    start_date: daysAgo(2 * 365),
    expected_graduation: daysFromNow(2 * 365),
    research_interests: ["flow matching", "generative models"],
    skills: ["PyTorch", "JAX"],
    bio: "2nd-year PhD student on generative flow models for molecular geometry.",
  });
  const priya = await peopleRepository.create({
    name: "Priya Patel",
    email: "priya.patel@simlab.edu",
    role: "PhD",
    start_date: daysAgo(365),
    expected_graduation: daysFromNow(3 * 365),
    research_interests: ["protein-protein interaction", "representation learning"],
    skills: ["PyTorch", "scikit-learn"],
    bio: "1st-year PhD student exploring representation learning for protein interactions.",
  });
  const james = await peopleRepository.create({
    name: "Dr. James Wu",
    email: "james.wu@simlab.edu",
    role: "Postdoc",
    start_date: daysAgo(365),
    research_interests: ["ligand-binding site prediction", "protein language models"],
    skills: ["PyTorch", "Bioinformatics pipelines"],
    bio: "Postdoc focused on graph-based binding-site prediction and protein language models.",
  });
  const tom = await peopleRepository.create({
    name: "Tom Anderson",
    email: "tom.a@simlab.edu",
    role: "RA",
    start_date: daysAgo(240),
    research_interests: ["data pipelines", "benchmarking"],
    skills: ["Python", "SQL"],
    bio: "Research assistant supporting benchmarking infrastructure across lab projects.",
  });
  const emma = await peopleRepository.create({
    name: "Emma Liu",
    email: "emma.liu@simlab.edu",
    role: "RA",
    start_date: daysAgo(150),
    research_interests: ["molecular optimization", "cheminformatics"],
    skills: ["RDKit", "Python"],
    bio: "Research assistant on molecular optimization and cheminformatics tooling.",
  });
  const david = await peopleRepository.create({
    name: "Dr. David Park",
    email: "dpark@partner-university.edu",
    role: "Collaborator",
    start_date: daysAgo(2 * 365),
    research_interests: ["structural biology", "cryo-EM"],
    bio: "External collaborator, Partner University — structural biology validation.",
  });
  const rachel = await peopleRepository.create({
    name: "Dr. Rachel Green",
    email: "rgreen@otherlab.edu",
    role: "Collaborator",
    start_date: daysAgo(365),
    research_interests: ["biological foundation models"],
    bio: "External collaborator on efficient biological foundation models.",
  });

  const geoflow = await projectRepository.create({
    title: "SE(3)-Equivariant Flow Matching for Protein Backbone Design",
    short_name: "FlowBB",
    description:
      "Conditional SE(3)-equivariant flow-matching models for de novo protein backbone generation, benchmarked against diffusion baselines as we scale model and dataset size.",
    lead_person_id: marcus.id,
    stage: "main_experiments",
    health: "healthy",
    priority: "high",
    start_date: daysAgo(150),
    target_date: daysFromNow(60),
    next_milestone: "Full-scale backbone generation benchmark",
    next_milestone_date: daysFromNow(12),
    github_url: "https://github.com/sim-lab/flow-bb",
  });
  const funcRegion = await projectRepository.create({
    title: "Graph Neural Networks for Ligand-Binding Pocket Prediction",
    short_name: "PocketGNN",
    description:
      "Residue- and pocket-center-level graph neural networks that identify ligand-binding sites directly from AlphaFold-predicted structures.",
    lead_person_id: james.id,
    stage: "writing",
    health: "attention",
    priority: "high",
    start_date: daysAgo(300),
    target_date: daysFromNow(30),
    next_milestone: "Submit to ISMB",
    next_milestone_date: daysFromNow(5),
    github_url: "https://github.com/sim-lab/pocket-gnn",
  });
  const scaleRep = await projectRepository.create({
    title: "Structure-Aware Masked Pretraining for Protein Representation Learning",
    short_name: "StructMask",
    description:
      "Pretraining objectives that mask 3D structural neighborhoods instead of sequence alone, compared against contrastive and standard masked-language baselines.",
    lead_person_id: priya.id,
    stage: "baselines",
    health: "healthy",
    priority: "medium",
    start_date: daysAgo(60),
    target_date: daysFromNow(120),
    next_milestone: "Finish baseline sweep",
    next_milestone_date: daysFromNow(20),
  });
  const ctrlGen = await projectRepository.create({
    title: "Binding-Site-Conditioned Protein Backbone Generation",
    short_name: "CondGen",
    description:
      "Conditioning flow-matching generative models on target binding-site geometry so generated backbones satisfy functional constraints by construction.",
    lead_person_id: alice.id,
    stage: "prototype",
    health: "healthy",
    priority: "medium",
    start_date: daysAgo(30),
    target_date: daysFromNow(180),
    next_milestone: "First conditional samples",
    next_milestone_date: daysFromNow(25),
  });
  const graphFM = await projectRepository.create({
    title: "Iterative Equivariant Refinement for Graph-Based Structural Biology Foundation Models",
    short_name: "GraphFM",
    description:
      "Pretrained graph neural networks with an iterative SE(3)-equivariant refinement stage, aimed at general-purpose structural biology representations that generalize across folds and message-passing depths.",
    lead_person_id: alice.id,
    stage: "ablation",
    health: "stalled",
    priority: "high",
    start_date: daysAgo(240),
    target_date: daysFromNow(30),
    next_milestone: "Ablation study on message-passing depth",
    next_milestone_date: daysAgo(4),
    github_url: "https://github.com/sim-lab/graphfm",
  });
  const molOpt = await projectRepository.create({
    title: "Optimizing Molecular Binders over a Generative Docking Latent Space",
    short_name: "MolOpt",
    description:
      "Gradient- and search-based optimization of small-molecule and peptide binders within the latent space of a pretrained generative docking model.",
    lead_person_id: emma.id,
    stage: "idea",
    health: "healthy",
    priority: "low",
    start_date: daysAgo(21),
    next_milestone: "Scope initial experiments",
    next_milestone_date: daysFromNow(30),
  });
  const ppiNet = await projectRepository.create({
    title: "Equivariant Graph Networks for Protein-Protein Interaction Site Prediction",
    short_name: "PPI-Net",
    description:
      "E(n)-equivariant graph neural networks that predict protein-protein interaction interfaces from joint structural embeddings and residue-level contact profiles.",
    lead_person_id: priya.id,
    stage: "ablation",
    health: "attention",
    priority: "medium",
    start_date: daysAgo(180),
    target_date: daysFromNow(60),
    next_milestone: "Ablate cross-attention module",
    next_milestone_date: daysAgo(1),
  });
  const effBio = await projectRepository.create({
    title: "Structured Distillation for Efficient, Deployable Biological Foundation Models",
    short_name: "EffBio",
    description:
      "Structured distillation and efficient attention variants for deploying large biological foundation models under realistic inference-latency budgets.",
    lead_person_id: james.id,
    stage: "rebuttal",
    health: "healthy",
    priority: "critical",
    start_date: daysAgo(330),
    target_date: daysFromNow(21),
    next_milestone: "Submit rebuttal",
    next_milestone_date: daysFromNow(6),
  });

  await projectRepository.addMember(geoflow.id, marcus.id, "lead");
  await projectRepository.addMember(geoflow.id, pi, "advisor");
  await projectRepository.addMember(geoflow.id, tom.id, "core_member");
  await projectRepository.addMember(funcRegion.id, james.id, "lead");
  await projectRepository.addMember(funcRegion.id, pi, "advisor");
  await projectRepository.addMember(funcRegion.id, david.id, "collaborator");
  await projectRepository.addMember(scaleRep.id, priya.id, "lead");
  await projectRepository.addMember(scaleRep.id, tom.id, "core_member");
  await projectRepository.addMember(ctrlGen.id, alice.id, "lead");
  await projectRepository.addMember(ctrlGen.id, pi, "advisor");
  await projectRepository.addMember(graphFM.id, alice.id, "lead");
  await projectRepository.addMember(graphFM.id, marcus.id, "core_member");
  await projectRepository.addMember(graphFM.id, pi, "advisor");
  await projectRepository.addMember(molOpt.id, emma.id, "lead");
  await projectRepository.addMember(ppiNet.id, priya.id, "lead");
  await projectRepository.addMember(ppiNet.id, rachel.id, "collaborator");
  await projectRepository.addMember(effBio.id, james.id, "lead");
  await projectRepository.addMember(effBio.id, rachel.id, "collaborator");
  await projectRepository.addMember(effBio.id, pi, "advisor");

  const submit = (
    projectId: string,
    authorPersonId: string,
    values: Parameters<typeof projectUpdatesRepository.submit>[0]["input"],
    createdAt: string,
  ) =>
    projectUpdatesRepository
      .submit({ projectId, authorPersonId, input: values })
      .then(async (update) => {
        const db = await getDb();
        await db.execute("update project_updates set created_at = ? where id = ?", [
          createdAt,
          update.id,
        ]);
        await db.execute("update projects set last_update_at = ? where id = ?", [
          createdAt,
          projectId,
        ]);
        return update;
      });

  await submit(
    geoflow.id,
    marcus.id,
    {
      summary: "Ran the full-scale flow-matching training run on the new backbone dataset.",
      progress: "Loss curves look stable; sample quality improved over last checkpoint.",
      blockers: null,
      next_steps: "Kick off large-scale sampling benchmark.",
      health: "healthy",
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
    daysAgo(3),
  );
  await submit(
    funcRegion.id,
    james.id,
    {
      summary: "Drafted the introduction and related work sections.",
      progress: "First full draft is ~70% complete.",
      blockers: "Need David's validation results before finishing the results section.",
      next_steps: "Follow up with David on validation timeline.",
      health: "attention",
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
    daysAgo(16),
  );
  await submit(
    scaleRep.id,
    priya.id,
    {
      summary: "Completed the second baseline (contrastive pretraining objective).",
      progress: "Baseline underperforms our method by 4 points on the held-out set, as expected.",
      blockers: null,
      next_steps: "Start the third baseline (masked modeling).",
      health: "healthy",
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
    daysAgo(6),
  );
  await submit(
    ctrlGen.id,
    alice.id,
    {
      summary: "Implemented the conditioning mechanism and ran a first small-scale test.",
      progress: "Conditional samples respect the target constraint in ~60% of cases.",
      blockers: null,
      next_steps: "Scale up to the full conditioning set.",
      health: "healthy",
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
    daysAgo(2),
  );
  await submit(
    graphFM.id,
    alice.id,
    {
      summary:
        "Paused ablations to help debug a shared infrastructure issue affecting multiple projects.",
      progress: null,
      blockers: "Blocked on a cluster scheduler bug; escalated to IT.",
      next_steps: "Resume ablation sweep once the scheduler issue is resolved.",
      health: "stalled",
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
    daysAgo(18),
  );
  await submit(
    molOpt.id,
    emma.id,
    {
      summary: "Scoped the initial experiment plan and reviewed related work.",
      progress: "Identified three candidate optimization objectives to try first.",
      blockers: null,
      next_steps: "Implement the first objective.",
      health: "healthy",
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
    daysAgo(4),
  );
  await submit(
    ppiNet.id,
    priya.id,
    {
      summary: "Waiting on a revised interface dataset from the Green lab collaboration.",
      progress: "No new experiments run this cycle.",
      blockers: "Dataset delivery has slipped twice; need to confirm a firm date.",
      next_steps: "Confirm dataset delivery date with Dr. Green.",
      health: "attention",
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
    daysAgo(15),
  );
  await submit(
    effBio.id,
    james.id,
    {
      summary: "Addressed all three reviewer concerns with new ablations.",
      progress: "New results strengthen the efficiency-accuracy tradeoff claim.",
      blockers: null,
      next_steps: "Finalize rebuttal text and submit.",
      health: "healthy",
      update_next_milestone: null,
      update_next_milestone_date: null,
    },
    daysAgo(1),
  );

  await milestoneRepository.create({
    project_id: geoflow.id,
    title: "Baseline flow-matching model trained",
    description: null,
    status: "completed",
    due_date: daysAgo(40),
    owner_person_id: marcus.id,
  });
  await milestoneRepository.create({
    project_id: geoflow.id,
    title: "Full-scale backbone generation benchmark",
    description: null,
    status: "in_progress",
    due_date: daysFromNow(12),
    owner_person_id: marcus.id,
  });
  await milestoneRepository.create({
    project_id: funcRegion.id,
    title: "Submit to ISMB",
    description: null,
    status: "in_progress",
    due_date: daysFromNow(5),
    owner_person_id: james.id,
  });
  await milestoneRepository.create({
    project_id: scaleRep.id,
    title: "Finish baseline sweep",
    description: null,
    status: "in_progress",
    due_date: daysFromNow(20),
    owner_person_id: priya.id,
  });
  await milestoneRepository.create({
    project_id: ctrlGen.id,
    title: "First conditional samples",
    description: null,
    status: "in_progress",
    due_date: daysFromNow(25),
    owner_person_id: alice.id,
  });
  await milestoneRepository.create({
    project_id: graphFM.id,
    title: "Ablation study on message-passing depth",
    description: null,
    status: "in_progress",
    due_date: daysAgo(4),
    owner_person_id: alice.id,
  });
  await milestoneRepository.create({
    project_id: graphFM.id,
    title: "Pretraining corpus finalized",
    description: null,
    status: "completed",
    due_date: daysAgo(60),
    owner_person_id: marcus.id,
  });
  await milestoneRepository.create({
    project_id: molOpt.id,
    title: "Scope initial experiments",
    description: null,
    status: "planned",
    due_date: daysFromNow(30),
    owner_person_id: emma.id,
  });
  await milestoneRepository.create({
    project_id: ppiNet.id,
    title: "Ablate cross-attention module",
    description: null,
    status: "in_progress",
    due_date: daysAgo(1),
    owner_person_id: priya.id,
  });
  await milestoneRepository.create({
    project_id: effBio.id,
    title: "Submit rebuttal",
    description: null,
    status: "in_progress",
    due_date: daysFromNow(6),
    owner_person_id: james.id,
  });

  const m1 = await meetingRepository.create(pi, {
    project_id: geoflow.id,
    title: "FlowBB weekly sync",
    meeting_type: "project",
    meeting_date: daysAgo(3),
    attendee_person_ids: [marcus.id, tom.id],
    progress: "Full-scale training run completed successfully.",
    results: "Sample quality improved over the previous checkpoint.",
    blockers: null,
    decisions: "Proceed with the large-scale sampling benchmark before requesting more compute.",
    next_steps: "Marcus to kick off the benchmark run this week.",
  });
  const m2 = await meetingRepository.create(pi, {
    project_id: graphFM.id,
    title: "GraphFM check-in",
    meeting_type: "project",
    meeting_date: daysAgo(18),
    attendee_person_ids: [alice.id, pi],
    progress: "Ablation sweep paused due to a scheduler bug.",
    results: null,
    blockers: "Cluster scheduler bug is blocking all ablation runs.",
    decisions:
      "Escalate the scheduler bug to IT directly rather than waiting; reassess timeline if unresolved by end of week.",
    next_steps: "Alice to escalate to IT and report back by Friday.",
  });
  await meetingRepository.create(pi, {
    title: "Lab meeting",
    meeting_type: "lab",
    meeting_date: daysAgo(7),
    attendee_person_ids: [pi, alice.id, marcus.id, priya.id, james.id],
    progress: "Round-robin project updates from all active projects.",
    results: "FlowBB and CondGen both showing strong early results.",
    blockers: null,
    decisions:
      "Lab will prioritize compute allocation for FlowBB's benchmark run over the next two weeks.",
    next_steps: "Sarah to coordinate compute allocation with IT.",
  });
  const m4 = await meetingRepository.create(pi, {
    project_id: effBio.id,
    title: "EffBio rebuttal planning",
    meeting_type: "project",
    meeting_date: daysAgo(2),
    attendee_person_ids: [james.id, pi],
    progress: "Reviewed all three reviewer comments in detail.",
    results: "Identified concrete ablations to address each concern.",
    blockers: null,
    decisions: "Submit the rebuttal with new ablations rather than requesting an extension.",
    next_steps: "James to finalize rebuttal text by end of week.",
  });
  await meetingRepository.create(pi, {
    title: "Sarah <> Alice 1:1",
    meeting_type: "one_on_one",
    meeting_date: daysAgo(5),
    attendee_person_ids: [pi, alice.id],
    progress: "Discussed GraphFM blockers and PhD progress overall.",
    results: null,
    blockers: "Scheduler bug still unresolved; affecting Alice's ability to make progress.",
    decisions: "Alice will spend the interim time on the paper draft instead of waiting idle.",
    next_steps: "Alice to draft the GraphFM methods section while blocked.",
  });
  const m6 = await meetingRepository.create(pi, {
    project_id: ppiNet.id,
    title: "PPI-Net / Green lab sync",
    meeting_type: "collaboration",
    meeting_date: daysAgo(15),
    attendee_person_ids: [priya.id, rachel.id],
    progress: "Reviewed current interface dataset quality issues.",
    results: null,
    blockers: "Dataset delivery has slipped twice.",
    decisions:
      "Request a firm delivery date in writing from the Green lab and set an internal fallback plan.",
    next_steps: "Priya to follow up in writing and propose a fallback dataset.",
  });

  await actionItemRepository.create(
    {
      project_id: geoflow.id,
      assignee_person_id: marcus.id,
      title: "Kick off large-scale sampling benchmark run",
      description: null,
      status: "in_progress",
      priority: "high",
      due_date: dateOnly(daysFromNow(3)),
    },
    m1.id,
  );
  await actionItemRepository.create(
    {
      project_id: graphFM.id,
      assignee_person_id: alice.id,
      title: "Escalate cluster scheduler bug to IT",
      description: null,
      status: "done",
      priority: "urgent",
      due_date: dateOnly(daysAgo(10)),
    },
    m2.id,
  );
  await actionItemRepository.create({
    assignee_person_id: pi,
    title: "Coordinate compute allocation for FlowBB benchmark",
    description: null,
    status: "open",
    priority: "high",
    due_date: dateOnly(daysFromNow(2)),
  });
  await actionItemRepository.create(
    {
      project_id: effBio.id,
      assignee_person_id: james.id,
      title: "Finalize EffBio rebuttal text",
      description: null,
      status: "in_progress",
      priority: "urgent",
      due_date: dateOnly(daysFromNow(4)),
    },
    m4.id,
  );
  await actionItemRepository.create({
    project_id: graphFM.id,
    assignee_person_id: alice.id,
    title: "Draft GraphFM methods section",
    description: null,
    status: "open",
    priority: "medium",
    due_date: dateOnly(daysFromNow(7)),
  });
  await actionItemRepository.create(
    {
      project_id: ppiNet.id,
      assignee_person_id: priya.id,
      title: "Follow up in writing on PPI dataset delivery date",
      description: null,
      status: "open",
      priority: "high",
      due_date: dateOnly(daysFromNow(1)),
    },
    m6.id,
  );
  await actionItemRepository.create({
    project_id: funcRegion.id,
    assignee_person_id: james.id,
    title: "Get validation results from David for results section",
    description: null,
    status: "open",
    priority: "high",
    due_date: dateOnly(daysFromNow(3)),
  });
  await actionItemRepository.create({
    project_id: scaleRep.id,
    assignee_person_id: tom.id,
    title: "Set up masked-modeling baseline training config",
    description: null,
    status: "open",
    priority: "medium",
    due_date: dateOnly(daysFromNow(10)),
  });

  const pub1 = await publicationRepository.create({
    project_id: funcRegion.id,
    title: "Predicting Ligand-Binding Pockets from AlphaFold Structures with Graph Neural Networks",
    status: "drafting",
    venue: "ISMB 2027",
    submission_deadline: dateOnly(daysFromNow(5)),
    submission_date: null,
    acceptance_date: null,
    publication_date: null,
    doi: null,
    arxiv_url: null,
    overleaf_url: null,
    code_url: null,
    paper_url: null,
    notes: "Waiting on validation results before final draft.",
    author_person_ids: [james.id, david.id, pi],
  });
  await publicationRepository.create({
    project_id: effBio.id,
    title: "Structured Distillation for Efficient Biological Foundation Models",
    status: "rebuttal",
    venue: "NeurIPS 2026",
    submission_deadline: null,
    submission_date: dateOnly(daysAgo(75)),
    acceptance_date: null,
    publication_date: null,
    doi: null,
    arxiv_url: null,
    overleaf_url: null,
    code_url: null,
    paper_url: null,
    notes: "In rebuttal phase; addressing three reviewer concerns.",
    author_person_ids: [james.id, rachel.id, pi],
  });
  const pub3 = await publicationRepository.create({
    project_id: graphFM.id,
    title: "Iterative Equivariant Refinement for Structural Biology Foundation Models",
    status: "experiments",
    venue: "ICML 2027",
    submission_deadline: dateOnly(daysFromNow(45)),
    submission_date: null,
    acceptance_date: null,
    publication_date: null,
    doi: null,
    arxiv_url: null,
    overleaf_url: null,
    code_url: null,
    paper_url: null,
    notes: "Blocked pending resolution of ablation infrastructure issue.",
    author_person_ids: [alice.id, marcus.id, pi],
  });
  await publicationRepository.create({
    project_id: geoflow.id,
    title: "SE(3)-Equivariant Flow Matching for De Novo Protein Backbone Generation",
    status: "idea",
    venue: null,
    submission_deadline: dateOnly(daysFromNow(90)),
    submission_date: null,
    acceptance_date: null,
    publication_date: null,
    doi: null,
    arxiv_url: null,
    overleaf_url: null,
    code_url: null,
    paper_url: null,
    notes: "Targeting a spring venue once the benchmark results are in.",
    author_person_ids: [marcus.id, pi],
  });
  await publicationRepository.create({
    project_id: ppiNet.id,
    title: "Predicting Protein-Protein Interaction Interfaces from Structural Embeddings",
    status: "internal_review",
    venue: "RECOMB 2027",
    submission_deadline: dateOnly(daysFromNow(20)),
    submission_date: null,
    acceptance_date: null,
    publication_date: null,
    doi: null,
    arxiv_url: null,
    overleaf_url: null,
    code_url: null,
    paper_url: null,
    notes: "Internal review circulated to co-authors.",
    author_person_ids: [priya.id, rachel.id],
  });
  // A real, externally published paper (verified via Crossref), shown with
  // no authors or project so nothing implies this fictional demo lab wrote
  // it — it's here only to demonstrate what a completed publication record
  // looks like, using genuine bibliographic data instead of an invented DOI.
  await publicationRepository.create({
    title: "Evolutionary-scale prediction of atomic-level protein structure with a language model",
    status: "published",
    venue: "Science",
    submission_deadline: null,
    submission_date: null,
    acceptance_date: null,
    publication_date: "2023-03-17",
    doi: "10.1126/science.ade2574",
    arxiv_url: null,
    overleaf_url: null,
    code_url: null,
    paper_url: null,
    notes: "Real published work shown for reference — not authored by this demo lab.",
    author_person_ids: [],
  });

  // ---- Tier 2: venue calendar, submission planning, paper readiness -------
  const iclr = await venueRepository.create({
    name: "International Conference on Learning Representations",
    short_name: "ICLR",
    category: "conference",
  });
  const icml = await venueRepository.create({
    name: "International Conference on Machine Learning",
    short_name: "ICML",
    category: "conference",
  });
  await venueCycleRepository.create({
    venue_id: iclr.id,
    cycle_label: "2027",
    abstract_deadline: dateOnly(daysFromNow(18)),
    submission_deadline: dateOnly(daysFromNow(25)),
    notification_date: dateOnly(daysFromNow(95)),
  });
  const icmlCycle = await venueCycleRepository.create({
    venue_id: icml.id,
    cycle_label: "2027",
    abstract_deadline: dateOnly(daysFromNow(38)),
    submission_deadline: dateOnly(daysFromNow(45)),
    notification_date: dateOnly(daysFromNow(120)),
  });

  await publicationRepository.update(pub3.id, { target_venue_cycle_id: icmlCycle.id });
  const plan = await submissionPlanRepository.create(pub3.id, icmlCycle.id);
  // Backdate the first two plan items to already-passed dates and mark them done, so the
  // submission plan visual shows real progress instead of an all-pending template.
  const db = await getDb();
  for (const item of plan.items.slice(0, 2)) {
    await db.execute(
      "update submission_plan_items set status = 'done', completed_at = ? where id = ?",
      [nowIso(), item.id],
    );
  }
  const readinessItems = await paperReadinessRepository.ensureDefaults(pub3.id);
  const readinessStatuses: Record<string, "done" | "in_progress" | "not_started"> = {
    "Main result": "done",
    Baselines: "done",
    Ablations: "in_progress",
    Draft: "in_progress",
  };
  for (const item of readinessItems) {
    const status = readinessStatuses[item.label];
    if (status) await paperReadinessRepository.setStatus(item.id, status);
  }

  // ---- Tier 2: research questions, hypotheses, evidence -------------------
  const q1 = await researchQuestionRepository.create({
    project_id: graphFM.id,
    question: "Does recurrent metric refinement improve 3D realization?",
    priority: "important",
  });
  const q2 = await researchQuestionRepository.create({
    project_id: graphFM.id,
    question: "Is the gain larger in higher-dimensional structures?",
  });
  await researchQuestionRepository.update(q2.id, { status: "investigating" });
  const q3 = await researchQuestionRepository.create({
    project_id: geoflow.id,
    question: "Does the flow-matching objective remain equivariant under the recurrent metric?",
  });
  await researchQuestionRepository.update(q3.id, { status: "answered", resolved_at: nowIso() });

  const h1 = await hypothesisRepository.create({
    project_id: graphFM.id,
    research_question_id: q1.id,
    statement:
      "Recurrent metric refinement improves 3D structural realization over a fixed metric.",
    confidence: "medium",
  });
  await hypothesisRepository.update(h1.id, { status: "supported", resolved_at: nowIso() });
  await evidenceRepository.create({
    hypothesis_id: h1.id,
    project_id: graphFM.id,
    type: "experiment",
    summary: "RM-GEL improves 3D RMSE by 0.8% over the hybrid baseline",
    direction: "supports",
    source_type: "project_update",
  });
  await evidenceRepository.create({
    hypothesis_id: h1.id,
    project_id: graphFM.id,
    type: "experiment",
    summary: "Consistent improvement across three random seeds",
    direction: "supports",
  });

  const h2 = await hypothesisRepository.create({
    project_id: graphFM.id,
    research_question_id: q1.id,
    statement: "The gain from recurrent refinement increases with geometric coupling strength.",
    confidence: "low",
  });
  await hypothesisRepository.update(h2.id, { status: "testing" });
  await evidenceRepository.create({
    hypothesis_id: h2.id,
    project_id: graphFM.id,
    type: "analysis",
    summary: "Ablation sweep on coupling strength inconclusive so far",
    direction: "mixed",
  });

  await hypothesisRepository.create({
    project_id: graphFM.id,
    statement: "The approach generalizes to small-molecule generation, not just proteins.",
    confidence: null,
  });

  await grantRepository.create({
    title: "NSF CAREER: Geometric Foundations of Structural Biology ML",
    funder: "NSF",
    program: "CAREER",
    status: "active",
    deadline: null,
    start_date: dateOnly(daysAgo(365)),
    end_date: dateOnly(daysFromNow(4 * 365)),
    amount: 650000,
    currency: "USD",
    pi_person_id: pi,
    description: "Five-year CAREER award funding the lab's core geometric ML research program.",
    notes: null,
  });
  await grantRepository.create({
    title: "NIH R01: Graph Neural Networks for Ligand-Binding Site Discovery",
    funder: "NIH",
    program: "R01",
    status: "preparing",
    deadline: dateOnly(daysFromNow(25)),
    start_date: null,
    end_date: null,
    amount: 2100000,
    currency: "USD",
    pi_person_id: pi,
    description:
      "Proposal in preparation to fund binding-site prediction work building on PocketGNN.",
    notes: null,
  });
  await grantRepository.create({
    title: "Industry gift: Generative Protein Design",
    funder: "BioGen Partners",
    program: null,
    status: "awarded",
    deadline: null,
    start_date: dateOnly(daysAgo(90)),
    end_date: dateOnly(daysFromNow(270)),
    amount: 150000,
    currency: "USD",
    pi_person_id: pi,
    description: "Unrestricted gift supporting generative protein design research.",
    notes: null,
  });
  await grantRepository.create({
    title: "DOE Early Career: Efficient Biological Foundation Models",
    funder: "Department of Energy",
    program: "Early Career",
    status: "submitted",
    deadline: null,
    start_date: null,
    end_date: null,
    amount: 875000,
    currency: "USD",
    pi_person_id: pi,
    description: "Submitted proposal for efficient, deployable biological foundation models.",
    notes: null,
  });

  void pub1;
}
