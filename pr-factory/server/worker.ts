import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import os from "node:os";
import { build } from "esbuild";
import { Store } from "./store.ts";
import { runCommand } from "./process.ts";
import { revision } from "../shared/domain.ts";
import type { Evidence } from "../shared/domain.ts";
import { generateRepair, repairProfile } from "./codex.ts";
const appRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const localRoot = path.resolve(
  process.env.STARAI_DATA_DIR || path.join(appRoot, ".local"),
);
const id = process.argv[2];
if (!/^[a-f0-9-]{36}$/.test(id)) throw Error("Invalid job");
const store = new Store(localRoot),
  jobRoot = path.join(localRoot, "jobs", id),
  repo = path.join(jobRoot, "repo");
await fs.mkdir(jobRoot, { recursive: true });
const controller = new AbortController();
const repair = store.get(id)?.profile === repairProfile;
const started = Date.now();
const previousActiveMs = store.get(id)?.activeMs || 0;
let heartbeat = Date.now(),
  ownerGone = false;
const poll = setInterval(() => {
  const owner = Number(process.env.STARAI_PARENT_PID);
  if (owner) {
    try {
      process.kill(owner, 0);
    } catch {
      ownerGone = true;
      controller.abort();
    }
  }
  const j = store.get(id);
  if (
    j?.request === "cancel" ||
    previousActiveMs + Date.now() - started > 30 * 60 * 1000
  )
    controller.abort();
  if (Date.now() - heartbeat > 10000) {
    store.update(id, (j) => {
      j.activeMs = previousActiveMs + Date.now() - started;
    });
    heartbeat = Date.now();
  }
}, 500);
async function command(
  exe: string,
  args: string[],
  cwd: string,
  logName: string,
) {
  const r = await runCommand(exe, args, cwd, {
    signal: controller.signal,
    timeoutMs: 120000,
  });
  await fs.writeFile(
    path.join(jobRoot, logName),
    `Command: ${path.basename(exe)} ${args.join(" ")}\nExit: ${r.code}; duration: ${r.durationMs}ms; timed out: ${r.timedOut}\n${r.output}`,
  );
  if (controller.signal.aborted)
    throw Error("Run canceled or execution budget exhausted");
  if (r.timedOut) throw Error("Process exceeded its 120-second budget");
  return r;
}
async function checkpoint() {
  const j = store.get(id)!;
  if (j.request === "cancel") throw Error("Run canceled");
  if (j.request === "pause") {
    store.update(id, (j) => {
      j.status = "paused";
      j.request = null;
      j.reason = "Paused at a revision boundary.";
    });
    return false;
  }
  return true;
}
try {
  store.update(id, (j) => {
    j.status = "running";
    j.reason = "";
  });
  const source = path.resolve(appRoot, "../vscode");
  const sourceStatus = await command(
    "git",
    ["status", "--short"],
    source,
    "source-status.log",
  );
  const lock = await fs.readFile(path.join(appRoot, "package-lock.json"));
  const harness = await fs.readFile(path.join(appRoot, "server/probe.mjs"));
  await fs.writeFile(
    path.join(jobRoot, "environment.json"),
    JSON.stringify(
      {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        osRelease: os.release(),
        profile: store.get(id)!.profile,
        revisions: revision,
        sourceDirty: sourceStatus.output.trim().length > 0,
        appDependencyLockSha256: createHash("sha256")
          .update(lock)
          .digest("hex"),
        probeSha256: createHash("sha256").update(harness).digest("hex"),
        limits: {
          attempts: repair ? 1 : 3,
          jobMinutes: 30,
          commandSeconds: 120,
          generationSeconds: repair ? 600 : 0,
        },
        isolation: "Separate local checkout; not an OS sandbox",
      },
      null,
      2,
    ),
  );
  store.event(
    id,
    "Environment",
    `Node ${process.version}; ${process.platform}/${process.arch}. ${repair ? "Fresh Codex repair; one generation attempt, read-only CLI with structured edits applied by runner." : "Pinned source validation; no model call."} Browser suite and desktop launch are not included.`,
  );
  try {
    await fs.access(path.join(repo, ".git"));
  } catch {
    store.event(
      id,
      "Checkout",
      "Creating a job-specific checkout of the local VS Code repository.",
    );
    const clone = await command(
      "git",
      ["clone", "--shared", "--no-checkout", source, repo],
      appRoot,
      "clone.log",
    );
    if (clone.code !== 0)
      throw Error("Local repository clone failed; see clone.log");
  }
  const phases = repair
    ? [
        ["baseline", revision.base],
        ["candidate", revision.base],
      ]
    : [
        ["baseline", revision.base],
        ["initial", revision.initial],
        ["candidate", revision.candidate],
      ];
  for (let i = store.get(id)!.checkpoint; i < phases.length; i++) {
    if (!(await checkpoint())) break;
    let [phase, sha] = phases[i];
    store.event(
      id,
      phase,
      `Checking pinned ${phase} revision ${sha.slice(0, 8)}.`,
    );
    const checkout = await command(
      "git",
      ["-c", "core.longpaths=true", "checkout", "--detach", sha],
      repo,
      phase + "-checkout.log",
    );
    if (checkout.code !== 0) throw Error("Checkout failed");
    const actual = await command(
      "git",
      ["rev-parse", "HEAD"],
      repo,
      phase + "-head.log",
    );
    if (actual.output.trim() !== sha)
      throw Error("Revision mismatch; check results invalidated");
    if (repair && phase === "candidate") {
      store.event(
        id,
        "Generate",
        "Codex is proposing a new patch. One attempt, maximum 10 minutes; uses your signed-in Codex account.",
      );
      const summary = await generateRepair(repo, jobRoot, controller.signal);
      const patch = await command(
        "git",
        ["diff", "--no-ext-diff", "--no-textconv", "HEAD"],
        repo,
        "generated-diff.log",
      );
      if (patch.code !== 0 || !patch.output.trim())
        throw Error("No generated patch available");
      await fs.writeFile(path.join(jobRoot, "candidate.patch"), patch.output);
      sha =
        revision.base +
        "+patch:" +
        createHash("sha256").update(patch.output).digest("hex");
      store.update(id, (j) => {
        j.candidate = sha;
      });
      await fs.writeFile(path.join(jobRoot, "generation-summary.md"), summary);
      store.event(
        id,
        "Candidate",
        "Scoped structured edits applied. Fresh source probes are running; the model's summary is not validation evidence.",
      );
    }
    const entry = path.join(jobRoot, "entry.ts"),
      bundle = path.join(jobRoot, phase + ".mjs");
    await fs.writeFile(
      entry,
      `export { Searcher, SearchParams } from ${JSON.stringify(path.join(repo, "src/vs/editor/common/model/textModelSearch.ts"))};`,
    );
    await build({
      entryPoints: [entry],
      outfile: bundle,
      bundle: true,
      platform: "node",
      format: "esm",
      target: "node24",
      logLevel: "silent",
      tsconfig: path.join(repo, "src/tsconfig.json"),
    });
    const r = await command(
      process.execPath,
      [path.join(appRoot, "server/probe.mjs"), bundle],
      jobRoot,
      phase + "-probes.log",
    );
    if (r.code !== 0 && r.code !== 1)
      throw Error("Probe runner failed before valid assertions");
    const data = JSON.parse(r.output) as {
      results: { name: string; status: "pass" | "fail"; detail: string }[];
    };
    await fs.writeFile(
      path.join(jobRoot, phase + "-results.json"),
      JSON.stringify(
        {
          revision: sha,
          scope: "Source probes only",
          durationMs: r.durationMs,
          ...data,
        },
        null,
        2,
      ),
    );
    for (const check of data.results)
      store.result(id, {
        ...check,
        name: phase + " · " + check.name,
        revision: sha,
        durationMs: r.durationMs,
        artifact: phase + "-results.json",
      });
    store.event(
      id,
      phase,
      `${data.results.filter((r) => r.status === "pass").length}/${data.results.length} source probes passed. ${phase === "candidate" ? "Other assurance gates remain unverified." : "Failures are preserved as baseline evidence."}`,
    );
    store.update(id, (j) => {
      j.checkpoint = i + 1;
    });
  }
  if (store.get(id)!.checkpoint === phases.length) {
    const candidateIdentity = store.get(id)!.candidate;
    const diff = await command(
      "git",
      repair
        ? ["diff", "--no-ext-diff", "--no-textconv", "HEAD"]
        : ["diff", "--no-ext-diff", revision.base, revision.candidate],
      repo,
      "patch.log",
    );
    await fs.writeFile(path.join(jobRoot, "candidate.patch"), diff.output);
    const checks = store.get(id)!.checks;
    const candidateChecks = checks.filter(
      (c) => c.revision === candidateIdentity,
    );
    const packageText = `# Local draft package for VS Code #291591\n\nCandidate: ${candidateIdentity}\n\n${repair ? "New Codex-generated candidate" : "Known recorded patch"}: ${candidateChecks.filter((c) => c.status === "pass").length}/${candidateChecks.length} bounded source probes passed.\n\nHistorical draft: https://github.com/microsoft/vscode/pull/344811\nExisting proposal: https://github.com/microsoft/vscode/pull/326447\n\n## Missing gates\n\nUpstream browser suite, full build, patched desktop behavior, GitHub CI, independent evaluation, and isolated preview are not run. Local checkout separation is not an OS security sandbox. No new PR was published.\n`;
    await fs.writeFile(path.join(jobRoot, "draft-pr.md"), packageText);
    const manifest: Evidence[] = [];
    for (const name of await fs.readdir(jobRoot)) {
      if (!/\.(log|json|patch|md)$/.test(name)) continue;
      const bytes = await fs.readFile(path.join(jobRoot, name));
      manifest.push({
        name,
        url: `/api/jobs/${id}/artifacts/${name}`,
        kind: "text",
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        provenance: "Fresh local worker output",
      });
    }
    await fs.writeFile(
      path.join(jobRoot, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    const expectedFailures = repair
      ? ["baseline · Literal overlap"]
      : [
          "baseline · Literal overlap",
          "initial · Rejected empty match terminates",
          "initial · Complex regex scan budget",
        ];
    const baselineConfirmed = expectedFailures.every((name) =>
      checks.some((c) => c.name === name && c.status === "fail"),
    );
    store.update(id, (j) => {
      j.manifest = manifest;
      j.status =
        candidateChecks.length !== 5 ||
        candidateChecks.some((c) => c.status === "fail") ||
        !baselineConfirmed
          ? "failed"
          : "blocked";
      j.reason =
        j.status === "failed"
          ? "Candidate checks or expected baseline failure contract did not match. Inspect the run artifacts."
          : "Source validation completed. Native preview, full checks, and independent evaluation are still required.";
    });
    store.event(
      id,
      "Handoff",
      "Local draft package and hashed artifacts are ready. No publication or merge occurred.",
    );
  }
} catch (e) {
  store.update(id, (j) => {
    j.status = ownerGone
      ? "interrupted"
      : j.request === "cancel"
        ? "canceled"
        : "failed";
    j.reason = ownerGone
      ? "Server connection lost. Resume at the last completed revision boundary."
      : e instanceof Error
        ? e.message
        : String(e);
    j.request = null;
  });
  store.event(id, "Stopped", store.get(id)!.reason);
} finally {
  clearInterval(poll);
  store.update(id, (j) => {
    j.activeMs = previousActiveMs + Date.now() - started;
  });
  // Failed, paused and canceled attempts also retain inspectable evidence.
  try {
    const manifest: Evidence[] = [];
    for (const name of await fs.readdir(jobRoot)) {
      if (name === "manifest.json" || !/[.](log|json|patch|md|txt)$/.test(name))
        continue;
      const bytes = await fs.readFile(path.join(jobRoot, name));
      manifest.push({
        name,
        url: `/api/jobs/${id}/artifacts/${name}`,
        kind: "text",
        bytes: bytes.length,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        provenance: "Fresh local worker output",
      });
    }
    await fs.writeFile(
      path.join(jobRoot, "manifest.json"),
      JSON.stringify(manifest, null, 2),
    );
    store.update(id, (j) => {
      j.manifest = manifest;
    });
  } finally {
    store.close();
  }
}
