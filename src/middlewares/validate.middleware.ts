import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/apiError";

export function validateBody<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      const msg = r.error.issues.map((i) => i.message).join(", ");
      next(new ApiError(422, "validation_error", msg));
      return;
    }
    req.body = r.data;
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.query);
    if (!r.success) {
      const msg = r.error.issues.map((i) => i.message).join(", ");
      next(new ApiError(422, "validation_error", msg));
      return;
    }
    req.query = r.data as Request["query"];
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.params);
    if (!r.success) {
      const msg = r.error.issues.map((i) => i.message).join(", ");
      next(new ApiError(422, "validation_error", msg));
      return;
    }
    req.params = r.data as Request["params"];
    next();
  };
}
