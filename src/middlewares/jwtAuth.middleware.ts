import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";
import { ApiError } from "../utils/apiError";

/**
 * JWT Authentication Middleware
 *
 * Token'ı `jwt.decode` ile açar; userId/role/cariId claim'lerini req'e koyar.
 *
 * GÜVENLİK NOTU (bilinçli, geçici): İmza DOĞRULANMIYOR (verify değil decode).
 * ERP'nin HS256 imzalama secret'ı elimizde olmadığı için demo modunda çalışıyoruz.
 * Bu yüzden role claim'i sahte token'la taklit edilebilir — adminAuth tek başına
 * gerçek koruma sağlamaz (bkz. adminAuth.middleware.ts). Production öncesi:
 * ERP'den JWT_SECRET al → bu satırı `jwt.verify(token, secret)`'a çevir.
 */
export const jwtAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    next(new ApiError(401, "unauthorized", "Invalid or missing token"));
    return;
  }
  const token = header.slice(7).trim();
  if (!token) {
    next(new ApiError(401, "unauthorized", "Invalid or missing token"));
    return;
  }

  try {
    const decoded = jwt.decode(token);
    if (!decoded || typeof decoded === "string") {
      next(new ApiError(401, "unauthorized", "Invalid or missing token"));
      return;
    }

    const payload = decoded as jwt.JwtPayload;
    const claimKey = getEnv().JWT_USER_ID_CLAIM;

    const raw =
      claimKey === "sub"
        ? payload.sub
        : (payload as Record<string, unknown>)[claimKey];

    const userId =
      typeof raw === "string"
        ? raw
        : raw != null && (typeof raw === "number" || typeof raw === "bigint")
          ? String(raw)
          : null;

    if (!userId) {
      next(new ApiError(401, "unauthorized", "Invalid or missing token"));
      return;
    }

    req.userId = userId;

    // Ek claim'ler (decode-only): role -> adminAuth, cariId -> cari işlemleri.
    const roleRaw = (payload as Record<string, unknown>).role;
    req.userRole = typeof roleRaw === "string" ? roleRaw : undefined;
    const cariRaw = (payload as Record<string, unknown>).cariId;
    req.cariId = typeof cariRaw === "string" ? cariRaw : undefined;

    next();
  } catch {
    next(new ApiError(401, "unauthorized", "Invalid or missing token"));
  }
};
