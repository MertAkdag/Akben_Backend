/**
 * Kanal adapter katmanı — pluggable çok-kanallı yayın.
 *
 * Her kanal aynı arayüzü uygular: isConfigured() + publish(). Worker kanaldan
 * habersizdir; sadece adapter'ı çağırır. Yeni kanal (örn. WhatsApp) eklemek =
 * yeni bir adapter yazıp registry'ye koymak.
 */
import type { StoryBroadcast, StoryChannel } from "../../generated/prisma/index";
import { storyBroadcastsRepository } from "./story-broadcasts.repository";
import { isInstagramConfigured, publishInstagramStory } from "./story-broadcasts.instagram";

export interface StoryChannelAdapter {
  channel: StoryChannel;
  /** Kanal yayına hazır mı (env/creds var mı). false ise job "skipped" işaretlenir. */
  isConfigured(): boolean;
  /** Yayınlar; başarısızlıkta throw eder (worker retry'ler). externalId döner (IG media id / story id). */
  publish(broadcast: StoryBroadcast): Promise<{ externalId: string | null }>;
}

// ─── In-App: mevcut story sistemine yazar (her zaman hazır, anında) ───
const inAppAdapter: StoryChannelAdapter = {
  channel: "inapp",
  isConfigured: () => true,
  async publish(broadcast) {
    const storyId = await storyBroadcastsRepository.createInAppStory(broadcast);
    return { externalId: storyId };
  },
};

// ─── Instagram: Graph API content publishing ───
const instagramAdapter: StoryChannelAdapter = {
  channel: "instagram",
  isConfigured: isInstagramConfigured,
  async publish(broadcast) {
    if (!broadcast.igMediaUrl) {
      // IG-uyumlu rendition üretilmemiş (HLS/webp yayınlanamaz) — yapısal hata, retry boşuna.
      throw new Error("instagram_rendition_missing");
    }
    const result = await publishInstagramStory({
      mediaType: broadcast.mediaType === "video" ? "video" : "image",
      mediaUrl: broadcast.igMediaUrl,
    });
    return { externalId: result.id };
  },
};

// ─── Registry ───
// WhatsApp V1'de yok; eklendiğinde buraya bir adapter konur. Registry'de olmayan
// kanal için worker job'u "skipped" işaretler.
const adapters: Partial<Record<StoryChannel, StoryChannelAdapter>> = {
  inapp: inAppAdapter,
  instagram: instagramAdapter,
};

export function getChannelAdapter(channel: StoryChannel): StoryChannelAdapter | undefined {
  return adapters[channel];
}

/** Şu an kayıtlı (registry'de var olan) kanallar — create endpoint doğrulaması için. */
export function isChannelSupported(channel: StoryChannel): boolean {
  return adapters[channel] !== undefined;
}
