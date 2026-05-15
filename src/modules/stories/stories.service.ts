import { ApiError } from "../../utils/apiError";
import type { PatchSeenBody } from "./stories.schema";
import type { CreateStoryUploadQuery } from "./stories.admin.schema";
import { storiesRepository } from "./stories.repository";
import { storyMediaProcessor } from "./story-media.processor";

export class StoriesService {
  async markSeen(userId: string, storyId: string, body: PatchSeenBody) {
    const now = new Date();
    const story = await storiesRepository.findActiveById(storyId, now);
    if (!story) {
      throw new ApiError(
        404,
        "story_not_found",
        "Requested story does not exist or has expired.",
      );
    }

    const seenAt = new Date(body.seenAt);
    const ctaClickedAt = body.ctaClickedAt ? new Date(body.ctaClickedAt) : null;

    await storiesRepository.upsertView({
      userId,
      storyId,
      seenAt,
      completed: body.completed,
      ctaClicked: body.ctaClicked,
      ctaClickedAt,
      platform: body.platform,
    });

    return {
      storyId,
      isSeen: true,
      seenAt: seenAt.toISOString(),
      completed: body.completed,
      ctaClicked: body.ctaClicked,
      ctaClickedAt: ctaClickedAt?.toISOString() ?? null,
    };
  }

  async createStoryFromUpload(input: {
    groupId: string;
    query: CreateStoryUploadQuery;
    binary: Buffer;
    contentType?: string;
    originalFilename?: string;
    publicBaseUrl: string;
  }) {
    const group = await storiesRepository.findGroupById(input.groupId);
    if (!group) {
      throw new ApiError(404, "story_group_not_found", "Story group was not found.");
    }

    if (!Buffer.isBuffer(input.binary) || input.binary.length === 0) {
      throw new ApiError(400, "missing_binary_body", "Story upload body must be raw media bytes.");
    }

    const processed = await storyMediaProcessor.process({
      buffer: input.binary,
      expectedMediaType: input.query.mediaType,
      contentType: input.contentType,
      originalFilename: input.originalFilename,
      publicBaseUrl: input.publicBaseUrl,
      imageFormat: input.query.imageFormat,
      videoOverflowPolicy: input.query.overflowPolicy,
    });

    const durationMs =
      input.query.mediaType === "image"
        ? input.query.durationMs ?? processed.durationMs
        : processed.durationMs;

    const story = await storiesRepository.createProcessedStory({
      groupId: input.groupId,
      mediaType: input.query.mediaType,
      mediaUrl: processed.mediaUrl,
      thumbnailUrl: processed.thumbnailUrl,
      posterUrl: processed.posterUrl,
      originalMediaUrl: null,
      optimizedFormat: processed.optimizedFormat,
      hlsManifestUrl: processed.hlsManifestUrl,
      hlsPreviewSegmentUrls: processed.hlsPreviewSegmentUrls,
      mediaBytes: processed.mediaBytes,
      mediaWidth: processed.mediaWidth,
      mediaHeight: processed.mediaHeight,
      durationMs,
      order: input.query.order,
      expiresAt: new Date(input.query.expiresAt),
      ctaType: input.query.ctaType ?? null,
      ctaValue: input.query.ctaValue ?? null,
      ctaLabel: input.query.ctaLabel ?? null,
      processedAt: new Date(),
    });

    return story;
  }
}

export const storiesService = new StoriesService();
