import { ApiError } from "../../utils/apiError";
import { getEnv } from "../../config/env";
import { storyMediaProcessor } from "../stories/story-media.processor";
import { broadcastToDto, type StoryBroadcastDto } from "../_shared/storyBroadcastDto";
import { storyBroadcastsRepository } from "./story-broadcasts.repository";
import { isChannelSupported } from "./story-broadcasts.channels";
import { runStoryBroadcastWorkerTick } from "./story-broadcasts.worker";
import type { CreateBroadcastQuery, ListBroadcastsQuery } from "./story-broadcasts.schema";
import type { StoryChannel } from "../../generated/prisma/index";

export class StoryBroadcastsService {
  async createFromUpload(input: {
    query: CreateBroadcastQuery;
    binary: Buffer;
    contentType?: string;
    originalFilename?: string;
    publicBaseUrl: string;
    createdBy?: string | null;
  }): Promise<StoryBroadcastDto> {
    const { query } = input;
    const channels = query.channels as StoryChannel[];

    // Registry'de olmayan kanal istenmişse erken reddet (şu an hepsi destekli).
    const unsupported = channels.find((c) => !isChannelSupported(c));
    if (unsupported) {
      throw new ApiError(422, "channel_not_supported", `Desteklenmeyen kanal: ${unsupported}`);
    }

    if (!Buffer.isBuffer(input.binary) || input.binary.length === 0) {
      throw new ApiError(400, "missing_binary_body", "Medya gövdesi ham bayt olmalı.");
    }

    const wantInstagram = channels.includes("instagram");

    const processed = await storyMediaProcessor.process({
      buffer: input.binary,
      expectedMediaType: query.mediaType,
      contentType: input.contentType,
      originalFilename: input.originalFilename,
      publicBaseUrl: input.publicBaseUrl,
      imageFormat: query.imageFormat,
      videoOverflowPolicy: query.overflowPolicy,
      instagramRendition: wantInstagram,
    });

    if (wantInstagram && !processed.igMediaUrl) {
      throw new ApiError(500, "ig_rendition_failed", "Instagram-uyumlu rendition üretilemedi.");
    }

    const durationMs =
      query.mediaType === "image" ? query.durationMs ?? processed.durationMs : processed.durationMs;

    const scheduledAt = query.scheduledAt ? new Date(query.scheduledAt) : null;
    const isFuture = scheduledAt != null && scheduledAt.getTime() > Date.now();

    const env = getEnv();
    const broadcast = await storyBroadcastsRepository.createBroadcastWithJobs({
      mediaType: query.mediaType,
      mediaUrl: processed.mediaUrl,
      thumbnailUrl: processed.thumbnailUrl,
      posterUrl: processed.posterUrl,
      optimizedFormat: processed.optimizedFormat,
      hlsManifestUrl: processed.hlsManifestUrl,
      hlsPreviewSegmentUrls: processed.hlsPreviewSegmentUrls,
      igMediaUrl: processed.igMediaUrl,
      mediaBytes: processed.mediaBytes,
      mediaWidth: processed.mediaWidth,
      mediaHeight: processed.mediaHeight,
      durationMs,
      caption: query.caption ?? null,
      ctaType: query.ctaType ?? null,
      ctaValue: query.ctaValue ?? null,
      ctaLabel: query.ctaLabel ?? null,
      groupName: query.groupName ?? env.STORY_BRAND_NAME,
      groupAvatarUrl: query.groupAvatarUrl ?? env.STORY_BRAND_AVATAR_URL,
      targetChannels: channels,
      expiresAt: new Date(query.expiresAt),
      scheduledAt,
      status: isFuture ? "scheduled" : "processing",
      createdBy: input.createdBy ?? null,
      channels,
      jobNextAttemptAt: isFuture ? scheduledAt : null,
    });

    // "Şimdi yayınla" ise worker'ı anında dürt (15sn polling beklemeden). Non-blocking.
    if (!isFuture) {
      void runStoryBroadcastWorkerTick().catch((err) =>
        console.error("[StoryBroadcast] anlık tick hatası:", err),
      );
    }

    return broadcastToDto(broadcast);
  }

  async list(query: ListBroadcastsQuery): Promise<{
    data: StoryBroadcastDto[];
    meta: { total: number; page: number; limit: number };
  }> {
    const { total, items } = await storyBroadcastsRepository.list({
      page: query.page,
      limit: query.limit,
      status: query.status,
    });
    return {
      data: items.map(broadcastToDto),
      meta: { total, page: query.page, limit: query.limit },
    };
  }

  async getById(id: string): Promise<StoryBroadcastDto> {
    const broadcast = await storyBroadcastsRepository.findById(id);
    if (!broadcast) {
      throw new ApiError(404, "broadcast_not_found", "Yayın bulunamadı.");
    }
    return broadcastToDto(broadcast);
  }

  /** Başarısız kanalları yeniden kuyruğa alır. */
  async retry(id: string): Promise<StoryBroadcastDto> {
    const broadcast = await storyBroadcastsRepository.findById(id);
    if (!broadcast) {
      throw new ApiError(404, "broadcast_not_found", "Yayın bulunamadı.");
    }
    const requeued = await storyBroadcastsRepository.requeueFailedJobs(id);
    await storyBroadcastsRepository.recomputeBroadcastStatus(id);
    if (requeued > 0) {
      void runStoryBroadcastWorkerTick().catch((err) =>
        console.error("[StoryBroadcast] retry tick hatası:", err),
      );
    }
    const updated = await storyBroadcastsRepository.findById(id);
    return broadcastToDto(updated!);
  }
}

export const storyBroadcastsService = new StoryBroadcastsService();
