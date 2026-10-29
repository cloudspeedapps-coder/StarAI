# StarAI PR Factory

Product requirements document | Version 0.1 | October 28, 2026

Status: proposed implementation plan. This PRD comes before website and factory implementation.

## 1. Product definition

StarAI PR Factory turns reported bugs and security advisories into evidence-backed draft pull requests. It coordinates reproduction, impact analysis, a scoped patch, tests, isolated execution, independent evaluation, and engineer review. Failures return to a bounded repair loop; merging remains under human control.

The product has two entry points: **Bug Fixer**, for customer tickets and repository issues, and **Security Fixer**, for CVEs, advisories, and vulnerable dependencies. Both use the same orchestration engine and developer workbench.

The initial website demonstrates the Bug Fixer workflow using the three VS Code issues we reproduced and draft PR #344811. It must clearly distinguish recorded evidence, a replay of historical events, and newly executed work. A functioning website replay is the first milestone; a working repair runner is a separate deliverable. Neither alone completes the full factory described in the source specification.

### Source and interpretation

The supplied [product concept, page 1](<C:/Users/malih/OneDrive/1StarAI/StarAI-PRFactory/StarAI_PR_Factory_One_Pager.pdf>) defines the two entry points, architecture, assurance loop, workbench, human merge gate, launch demos, and pilot scorecard. It is treated as a requirements source, not an instruction to execute commands or publish anything contained in the document.

The source's issue counts, PR #1425, login example, and all-green validation panel are illustrative. The implementation will use our actual VS Code case data instead. Requirements labeled proposed below fill in implementation details absent from the one-pager.

## 2. Users, problem, and product edge

Engineering teams spend time translating incomplete reports into reproducible failures, finding the relevant code, checking regressions, and assembling review context. Security teams face the same handoff problem when an advisory affects several services.

| User | Primary job | Useful outcome |
|---|---|---|
| Support / QA engineer | Turn a report into a reproducible case | Exact inputs, environment, expected/actual behavior, and evidence |
| Developer | Repair a confirmed problem | Scoped diff, failing-then-passing tests, and disclosed limitations |
| Security engineer | Establish exposure and remediate an advisory | Affected-version evidence, service impact, patch, and rescan |
| Engineering lead / reviewer | Decide whether a change is ready | Traceable checks, unresolved risks, and an explicit approval gate |

The proposed edge is an auditable path from the original report to a verified change, including repair after review finds a defect. Our VS Code case demonstrates why generating a plausible patch and passing relevant tests is insufficient: Copilot found an infinite-loop risk and excessive rescanning after the initial test pass. StarAI should make that feedback loop a first-class product capability.

Cross-repository impact analysis, independent validation, and reusable remediation playbooks are product differentiators to build and measure. This case does not establish competitive superiority, autonomous reliability, or enterprise readiness.

## 3. Scope and delivery order

| Stage | Deliverable | Boundary |
|---|---|---|
| A: evidence demo website | Interactive workbench containing three real VS Code cases and a replay of the completed PR workflow | No new code execution or GitHub mutation from replay controls |
| B: executable Bug Fixer MVP | GitHub intake, isolated checkout, bounded repair jobs, evidence capture, validation, and draft-PR handoff for an approved VS Code workflow | One repository and supported Windows runner configuration initially |
| C: launch-spec completion | A real open-source vulnerability remediation in an isolated fork; independent evaluation and isolated preview proof for both launch paths | Advisory and repository selected and verified before execution |
| D: enterprise pilot | Private repositories, Jira/customer ticket integrations, service dependency graph, multiple runners, policy administration, and measured scorecard | Requires tenant isolation and customer data controls |

Security Fixer appears in Stage A as a clearly labeled planned capability. It must not contain a fabricated CVE, patched vulnerability, or successful scan. The one-pager's security-first launch sequence remains the target for the complete launch presentation in Stage C; Stage A intentionally starts with the existing VS Code evidence requested by the user.

