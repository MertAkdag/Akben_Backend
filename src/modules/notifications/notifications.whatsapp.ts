/**
 * WhatsApp Business Cloud API (Meta) istemcisi.
 *
 * Native fetch kullanır (Node 18+). Ek bağımlılık yok — tıpkı notifications.push.ts gibi.
 * Dokümantasyon: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/template-messages
 *
 * ⚠ Meta kuralı: business-initiated (broadcast) mesaj, kullanıcı son 24 saatte
 * işletmeye yazmadıysa ÖNCEDEN ONAYLI bir template olmak zorunda. Serbest metin
 * gönderilemez. Bu yüzden panelin serbest title/body'si değil, template adı +
 * pozisyonel değişkenler ({{1}}, {{2}}, ...) gönderilir.
 *
 * Env:
 *   WHATSAPP_TOKEN           — System User / kalıcı erişim token'ı (Bearer)
 *   WHATSAPP_PHONE_NUMBER_ID — Gönderen WhatsApp numarasının Phone Number ID'si
 *   WHATSAPP_GRAPH_VERSION   — Graph API sürümü (varsayılan v21.0)
 */

const DEFAULT_GRAPH_VERSION = "v21.0";

export interface WhatsappTemplateInput {
  to: string; // ham numara — normalizeMsisdn ile E.164'e (sadece rakam) çevrilir
  template: string; // onaylı template adı
  languageCode: string; // template dil kodu, örn "tr", "en_US"
  bodyParams?: string[]; // BODY bileşenindeki {{1}}, {{2}}, ... değerleri
}

export interface WhatsappResult {
  to: string; // normalize edilmiş numara (ya da normalize edilemediyse ham)
  ok: boolean;
  id?: string; // wamid — başarılıysa
  error?: string; // Meta hata mesajı / kodu
}

export interface WhatsappBroadcastResult {
  configured: boolean; // env eksikse false (gönderim denenmedi)
  attempted: number;
  sent: number;
  failed: number;
  results: WhatsappResult[];
}

export function isWhatsappConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

/**
 * Ham numarayı Meta'nın beklediği biçime indirger: sadece rakam, ülke kodu dahil,
 * '+' yok. TR için yaygın girişlere yardımcı düzeltme uygular:
 *   "0532 123 45 67" → "905321234567"
 *   "+90 532 ..."    → "90532..."
 *   "532 123 45 67"  → "90532..." (10 hane, 5 ile başlıyor → TR varsay)
 * Tanınmayan biçimde rakamlar olduğu gibi bırakılır (caller doğru ülke kodunu verebilir).
 */
export function normalizeMsisdn(raw: string): string | null {
  let d = String(raw).replace(/\D+/g, "");
  if (!d) return null;
  if (d.startsWith("0") && d.length === 11) d = "90" + d.slice(1); // 0XXXXXXXXXX → 90...
  else if (d.length === 10 && d.startsWith("5")) d = "90" + d; // 5XXXXXXXXX → 90...
  if (d.length < 8 || d.length > 15) return null; // E.164 sınırı
  return d;
}

function endpoint(): string {
  const version = process.env.WHATSAPP_GRAPH_VERSION || DEFAULT_GRAPH_VERSION;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  return `https://graph.facebook.com/${version}/${phoneId}/messages`;
}

/** Tek numaraya template mesajı gönderir. Hata fırlatmaz — sonucu WhatsappResult olarak döner. */
export async function sendWhatsappTemplate(
  input: WhatsappTemplateInput,
): Promise<WhatsappResult> {
  const to = normalizeMsisdn(input.to);
  if (!to) {
    return { to: input.to, ok: false, error: "invalid_number" };
  }

  const components = input.bodyParams && input.bodyParams.length
    ? [
        {
          type: "body",
          parameters: input.bodyParams.map((text) => ({ type: "text", text })),
        },
      ]
    : [];

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: input.template,
      language: { code: input.languageCode },
      ...(components.length ? { components } : {}),
    },
  };

  try {
    const res = await fetch(endpoint(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => null)) as
      | {
          messages?: { id: string }[];
          error?: { message?: string; code?: number };
        }
      | null;

    if (!res.ok || json?.error) {
      const code = json?.error?.code ? ` [${json.error.code}]` : "";
      const msg = json?.error?.message || `HTTP ${res.status}`;
      return { to, ok: false, error: msg + code };
    }
    return { to, ok: true, id: json?.messages?.[0]?.id };
  } catch (err) {
    return {
      to,
      ok: false,
      error: err instanceof Error ? err.message : "network_error",
    };
  }
}

/**
 * Birden çok numaraya aynı template'i gönderir (demo: panelden elle girilen liste).
 * Env yoksa hiç denemeden configured:false döner. Sıralı gönderir — Cloud API
 * tek numaralı demo hesaplarda agresif rate limit uygular.
 */
export async function sendWhatsappTemplateBatch(
  numbers: string[],
  template: string,
  languageCode: string,
  bodyParams: string[] = [],
): Promise<WhatsappBroadcastResult> {
  if (!isWhatsappConfigured()) {
    return { configured: false, attempted: 0, sent: 0, failed: 0, results: [] };
  }
  const results: WhatsappResult[] = [];
  for (const raw of numbers) {
    results.push(
      await sendWhatsappTemplate({ to: raw, template, languageCode, bodyParams }),
    );
  }
  const sent = results.filter((r) => r.ok).length;
  return {
    configured: true,
    attempted: results.length,
    sent,
    failed: results.length - sent,
    results,
  };
}
