import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { Store } from "./store.ts";
import { detectCodex, repairProfile } from "./codex.ts";
import { revision, canResume } from "../shared/domain.ts";
import type { Job } from "../shared/domain.ts";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  dataRoot = path.resolve(
    process.env.STARAI_DATA_DIR || path.join(root, ".local"),
  );
const store = new Store(dataRoot),
  port = Number(process.env.PORT || 4173),
  token = randomBytes(32).toString("hex");
const children = new Map<string, ReturnType<typeof spawn>>();
const codex = await detectCodex(root);
function alive(pid?: number) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
// A restart cannot certify what an old process did. It must be explicitly resumed.
for (const j of store.list())
  if (["running", "queued"].includes(j.status) && !alive(j.workerPid)) {
    j.status = "interrupted";
    j.reason =
      "Server restarted. Resume from the last completed revision boundary.";
    store.save(j);
  }
function startWorker(id: string) {
  const child = spawn(
    process.execPath,
    [path.join(root, "server/worker.ts"), id],
    {
      cwd: root,
      env: {
        ...process.env,
        STARAI_DATA_DIR: dataRoot,
        STARAI_PARENT_PID: String(process.pid),
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  children.set(id, child);
  store.update(id, (j) => {
    j.workerPid = child.pid;
  });
  let failure = "";
  child.stderr?.on("data", (c) => {
    failure = (failure + c).slice(-3000);
  });
  child.on("error", (e) => {
    store.update(id, (j) => {
      j.status = "failed";
      j.reason = e.message;
    });
    children.delete(id);
  });
  child.on("exit", () => {
    children.delete(id);
    const j = store.get(id);
    if (j?.status === "running" || j?.status === "queued")
      store.update(id, (j) => {
        j.status = "interrupted";
        j.reason = failure || "Worker stopped without a completion checkpoint.";
      });
  });
}
const mime: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".md": "text/plain",
  ".log": "text/plain",
  ".patch": "text/plain",
  ".txt": "text/plain",
};
const server = http.createServer(async (req, res) => {
  const send = (code: number, data: unknown) => {
    res.writeHead(code, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(data));
  };
  try {
    if (
      ![`127.0.0.1:${port}`, `localhost:${port}`].includes(
        req.headers.host || "",
      )
    )
      return send(403, { error: "Loopback host required" });
    const url = new URL(req.url || "/", `http://127.0.0.1:${port}`),
      p = url.pathname;
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'",
    );
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      const origin = req.headers.origin;
      if (
        origin &&
        ![
          "http://127.0.0.1:4173",
          "http://localhost:4173",
          "http://127.0.0.1:5173",
          "http://localhost:5173",
          `http://127.0.0.1:${port}`,
        ].includes(origin)
      )
        return send(403, { error: "Origin rejected" });
      if (req.headers["x-starai-token"] !== token)
        return send(403, { error: "Session token required" });
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (raw.length > 32000)
          return send(413, { error: "Request too large" });
      }
      try {
        body = JSON.parse(raw || "{}");
      } catch {
        return send(400, { error: "Invalid JSON" });
      }
    }
    if (p === "/api/bootstrap")
      return send(200, {
        token,
        profile: "vscode-291591-pinned-v1",
        codex,
        capabilities: {
          sourceValidation: true,
          autonomousRepair: codex.available,
          desktopPreview: false,
          publish: false,
        },
        jobs: store.list(),
      });
    if (p === "/api/health") return send(200, { status: "ok" });
    if (p === "/api/jobs" && req.method === "GET")
      return send(200, store.list());
    if (p === "/api/jobs" && req.method === "POST") {
      if (
        body.profile !== "vscode-291591-pinned-v1" &&
        body.profile !== repairProfile
      )
        return send(400, {
          error:
            "Only the approved VS Code validation and Codex repair profiles are enabled.",
        });
      if (body.profile === repairProfile && !codex.available)
        return send(503, { error: codex.reason });
      if (store.list().some((j) => ["running", "queued"].includes(j.status)))
        return send(409, {
          error: "A run is already active. Wait, pause, or cancel it first.",
        });
      const now = new Date().toISOString(),
        j: Job = {
          id: randomUUID(),
          caseId: 291591,
          profile: String(body.profile),
          mode: "live",
          status: "queued",
          createdAt: now,
          updatedAt: now,
          checkpoint: 0,
          candidate:
            body.profile === repairProfile ? "pending" : revision.candidate,
          checks: [],
          events: [],
          request: null,
          reason: "",
        };
      store.save(j);
      store.event(
        j.id,
        "Queued",
        body.profile === repairProfile
          ? "User requested a new Codex-generated candidate for the scoped literal-search bug."
          : "User requested fresh validation of three pinned local revisions.",
      );
      startWorker(j.id);
      return send(201, store.get(j.id));
    }
    const jobMatch = p.match(
      /^\/api\/jobs\/([a-f0-9-]{36})(?:\/(pause|resume|cancel|export|artifacts\/[A-Za-z0-9._-]+))?$/,
    );
    if (jobMatch) {
      const [, id, action] = jobMatch,
        j = store.get(id);
      if (!j) return send(404, { error: "Job not found" });
      if (action?.startsWith("artifacts/") && req.method === "GET") {
        const name = action.slice(10),
          record = j.manifest?.find((a) => a.name === name);
        if (!record)
          return send(404, { error: "Artifact not in verified manifest" });
        const bytes = await fs.readFile(path.join(dataRoot, "jobs", id, name));
        if (createHash("sha256").update(bytes).digest("hex") !== record.sha256)
          return send(409, {
            error: "Artifact changed since capture; integrity check failed",
          });
        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        return res.end(bytes);
      }
      if (action === "export" && req.method === "GET") {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="starai-${id}.json"`,
        );
        return send(200, j);
      }
      if (req.method === "GET" && !action) return send(200, j);
      if (req.method === "POST") {
        if (action === "resume") {
          if (j.profile === repairProfile)
            return send(409, {
              error:
                "Repair attempts are single-use. Start a new repair job to retry.",
            });
          if (!canResume(j.status) || children.has(id) || alive(j.workerPid))
            return send(409, {
              error: "Run cannot be resumed while its worker is active.",
            });
          if (
            store
              .list()
              .some(
                (k) => k.id !== id && ["running", "queued"].includes(k.status),
              )
          )
            return send(409, { error: "Another run is active." });
          store.update(id, (j) => {
            j.status = "queued";
            j.request = null;
          });
          store.event(
            id,
            "Resumed",
            "Resuming at the last completed revision boundary.",
          );
          startWorker(id);
        } else if (action === "pause") {
          if (j.profile === repairProfile)
            return send(409, {
              error:
                "Repair attempts support cancellation; pause is only available for pinned validation.",
            });
          if (!["running", "queued"].includes(j.status))
            return send(409, { error: "Only an active run can pause." });
          store.update(id, (j) => {
            j.request = "pause";
          });
          store.event(
            id,
            "Pause requested",
            "The worker will pause at the next revision boundary.",
          );
        } else if (action === "cancel") {
          if (["blocked", "failed", "canceled"].includes(j.status))
            return send(409, { error: "Run has already stopped." });
          store.update(id, (j) => {
            j.request = "cancel";
            if (!children.has(id)) {
              j.status = "canceled";
              j.request = null;
            }
          });
          store.event(
            id,
            "Cancel requested",
            "Stopping active work and retaining evidence.",
          );
        } else return send(405, { error: "Unsupported action" });
        return send(200, store.get(id));
      }
    }
    if (p === "/api/intakes" && req.method === "GET")
      return send(
        200,
        store.db
          .prepare("SELECT data FROM intakes ORDER BY rowid DESC")
          .all()
          .map((r) => JSON.parse(String(r.data))),
      );
    if (p === "/api/intakes" && req.method === "POST") {
      const title = String(body.title || "").trim(),
        description = String(body.description || "").trim(),
        source = String(body.source || "").trim();
      if (!title || !description)
        return send(400, {
          error: "Title and expected/actual behavior are required.",
        });
      if (
        source &&
        !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+$/.test(source)
      )
        return send(400, {
          error: "Use a public GitHub issue URL, or leave the source blank.",
        });
      const record = {
        id: randomUUID(),
        title,
        description,
        source,
        createdAt: new Date().toISOString(),
        status: "Needs triage",
        duplicateCheck: "Not run",
        execution: "Not enabled for imported cases",
      };
      store.db
        .prepare("INSERT INTO intakes VALUES(?,?)")
        .run(record.id, JSON.stringify(record));
      return send(201, record);
    }
    if (p.startsWith("/api/"))
      return send(404, { error: "Endpoint unavailable; no action performed" });
    if (req.method !== "GET" && req.method !== "HEAD")
      return send(405, { error: "Method not allowed" });
    let file = path.resolve(root, "dist", "." + decodeURIComponent(p));
    const allowed = path.join(root, "dist") + path.sep;
    if (file !== path.join(root, "dist") && !file.startsWith(allowed))
      return send(403, { error: "Invalid path" });
    try {
      if ((await fs.stat(file)).isDirectory())
        file = path.join(file, "index.html");
    } catch {
      if (path.extname(file)) return send(404, { error: "File not found" });
      file = path.join(root, "dist/index.html");
    }
    const bytes = await fs.readFile(file);
    res.writeHead(200, {
      "Content-Type":
        (mime[path.extname(file)] || "application/octet-stream") +
        "; charset=utf-8",
      "Cache-Control": "no-cache",
    });
    res.end(req.method === "HEAD" ? undefined : bytes);
  } catch (e) {
    send(500, { error: e instanceof Error ? e.message : "Request failed" });
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`StarAI PR Factory: http://127.0.0.1:${port}`),
);
function shutdown() {
  for (const id of children.keys()) {
    try {
      store.update(id, (j) => {
        j.request = "cancel";
      });
    } catch {}
  }
  server.close();
  setTimeout(() => process.exit(), 2000);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
