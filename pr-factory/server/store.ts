import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import type { Job, Result } from "../shared/domain.ts";
export class Store {
  db: DatabaseSync;
  constructor(root: string) {
    mkdirSync(root, { recursive: true });
    this.db = new DatabaseSync(path.join(root, "factory.db"));
    this.db.exec(
      "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, data TEXT NOT NULL); CREATE TABLE IF NOT EXISTS intakes(id TEXT PRIMARY KEY, data TEXT NOT NULL);",
    );
  }
  list(): Job[] {
    return this.db
      .prepare("SELECT data FROM jobs ORDER BY rowid DESC")
      .all()
      .map((r) => JSON.parse(String(r.data)));
  }
  get(id: string): Job | undefined {
    const row = this.db.prepare("SELECT data FROM jobs WHERE id=?").get(id);
    return row ? JSON.parse(String(row.data)) : undefined;
  }
  save(job: Job) {
    job.updatedAt = new Date().toISOString();
    this.db
      .prepare(
        "INSERT INTO jobs VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
      )
      .run(job.id, JSON.stringify(job));
    return job;
  }
  update(id: string, change: (j: Job) => void) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const j = this.get(id);
      if (!j) throw Error("Job not found");
      change(j);
      this.save(j);
      this.db.exec("COMMIT");
      return j;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  event(id: string, stage: string, message: string) {
    return this.update(id, (j) => {
      j.events.push({
        id: j.events.length + 1,
        at: new Date().toISOString(),
        stage,
        message,
      });
    });
  }
  result(id: string, result: Result) {
    return this.update(id, (j) => {
      j.checks = j.checks.filter((c) => c.name !== result.name);
      j.checks.push(result);
    });
  }
  close() {
    this.db.close();
  }
}
