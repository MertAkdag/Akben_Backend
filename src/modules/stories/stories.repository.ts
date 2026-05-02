import { prisma } from "../../config/prisma";
import { Platform } from "../../generated/prisma/index";

export class StoriesRepository {
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
}

export const storiesRepository = new StoriesRepository();
