import type { Response } from "express";
import { ApiError } from "./apiError";

export interface MetaPage {
  total: number;
  limit: number;
  nextCursor: string | null;
}

/**
 * Başarılı yanıt gönderir.
 * Dokümantasyona uygun sıralama: { success, meta?, data }
 */
export function ok<T>(res: Response, data: T, meta?: MetaPage): void {
  if (meta !== undefined) {
    // meta varsa data'dan önce koy — dokümantasyon sırası: success → meta → data
    res.status(200).json({ success: true, meta, data });
  } else {
    res.status(200).json({ success: true, data });
  }
}

export function fail(res: Response, err: ApiError): void {
  res.status(err.status).json({
    success: false,
    error: { code: err.code, message: err.message },
  });
}
