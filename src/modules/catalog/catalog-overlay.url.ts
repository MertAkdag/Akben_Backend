/**
 * Overlay URL Helper
 *
 * DB'de göreli path (örn. "/media/category-overlays/1/large.webp") saklanır.
 * Frontend'e döndürmeden önce bu helper ile origin (https://akbenapi.ekler.app)
 * prefix'lenir. Böylece sunucu domain'i değişirse DB güncellenmesi gerekmez.
 */

import type { Request } from "express";
import { getStoryMediaRuntimeConfig } from "../../config/storyMedia";

/**
 * "/media/..." göreli path'i request origin'i ile birleştirir.
 * Mutlak URL ise (http/https) olduğu gibi döner — backward compat.
 * null/undefined ise null döner.
 */
export function absolutizeOverlayUrl(req: Request, relOrAbs: string | null | undefined): string | null {
  if (!relOrAbs) return null;
  if (/^https?:\/\//i.test(relOrAbs)) return relOrAbs;

  const origin = resolveOrigin(req);
  // relOrAbs zaten "/" ile başlıyor
  return `${origin}${relOrAbs}`;
}

function resolveOrigin(req: Request): string {
  const configured = getStoryMediaRuntimeConfig().publicBaseUrl;
  if (configured) {
    // publicBaseUrl genellikle "https://akbenapi.ekler.app/media" formatında —
    // sadece origin'ini al
    try {
      const u = new URL(configured);
      return `${u.protocol}//${u.host}`;
    } catch {
      // ignore parse error
    }
  }

  const forwardedProto = req.header("x-forwarded-proto")?.split(",")[0]?.trim();
  const forwardedHost = req.header("x-forwarded-host")?.split(",")[0]?.trim();
  const protocol = forwardedProto || req.protocol;
  const host = forwardedHost || req.get("host");
  return `${protocol}://${host}`;
}
