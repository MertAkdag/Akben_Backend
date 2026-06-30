import { CtaType } from "../../generated/prisma/index";
import type { BroadcastWithJobs } from "../story-broadcasts/story-broadcasts.repository";

export type StoryChannelName = "inapp" | "instagram" | "whatsapp";
export type ChannelJobStatusName =
  | "pending"
  | "processing"
  | "published"
  | "failed"
  | "skipped";
export type BroadcastStatusName =
  | "scheduled"
  | "processing"
  | "partial"
  | "completed"
  | "failed";

export type StoryChannelJobDto = {
  channel: StoryChannelName;
  status: ChannelJobStatusName;
  attempts: number;
  maxAttempts: number;
  externalId: string | null;
  lastError: string | null;
  nextAttemptAt: string | null;
  publishedAt: string | null;
};

export type StoryBroadcastDto = {
  id: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  thumbnailUrl: string;
  posterUrl: string | null;
  igMediaUrl: string | null;
  durationMs: number;
  caption: string | null;
  cta: { type: "product" | "collection" | "link" | "design"; value: string; label: string } | null;
  groupName: string;
  groupAvatarUrl: string;
  targetChannels: StoryChannelName[];
  expiresAt: string;
  scheduledAt: string | null;
  status: BroadcastStatusName;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  jobs: StoryChannelJobDto[];
};

function ctaTypeToApi(t: CtaType): "product" | "collection" | "link" | "design" {
  switch (t) {
    case CtaType.product:
      return "product";
    case CtaType.collection:
      return "collection";
    case CtaType.link:
      return "link";
    case CtaType.design:
      return "design";
    default: {
      const _exhaustive: never = t;
      return _exhaustive;
    }
  }
}

export function broadcastToDto(b: BroadcastWithJobs): StoryBroadcastDto {
  return {
    id: b.id,
    mediaType: b.mediaType === "video" ? "video" : "image",
    mediaUrl: b.mediaUrl,
    thumbnailUrl: b.thumbnailUrl,
    posterUrl: b.posterUrl,
    igMediaUrl: b.igMediaUrl,
    durationMs: b.durationMs,
    caption: b.caption,
    cta:
      b.ctaType && b.ctaValue != null && b.ctaLabel != null
        ? { type: ctaTypeToApi(b.ctaType), value: b.ctaValue, label: b.ctaLabel }
        : null,
    groupName: b.groupName,
    groupAvatarUrl: b.groupAvatarUrl,
    targetChannels: b.targetChannels as StoryChannelName[],
    expiresAt: b.expiresAt.toISOString(),
    scheduledAt: b.scheduledAt ? b.scheduledAt.toISOString() : null,
    status: b.status as BroadcastStatusName,
    createdBy: b.createdBy,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
    jobs: b.jobs
      .slice()
      .sort((a, c) => a.channel.localeCompare(c.channel))
      .map((j) => ({
        channel: j.channel as StoryChannelName,
        status: j.status as ChannelJobStatusName,
        attempts: j.attempts,
        maxAttempts: j.maxAttempts,
        externalId: j.externalId,
        lastError: j.lastError,
        nextAttemptAt: j.nextAttemptAt ? j.nextAttemptAt.toISOString() : null,
        publishedAt: j.publishedAt ? j.publishedAt.toISOString() : null,
      })),
  };
}
