import type { NextFunction, Request, Response } from "express";

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  name: string;
};

const buckets = new Map<string, Bucket>();

function clientKey(req: Request, name: string) {
  // Nao usa X-Forwarded-For automaticamente: esse cabecalho pode ser forjado
  // quando a aplicacao nao esta atras de um proxy confiavel.
  return `${name}:${req.ip || req.socket.remoteAddress || "unknown"}`;
}

export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = clientKey(req, options.name);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      next();
      return;
    }

    if (current.count >= options.limit) {
      const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));

      res.set("Retry-After", String(retryAfter));
      res.set("Cache-Control", "no-store");
      res.status(429).json({
        error: "Too many requests",
        retryAfter,
      });
      return;
    }

    current.count += 1;
    next();
  };
}

/** Usado somente pelos testes para evitar estado entre casos. */
export function resetRateLimitBuckets() {
  buckets.clear();
}
