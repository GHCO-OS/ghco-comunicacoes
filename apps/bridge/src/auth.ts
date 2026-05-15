import type { NextFunction, Request, Response } from "express";

export function requireBearerToken(expectedToken: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    if (!expectedToken) {
      response.status(503).json({ ok: false, error: "Bridge token is not configured." });
      return;
    }

    const header = request.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

    if (token !== expectedToken) {
      response.status(401).json({ ok: false, error: "Unauthorized." });
      return;
    }

    next();
  };
}

