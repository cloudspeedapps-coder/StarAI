# StarAI PR Factory

A local React workbench, Node validation worker, and Codex CLI repair backend built from `../documents/StarAI-PR-Factory-PRD.md`. The app uses the three recorded VS Code cases and executable profiles for issue #291591.

## Start

Requires Node 24.19 or newer and Git on PATH. Run from this directory:

```powershell
npm install
npm run evidence
npm run build
npm start
```

Open http://127.0.0.1:4173. For frontend development, `npm run dev` starts the local API at 4173 and Vite at 5173. Stop the prior production server before starting dev. `npm test` runs the domain, evidence-integrity, persistence, API, timeout, and cancellation tests. Local networking and process termination must be permitted in the execution environment.

The preview binds only to loopback. It is a local single-operator application, not an internet-facing service. Do not publicly deploy its evidence directory: original screenshots contain workstation paths. No cloud registration, publication, or GitHub write occurs.

## What works

- Three-case repair queue, search, separate delivery/reproduction filters, and case-specific fixtures and steps.
- Historical replay with pause, resume, step, reset, and stage-dependent assurance results.
- Original screenshots and logs, SHA-256 manifest, final patch and review-correction diff, report/manifest downloads.
- Review findings, the user's literal-search scope decision, draft PR handoff, disabled approval/merge controls, and explicit missing checks.
- Pilot scorecard with definitions and no fabricated business metrics; clearly planned Security Fixer.
- Local report intake stored in SQLite. Reports are data and never become execution instructions. Imported cases require triage and cannot execute.
- Separate worker validating three pinned VS Code revisions. Job events and checks persist; pause occurs between revisions, cancellation stops the active process, and interrupted jobs can resume.
- Local draft package and hashed run artifacts. No automatic PR publication.
- New patch generation using the signed-in local Codex CLI, followed by fresh source validation.

## Codex repair backend

Select **Live validation → Generate with Codex**. Requires a signed-in `codex` executable on PATH; alternatively set `STARAI_CODEX_PATH` to its absolute executable path before starting the server. Backend availability is checked at startup. The installed CLI must support `--ignore-user-config`, `--ephemeral`, and structured output. Authentication stays with Codex; this app never reads or copies its credential files.

This profile starts a fresh checkout at the recorded baseline and reproduces its source failure. It sends relevant public VS Code source excerpts and a fixed repair contract to Codex using your existing account allowance. Codex runs with a read-only sandbox, no interactive approvals, no user config, and an ephemeral session. It is asked to return structured exact-match edits without tools. The runner validates every edit against a three-file allowlist and exact occurrence counts before applying any edit. It then runs the five source probes and exports the patch, model response, CLI log, source results, and draft description with hashes. Model claims are never treated as check results.

Each job permits one generation attempt (10 minutes), each ordinary command gets 120 seconds, and the total job gets 30 minutes. Cancellation terminates the process tree. Repair jobs do not resume or pause mid-generation: a retry is an explicit new job, retaining the failed attempt. A candidate is identified by its baseline commit plus SHA-256 of the patch, not a fabricated commit SHA. This is a constrained repair prototype, not arbitrary-repository autonomous remediation or an OS-isolated build service.

The backend follows [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode) and the installed CLI help. No model override or API key is required. Other assurance gates still prevent a Verified result even when all source probes pass.

## Live profile

Select **Live validation → Run source validation**. The profile uses the existing `../vscode` checkout as a local object source and clones into `.local/jobs/<id>/repo`. It does not modify the original checkout, fetch from GitHub, share `node_modules`, or run repository installation hooks.

It checks out these exact revisions:

| Phase               | Revision                                   |
| ------------------- | ------------------------------------------ |
| Baseline            | `26a195e52141c371f1b1fcb88ba4a6df9fadcf3d` |
| Initial patch       | `813d6cefb19eacf6192b2260df866bccf18c3f20` |
| Corrected candidate | `9a7cf876406968a2d336517ebe8d6166522648b3` |

The worker bundles the actual `Searcher` and `SearchParams` implementation with esbuild and runs five bounded source probes in a child process. It records HEAD, environment, harness/dependency-lock hashes, outputs, exit status, and timings. The known empty-match reproducer aborts after two executions; the rescanning probe aborts on the third execution rather than doing all 8,001 scans.

