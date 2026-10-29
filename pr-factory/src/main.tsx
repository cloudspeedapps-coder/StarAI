import React, { useEffect, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Code2,
  FileCode2,
  FileText,
  FlaskConical,
  FolderGit2,
  GitBranch,
  GitPullRequest,
  Layers3,
  LockKeyhole,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldQuestion,
  SkipForward,
  Sparkles,
  Square,
  Terminal,
  TriangleAlert,
  X,
} from "lucide-react";
import { cases, timeline, gaps, metrics } from "./data.ts";
import { revision, canResume } from "../shared/domain.ts";
import type { CaseRecord, Evidence, Job } from "../shared/domain.ts";
import "./style.css";
type Page = "queue" | "evidence" | "review" | "runs" | "scorecard" | "security";
type Manifest = { capturedAt: string; visibility: string; files: Evidence[] };
type Intake = {
  id: string;
  title: string;
  description: string;
  source: string;
  status: string;
};
const issueURL = (id: number) =>
  `https://github.com/microsoft/vscode/issues/${id}`;
const prURL = "https://github.com/microsoft/vscode/pull/344811";
function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <span className={`badge ${tone}`}>
      <i />
      {children}
    </span>
  );
}
function External({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={13} />
    </a>
  );
}
function download(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob(
      [typeof value === "string" ? value : JSON.stringify(value, null, 2)],
      {
        type: typeof value === "string" ? "text/markdown" : "application/json",
      },
    ),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
function App() {
  const [page, setPage] = useState<Page>("queue"),
    [selected, setSelected] = useState(291591),
    [tab, setTab] = useState("Overview"),
    [query, setQuery] = useState(""),
    [delivery, setDelivery] = useState("All delivery states"),
    [outcome, setOutcome] = useState("All reproduction states");
  const [manifest, setManifest] = useState<Manifest>(),
    [modal, setModal] = useState<Evidence>(),
    [modalText, setModalText] = useState(""),
    [phase, setPhase] = useState(6),
    [playing, setPlaying] = useState(false),
    [diff, setDiff] = useState(""),
    [diffType, setDiffType] = useState("final.patch");
  const [jobs, setJobs] = useState<Job[]>([]),
    [codex, setCodex] = useState<{
      available: boolean;
      version: string;
      reason: string;
    }>(),
    [token, setToken] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [newCase, setNewCase] = useState(false),
    [intakes, setIntakes] = useState<Intake[]>([]);
  const dialog = useRef<HTMLDialogElement>(null),
    formDialog = useRef<HTMLDialogElement>(null),
    priorFocus = useRef<HTMLElement | null>(null);
  const current = cases.find((c) => c.id === selected)!;
  useEffect(() => {
    fetch("/evidence/manifest.json")
      .then((r) => {
        if (!r.ok) throw Error("Evidence manifest unavailable");
        return r.json();
      })
      .then(setManifest)
      .catch((e) => setError(e.message));
    fetch("/api/bootstrap")
      .then((r) => {
        if (!r.ok) throw Error("Local API unavailable");
        return r.json();
      })
      .then((b) => {
        setToken(b.token);
        setJobs(b.jobs);
        setCodex(b.codex);
      })
      .catch((e) => setError(e.message));
    fetch("/api/intakes")
      .then((r) => r.json())
      .then(setIntakes)
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (page !== "runs") return;
    const id = setInterval(
      () =>
        fetch("/api/jobs")
          .then((r) => r.json())
          .then(setJobs)
          .catch(() =>
            setError("Could not refresh live runs. Status may be stale."),
          ),
      1500,
    );
    return () => clearInterval(id);
  }, [page]);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(
      () =>
        setPhase((p) => {
          if (p >= 6) {
            setPlaying(false);
            return 6;
          }
          return p + 1;
        }),
      2200,
    );
    return () => clearInterval(id);
  }, [playing]);
  useEffect(() => {
    if (!modal) {
      dialog.current?.close();
      priorFocus.current?.focus();
      return;
    }
    priorFocus.current = document.activeElement as HTMLElement;
    dialog.current?.showModal();
    setModalText("Loading artifact…");
    if (modal.kind === "text")
      fetch(modal.url)
        .then((r) => {
          if (!r.ok) throw Error("Artifact missing");
          return r.text();
        })
        .then(setModalText)
        .catch((e) => setModalText(e.message));
  }, [modal]);
  useEffect(() => {
    if (newCase) formDialog.current?.showModal();
    else formDialog.current?.close();
  }, [newCase]);
  useEffect(() => {
    fetch("/evidence/" + diffType)
      .then((r) => {
        if (!r.ok) throw Error("Diff unavailable");
        return r.text();
      })
      .then(setDiff)
      .catch((e) => setDiff(e.message));
  }, [diffType]);
  async function post(url: string, body: unknown = {}) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-StarAI-Token": token },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw Error(data.error || "Request failed");
    return data;
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  const artifact = (name: string) =>
    manifest?.files.find((f) => f.name === name);
  const openArtifact = (name: string) => {
    const f = artifact(name);
    if (f) setModal(f);
    else setError("Artifact is absent from the evidence manifest.");
  };
  function pick(c: CaseRecord) {
    setSelected(c.id);
    setTab("Overview");
    setPlaying(false);
    setPhase(6);
  }
  function navigate(p: Page) {
    setPage(p);
    setPlaying(false);
    setNotice("");
  }
  function exportCase() {
    download(
      `starai-${current.id}-report.md`,
      `# VS Code #${current.id}\n\n${current.title}\n\nRecorded October 28, 2026.\n\n## Expected\n${current.expected}\n\n## Actual\n${current.actual}\n\n## Steps\n${current.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## Limitations\n${current.adaptation}\nExisting profile, Restricted Mode, VS Code 1.144.0.\n\n## Delivery\n${current.delivery}\n${current.id === 291591 ? prURL : ""}\n\n## Missing assurance\n${gaps.join("\n")}\n\n## Evidence\n${current.screenshots.map((n) => `${n} SHA-256: ${artifact(n)?.sha256 || "unavailable"}`).join("\n")}\n`,
    );
  }
  const filtered = cases.filter(
    (c) =>
      `${c.id} ${c.title} ${c.area}`
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (delivery === "All delivery states" || c.delivery === delivery) &&
      (outcome === "All reproduction states" || outcome === "Reproduced"),
  );
  const sections: [Page, typeof Layers3, string][] = [
    ["queue", Layers3, "Repair queue"],
    ["runs", Activity, "Live validation"],
    ["evidence", FolderGit2, "Evidence library"],
    ["review", GitPullRequest, "Review & repair"],
    ["scorecard", Activity, "Pilot scorecard"],
    ["security", ShieldCheck, "Security Fixer"],
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("queue");
          }}
        >
          <span className="brand-mark">
            <Sparkles size={22} />
          </span>
          <span>
            StarAI<small>PR FACTORY</small>
          </span>
        </a>
        <div className="workspace">
          <div className="workspace-icon">
            <Code2 size={18} />
          </div>
          <span>
            Engineering workspace<small>Local development</small>
          </span>
          <ChevronRight size={14} />
        </div>
        <div className="nav-label">WORKBENCH</div>
        <nav>
          {sections.map(([key, Icon, label]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => navigate(key)}
            >
              <Icon size={18} />
              {label}
              {key === "queue" && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>
        <div className="nav-label engines-label">REPAIR ENGINES</div>
        <button className="engine-button" onClick={() => navigate("queue")}>
          <span className="engine-dot" />
          Bug Fixer<small>Demo</small>
        </button>
        <button className="engine-button" onClick={() => navigate("security")}>
          <ShieldCheck size={17} />
          Security Fixer<small>Planned</small>
        </button>
        <div className="sidebar-bottom">
          <div className="local-status">
            <i /> Local workspace
          </div>
          <p>
            Evidence before confidence.
            <br />
            People control the merge.
          </p>
          <div className="user">
            <span>SA</span>
            <div>
              StarAI workspace<small>Local operator</small>
            </div>
            <LockKeyhole size={15} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <ChevronRight size={13} />{" "}
            <strong>
              {sections.find((s) => s[0] === page)?.[2] || "Security Fixer"}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="repo">
              <FolderGit2 size={15} /> microsoft / vscode
            </span>
            <span className="avatar">SA</span>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                FROM REPORTED ISSUE TO REVIEW-READY CHANGE
              </div>
              <h1>
                {
                  {
                    queue: "The repair workbench",
                    evidence: "Evidence, in context",
                    review: "Better patches through review",
                    runs: "Fresh evidence. Real execution.",
                    scorecard: "Measure outcomes, not activity",
                    security: "Security Fixer",
                  }[page]
                }
              </h1>
              <p>
                {
                  {
                    queue:
                      "Reproduce the failure. Trace the repair. Know what still needs checking.",
                    evidence:
                      "Original local records, exact fixtures, and content hashes.",
                    review:
                      "Follow the findings that changed the patch—not just the passing tests.",
                    runs: "Generate a scoped repair with Codex or validate the recorded VS Code revisions.",
                    scorecard:
                      "A clear view of what this dataset can—and cannot—tell us.",
                    security:
                      "A shared assurance workflow for vulnerability remediation.",
                  }[page]
                }
              </p>
            </div>
            <div className="heading-action">
              {page === "runs" ? (
                <Badge tone="blue">Local execution</Badge>
              ) : (
                <Badge tone="amber">Recorded demo · Oct 28, 2026</Badge>
              )}
              <button className="primary" onClick={() => setNewCase(true)}>
                <Plus size={16} /> Add report
              </button>
            </div>
          </div>
          {error && (
            <div className="alert error" role="alert">
              <TriangleAlert size={17} />
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="alert" role="status">
              {notice}
            </div>
          )}
          {page === "queue" && (
            <>
              <div className="stats">
                <Stat
                  label="Reproduced cases"
                  value={cases.length}
                  note="Observed in the installed app"
                  icon={<FlaskConical />}
                />
                <Stat
                  label="Draft pull requests"
                  value={cases.filter((c) => c.delivery === "Draft PR").length}
                  note="Awaiting engineer verification"
                  icon={<GitPullRequest />}
                />
                <Stat
                  label="Related browser tests"
                  value="186"
                  note="Recorded pass · issue #291591"
                  icon={<CheckCircle2 />}
                />
                <Stat
                  label="Fully verified repairs"
                  value="0"
                  note="Required assurance gates remain"
                  icon={<ShieldQuestion />}
                />
              </div>
              <div className="factory-bar">
                <div>
                  <span className="teal-icon">
                    <GitBranch size={17} />
                  </span>
                  <strong>The assurance loop</strong>
                </div>
                <div className="flow">
                  {[
                    "Reproduce",
                    "Plan",
                    "Patch",
                    "Test",
                    "Preview",
                    "Evaluate",
                    "Human review",
                  ].map((n, i) => (
                    <React.Fragment key={n}>
                      <span className={i > 3 ? "future" : ""}>
                        {i === 6 ? (
                          <LockKeyhole size={12} />
                        ) : (
                          <span>{String(i + 1).padStart(2, "0")}</span>
                        )}
                        {n}
                      </span>
                      {i < 6 && <ChevronRight size={12} />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
              <section className="workbench">
                <div className="queue-panel">
                  <div className="panel-heading">
                    <h2>Repair queue</h2>
                    <span className="number">{filtered.length}</span>
                  </div>
                  <label className="searchbox">
                    <Search size={15} />
                    <input
                      aria-label="Search cases"
                      placeholder="Search cases…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                  </label>
                  <div className="queue-filters">
                    <select
                      aria-label="Filter delivery state"
                      value={delivery}
                      onChange={(e) => setDelivery(e.target.value)}
                    >
                      <option>All delivery states</option>
                      <option>Draft PR</option>
                      <option>Reproduced only</option>
                    </select>
                    <select
                      aria-label="Filter reproduction state"
                      value={outcome}
                      onChange={(e) => setOutcome(e.target.value)}
                    >
                      <option>All reproduction states</option>
                      <option>Reproduced</option>
                      <option>Not reproduced</option>
                      <option>Blocked</option>
                    </select>
                  </div>
                  <div className="case-list">
                    {filtered.map((c) => (
                      <button
                        className={`case-card ${selected === c.id ? "selected" : ""}`}
                        key={c.id}
                        onClick={() => pick(c)}
                      >
                        <span className="case-meta">
                          <span>#{c.id}</span>
                          <span>
                            {c.id === 291591
                              ? "01"
                              : c.id === 196884
                                ? "02"
                                : "03"}
                          </span>
                        </span>
                        <strong>{c.title}</strong>
                        <span className="case-area">{c.area}</span>
                        <Badge
                          tone={c.delivery === "Draft PR" ? "blue" : "green"}
                        >
                          {c.delivery}
                        </Badge>
                      </button>
                    ))}
                    {!filtered.length && (
                      <p className="empty">No cases match these filters.</p>
                    )}
                  </div>
                  <div className="queue-foot">
                    <BookOpen size={16} />
                    <span>
                      Three public reports.
                      <br />
                      One traceable repair story.
                    </span>
                  </div>
                </div>
                <div className="detail-panel">
                  <div className="detail-title">
                    <div className="case-kicker">
                      <Code2 size={15} /> VS CODE <span>/</span> #{current.id}
                    </div>
                    <h2>{current.title}</h2>
                    <p>{current.summary}</p>
                    <div className="detail-tags">
                      <Badge tone="green">Reproduced</Badge>
                      <span>Windows · VS Code 1.144.0</span>
                      <External href={issueURL(current.id)}>
                        Source issue
                      </External>
                    </div>
                  </div>
                  <div
                    className="tabs"
                    role="tablist"
                    aria-label="Case details"
                  >
                    {["Overview", "Reproduction", "Diff", "Evidence"].map(
                      (t) => (
                        <button
                          role="tab"
                          aria-selected={tab === t}
                          key={t}
                          className={tab === t ? "active" : ""}
                          onClick={() => setTab(t)}
                        >
                          {t}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="detail-content">
                    {tab === "Overview" && (
                      <>
                        <div className="section-heading">
                          <h3>
                            {current.id === 291591
                              ? "A repair you can inspect"
                              : "Reproduction recorded"}
                          </h3>
                          <span className="muted">HISTORICAL EVIDENCE</span>
                        </div>
                        {current.id === 291591 ? (
                          <>
                            <div className="timeline-nav">
                              {timeline.map((t, i) => (
                                <button
                                  key={t.stage}
                                  className={
                                    i === phase
                                      ? "current"
                                      : i < phase
                                        ? "done"
                                        : ""
                                  }
                                  onClick={() => {
                                    setPlaying(false);
                                    setPhase(i);
                                  }}
                                  aria-label={`View ${t.stage} stage`}
                                  aria-current={
                                    i === phase ? "step" : undefined
                                  }
                                >
                                  <span>
                                    {i < phase ? <Check size={11} /> : i + 1}
                                  </span>
                                  <small>{t.stage}</small>
                                </button>
                              ))}
                            </div>
                            <div
                              className={`story-card ${timeline[phase].tone}`}
                            >
                              <div>
                                <Badge tone={timeline[phase].tone}>
                                  {timeline[phase].stage}
                                </Badge>
                                <span className="mono">0{phase + 1} / 07</span>
                              </div>
                              <h3>{timeline[phase].title}</h3>
                              <p>{timeline[phase].body}</p>
                              <div className="story-metric">
                                <Activity size={17} />
                                {timeline[phase].metric}
                              </div>
                            </div>
                            <div className="replay-controls">
                              <button
                                className="primary"
                                onClick={() => {
                                  if (playing) {
                                    setPlaying(false);
                                  } else {
                                    if (phase === 6) setPhase(0);
                                    setPlaying(true);
                                  }
                                }}
                              >
                                {playing ? (
                                  <Pause size={14} />
                                ) : (
                                  <Play size={14} />
                                )}{" "}
                                {playing
                                  ? "Pause replay"
                                  : phase > 0 && phase < 6
                                    ? "Resume replay"
                                    : "Replay repair"}
                              </button>
                              <button
                                aria-label="Next replay step"
                                disabled={phase === 6}
                                onClick={() => {
                                  setPlaying(false);
                                  setPhase((p) => Math.min(6, p + 1));
                                }}
                              >
                                <SkipForward size={15} />
                              </button>
                              <button
                                aria-label="Reset replay"
                                onClick={() => {
                                  setPlaying(false);
                                  setPhase(0);
                                }}
                              >
                                <RotateCcw size={14} />
                              </button>
                              <small>Recorded events · no code executes</small>
                            </div>
                            <div className="finding-teaser">
                              <div className="finding-icon">
                                <TriangleAlert size={18} />
                              </div>
                              <div>
                                <strong>
                                  Passing tests weren’t the end of the story.
                                </strong>
                                <p>
                                  Review exposed two defects in the initial
                                  patch.
                                </p>
                                <button
                                  className="text-button"
                                  onClick={() => navigate("review")}
                                >
                                  Inspect review findings{" "}
                                  <ArrowRight size={14} />
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="observation">
                              <span>OBSERVED</span>
                              <p>{current.actual}</p>
                            </div>
                            <p>{current.attempts}</p>
                            <div className="alert">
                              <FlaskConical size={18} />
                              <span>
                                Reproduction is complete for this local
                                configuration. No patch was created by this
                                project.
                              </span>
                            </div>
                            <button onClick={() => setTab("Reproduction")}>
                              View reproduction <ArrowRight size={14} />
                            </button>
                          </>
                        )}
                        <div className="section-heading environment-heading">
                          <h3>Environment & provenance</h3>
                          <LockKeyhole size={14} />
                        </div>
                        <dl className="metadata">
                          <div>
                            <dt>Installed application</dt>
                            <dd>VS Code 1.144.0 · Windows</dd>
                          </div>
                          <div>
                            <dt>Profile</dt>
                            <dd>Existing user · Restricted Mode</dd>
                          </div>
                          <div>
                            <dt>Setup adaptation</dt>
                            <dd>{current.adaptation}</dd>
                          </div>
                          <div>
                            <dt>Existing proposal</dt>
                            <dd>
                              <External
                                href={`https://github.com/microsoft/vscode/pull/${current.existingPR}`}
                              >
                                PR #{current.existingPR}
                              </External>
                              <small>
                                Recorded discovery; current state not refreshed.
                              </small>
                            </dd>
                          </div>
                        </dl>
                      </>
                    )}
                    {tab === "Reproduction" && (
                      <>
                        <div className="section-heading">
                          <h3>Exact input</h3>
                          <button
                            className="small"
                            onClick={() => {
                              navigator.clipboard
                                .writeText(current.fixture)
                                .then(() => setNotice("Fixture copied."))
                                .catch(() =>
                                  setError(
                                    "Clipboard unavailable; select the fixture text to copy it.",
                                  ),
                                );
                            }}
                          >
                            Copy fixture
                          </button>
                        </div>
                        <pre className="fixture">
                          <code>{current.fixture}</code>
                        </pre>
                        <div className="expected-actual">
                          <div>
                            <span>EXPECTED</span>
                            <p>{current.expected}</p>
                          </div>
                          <div>
                            <span>ACTUAL</span>
                            <p>{current.actual}</p>
                          </div>
                        </div>
                        <h3>Reproduction steps</h3>
                        <ol className="steps">
                          {current.steps.map((s) => (
                            <li key={s}>{s}</li>
                          ))}
                        </ol>
                        <div className="callout">
                          <strong>Repeat evidence</strong>
                          <p>{current.attempts}</p>
                          <p>{current.adaptation}</p>
                        </div>
                        <button
                          onClick={() => openArtifact(current.screenshots[0])}
                        >
                          <FileText size={15} /> Open original capture
                        </button>
                      </>
                    )}
                    {tab === "Diff" &&
                      (current.id === 291591 ? (
                        <>
                          <div className="section-heading">
                            <h3>Local source changes</h3>
                            <select
                              aria-label="Diff revision"
                              value={diffType}
                              onChange={(e) => setDiffType(e.target.value)}
                            >
                              <option value="final.patch">
                                Final vs baseline
                              </option>
                              <option value="review-correction.patch">
                                Review correction
                              </option>
                            </select>
                          </div>
                          <p className="fine-print">
                            Pinned local revisions. This is not a refreshed
                            remote PR diff.
                          </p>
                          <div className="file-list">
                            {[
                              "model.ts",
                              "model/textModelSearch.ts",
                              "model/pieceTreeTextBuffer/pieceTreeBase.ts",
                              "test/common/model/textModelSearch.test.ts",
                            ].map((n) => (
                              <div key={n}>
                                <FileCode2 size={14} />
                                <span>{n}</span>
                                <Badge tone="green">Modified</Badge>
                              </div>
                            ))}
                          </div>
                          <pre className="diff">
                            {diff.split("\n").map((line, i) => (
                              <div
                                className={
                                  line.startsWith("+")
                                    ? "added"
                                    : line.startsWith("-")
                                      ? "removed"
                                      : line.startsWith("@@")
                                        ? "hunk"
                                        : ""
                                }
                                key={i}
                              >
                                {line || " "}
                              </div>
                            ))}
                          </pre>
                        </>
                      ) : (
                        <div className="empty-state">
                          <FileCode2 />
                          <h3>No patch in this project</h3>
                          <p>
                            This case has reproduction evidence only. Its
                            existing contributor proposal is linked in Overview.
                          </p>
                        </div>
                      ))}
                    {tab === "Evidence" && (
                      <>
                        <h3>Captured application behavior</h3>
                        <p className="fine-print">
                          Original captures stay local and may contain
                          workstation paths.
                        </p>
                        <div className="image-grid">
                          {current.screenshots.map((name, i) => (
                            <button
                              key={name}
                              onClick={() => openArtifact(name)}
                            >
                              <img
                                src={"/evidence/" + name}
                                alt={`${current.title}, evidence capture ${i + 1}`}
                                loading="lazy"
                              />
                              <span>{name.replace(".png", "")}</span>
                            </button>
                          ))}
                        </div>
                        <button
                          className="text-button"
                          onClick={() => navigate("evidence")}
                        >
                          Browse logs and artifact hashes{" "}
                          <ArrowRight size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  <div className="detail-footer">
                    <span>
                      <Clock3 size={13} /> Evidence recorded Oct 28, 2026
                    </span>
                    <button className="text-button" onClick={exportCase}>
                      <ArrowDownToLine size={14} /> Export report
                    </button>
                  </div>
                </div>
                <aside className="assurance-panel">
                  <div className="panel-heading">
                    <h2>Assurance</h2>
                    <ShieldCheck size={18} />
                  </div>
                  <p className="fine-print">
                    Evidence supports a claim.
                    <br />
                    Missing checks stay visible.
                  </p>
                  <div className="checks">
                    <CheckRow
                      title="Application reproduction"
                      status="pass"
                      detail="Recorded on installed 1.144.0"
                    />
                    <CheckRow
                      title="Related browser tests"
                      status={
                        current.id === 291591
                          ? phase >= 5
                            ? "pass"
                            : phase === 2
                              ? "pass"
                              : phase === 3 || phase === 4
                                ? "fail"
                                : "not run"
                          : "not run"
                      }
                      detail={
                        current.id === 291591
                          ? phase >= 5
                            ? "186 passing · recorded"
                            : phase === 2
                              ? "182 passing · initial patch"
                              : phase === 3 || phase === 4
                                ? "Two review regressions fail"
                                : "Not yet reached in replay"
                          : "No patch by this project"
                      }
                    />
                    <CheckRow
                      title="Targeted lint"
                      status={
                        current.id === 291591 && phase >= 5 ? "pass" : "not run"
                      }
                      detail={
                        current.id === 291591 && phase >= 5
                          ? "4 files checked · recorded"
                          : "Not validated at this stage"
                      }
                    />
                    {gaps.map((g) => (
                      <CheckRow key={g} title={g} status="not run" />
                    ))}
                  </div>
                  <div className="evaluation">
                    <span>Independent evaluation</span>
                    <strong>Not evaluated</strong>
                    <small>Risk: unassessed</small>
                  </div>
                  <div className="human-gate">
                    <LockKeyhole size={21} />
                    <h3>Engineer approval required</h3>
                    <p>
                      Missing assurance gates prevent a fully verified status.
                    </p>
                    {current.id === 291591 ? (
                      <a
                        className="button primary"
                        href={prURL}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <GitPullRequest size={15} /> Open draft PR{" "}
                        <ArrowUpRight size={14} />
                      </a>
                    ) : (
                      <span className="fine-print">
                        No draft PR for this case.
                      </span>
                    )}
                    <button
                      disabled
                      title="Replay has no approval or merge authority"
                    >
                      Approve & merge
                    </button>
                    <small>Recorded demo has no merge authority.</small>
                  </div>
                </aside>
              </section>
              {intakes.length > 0 && (
                <section className="intakes">
                  <h2>Reports awaiting triage</h2>
                  {intakes.map((i) => (
                    <div key={i.id}>
                      <FileText size={18} />
                      <strong>{i.title}</strong>
                      <Badge tone="amber">{i.status}</Badge>
                      <small>Execution not enabled</small>
                    </div>
                  ))}
                </section>
              )}
            </>
          )}
          {page === "evidence" && (
            <>
              <div className="alert">
                <LockKeyhole size={16} />
                <span>
                  Local-only evidence. Original screenshots include workstation
                  paths. Inspect and redact before any public deployment.
                </span>
              </div>
              <div className="evidence-summary">
                <strong>{manifest?.files.length ?? "…"} artifacts</strong>
                <span>SHA-256 content identity · October 28, 2026</span>
                <button
                  onClick={() =>
                    manifest &&
                    download("starai-evidence-manifest.json", manifest)
                  }
                >
                  <ArrowDownToLine size={15} /> Export manifest
                </button>
              </div>
              <div className="artifact-list">
                {manifest?.files.map((f) => (
                  <button key={f.name} onClick={() => setModal(f)}>
                    <div className="artifact-icon">
                      {f.kind === "image" ? (
                        <FlaskConical size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </div>
                    <div>
                      <strong>{f.name}</strong>
                      <small>{f.provenance}</small>
                      <code>{f.sha256}</code>
                    </div>
                    <span>{(f.bytes / 1024).toFixed(1)} KB</span>
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "review" && (
            <>
              <div className="review-intro">
                <Badge tone="amber">2 findings · verification open</Badge>
                <h2>Review changed the definition of done.</h2>
                <p>
                  The initial patch passed 182 tests. Two bounded regressions
                  then exposed termination and performance problems. The
                  correction keeps overlap retries specific to literal search.
                </p>
                <External href={prURL}>View draft PR #344811</External>
              </div>
              <div className="review-grid">
                <Finding
                  severity="High"
                  title="Rejected empty matches can loop forever"
                  detail="A non-global regex ignores lastIndex. Retrying a rejected empty match can repeatedly return the same result."
                  fix="Stop after the first accepted or rejected match for non-global, non-sticky regexes."
                  code="new Searcher(wordSeparators, /$/).next('x')"
                />
                <Finding
                  severity="Medium"
                  title="Whole-word retries can rescan every suffix"
                  detail="Rewinding arbitrary regexes after boundary failures can cause quadratic work on long text."
                  fix="Only literal-text searches retry overlapping candidates. Preserve existing complex-regex behavior."
                  code="/a.*b/gu over 'a '.repeat(8000) + 'bx'"
                />
              </div>
              <div className="decision">
                <div className="teal-icon">
                  <Check size={20} />
                </div>
                <div>
                  <span className="eyebrow">RECORDED HUMAN DECISION</span>
                  <h3>Focus this PR on literal-text search.</h3>
                  <p>
                    Preserve complex-regex behavior. This historical decision
                    cannot be changed by replay.
                  </p>
                </div>
              </div>
              <div className="review-results">
                <div>
                  <span>Related browser tests</span>
                  <strong>
                    182 <ArrowRight /> 186
                  </strong>
                  <small>Initial patch → corrected patch</small>
                </div>
                <div>
                  <span>Executions in one regression fixture</span>
                  <strong>
                    8,001 <ArrowRight /> ≤ 2
                  </strong>
                  <small>A bounded test result, not a universal speedup</small>
                </div>
                <button
                  onClick={() => openArtifact("review-fix-validation.log")}
                >
                  Inspect validation log <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="callout">
                <strong>Correction is not reviewer approval.</strong>
                <p>
                  Both review threads remain open in the recorded state. Full
                  build, patched desktop behavior, CI, and independent
                  evaluation are not established.
                </p>
              </div>
              <button
                onClick={() => {
                  navigate("queue");
                  pick(cases[0]);
                  setTab("Diff");
                  setDiffType("review-correction.patch");
                }}
              >
                <FileCode2 size={16} /> Inspect the correction diff
              </button>
            </>
          )}
          {page === "runs" && (
            <>
              <div className="runner-card">
                <div>
                  <span className="eyebrow">LOCAL CODEX · NEW CANDIDATE</span>
                  <h2>Generate a fresh repair.</h2>
                  <p>
                    Start from the original VS Code #291591 baseline. Codex
                    proposes scoped source edits, then the runner applies them
                    in a separate checkout and checks the candidate against five
                    bounded probes.
                  </p>
                  <p className="fine-print">
                    {codex?.reason || "Checking backend availability…"}{" "}
                    {codex?.version} · One attempt, 10-minute generation limit.
                    Uses your Codex account allowance. Full application
                    validation and independent review remain required.
                  </p>
                </div>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !token ||
                    !codex?.available ||
                    jobs.some((j) => ["running", "queued"].includes(j.status))
                  }
                  onClick={() =>
                    action(async () => {
                      const j = await post("/api/jobs", {
                        profile: "vscode-291591-codex-v1",
                      });
                      setJobs((old) => [j, ...old]);
                    })
                  }
                >
                  <Sparkles size={16} /> Generate with Codex
                </button>
              </div>
              <div className="runner-card">
                <div>
                  <span className="eyebrow">
                    ENABLED PROFILE · VSCODE-291591-PINNED-V1
                  </span>
                  <h2>Three revisions. One bounded test contract.</h2>
                  <p>
                    Clone the existing local repository into a job-specific
                    checkout, bundle the actual search module, and run five
                    source probes against the baseline, initial patch, and
                    corrected candidate.
                  </p>
                  <div className="revision-chain">
                    {[
                      ["Baseline", revision.base],
                      ["Initial patch", revision.initial],
                      ["Correction", revision.candidate],
                    ].map(([label, sha]) => (
                      <div key={label}>
                        <small>{label}</small>
                        <code>{sha.slice(0, 8)}</code>
                      </div>
                    ))}
                  </div>
                  <p className="fine-print">
                    Uses the known patch; does not generate a new AI fix. Source
                    probes are separate from the recorded 186-test suite.
                    Checkout separation is not an OS security sandbox. No GitHub
                    write, merge, or native app launch.
                  </p>
                </div>
                <button
                  className="primary"
                  disabled={
                    busy ||
                    !token ||
                    jobs.some((j) => ["running", "queued"].includes(j.status))
                  }
                  onClick={() =>
                    action(async () => {
                      const j = await post("/api/jobs", {
                        profile: "vscode-291591-pinned-v1",
                      });
                      setJobs((old) => [j, ...old]);
                    })
                  }
                >
                  <Play size={16} /> Run source validation
                </button>
              </div>
              {jobs.length === 0 ? (
                <div className="empty-state">
                  <Terminal />
                  <h3>No live runs yet</h3>
                  <p>
                    A run produces fresh logs, revision checks, and a
                    downloadable local draft package.
                  </p>
                </div>
              ) : (
                jobs.map((j) => (
                  <section className="run-card" key={j.id}>
                    <div className="run-heading">
                      <div>
                        <strong>VS Code #291591</strong>
                        <span>
                          {j.profile === "vscode-291591-codex-v1"
                            ? "Codex repair"
                            : "Pinned validation"}
                        </span>
                        <code>{j.id.slice(0, 8)}</code>
                        <span>{new Date(j.createdAt).toLocaleString()}</span>
                      </div>
                      <Badge
                        tone={
                          j.status === "running"
                            ? "blue"
                            : j.status === "failed"
                              ? "red"
                              : "amber"
                        }
                      >
                        {j.status}
                      </Badge>
                    </div>
                    <p>
                      {j.reason ||
                        `Checkpoints: ${j.checkpoint} / ${j.profile === "vscode-291591-codex-v1" ? 2 : 3}`}
                    </p>
                    <div className="run-controls">
                      {["running", "queued"].includes(j.status) && (
                        <>
                          {j.profile !== "vscode-291591-codex-v1" && (
                            <button
                              disabled={busy || j.request === "pause"}
                              onClick={() =>
                                action(async () => {
                                  await post(`/api/jobs/${j.id}/pause`);
                                })
                              }
                            >
                              <Pause size={14} /> Pause at checkpoint
                            </button>
                          )}
                          <button
                            disabled={busy}
                            onClick={() =>
                              action(async () => {
                                await post(`/api/jobs/${j.id}/cancel`);
                              })
                            }
                          >
                            <Square size={13} /> Cancel
                          </button>
                        </>
                      )}
                      {canResume(j.status) &&
                        j.profile !== "vscode-291591-codex-v1" && (
                          <button
                            disabled={busy}
                            onClick={() =>
                              action(async () => {
                                await post(`/api/jobs/${j.id}/resume`);
                              })
                            }
                          >
                            <Play size={14} /> Resume
                          </button>
                        )}
                      <a
                        className="button"
                        href={`/api/jobs/${j.id}/export`}
                        download
                      >
                        <ArrowDownToLine size={14} /> Export run
                      </a>
                    </div>
                    <div className="run-columns">
                      <div className="event-log" aria-label="Run event log">
                        {j.events.map((e) => (
                          <div key={e.id}>
                            <time>{new Date(e.at).toLocaleTimeString()}</time>
                            <span>
                              <strong>{e.stage}</strong>
                              {e.message}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div>
                        {j.checks.map((c) => (
                          <CheckRow
                            key={c.name}
                            title={c.name}
                            status={c.status}
                            detail={c.detail}
                          />
                        ))}
                        {j.manifest && (
                          <div className="run-artifacts">
                            <h3>Run artifacts</h3>
                            {j.manifest.map((a) => (
                              <button
                                className="text-button"
                                key={a.name}
                                onClick={() => setModal(a)}
                              >
                                <FileText size={13} />
                                {a.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ))
              )}
            </>
          )}
          {page === "scorecard" && (
            <>
              <div className="alert">
                <Activity size={17} />
                <span>
                  Three selected cases and one draft PR do not establish
                  acceptance, reliability, or business economics.
                </span>
              </div>
              <div className="metric-grid">
                {metrics.map(([name, detail]) => (
                  <div className="metric-card" key={name}>
                    <span>{name}</span>
                    <strong>Not measured</strong>
                    <p>{detail}</p>
                  </div>
                ))}
              </div>
              <div className="callout">
                <h3>Build the pilot cohort before setting targets.</h3>
                <p>
                  Predeclare cases, include unsuccessful and blocked runs, and
                  measure reviewer effort alongside acceptance. Keep independent
                  evaluation and post-merge observations separate from test
                  counts.
                </p>
              </div>
            </>
          )}
          {page === "security" && (
            <div className="security-view">
              <div className="security-icon">
                <ShieldCheck size={36} />
              </div>
              <Badge tone="neutral">Planned capability</Badge>
              <h2>From advisory to verified remediation.</h2>
              <p>
                Security Fixer will identify affected services and dependency
                paths, prepare a scoped patch, validate behavior, and rescan in
                an isolated environment.
              </p>
              <div className="security-steps">
                {[
                  "Verify the advisory and affected versions",
                  "Map services, owners, and dependency paths",
                  "Patch and rescan an isolated fork",
                  "Independent evaluation and human review",
                ].map((s, i) => (
                  <div key={s}>
                    <span>{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
              <div className="callout">
                No advisory or target repository has been selected. No
                vulnerability remediation or successful security scan is
                claimed.
              </div>
              <button onClick={() => navigate("queue")}>
                Explore the Bug Fixer demo <ArrowRight size={16} />
              </button>
            </div>
          )}
          <footer className="page-footer">
            <span>
              <Sparkles size={13} /> StarAI PR Factory
            </span>
            <span>Evidence is revision-bound. Approval stays human.</span>
            <span>LOCAL FIRST · v0.1</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="artifact-dialog"
        onCancel={() => setModal(undefined)}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">EVIDENCE ARTIFACT</span>
            <h2>{modal?.name}</h2>
          </div>
          <button
            aria-label="Close artifact"
            onClick={() => setModal(undefined)}
          >
            <X size={20} />
          </button>
        </div>
        {modal && (
          <>
            <p className="fine-print">{modal.provenance}</p>
            {modal.kind === "image" ? (
              <img className="full-capture" src={modal.url} alt={modal.name} />
            ) : (
              <pre className="artifact-text">{modalText}</pre>
            )}
            <div className="artifact-hash">
              <span>SHA-256</span>
              <code>{modal.sha256}</code>
              <a href={modal.url} download>
                <ArrowDownToLine size={14} /> Download
              </a>
            </div>
          </>
        )}
      </dialog>
      <dialog
        ref={formDialog}
        className="intake-dialog"
        onCancel={() => setNewCase(false)}
      >
        <div className="dialog-heading">
          <h2>Add a reported issue</h2>
          <button
            aria-label="Close report form"
            onClick={() => setNewCase(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          Save a report for triage. Imported reports do not launch an agent or
          execute instructions.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            action(async () => {
              const i = await post("/api/intakes", Object.fromEntries(fd));
              setIntakes((old) => [i, ...old]);
              setNewCase(false);
              navigate("queue");
              setNotice(
                "Report saved locally. Duplicate checking and repair require triage.",
              );
            });
          }}
        >
          <label>
            Issue title
            <input
              name="title"
              required
              maxLength={160}
              placeholder="What goes wrong?"
            />
          </label>
          <label>
            GitHub issue URL <small>(optional)</small>
            <input
              name="source"
              type="url"
              placeholder="https://github.com/owner/repo/issues/123"
            />
          </label>
          <label>
            Expected and actual behavior
            <textarea
              name="description"
              required
              rows={5}
              maxLength={12000}
              placeholder="Include steps, environment, and observable results."
            />
          </label>
          <button className="primary" disabled={busy || !token}>
            Save report for triage <ArrowRight size={15} />
          </button>
          {error && (
            <p role="alert" className="red-text">
              {error}
            </p>
          )}
        </form>
      </dialog>
    </div>
  );
}
function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div>
        <span>{label}</span>
        {icon}
      </div>
      <strong>{value}</strong>
      <small>{note}</small>
    </div>
  );
}
function CheckRow({
  title,
  status,
  detail,
}: {
  title: string;
  status: string;
  detail?: string;
}) {
  return (
    <div className="check-row">
      <span
        className={`check-symbol ${status === "pass" ? "green" : status === "fail" ? "red" : ""}`}
      >
        {status === "pass" ? (
          <CheckCircle2 size={16} />
        ) : status === "fail" ? (
          <TriangleAlert size={16} />
        ) : (
          <span className="empty-circle" />
        )}
      </span>
      <div>
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </div>
      <span className="check-label">
        {status === "pass" ? "Pass" : status === "fail" ? "Fail" : "Not run"}
      </span>
    </div>
  );
}
function Finding({
  severity,
  title,
  detail,
  fix,
  code,
}: {
  severity: string;
  title: string;
  detail: string;
  fix: string;
  code: string;
}) {
  return (
    <article className="finding">
      <Badge tone={severity === "High" ? "red" : "amber"}>
        {severity} severity
      </Badge>
      <h3>{title}</h3>
      <p>{detail}</p>
      <pre>{code}</pre>
      <div className="fix">
        <CheckCircle2 size={17} />
        <div>
          <strong>Correction implemented</strong>
          <p>{fix}</p>
        </div>
      </div>
      <small>Reviewer verification remains open in the recorded state.</small>
    </article>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
