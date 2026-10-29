import { spawn } from "node:child_process";
export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  options: {
    timeoutMs?: number;
    signal?: AbortSignal;
    onOutput?: (text: string) => void;
    input?: string;
  } = {},
) {
  return new Promise<{
    code: number;
    output: string;
    durationMs: number;
    timedOut: boolean;
  }>((resolve, reject) => {
    const started = Date.now();
    let output = "",
      timedOut = false,
      settled = false;
    const child = spawn(command, args, {
      cwd,
      windowsHide: true,
      shell: false,
      stdio: ["pipe", "pipe", "pipe"],
    });
    child.stdin.on("error", () => {});
    child.stdin.end(options.input);
    const stop = () => {
      if (child.pid && process.platform === "win32")
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
          windowsHide: true,
          stdio: "ignore",
        });
      else child.kill("SIGKILL");
    };
    const timeout = setTimeout(() => {
      timedOut = true;
      stop();
    }, options.timeoutMs ?? 120000);
    options.signal?.addEventListener("abort", stop, { once: true });
    if (options.signal?.aborted) stop();
    const append = (data: Buffer) => {
      const text = data.toString();
      output = (output + text).slice(-2_000_000);
      options.onOutput?.(text);
    };
    child.stdout.on("data", append);
    child.stderr.on("data", append);
    const cleanup = () => {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", stop);
    };
    child.on("error", (e) => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(e);
      }
    });
    child.on("close", (code) => {
      if (!settled) {
        settled = true;
        cleanup();
        resolve({
          code: code ?? -1,
          output,
          durationMs: Date.now() - started,
          timedOut,
        });
      }
    });
  });
}
