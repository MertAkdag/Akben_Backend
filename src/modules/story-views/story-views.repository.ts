import type { StoryViewItemInput } from "./story-views.schema";
import { prisma } from "../../config/prisma";
import { Platform } from "../../generated/prisma/index";

export class StoryViewsRepository {
  async batchCreateViews(userId: string, views: StoryViewItemInput[]): Promise<{ processed: number; skipped: number }> {
    const now = new Date();
    const storyIds = [...new Set(views.map((v) => v.storyId))];
    const activeStories = await prisma.story.findMany({
      where: {
        id: { in: storyIds },
        expiresAt: { gt: now },
      },
      select: { id: true },
    });
    const validIds = new Set(activeStories.map((s) => s.id));

    let processed = 0;
    let skipped = 0;
    const writtenInRequest = new Set<string>();

    await prisma.$transaction(async (tx) => {
      for (const v of views) {
        if (!validIds.has(v.storyId)) {
          skipped++;
          continue;
        }
        if (writtenInRequest.has(v.storyId)) {
          skipped++;
          continue;
        }

        const existing = await tx.storyView.findUnique({
          where: { userId_storyId: { userId, storyId: v.storyId } },
        });
        if (existing) {
          skipped++;
          continue;
        }

        const p =
          v.platform === "ios" ? Platform.ios : v.platform === "android" ? Platform.android : Platform.web;

        await tx.storyView.create({
          data: {
            userId,
            storyId: v.storyId,
            seenAt: new Date(v.seenAt),
            completed: v.completed,
            ctaClicked: v.ctaClicked,
            ctaClickedAt: v.ctaClickedAt ? new Date(v.ctaClickedAt) : null,
            platform: p,
          },
        });
        writtenInRequest.add(v.storyId);
        processed++;
      }
    });

    return { processed, skipped };
  }
}

export const storyViewsRepository = new StoryViewsRepository();
