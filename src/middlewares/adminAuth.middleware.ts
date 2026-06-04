import type { RequestHandler } from "express";
import { ApiError } from "../utils/apiError";

/**
 * Admin yetki middleware'i — jwtAuth'tan SONRA çalışır.
 *
 * jwtAuth token'ı decode edip `req.userRole`'ü doldurur (JWT `role` claim'i, ör. "SUPER_ADMIN").
 * Bu middleware rolü izinli sette değilse 403 döner.
 *
 * İzinli roller `ADMIN_ROLES` env değişkeninden (virgülle ayrık) okunur,
 * yoksa varsayılan: SUPER_ADMIN, ADMIN.
 *
 * GÜVENLİK NOTU: jwtAuth şu an imza doğrulaması YAPMIYOR (decode-only). Yani rol claim'i
 * teknik olarak sahte token'la taklit edilebilir. ERP imzalama secret'ı alınıp jwtAuth
 * `jwt.verify`'a çevrildiğinde bu kontrol otomatik olarak gerçek güvenliğe kavuşur.
 */
const DEFAULT_ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

function allowedRoles(): string[] {
  const raw = process.env.ADMIN_ROLES;
  if (!raw) return DEFAULT_ADMIN_ROLES;
  const parsed = raw
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_ADMIN_ROLES;
}

export const adminAuth: RequestHandler = (req, _res, next) => {
  const role = req.userRole;
  if (!role || !allowedRoles().includes(role)) {
    next(new ApiError(403, "forbidden", "Admin privileges required"));
    return;
  }
  next();
};
