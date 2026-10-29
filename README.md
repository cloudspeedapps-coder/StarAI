# StarAI

StarAI PR Factory is a local developer workbench for reproducing bugs, inspecting evidence, generating scoped candidate fixes with Codex CLI, and preparing changes for human review.

## Run the app

Requires Node 24.19+ and Git. From this repository:

```powershell
cd pr-factory
npm ci
npm run build
npm start
```

Open http://127.0.0.1:4173. Keep the terminal running while using the app.

The recorded demo works from the committed evidence assets. Do not run `npm run evidence` on a fresh clone: that maintenance command rebuilds the historical fixture set from the original workstation's QA archive, which is intentionally excluded from this repository.

Live validation and repair additionally require the prepared VS Code checkout at `./vscode`, with the pinned revisions listed in [the app README](pr-factory/README.md). That nested checkout is not included here. Codex generation requires a locally signed-in Codex CLI; credentials and job databases are never committed.

## Included

- React repair queue, three VS Code cases, historical replay, review findings and evidence viewer.
- SQLite-backed local API, bounded validation jobs, cancellation and artifact hashes.
- Scoped Codex CLI repair backend and draft-package export.
- [Product requirements](documents/StarAI-PR-Factory-PRD.md) and [implementation evidence](documents/StarAI-PR-Factory-Implementation.md).

Run `npm test` from `pr-factory` after building. This is a local single-operator prototype; full application checks, independent evaluation, general repository support and automatic PR publication are not implemented. Source-check passes do not mark a repair fully verified.

This repository is private. Historical screenshots and logs contain workstation paths; review and redact them before making the repository or static assets public. The VS Code source excerpts retain their [upstream license](pr-factory/public/evidence/LICENSE-vscode.txt).
