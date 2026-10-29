import test from "node:test";
import assert from "node:assert/strict";
import { allowedFiles, validateEdits } from "../server/codex.ts";

test("Codex edits fail closed on traversal, ambiguous matches, empty patches and malformed responses", () => {
  const file = allowedFiles[0],
    sources = new Map([[file, "one two one"]]);
  const edit = { path: file, before: "one", after: "three", occurrences: 2 };
  const response = (edits: unknown) => ({ summary: "test", edits });
  assert.equal(
    validateEdits(response([edit]), sources).files.get(file),
    "three two three",
  );
  assert.equal(sources.get(file), "one two one");
  assert.throws(() =>
    validateEdits(response([{ ...edit, path: "../outside.ts" }]), sources),
  );
  assert.throws(() =>
    validateEdits(response([{ ...edit, occurrences: 1 }]), sources),
  );
  assert.throws(() =>
    validateEdits(response([{ ...edit, before: "" }]), sources),
  );
  assert.throws(() =>
    validateEdits(response([{ ...edit, after: "one" }]), sources),
  );
  assert.throws(() => validateEdits(response([]), sources));
  assert.throws(() => validateEdits(null, sources));
  assert.throws(() =>
    validateEdits(response([edit, { ...edit, before: "missing" }]), sources),
  );
  assert.equal(
    sources.get(file),
    "one two one",
    "All edits are validated before any file write",
  );
});
