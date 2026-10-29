import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(root, "../qa/vscode-2026-10-28-batch2");
const dest = path.join(root, "public/evidence");
await fs.mkdir(dest, { recursive: true });
const manifest = [];
async function add(name, bytes, provenance) {
  await fs.writeFile(path.join(dest, name), bytes);
  manifest.push({
    name,
    url: "/evidence/" + encodeURIComponent(name),
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    kind: name.endsWith(".png") ? "image" : "text",
    provenance,
  });
}
for (const name of await fs.readdir(path.join(source, "evidence")))
  if (name.endsWith(".png"))
    await add(
      name,
      await fs.readFile(path.join(source, "evidence", name)),
      "Original desktop capture · local-only · contains workstation paths",
    );
for (const name of [
  "whole-word.txt",
  "lookbehind.txt",
  "multicursor.txt",
  "lookbehind-after-replace-all.txt",
  "fix-baseline-tests.log",
  "fix-validation.log",
  "review-fix-validation.log",
  "VSCode-Bug-Reproduction-Report.md",
  "observations.json",
  "public-issues.json",
])
  await add(
    name,
    await fs.readFile(path.join(source, name)),
    "Historical local record · 2026-10-28",
  );
const repo = path.resolve(root, "../vscode");
for (const [name, from, to] of [
  ["final.patch", "26a195e5", "9a7cf876"],
  ["review-correction.patch", "813d6cef", "9a7cf876"],
])
  await add(
    name,
    execFileSync("git", ["-C", repo, "diff", "--no-ext-diff", from, to], {
      maxBuffer: 4e6,
    }),
    "Generated from pinned local Git revisions · not the remote PR diff",
  );
await add(
  "LICENSE-vscode.txt",
  await fs.readFile(path.join(repo, "LICENSE.txt")),
  "Microsoft VS Code source license",
);
await fs.writeFile(
  path.join(dest, "manifest.json"),
  JSON.stringify(
    { capturedAt: "2026-10-28", visibility: "local-only", files: manifest },
    null,
    2,
  ),
);
console.log(
  `Prepared ${manifest.length} evidence artifacts; SHA-256 manifest written.`,
);
