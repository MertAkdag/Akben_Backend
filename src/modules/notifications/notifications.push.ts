/**
 * Expo Push Service istemcisi.
 *
 * Native fetch kullanır (Node 18+). Ek bağımlılık yok.
 * Dokümantasyon: https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * Akış:
 *  1) sendExpoPush(messages) -> /push/send, 100'lük batch. Her mesaj için bir "ticket" döner.
 *  2) ticket "ok" değilse ve "DeviceNotRegistered" ise token prune edilir (Device.disabledAt).
 *
 * NOT: Asenkron receipt polling (/push/getReceipts) v1'de YOK — ticket-anı sonucuyla yetiniyoruz.
 * Receipt aşamasındaki gecikmeli DeviceNotRegistered için bkz. Faz 3 (receipt job).
 */

const EXPO_SEND_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  subtitle?: string; // iOS alt başlık
  sound?: "default" | null;
  badge?: number; // iOS ikon rozet sayısı
  channelId?: string; // Android kanal (tip bazlı — campaign/order/price/system)
  categoryId?: string; // aksiyon butonu kategorisi (mobilde setNotificationCategoryAsync ile eşleşir)
  priority?: "default" | "normal" | "high";
  mutableContent?: boolean; // iOS: NSE'nin görsel eki indirip payload'ı değiştirmesine izin
  richContent?: { image?: string }; // görselli bildirim (Android native, iOS NSE gerektirir)
  interruptionLevel?: "active" | "critical" | "passive" | "time-sensitive"; // iOS
}

export interface ExpoTicket {
  status: "ok" | "error";
  id?: string; // receiptId — status "ok" ise
  message?: string;
  details?: { error?: ExpoErrorCode };
}

export type ExpoErrorCode =
  | "DeviceNotRegistered"
  | "MessageTooBig"
  | "MessageRateExceeded"
  | "MismatchSenderId"
  | "InvalidCredentials";

export function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") || token.startsWith("ExpoPushToken[")
  );
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Encoding": "gzip, deflate",
  };
  // Expo "Enhanced Security" açıksa zorunlu; değilse opsiyonel.
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Expo push HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

/**
 * Mesajları gönderir. Sırayı KORUR — dönen ticket[i], gönderilen geçerli mesaj[i] ile eşleşir.
 * Geçersiz formatlı token'lar gönderilmeden önce elenir (caller geçerli token vermeli).
 */
export async function sendExpoPush(
  messages: ExpoMessage[],
): Promise<ExpoTicket[]> {
  if (messages.length === 0) return [];
  const tickets: ExpoTicket[] = [];
  for (const batch of chunk(messages, BATCH_SIZE)) {
    const json = await postJson<{ data?: ExpoTicket[]; errors?: unknown }>(
      EXPO_SEND_URL,
      batch,
    );
    const data = json.data ?? [];
    // Beklenenden az ticket dönerse hizalamayı bozmamak için doldur.
    for (let i = 0; i < batch.length; i++) {
      tickets.push(
        data[i] ?? { status: "error", message: "no ticket returned" },
      );
    }
  }
  return tickets;
}
