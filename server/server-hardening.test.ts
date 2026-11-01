import { spawn, type ChildProcess } from "node:child_process";
import { builtinModules } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { buildSync } from "esbuild";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

function packageName(specifier: string) {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
}

describe("production bundle does not require devDependencies", () => {
  it("only statically imports packages listed in dependencies", () => {
    // Same options as the `build` script in package.json.
    const result = buildSync({
      entryPoints: [path.join(root, "server/_core/index.ts")],
      platform: "node",
      packages: "external",
      bundle: true,
      format: "esm",
      write: false,
      outdir: path.join(root, "dist-test"),
      logLevel: "silent",
    });
    const output = result.outputFiles[0].text;

    const specifiers = new Set<string>();
    for (const match of output.matchAll(/^import\s+(?:[^;]*?\s+from\s+)?["']([^"']+)["']/gm)) {
      specifiers.add(match[1]);
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf-8"));
    const runtime = new Set(Object.keys(pkg.dependencies ?? {}));
    const builtins = new Set(builtinModules);

    const missing = [...specifiers].filter(specifier => {
      if (specifier.startsWith("node:") || builtins.has(specifier)) return false;
      if (specifier.startsWith(".") || specifier.startsWith("/")) return false;
      return !runtime.has(packageName(specifier));
    });

    expect(missing).toEqual([]);
  });

  it("loads vite only through dynamic import inside setupVite", () => {
    const source = fs.readFileSync(path.join(root, "server/_core/vite.ts"), "utf-8");
    expect(source).toMatch(/await import\(["']vite["']\)/);
  });
});

describe("request body limit", () => {
  const port = 41000 + Math.floor(Math.random() * 2000);
  const base = `http://127.0.0.1:${port}`;
  let child: ChildProcess;

  beforeAll(async () => {
    child = spawn(path.join(root, "node_modules/.bin/tsx"), ["server/_core/index.ts"], {
      cwd: root,
      env: { ...process.env, NODE_ENV: "production", PORT: String(port) },
      stdio: "ignore",
    });
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        const res = await fetch(`${base}/api/health`);
        if (res.ok) return;
      } catch {
        // server not up yet
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    throw new Error("server did not start");
  }, 20_000);

  afterAll(() => {
    child?.kill("SIGTERM");
  });

  const post = (bytes: number) =>
    fetch(`${base}/api/trpc/auth.logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filler: "x".repeat(bytes) }),
    });

  it("rejects a 200 KB body with 413", async () => {
    expect((await post(200 * 1024)).status).toBe(413);
  });

  it("rejects a 12 MB body with 413", async () => {
    expect((await post(12 * 1024 * 1024)).status).toBe(413);
  });

  it("still accepts a small body", async () => {
    expect((await post(100)).status).not.toBe(413);
  });
});
