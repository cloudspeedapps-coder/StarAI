export type CheckStatus = "pass" | "fail" | "not run" | "blocked" | "running";
export interface Evidence {
  name: string;
  url: string;
  sha256: string;
  bytes: number;
  kind: "image" | "text";
  provenance: string;
}
export interface CaseRecord {
  id: number;
  title: string;
  area: string;
  summary: string;
  delivery: "Draft PR" | "Reproduced only";
  expected: string;
  actual: string;
  fixture: string;
  attempts: string;
  adaptation: string;
  existingPR: number;
  steps: string[];
  screenshots: string[];
}
export interface Event {
  id: number;
  at: string;
  stage: string;
  message: string;
}
export interface Result {
  name: string;
  status: CheckStatus;
  detail: string;
  revision: string;
  durationMs?: number;
  artifact?: string;
}
export type JobStatus =
  | "queued"
  | "running"
  | "paused"
  | "canceled"
  | "blocked"
  | "failed"
  | "interrupted";
export interface Job {
  id: string;
  caseId: number;
  profile: string;
  mode: "live";
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  checkpoint: number;
  candidate: string;
  checks: Result[];
  events: Event[];
  request: "pause" | "cancel" | null;
  reason: string;
  manifest?: Evidence[];
  workerPid?: number;
  activeMs?: number;
}
export const revision = {
  base: "26a195e52141c371f1b1fcb88ba4a6df9fadcf3d",
  initial: "813d6cefb19eacf6192b2260df866bccf18c3f20",
  candidate: "9a7cf876406968a2d336517ebe8d6166522648b3",
  published: "b00aac50ef01f2d0b8ec84e7dc163d214549713c",
};
export const requiredGates = [
  "Regression tests",
  "Full build",
  "Patched desktop behavior",
  "GitHub CI",
  "Independent evaluation",
  "Isolated preview",
];
export function isVerified(
  checks: Result[],
  head: string,
  blockingFindings: number,
) {
  return (
    blockingFindings === 0 &&
    requiredGates.every((name) =>
      checks.some(
        (c) => c.name === name && c.status === "pass" && c.revision === head,
      ),
    )
  );
}
export function canResume(status: JobStatus) {
  return ["paused", "interrupted"].includes(status);
}
