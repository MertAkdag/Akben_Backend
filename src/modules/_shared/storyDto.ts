import type { Story, StoryGroup, StoryView } from "../../generated/prisma/index";
import { CtaType, MediaType, Platform, StoryGroupType } from "../../generated/prisma/index";

// ─────────────────────────────────────────────
// DTO Tipleri — Dokümantasyonla 1:1 Uyumlu
// ─────────────────────────────────────────────

/**
 * CTA DTO — Dokümantasyondaki CTA modeline uygun.
 * `type` alanı enum ile sınırlandırılmıştır.
 */
export type CtaDto = {
  type: "product" | "collection" | "link" | "design";
  value: string;
  label: string;
};

/**
 * Story DTO — Dokümantasyondaki Story modeline uygun.
 * `mediaType` alanı enum ile sınırlandırılmıştır.
 */
export type StoryDto = {
  id: string;
  mediaUrl: string;
  thumbnailUrl: string;
  posterUrl: string | null;
  mediaType: "image" | "video";
  optimizedFormat: string | null;
  hlsManifestUrl: string | null;
  hlsPreviewSegmentUrls: string[];
  mediaBytes: number | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  durationMs: number;
  order: number;
  createdAt: string;
  expiresAt: string;
  isSeen: boolean;
  seenAt: string | null;
  cta: CtaDto | null;
};

/**
 * StoryGroup DTO — Dokümantasyondaki StoryGroup modeline uygun.
 * `type` alanı enum ile sınırlandırılmıştır.
 */
export type StoryGroupDto = {
  id: string;
  name: string;
  avatarUrl: string;
  type: "brand" | "user";
  priority: number;
  isSeen: boolean;
  stories: StoryDto[];
};

// ─────────────────────────────────────────────
// Dönüştürücü Fonksiyonlar
// ─────────────────────────────────────────────

/**
 * Prisma Story modelini API DTO'suna dönüştürür.
 * view parametresi varsa isSeen/seenAt hesaplanır.
 */
export function storyToDto(story: Story, view?: StoryView | null): StoryDto {
  return {
    id: story.id,
    mediaUrl: story.mediaType === MediaType.video && story.hlsManifestUrl ? story.hlsManifestUrl : story.mediaUrl,
    thumbnailUrl: story.thumbnailUrl,
    posterUrl: story.posterUrl,
    mediaType: mediaTypeToApi(story.mediaType),
    optimizedFormat: story.optimizedFormat,
    hlsManifestUrl: story.hlsManifestUrl,
    hlsPreviewSegmentUrls: story.hlsPreviewSegmentUrls,
    mediaBytes: story.mediaBytes,
    mediaWidth: story.mediaWidth,
    mediaHeight: story.mediaHeight,
    durationMs: story.durationMs,
    order: story.order,
    createdAt: story.createdAt.toISOString(),
    expiresAt: story.expiresAt.toISOString(),
    isSeen: Boolean(view),
    seenAt: view ? view.seenAt.toISOString() : null,
    cta:
      story.ctaType && story.ctaValue != null && story.ctaLabel != null
        ? { type: ctaTypeToApi(story.ctaType), value: story.ctaValue, label: story.ctaLabel }
        : null,
  };
}

/**
 * Prisma StoryGroup modelini API DTO'suna dönüştürür.
 * isSeen: gruptaki TÜM story'ler görüldüyse true.
 */
export function groupToDto(group: StoryGroup, stories: Story[], viewsByStoryId: Map<string, StoryView>): StoryGroupDto {
  const storyDtos = stories.map((s) => storyToDto(s, viewsByStoryId.get(s.id)));
  const allSeen = storyDtos.length > 0 && storyDtos.every((s) => s.isSeen);
  return {
    id: group.id,
    name: group.name,
    avatarUrl: group.avatarUrl,
    type: groupTypeToApi(group.type),
    priority: group.priority,
    isSeen: allSeen,
    stories: storyDtos,
  };
}

// ─────────────────────────────────────────────
// Enum Dönüştürücüler
// ─────────────────────────────────────────────

function groupTypeToApi(t: StoryGroupType): "brand" | "user" {
  return t === StoryGroupType.brand ? "brand" : "user";
}

function mediaTypeToApi(t: MediaType): "image" | "video" {
  return t === MediaType.image ? "image" : "video";
}

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
    default:
      // Exhaustive check — Prisma enum yeni değer alırsa compile-time hata verir
      const _exhaustive: never = t;
      return _exhaustive;
  }
}

export function toPrismaPlatform(p: "ios" | "android" | "web"): Platform {
  if (p === "ios") return Platform.ios;
  if (p === "android") return Platform.android;
  return Platform.web;
}
