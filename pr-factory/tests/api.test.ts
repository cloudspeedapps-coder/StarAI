import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { Store } from "../server/store.ts";
test("Local API protects writes, validates intake and rejects arbitrary execution profiles", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "starai-api-")),
    port = 4273;
  const server = spawn(process.execPath, ["server/index.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, PORT: String(port), STARAI_DATA_DIR: dir },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = `http://127.0.0.1:${port}`;
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(Error("Server startup timed out")),
        10000,
      );
      server.stdout.on("data", () => {
        clearTimeout(timer);
        resolve();
      });
      server.on("error", reject);
      server.on("exit", (code) => {
        if (code) reject(Error("Server failed"));
      });
    });
    const b = (await (await fetch(url + "/api/bootstrap")).json()) as {
      token: string;
    };
    const homepage = await fetch(url + "/");
    assert.equal(homepage.status, 200);
    assert.match(await homepage.text(), /StarAI/);
    const post = (
      route: string,
      body: unknown,
      token = b.token,
      origin = url,
    ) =>
      fetch(url + route, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-StarAI-Token": token,
          Origin: origin,
        },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await post("/api/intakes", { title: "x", description: "y" }, "wrong"))
        .status,
      403,
    );
    assert.equal(
      (
        await post(
          "/api/intakes",
          { title: "x", description: "y" },
          b.token,
          "https://attacker.example",
        )
      ).status,
      403,
    );
    assert.equal(
      (
        await post("/api/jobs", {
          profile: "arbitrary-shell",
          command: "whoami",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await post("/api/intakes", {
          title: "x",
          description: "y",
          source: "http://localhost/secret",
        })
      ).status,
      400,
    );
    const response = await post("/api/intakes", {
      title: "Sample test report",
      description: "Expected X, got Y",
      source: "https://github.com/microsoft/vscode/issues/291591",
    });
    assert.equal(response.status, 201);
    const record = (await response.json()) as {
      status: string;
      execution: string;
    };
    assert.equal(record.status, "Needs triage");
    assert.match(record.execution, /Not enabled/);
    assert.equal((await post("/api/publish", {})).status, 404);
    assert.equal((await post("/api/approve", {})).status, 404);
    assert.equal(
      ((await (await fetch(url + "/api/jobs")).json()) as unknown[]).length,
      0,
    );
    const id = randomUUID(),
      now = new Date().toISOString();
    const file = path.join(dir, "jobs", id, "proof.log");
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, "original proof");
    const db = new Store(dir);
    db.save({
      id,
      caseId: 291591,
      profile: "test",
      mode: "live",
      status: "blocked",
      createdAt: now,
      updatedAt: now,
      checkpoint: 3,
      candidate: "head",
      checks: [],
      events: [],
      request: null,
      reason: "test",
      manifest: [
        {
          name: "proof.log",
          url: "",
          sha256: createHash("sha256").update("original proof").digest("hex"),
          bytes: 14,
          kind: "text",
          provenance: "test",
        },
      ],
    });
    db.close();
    assert.equal(
      (await fetch(`${url}/api/jobs/${id}/artifacts/proof.log`)).status,
      200,
    );
    await writeFile(file, "changed proof");
    assert.equal(
      (await fetch(`${url}/api/jobs/${id}/artifacts/proof.log`)).status,
      409,
    );
    assert.equal(
      (await fetch(`${url}/api/jobs/${id}/artifacts/unknown.log`)).status,
      404,
    );
  } finally {
    server.kill();
    await new Promise((r) => server.once("exit", r));
    await rm(dir, { recursive: true, force: true });
  }
});