Out of the initial MVP: autonomous merging, production deployment, unrestricted shell access, arbitrary repository/language support, guaranteed root-cause discovery, full static-analysis coverage, automatic legal attestations, and billing implementation.

## 4. Real case dataset

Historical evidence below was recorded October 28, 2026. Issue and PR state must be timestamped in the website; opening the demo does not refresh GitHub automatically.

| Case | Recorded reproduction | Our delivery state |
|---|---|---|
| [VS Code #196884](https://github.com/microsoft/vscode/issues/196884) | Single regex Replace with `(?<=\n)b` skipped the selected text; Replace All changed it | Reproduced; no patch by this project |
| [VS Code #291591](https://github.com/microsoft/vscode/issues/291591) | Whole-word literal search for `aa-aa` missed a valid overlapping match in `xaa-aa-aa` | Patch and regression tests; published [draft PR #344811](https://github.com/microsoft/vscode/pull/344811) |
| [VS Code #309282](https://github.com/microsoft/vscode/issues/309282) | Copy Line Down reduced three cursors to two | Reproduced with adapted cursor setup; no patch by this project |

The installed application was VS Code 1.144.0 on Windows, using the existing profile in Restricted Mode. The source checkout used for the patch was a later development revision. These are different environments. No clean-profile, extension-bisect, or cross-platform claim is supported. For #309282, keyboard selection created the cursor state instead of the reported Alt+Click method. For #291591, the reported remote SSH environment was not recreated.

Existing contributor proposals were identified for all three cases: #341940, #326447, and #312513 respectively. The workbench must disclose these historical findings and avoid presenting our work as exclusive discovery. Before a new live repair, refresh duplicates and let the operator choose evaluation, contribution to an existing proposal, or a new draft.

### #291591 evidence story

1. Reproduce the missed whole-word result with this exact fixture:

   ```text
   [1] aa-aa
   [2] xaa-aa-aa
   [3] aax-aa-aa
   ```

2. Record baseline regression failures, then the original implementation and its 182 passing related browser tests.
3. Show Copilot's two findings: rejected non-global empty matches can loop forever; overlapping retries for arbitrary regexes can cause quadratic rescanning.
4. Show the two review regressions failing before correction. Keep the empty-match reproducer bounded so replay or testing cannot hang the runner.
5. Record the user's scope decision: overlap retries apply to literal-text Find; preserve existing complex-regex behavior.
6. Show the corrected behavior: a termination guard for non-global/non-sticky regexes, literal-search metadata, and 186 passing related browser tests plus targeted lint.
7. Show the measured regression fixture changing from 8,001 regex executions to at most two. This is a count for one test, not a general speedup or a bound on arbitrary JavaScript regex evaluation.
8. Finish at the draft PR and unresolved review verification, not an approved or merged state.

Latest recorded local correction: `9a7cf876`. Recorded published head: `b00aac50ef01f2d0b8ec84e7dc163d214549713c`. Four published file blobs matched the tested local files. The local and published histories differ; file equality does not establish that the whole published head passed the local tests. A future live validation must run against the exact PR head.

Full Electron/native validation, full TypeScript typechecking, manual testing of the patched desktop build, and completed GitHub CI are not established by this evidence. Independent evaluation and isolated deployment are also not complete. These checks must appear as missing, not green.

## 5. Demo website experience

The website is a working interactive product demonstration, not just a marketing landing page. Use the source's navy, teal, and blue visual language, clear typography, and a three-column desktop workbench. On narrow screens, use a case list followed by tabbed detail panels.

### Main screens

| Screen | Required content and behavior |
|---|---|
| Overview / Repair Queue | Bug Fixer and Security Fixer entry points; three VS Code cases; filters by reproduction and delivery state; visible `Recorded demo` badge and evidence date |
| Case workbench | Report and environment on the left; workflow timeline, diff, and file list in the center; checks, risks, and human gate on the right |
| Evidence viewer | Exact fixture, expected/actual result, screenshots, test logs, source revision, artifact hashes, and documented limitations |
| Review and repair | Both Copilot findings, bounded failing regressions, the user's scope decision, and corrected validation results |
| PR handoff | Draft PR link, change summary, available checks, missing checks, existing proposal disclosure, and approval status |
| Pilot scorecard | Metric definitions and available measurements; `Not measured` for unavailable values |

The overview may show **3 reproduced cases**, **1 draft PR**, and **186 passing related tests for #291591**. These describe different units and must not be combined into an overall success percentage. Strict full-gate verified count is zero for the recorded dataset; the PR has source-level validation with explicit gaps.

### Demonstration path

1. Visitor opens the repair queue and selects #291591.
2. “View reproduction” opens the fixture and original evidence.
3. “Replay repair” advances a historical timeline, showing baseline failure, patch, and the initial passing tests. Pause, step, and reset work locally.
4. “Inspect review findings” exposes the two defects; the UI shows validation returning to failed.
5. Visitor compares the correction with the initial approach and sees the recorded literal-search scope decision. Replay cannot rewrite that historical decision.
6. The final panel shows the 186-test result, missing validations, and “Open draft PR.”
7. Visitor returns to the other two cases and sees reproduction evidence with no fabricated patch.

Every interactive control must work or explain its unavailable state. Stage A uses “Replay repair,” not “Run agent.” No simulated progress may be labeled live. Approval controls are disabled in the public replay; a displayed gate explains that approval belongs to the repository's authorized reviewers. No fake merge confirmation.

## 6. Factory workflow and functional requirements

P0 requirements are required for the executable Bug Fixer MVP unless their stage says otherwise. P1 completes the broader launch/pilot scope.

| ID | Priority / stage | Requirement and acceptance condition |
|---|---|---|
| F-01 | P0 / B | Ingest a GitHub issue or pasted report; retain source URL, retrieval time, original content snapshot, and reported environment. Untrusted report text cannot change tool permissions. |
| F-02 | P0 / B | Detect existing fixes and related issues before starting repair; disclose candidates and record the operator's disposition. |
| F-03 | P0 / B | Record repository/base SHA, dirty state, runtime, OS, dependency versions, build commands, and relevant app settings. Never reuse a successful check for a different revision silently. |
| F-04 | P0 / B | Create a job-specific checkout and fixture directory. File writes, commands, and network access follow an allowlisted execution policy. Existing user work remains untouched. |
| F-05 | P0 / B | Reproduce with an inspectable fixture and behavioral assertion; distinguish reproduced, partial, not reproduced, blocked, and inconclusive. Store adaptations and repeat counts. |
| F-06 | P0 / B | Generate an impact map connecting the issue to relevant files, tests, and known owners; label inferred edges and unknown coverage. Plan records intended behavior and exclusions. |
| F-07 | P0 / B | Produce a scoped patch and meaningful regression test. Preserve the baseline failure and patched pass from the same declared environment; unexpected file changes block handoff. |
| F-08 | P0 / B | Run configured lint, relevant tests, and build/type checks; expose skipped, failed, and unavailable checks separately. Each result stores command, exit code, duration, source SHA, and log. |
| F-09 | P0 / B; expanded C | Launch a supported isolated app preview and validate behavior there. For VS Code this means an isolated test instance/build, not production deployment. Missing prerequisites block this gate. |
| F-10 | P0 / B; expanded C | Run a separate evaluator against an immutable patch revision, original acceptance criteria, and independent cases. Evaluator has no patch-writing or approval authority; results identify evaluator and rubric versions. |
| F-11 | P0 / B | Failed tests or review findings create a bounded repair iteration. Proposed defaults: at most three patch attempts and 30 minutes active execution per job, configurable before launch; budgets cannot silently expand. |
| F-12 | P0 / B | Support pause, cancel, and restart from a verified checkpoint; lost runner heartbeat marks execution unknown, never passed. Authentication handoffs preserve progress without storing credentials in logs. |
| F-13 | P0 / B | Prepare or update a draft PR with issue, diff, tests, CI state, evaluation, preview evidence, limitations, and risks. Use the authorized account, verify the published head, and prevent duplicate submissions on retry. |
| F-14 | P0 / B | Import review findings and connect them to failing tests, scope decisions, revisions, and rerun results. Do not mark a reviewer thread resolved solely because a patch was generated. |
| F-15 | P0 / B | Require an authorized engineer's approval of the exact revision before merge. Approval expires when that revision changes; repository branch protections remain authoritative. |
| F-16 | P1 / C | Security intake validates advisory ID, affected and fixed versions, dependency path, and repo exposure before patching; post-patch behavior and advisory checks both run. |
| F-17 | P1 / D | Extend impact analysis across repositories and services with evidence-backed dependency edges and named owners; unknown dependencies remain visible. |
| F-18 | P0 / A-B | Export a readable report plus machine-readable manifest linking source, environment, attempts, checks, decisions, patch, and PR. Missing artifacts must be explicit. |

### State and gate semantics

Execution stages are `intake -> triage -> reproduce -> plan -> patch -> test -> preview -> validate -> evaluate -> draft PR -> human review -> merge observed`. Failed assurance returns to plan/patch within budget. Any stage can pause, be blocked, be canceled, or fail with a reason.

Store reproduction outcome, execution state, and PR state separately. A case can simultaneously be reproduced, blocked on native validation, and have a published draft. A historical draft may exist before strict readiness gates pass; its existence is not a verification claim.

Each check has `pending`, `running`, `pass`, `fail`, `blocked`, `not run`, or `not applicable`. “Not applicable” requires a policy reason. A job is **Verified** only when every required gate for its declared profile passes on the same candidate revision, independent evaluation is complete, and no blocking finding remains. Proposed changes to required gates require a recorded policy decision.

## 7. Independent assurance and evaluation

The patch author must not be the sole judge of correctness. Separation requires an evaluator task with read-only access to the candidate, frozen acceptance criteria, independently maintained regression cases, and its own result record. A second model giving a positive opinion is insufficient.

The evaluator checks: original symptom resolution, regression behavior, scope compliance, dependency/security impact where applicable, reproducibility of evidence, and unmet validations. Findings carry severity and links to proof. Blocking failures cannot be averaged away by a high score.

Proposed evaluation score: the percentage of applicable rubric checks that pass, displayed alongside coverage and blockers. Pending checks remain visible; a score cannot unlock a gate. The recorded VS Code demo has no such independent score, so it displays `Not evaluated` rather than inventing a number. Risk remains `Unassessed` unless a documented rubric is actually applied.

## 8. Proposed implementation architecture

Use a TypeScript/React frontend with a shared domain schema and evidence-backed demo fixtures. Keep the replay controller independent of execution adapters so a polished demo cannot accidentally execute repository commands. Begin with a local web app and documented startup command; public hosting is a later deployment step.

The executable MVP adds a Node/TypeScript API, persistent job/event storage, and a separate worker process. SQLite is sufficient for a local single-operator pilot; migrate to a multi-tenant database and artifact store before enterprise service deployment. The browser never receives GitHub tokens or runs shell commands directly.

Orchestration components:

- Intake and triage normalize reports, check duplicates, and assemble scope evidence.
- Planner identifies code and tests and proposes permitted changes.
- Repair worker edits only the isolated checkout and records patch iterations.
- Runner executes approved commands and app workflows with process timeouts and cancellation.
- Validator and independent evaluator produce separate assurance records.
- Publisher prepares draft PRs and checks remote revisions; human review remains a distinct gate.

These are logical roles; they need not all be separate model calls. Persist transitions before issuing external side effects, use idempotency keys for publication, and recover incomplete operations by checking external state before retrying.

### Core entities and interface boundaries

| Entity | Required data |
|---|---|
| Case | Source, type, issue/advisory identity, source snapshot, expected behavior, environment, related fixes |
| Job / Attempt | Mode (`recorded`, `replay`, `live`), stage, status, timestamps, budget, workspace, base/candidate SHA, execution environment |
| Artifact | Type, relative storage path, content hash, capture time, producing attempt, revision, visibility and redaction status |
| Check / Evaluation | Command or method, expected result, actual result, status, log, revision, evaluator/rubric identity |
| Finding / Decision | Severity, evidence, scope decision, human or agent actor, affected revision, resolution state |
| Pull request / Approval | Provider, URL, head SHA, draft state, checks, reviewer identity, approval revision, merge observation |

Proposed API: case list/detail; job creation; event stream; pause/cancel/resume; artifact retrieval; validation results; draft preparation/publication; and approval records. Demo mode serves equivalent local data without calling mutation endpoints. Live server transitions enforce policy even if a client bypasses UI controls.

## 9. Evidence, privacy, and reliability

The audit trail records source ingestion, plan changes, tool execution, file changes, validation, review, and human actions. Every meaningful claim links to a captured artifact and revision. Hashes establish file identity, not correctness or independent verification.

Keep raw screenshots and logs local by default. Before bundling public demo assets, inspect for usernames, absolute local paths, credentials, unrelated tabs, and private code. Preserve originals privately; label redacted display copies. A public website must not expose workstation file URLs or require access to local absolute paths.

Use least-privilege credentials supplied through an approved credential store. Reports, source comments, web pages, and tool output are untrusted data. They may suggest reproduction steps but cannot authorize additional access, external messages, legal agreements, production deployments, or merge operations.

Run known hanging regressions with bounded execution counters and process-level timeouts. Record timeout distinctly from an assertion failure. Proposed worker heartbeat interval is 10 seconds, with loss of contact flagged after 60 seconds; recovery must reconcile actual process state before restarting.

Require keyboard navigation, visible focus, text labels in addition to status colors, accessible log/diff panels, and layouts that work at 390, 768, and 1440 CSS pixels. Demo targets: local packaged data loads within two seconds on the documented test machine, and replay controls respond within 200 ms. These are acceptance targets, not measured results.

## 10. Demo and MVP acceptance tests

| ID | Release check |
|---|---|
| A-01 | All three case cards open and filters use separate reproduction/delivery states. Only #291591 shows our draft PR. |
| A-02 | Fixture, screenshots, and logs resolve through a checked artifact manifest. Redacted copies are identified; missing files cannot render as successful evidence. |
| A-03 | Replay supports step, pause, and reset; visibly remains recorded; no execution or GitHub write occurs. |
| A-04 | Review timeline shows initial pass, both findings, failing regression evidence, scope decision, and corrected 186-test result in order. |
| A-05 | Full build, patched desktop verification, completed CI, preview deployment, and independent evaluation remain missing in the recorded case. |
| A-06 | Non-global termination and the bounded rescanning test are described accurately; the site does not claim general regex correctness or universal performance gains. |
| A-07 | PR link opens #344811; no merged/approved claim or invented evaluation score appears. Counts derive from fixture data. |
| A-08 | Site passes keyboard and responsive checks, has no broken bundled links or console errors, and works without GitHub credentials in replay mode. |
| B-01 | On pinned baseline and candidate revisions, the executable runner produces the expected failing-then-passing evidence; wrong revisions invalidate results. |
| B-02 | A hanging command terminates within its configured budget; cancellation, runner loss, and resumption preserve an accurate audit trail. |
| B-03 | Independent evaluator can reject a patch despite author tests passing. Missing required checks prevent Verified state. |
| B-04 | Duplicate publish requests create at most one draft; a changed head invalidates previous readiness/approval. |
| B-05 | A supported isolated app preview proves behavior on the candidate, or the job remains explicitly blocked. |
| C-01 | A real advisory is shown to affect a selected open-source target, repaired in an isolated fork, rescanned, independently evaluated, and delivered as a draft with engineer review. |

Stage A is complete only after interaction and content checks pass against the bundled evidence. Stage B is complete only after an actual runner job produces its own artifacts. A mock event stream cannot satisfy B or C.

## 11. Pilot scorecard and commercial hypothesis

| Metric | Definition |
|---|---|
| Time to verified PR | Intake to strict Verified state and available draft; show active execution and blocked/human waiting time separately |
| Fix acceptance | Maintainer-accepted patches divided by submitted eligible patches in a fixed cohort; drafts and pending decisions reported separately |
| Evaluation pass rate | First-attempt and eventual independent gate pass rates, reported separately with denominators |
| Regression rate | Verified patches with a subsequently confirmed introduced regression, within a declared observation window |
| Post-merge findings | Confirmed findings per merged patch within the same observation window; no merged cohort means not measurable |
| Human effort and cost | Operator interventions, active reviewer minutes, model/tool/runner cost per completed outcome |

Do not infer these rates from three selected cases or a single unmerged PR. Establish a predeclared pilot case set, include blocked and unsuccessful jobs, and measure before setting commercial SLAs.

The source proposes an enterprise pilot followed by subscription plus usage-based pricing per verified outcome. Pricing, billing events, rework treatment, and acceptance criteria remain product decisions. Reusable playbooks may use only material permitted by customer agreements and data rights; private customer code is not a default research asset.

## 12. Implementation milestones and unresolved decisions

1. **PRD and evidence contract:** this document; source map; exact historical claims and missing gates.
2. **Website demo:** implement the responsive workbench, case fixture schema, evidence viewer, replay, and review-to-correction story. Verify all A checks before sharing.
3. **Executable vertical slice:** add the isolated VS Code runner and persistence, repeat #291591 on pinned revisions, and generate a local draft package before any new external publication.
4. **Assurance and publication:** complete isolated preview, independent evaluation, exact-head checks, review repair, and human-gated draft handoff.
5. **Security launch case and pilot:** select a permitted advisory/repository, complete C-01, then evaluate broader repositories and integrations.

Defaults for the next implementation are a local-first demo, the supplied visual style, public VS Code case data, no required sign-in for replay, and no live execution on page load. No new external PR is necessary to build the demo.

Decisions to settle before their dependent milestones: hosting destination and audience; the first real security advisory; enterprise deployment/retention model; owners of independent evaluation cases; allowed runner commands and credentials; and the policy defining a chargeable verified outcome. None blocks building Stage A.

## 13. Evidence references and specification coverage

Local records are historical sources, not claims that GitHub's current state has been refreshed:

- [Bug reproduction PRD](BugReproduce.prd): original reproduction requirements and environment limitations.
- [Three-case reproduction report](../qa/vscode-2026-10-28-batch2/VSCode-Bug-Reproduction-Report.md): steps, expected/actual behavior, controls, and screenshots.
- [Delivery record](VSCode-291591-Delivery.md): publication and subsequent Copilot corrections; correction section supersedes initial validation counts.
- [Revised PR description](VSCode-291591-PR.md): final literal-search scope and validation limitations.
- [Review correction validation log](../qa/vscode-2026-10-28-batch2/review-fix-validation.log): failing review regressions and corrected results.

| One-pager requirement | PRD coverage |
|---|---|
| Security Fixer + Bug Fixer | Sections 1, 3, 6; security case is required for full launch completion |
| Intake, graph, orchestration, human gate | Sections 6 and 8 |
| Reproduce through evaluate; fail/repatch loop | Sections 6 and 7 |
| Repair queue, diff, validation workbench | Section 5 |
| Independent evaluation and audit trail | Sections 7 and 9 |
| Isolated deployment and behavioral validation | F-09, B-05, C-01 |
| Vulnerability demo and customer issue-to-PR | Sections 3, 4, 10, 12; public reported bugs seed the initial demo |
| Pilot metrics and commercial path | Section 11 |

The existing BugReproduce.prd remains the reproduction module's specification. This document extends it into the proposed repair factory and demo website without changing the historical test results.
