import type { Prisma } from "../../generated/prisma/index";
import { prisma } from "../../config/prisma";
import { decodeStoryGroupCursor } from "../../utils/cursor";

export class StoryGroupsRepository {
  async countActiveGroups(now: Date): Promise<number> {
    return prisma.storyGroup.count({
      where: {
        stories: {
          some: { expiresAt: { gt: now } },
        },
      },
    });
  }

  async findGroupsPage(params: {
    now: Date;
    limit: number;
    cursor: string | undefined;
  }): Promise<
    Prisma.StoryGroupGetPayload<{
      include: {
        stories: true;
      };
    }>[]
  > {
    const { now, limit, cursor } = params;

    const where: Prisma.StoryGroupWhereInput = {
      stories: {
        some: { expiresAt: { gt: now } },
      },
    };

    if (cursor) {
      const { p, id } = decodeStoryGroupCursor(cursor);
      where.AND = [
        {
          OR: [{ priority: { lt: p } }, { AND: [{ priority: p }, { id: { gt: id } }] }],
        },
      ];
    }

    return prisma.storyGroup.findMany({
      where,
      orderBy: [{ priority: "desc" }, { id: "asc" }],
      take: limit + 1,
      include: {
        stories: {
          where: { expiresAt: { gt: now } },
          orderBy: { order: "asc" },
        },
      },
    });
  }

  async findGroupWithActiveStories(groupId: string, now: Date) {
    return prisma.storyGroup.findUnique({
      where: { id: groupId },
      include: {
        stories: {
          where: { expiresAt: { gt: now } },
          orderBy: { order: "asc" },
        },
      },
    });
  }
}

export const storyGroupsRepository = new StoryGroupsRepository();
