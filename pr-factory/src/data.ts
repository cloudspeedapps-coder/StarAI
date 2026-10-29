import type { CaseRecord } from "../shared/domain.ts";
export const cases: CaseRecord[] = [
  {
    id: 291591,
    title: "Whole-word Find skips valid matches",
    area: "Editor · Search",
    summary:
      "A valid overlapping occurrence disappears when Match Whole Word is enabled.",
    delivery: "Draft PR",
    expected:
      "Three whole-word matches, including the trailing aa-aa on line 2.",
    actual:
      "Only two matches are highlighted, on lines 1 and 3. Turning whole-word off restores three matches.",
    fixture: "[1] aa-aa\n[2] xaa-aa-aa\n[3] aax-aa-aa",
    attempts:
      "Two whole-word-on observations, separated by an off-mode control.",
    adaptation:
      "Local file; the reported remote SSH environment was not recreated.",
    existingPR: 326447,
    steps: [
      "Open the exact fixture in VS Code 1.144.0.",
      "Find aa-aa with regex and whole-word disabled. Observe 3 matches.",
      "Enable Match Whole Word. Observe 2 matches; line 2 is omitted.",
      "Toggle whole-word off and on. The count returns to 3, then 2.",
    ],
    screenshots: [
      "291591-whole-word-off.png",
      "291591-whole-word-on.png",
      "291591-whole-word-repeat.png",
    ],
  },
  {
    id: 196884,
    title: "Single Replace skips a regex match",
    area: "Editor · Replace",
    summary:
      "A newline lookbehind matches text, but single Replace moves on without changing it.",
    delivery: "Reproduced only",
    expected:
      "Single Replace changes the selected b to BBB and reduces the match count.",
    actual:
      "Two clicks advance through matches without changing text. Replace All correctly changes all three.",
    fixture:
      "a-b-c\na-b-d\na-b-e\na-c-d\na-c-e\na-d-e\nb-c-d\nb-c-e\nb-d-e\nc-d-e",
    attempts:
      "Two successive matches in one document session; one Replace All control.",
    adaptation:
      "Existing user profile. No clean-profile or application-restart comparison.",
    existingPR: 341940,
    steps: [
      "Open the fixture and press Ctrl+H.",
      "Search (?<=\\n)b with regex on and whole-word off; replace with BBB.",
      "Click single Replace twice. Text stays unchanged while selection moves.",
      "Use Replace All as a control. All three matching lines change.",
    ],
    screenshots: [
      "196884-before.png",
      "196884-single-replace.png",
      "196884-single-replace-repeat.png",
      "196884-replace-all-control.png",
    ],
  },
  {
    id: 309282,
    title: "Copy Line Down loses the third cursor",
    area: "Editor · Multi-cursor",
    summary:
      "Three carets become two after copying the line, silently omitting a subsequent edit.",
    delivery: "Reproduced only",
    expected: "All three carets survive; typing x produces foox barx bazx.",
    actual: "Three selections become two. Typing x produces foox barx baz.",
    fixture: "foo bar baz",
    attempts:
      "Two Copy Line Down trials separated by undo reset; one marker probe.",
    adaptation:
      "Regex selection and Right created the carets instead of the reported Alt+Click method. Copy Line Up was not tested.",
    existingPR: 312513,
    steps: [
      "Find foo|bar|baz with regex on and whole-word off.",
      "Alt+Enter, Escape, then Right creates three carets.",
      "Press Shift+Alt+Down. The status bar reports 2 selections.",
      "Type x, inspect the missing third marker, undo and repeat.",
    ],
    screenshots: [
      "309282-three-cursors-before.png",
      "309282-copy-down-two-cursors.png",
      "309282-cursor-probe.png",
      "309282-copy-down-repeat.png",
    ],
  },
];
export const timeline = [
  {
    stage: "Reproduce",
    title: "The report becomes an observable failure",
    body: "The installed app shows two whole-word matches instead of three. A toggle control reproduces the missing occurrence.",
    tone: "red",
    metric: "2 of 3 matches",
  },
  {
    stage: "Baseline",
    title: "Regression tests fail before the patch",
    body: "Six new regression cases fail on the original source. The empty-search control passes.",
    tone: "red",
    metric: "6 failing cases",
  },
  {
    stage: "Patch",
    title: "The first patch passes related tests",
    body: "The original overlap retry implementation passes 182 browser tests. This is source-level evidence, not a fully verified repair.",
    tone: "green",
    metric: "182 tests passing",
  },
  {
    stage: "Review",
    title: "Review catches two new failure modes",
    body: "Copilot identifies rejected non-global empty matches that can loop forever, and arbitrary regex retries that rescan long suffixes.",
    tone: "red",
    metric: "2 review findings",
  },
  {
    stage: "Replan",
    title: "A human narrows the repair scope",
    body: "The user chooses literal-text search. Complex regex behavior is preserved. Both bounded review regressions fail before correction.",
    tone: "amber",
    metric: "Literal search only",
  },
  {
    stage: "Validate",
    title: "The correction passes 186 related tests",
    body: "A termination guard and explicit literal-search metadata address the findings. The performance fixture drops from 8,001 executions to at most two.",
    tone: "green",
    metric: "186 tests passing",
  },
  {
    stage: "Handoff",
    title: "Draft PR, with verification still open",
    body: "PR #344811 contains the corrected files. Native build, patched desktop behavior, GitHub CI, and independent evaluation remain unverified.",
    tone: "blue",
    metric: "Engineer review required",
  },
];
export const gaps = [
  "Full Electron / native build",
  "Full TypeScript typechecking",
  "Patched desktop behavior",
  "Completed GitHub CI",
  "Independent evaluation",
  "Isolated app preview",
];
export const metrics = [
  [
    "Time to verified PR",
    "Intake to all required gates passing, separating active time from waiting.",
  ],
  [
    "Fix acceptance",
    "Maintainer-accepted patches / submitted eligible patches. Pending drafts stay separate.",
  ],
  [
    "Evaluation pass rate",
    "First-attempt and eventual independent evaluation passes with denominators.",
  ],
  [
    "Regression rate",
    "Verified patches with a confirmed introduced regression in the observation window.",
  ],
  [
    "Post-merge findings",
    "Confirmed findings per merged patch. This dataset has no established merged cohort.",
  ],
  [
    "Human effort & cost",
    "Operator interventions, reviewer minutes, and infrastructure/model cost per outcome.",
  ],
];