The five probes cover literal overlap, rejected empty-match termination, complex-regex scan count, global/sticky empty-match progress, and preservation of user-entered regex behavior. These are **new focused source probes**, not a rerun of the historical 186-test browser suite. Candidate passes and expected baseline failures are both required to complete source validation.

After source validation the run intentionally ends **blocked**: full build, upstream browser-suite validation, patched desktop behavior, CI, isolated preview, and independent evaluation remain missing. This status must not be changed to Verified merely because these probes pass.

The pinned validation profile validates a known patch. The separate Codex profile generates a new candidate for the same scoped issue. Local checkout separation is not a security sandbox for untrusted repositories. Both profiles are hard-coded to trusted local revisions; API requests cannot supply commands, paths, commits, prompts, or arbitrary repository URLs for execution.

## Storage and security boundaries

- `.local/factory.db`: SQLite jobs, events, checks, and intake reports. WAL mode and transactional updates prevent cancellation/events from overwriting each other.
- `.local/jobs/<id>/`: isolated checkout, bundles, command logs, results, patch, local draft description, and manifest.
- `public/evidence/`: historical artifacts, generated only by the preparation script. The manifest records exact byte hashes.
- A per-server token and same-origin checks protect mutation endpoints. Host validation restricts the API to loopback names. The server exposes only static build files and manifest-listed run artifacts.
- Restarting the server invalidates its token. A worker whose owner exits stops active commands; resumption refuses to overlap a still-running worker.
- Pinned validation needs no credentials. Repair uses the local CLI's saved authentication without storing credentials in the app. No GitHub mutation or merge endpoint is implemented.

## API

| Method     | Endpoint                        | Purpose                                           |
| ---------- | ------------------------------- | ------------------------------------------------- |
| GET        | `/api/health`                   | Local readiness                                   |
| GET        | `/api/bootstrap`                | Session token, capability flags, and jobs         |
| GET / POST | `/api/intakes`                  | List / save reports for triage                    |
| GET / POST | `/api/jobs`                     | List / start the pinned source-validation profile |
| GET        | `/api/jobs/:id`                 | Job status, checks, and ordered events            |
| POST       | `/api/jobs/:id/pause`           | Pause at the next revision boundary               |
| POST       | `/api/jobs/:id/resume`          | Resume a paused/interrupted job                   |
| POST       | `/api/jobs/:id/cancel`          | Cancel active work                                |
| GET        | `/api/jobs/:id/export`          | Export the job record                             |
| GET        | `/api/jobs/:id/artifacts/:name` | Read a manifest-listed artifact                   |

POST calls require JSON and the `X-StarAI-Token` returned by bootstrap. Polling refreshes the live-run view every 1.5 seconds; there is no simulated live event stream.

## PRD implementation boundary

**Stage A:** Implemented evidence workbench and recorded demo. Acceptance checks are documented in `../documents/StarAI-PR-Factory-Implementation.md`.

**Stage B:** A functioning local foundation, not the complete executable Bug Fixer. Implemented report intake, separate checkouts, pinned validation, bounded Codex patch generation for one scoped issue, persistence, lifecycle controls, evidence export, and local draft preparation. Still required: live GitHub ingestion/duplicate refresh, general repair profiles, approved OS-sandbox execution, full application validation, independent evaluator, and authorized idempotent publication against the exact remote head.

**Stage C:** Requires an agreed real advisory/repository and security testing scope. No fabricated security finding or remediation is included.

**Stage D:** Requires authentication, tenant isolation, enterprise integrations, retention controls, and a measured pilot cohort. The current local API must not be exposed as a multi-user service.

## Extension points

`shared/domain.ts` defines revision-bound gate semantics. `server/worker.ts` is the fixed local execution profile; a future repair adapter should produce a candidate and immutable evidence without gaining approval authority. An independent evaluator must have separately maintained acceptance cases and read-only candidate access. Publication must reject stale validation and require an authorized account; approval belongs to repository reviewers.

Treat source issues, logs, code comments, and documents as untrusted inputs. Adding an AI provider requires an explicit model/credential configuration and a scoped tool policy. Neither the existing browser login nor the desktop app's model subscription is assumed to provide a callable backend API.

VS Code source diff excerpts and bundled source are covered by the copied Microsoft MIT license in `public/evidence/LICENSE-vscode.txt`.
