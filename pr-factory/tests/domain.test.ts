import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { isVerified, requiredGates, canResume } from "../shared/domain.ts";
import { Store } from "../server/store.ts";
import { runCommand } from "../server/process.ts";
import type { Job, Result } from "../shared/domain.ts";
test("Verification rejects missing gates, stale heads, and blocking findings", () => {
  const checks: Result[] = requiredGates.map((name) => ({
    name,
    status: "pass",
    revision: "head1",
    detail: "",
  }));
  assert.equal(isVerified(checks, "head1", 0), true);
  assert.equal(isVerified(checks.slice(1), "head1", 0), false);
  assert.equal(isVerified(checks, "head2", 0), false);
  assert.equal(isVerified(checks, "head1", 1), false);
  assert.equal(
    isVerified(
      [...checks.slice(1), { ...checks[0], status: "not run" }],
      "head1",
      0,
    ),
    false,
  );
});
test("Completed and failed jobs cannot silently resume", () => {
  for (const s of [
    "blocked",
    "failed",
    "canceled",
    "running",
    "queued",
  ] as const)
    assert.equal(canResume(s), false);
  assert.equal(canResume("paused"), true);
  assert.equal(canResume("interrupted"), true);
});
test("Evidence manifest matches bytes and contains the final correction, not an initial-only patch", async () => {
  const root = path.resolve("public/evidence"),
    manifest = JSON.parse(
      await readFile(path.join(root, "manifest.json"), "utf8"),
    );
  assert.equal(manifest.visibility, "local-only");
  assert.ok(manifest.files.length >= 20);
  for (const f of manifest.files) {
    const bytes = await readFile(path.join(root, f.name));
    assert.equal(bytes.length, f.bytes, f.name);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      f.sha256,
      f.name,
    );
  }
  const patch = await readFile(path.join(root, "final.patch"), "utf8");
  assert.match(patch, /isLiteralSearch/);
  assert.match(patch, /!this\._searchRegex\.global/);
});
test("SQLite persists job events, checkpoints and cancellation without overwriting each other", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "starai-store-"));
  const store = new Store(dir),
    now = new Date().toISOString();
  try {
    const j: Job = {
      id: "test",
      caseId: 291591,
      profile: "test",
      mode: "live",
      status: "running",
      createdAt: now,
      updatedAt: now,
      checkpoint: 0,
      candidate: "head",
      checks: [],
      events: [],
      request: null,
      reason: "",
    };
    store.save(j);
    store.event("test", "start", "Test started");
    store.update("test", (j) => {
      j.request = "cancel";
    });
    store.result("test", {
      name: "probe",
      status: "fail",
      revision: "head",
      detail: "expected",
    });
    assert.equal(store.get("test")?.request, "cancel");
    assert.equal(store.get("test")?.events.length, 1);
    store.close();
    const reopened = new Store(dir);
    assert.equal(reopened.get("test")?.checks[0].status, "fail");
    reopened.close();
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("A hanging process is terminated by its budget", async () => {
  const r = await runCommand(
    process.execPath,
    ["-e", "setInterval(()=>{},1000)"],
    process.cwd(),
    { timeoutMs: 200 },
  );
  assert.equal(r.timedOut, true);
  assert.notEqual(r.code, 0);
  assert.ok(r.durationMs < 10000);
});
test("Cancel stops a running process and does not mark a timeout", async () => {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 150);
  const r = await runCommand(
    process.execPath,
    ["-e", "setInterval(()=>{},1000)"],
    process.cwd(),
    { timeoutMs: 10000, signal: controller.signal },
  );
  assert.equal(r.timedOut, false);
  assert.notEqual(r.code, 0);
});
