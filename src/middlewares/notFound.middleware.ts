import type { Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { fail } from "../utils/response";

export function notFoundMiddleware(_req: Request, res: Response): void {
  fail(res, new ApiError(404, "not_found", "Resource not found"));
}
