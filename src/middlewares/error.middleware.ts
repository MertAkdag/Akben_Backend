import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { fail } from "../utils/response";

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    fail(res, err);
    return;
  }
  console.error(err);
  fail(res, new ApiError(500, "internal_error", "Internal server error"));
}
