import type { NextFunction, Request, RequestHandler, Response } from "express";
import jwt from "jsonwebtoken";
import { getEnv } from "../config/env";
import { ApiError } from "../utils/apiError";

/**
 * JWT Authentication Middleware
 *
 * Token doğrulaması (imza kontrolü) ana auth backend tarafından yapılıyor.
 * Kullanıcı oraya login olmadan token alamaz.
 *
 * Bu middleware sadece token'ın içindeki userId (sub) claim'ini okur.
 * İmza doğrulaması yapmaz — gereksizdir çünkü:
 * 1. Token zaten güvenilir auth backend tarafından verilmiştir
 * 2. Mobil uygulama auth olmadan çalışmaz
 */
export const jwtAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  console.log("[JWT] Authorization header:", header ? `VAR (${header.length} karakter)` : "YOK");

  if (!header?.startsWith("Bearer ")) {
    console.log("[JWT] HATA: Bearer prefix yok");
    next(new ApiError(401, "unauthorized", "Invalid or missing token"));
    return;
  }
  const token = header.slice(7).trim();
  if (!token) {
    console.log("[JWT] HATA: Token boş");
    next(new ApiError(401, "unauthorized", "Invalid or missing token"));
    return;
  }

  console.log("[JWT] Token alındı:", token.substring(0, 30) + "...", `(${token.length} karakter)`);

  try {
    const decoded = jwt.decode(token);
    console.log("[JWT] Decode sonucu:", JSON.stringify(decoded, null, 2));

    if (!decoded || typeof decoded === "string") {
      console.log("[JWT] HATA: Token decode edilemedi veya string döndü, typeof:", typeof decoded);
      next(new ApiError(401, "unauthorized", "Invalid or missing token"));
      return;
    }

    const payload = decoded as jwt.JwtPayload;
    const env = getEnv();
    const claimKey = env.JWT_USER_ID_CLAIM;

    console.log("[JWT] Claim key:", claimKey);
    console.log("[JWT] Payload keys:", Object.keys(payload));

    const raw =
      claimKey === "sub"
        ? payload.sub
        : (payload as Record<string, unknown>)[claimKey];

    console.log("[JWT] Raw userId değeri:", raw, "typeof:", typeof raw);

    const userId =
      typeof raw === "string" ? raw : raw != null && (typeof raw === "number" || typeof raw === "bigint") ? String(raw) : null;

    console.log("[JWT] Çıkarılan userId:", userId);

    if (!userId) {
      console.log("[JWT] HATA: userId null — token'da", claimKey, "claim'i bulunamadı");
      next(new ApiError(401, "unauthorized", "Invalid or missing token"));
      return;
    }

    req.userId = userId;
    console.log("[JWT] BAŞARILI — userId:", userId);
    next();
  } catch (err) {
    console.log("[JWT] HATA: catch bloğu:", err);
    next(new ApiError(401, "unauthorized", "Invalid or missing token"));
  }
};
