/**
 * Instagram Graph API (Meta) — Stories content publishing istemcisi.
 *
 * Native fetch kullanır (Node 18+). Ek bağımlılık yok — notifications.whatsapp.ts ile aynı desen.
 * Dokümantasyon: https://developers.facebook.com/docs/instagram-platform/content-publishing
 *
 * ⚠ Gereksinimler:
 *   - Hesap, bir Facebook Page'e bağlı Instagram Business/Creator hesabı olmalı.
 *   - Medya PUBLIC bir URL'den erişilebilir olmalı (IG sunucusu çeker) — bizde /media static.
 *   - Story video: MP4 (H.264/AAC), ≤ 60 sn. Story image: JPEG. (HLS/webp KABUL EDİLMEZ.)
 *   - Günlük yayın limiti vardır (story dahil ~25/24s).
 *
 * Yayın akışı (iki adım, async):
 *   1) POST /{ig-user-id}/media            → container oluştur (creation_id döner)
 *   2) GET  /{container-id}?fields=status_code → FINISHED olana kadar bekle (video işlenir)
 *   3) POST /{ig-user-id}/media_publish     → yayınla (media id döner)
 *
 * Env:
 *   INSTAGRAM_ACCESS_TOKEN          — uzun ömürlü Page/System User token'ı
 *   INSTAGRAM_BUSINESS_ACCOUNT_ID   — IG Business hesabının ID'si
 *   INSTAGRAM_GRAPH_VERSION         — Graph API sürümü (varsayılan v21.0)
 */

import { getEnv } from "../../config/env";

export type InstagramStoryMediaType = "image" | "video";

export interface PublishInstagramStoryInput {
  mediaType: InstagramStoryMediaType;
  /** IG'nin çekeceği public URL — image için JPEG, video için MP4. */
  mediaUrl: string;
}

export interface PublishInstagramStoryResult {
  /** Yayınlanan IG media id'si. */
  id: string;
}

/** Token + business account id varsa true. Yoksa kanal "skipped" işaretlenir. */
export function isInstagramConfigured(): boolean {
  const env = getEnv();
  return Boolean(env.INSTAGRAM_ACCESS_TOKEN && env.INSTAGRAM_BUSINESS_ACCOUNT_ID);
}

function graphBase(): string {
  const env = getEnv();
  return `https://graph.facebook.com/${env.INSTAGRAM_GRAPH_VERSION}`;
}

type GraphError = { error?: { message?: string; code?: number; error_subcode?: number } };

async function graphPost(pathSegment: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const env = getEnv();
  const body = new URLSearchParams({ ...params, access_token: env.INSTAGRAM_ACCESS_TOKEN! });
  const res = await fetch(`${graphBase()}/${pathSegment}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => null)) as (Record<string, unknown> & GraphError) | null;
  if (!res.ok || !json || json.error) {
    throw new Error(formatGraphError(json, res.status));
  }
  return json;
}

async function graphGet(pathSegment: string, fields: string): Promise<Record<string, unknown>> {
  const env = getEnv();
  const url = `${graphBase()}/${pathSegment}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(
    env.INSTAGRAM_ACCESS_TOKEN!,
  )}`;
  const res = await fetch(url);
  const json = (await res.json().catch(() => null)) as (Record<string, unknown> & GraphError) | null;
  if (!res.ok || !json || json.error) {
    throw new Error(formatGraphError(json, res.status));
  }
  return json;
}

function formatGraphError(json: GraphError | null, status: number): string {
  const msg = json?.error?.message || `HTTP ${status}`;
  const code = json?.error?.code != null ? ` [${json.error.code}]` : "";
  return `instagram_api_error: ${msg}${code}`;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Container'ın işlenmesini bekler (özellikle video). FINISHED olunca döner;
 * ERROR/EXPIRED'da ya da timeout'ta hata fırlatır (worker retry'ler).
 */
async function waitForContainerReady(containerId: string): Promise<void> {
  const env = getEnv();
  const deadline = Date.now() + env.INSTAGRAM_PUBLISH_POLL_TIMEOUT_MS;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const status = await graphGet(containerId, "status_code");
    const code = String(status.status_code ?? "");
    if (code === "FINISHED") return;
    if (code === "ERROR" || code === "EXPIRED") {
      throw new Error(`instagram_container_${code.toLowerCase()}`);
    }
    if (Date.now() >= deadline) {
      throw new Error("instagram_container_timeout");
    }
    await sleep(env.INSTAGRAM_PUBLISH_POLL_INTERVAL_MS);
  }
}

/**
 * Bir story'i Instagram'a yayınlar. Başarısızlıkta Error fırlatır (worker yakalar).
 * Çağıran taraf isInstagramConfigured()'ı önceden kontrol etmelidir.
 */
export async function publishInstagramStory(
  input: PublishInstagramStoryInput,
): Promise<PublishInstagramStoryResult> {
  const env = getEnv();
  const igUserId = env.INSTAGRAM_BUSINESS_ACCOUNT_ID!;

  // 1) Container oluştur — STORIES media_type.
  const containerParams: Record<string, string> = { media_type: "STORIES" };
  if (input.mediaType === "image") {
    containerParams.image_url = input.mediaUrl;
  } else {
    containerParams.video_url = input.mediaUrl;
  }
  const container = await graphPost(`${igUserId}/media`, containerParams);
  const containerId = String(container.id ?? "");
  if (!containerId) {
    throw new Error("instagram_container_no_id");
  }

  // 2) İşlenmeyi bekle (video için zorunlu; image genelde anında FINISHED).
  await waitForContainerReady(containerId);

  // 3) Yayınla.
  const published = await graphPost(`${igUserId}/media_publish`, { creation_id: containerId });
  const mediaId = String(published.id ?? "");
  if (!mediaId) {
    throw new Error("instagram_publish_no_id");
  }
  return { id: mediaId };
}
