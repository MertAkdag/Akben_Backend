import { prisma } from "../../config/prisma";
import { Platform } from "../../generated/prisma/index";

export class StoriesRepository {
  async findGroupById(groupId: string) {
    return prisma.storyGroup.findUnique({
      where: { id: groupId },
      select: { id: true },
    });
  }

  async findActiveById(storyId: string, now: Date) {
    return prisma.story.findFirst({
      where: {
        id: storyId,
        expiresAt: { gt: now },
      },
    });
  }

  async upsertView(input: {
    userId: string;
    storyId: string;
    seenAt: Date;
    completed: boolean;
    ctaClicked: boolean;
    ctaClickedAt: Date | null;
    platform: "ios" | "android" | "web";
  }) {
    const p =
      input.platform === "ios"
        ? Platform.ios
        : input.platform === "android"
          ? Platform.android
          : Platform.web;

    return prisma.storyView.upsert({
      where: {
        userId_storyId: { userId: input.userId, storyId: input.storyId },
      },
      create: {
        userId: input.userId,
        storyId: input.storyId,
        seenAt: input.seenAt,
        completed: input.completed,
        ctaClicked: input.ctaClicked,
        ctaClickedAt: input.ctaClickedAt,
        platform: p,
      },
      update: {
        seenAt: input.seenAt,
        completed: input.completed,
        ctaClicked: input.ctaClicked,
        ctaClickedAt: input.ctaClickedAt,
        platform: p,
      },
    });
  }

  async createProcessedStory(input: {
    groupId: string;
    mediaType: "image" | "video";
    mediaUrl: string;
    thumbnailUrl: string;
    posterUrl: string | null;
    originalMediaUrl: string | null;
    optimizedFormat: string;
    hlsManifestUrl: string | null;
    hlsPreviewSegmentUrls: string[];
    mediaBytes: number;
    mediaWidth: number | null;
    mediaHeight: number | null;
    durationMs: number;
    order: number;
    expiresAt: Date;
    ctaType: "product" | "collection" | "link" | "design" | null;
    ctaValue: string | null;
    ctaLabel: string | null;
    processedAt: Date;
  }) {
    return prisma.story.create({
      data: {
        groupId: input.groupId,
        mediaType: input.mediaType === "image" ? "image" : "video",
        mediaUrl: input.mediaUrl,
        thumbnailUrl: input.thumbnailUrl,
        posterUrl: input.posterUrl,
        originalMediaUrl: input.originalMediaUrl,
        optimizedFormat: input.optimizedFormat,
        hlsManifestUrl: input.hlsManifestUrl,
        hlsPreviewSegmentUrls: input.hlsPreviewSegmentUrls,
        mediaBytes: input.mediaBytes,
        mediaWidth: input.mediaWidth,
        mediaHeight: input.mediaHeight,
        durationMs: input.durationMs,
        order: input.order,
        expiresAt: input.expiresAt,
        ctaType: input.ctaType,
        ctaValue: input.ctaValue,
        ctaLabel: input.ctaLabel,
        processedAt: input.processedAt,
      },
    });
  }
}

export const storiesRepository = new StoriesRepository();
