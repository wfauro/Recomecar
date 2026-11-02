import express from "express";
import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, resetRateLimitBuckets } from "./rateLimit";

async function startTestServer(
  middleware: ReturnType<typeof rateLimit>
): Promise<{ server: Server; baseUrl: string }> {
  const app = express();

  app.use(middleware);
  app.get("/test", (_req, res) => {
    res.json({ ok: true });
  });

  const server = createServer(app);

  await new Promise<void>(resolve => {
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

afterEach(() => {
  resetRateLimitBuckets();
});

describe("rateLimit", () => {
  it("returns 429 after the configured limit", async () => {
    const { server, baseUrl } = await startTestServer(
      rateLimit({
        name: "test",
        limit: 2,
        windowMs: 60_000,
      })
    );

    try {
      expect((await fetch(`${baseUrl}/test`)).status).toBe(200);
      expect((await fetch(`${baseUrl}/test`)).status).toBe(200);

      const response = await fetch(`${baseUrl}/test`);

      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toMatch(/^\d+$/);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        error: "Too many requests",
        retryAfter: expect.any(Number),
      });
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it("allows requests again after the window expires", async () => {
    const { server, baseUrl } = await startTestServer(
      rateLimit({
        name: "test-expiration",
        limit: 1,
        windowMs: 1_000,
      })
    );

    try {
      expect((await fetch(`${baseUrl}/test`)).status).toBe(200);
      expect((await fetch(`${baseUrl}/test`)).status).toBe(429);

      await new Promise(resolve => setTimeout(resolve, 1_100));

      expect((await fetch(`${baseUrl}/test`)).status).toBe(200);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
