import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { CtaType, MediaType, StoryGroupType } from "../src/generated/prisma";

/**
 * Seed — Geliştirme ortamı için örnek hikaye verileri.
 *
 * Medya URL'leri:
 * - Resimler: Unsplash (doğrudan CDN, hotlink friendly)
 * - Video: Cloudflare test stream (iOS AVPlayer uyumlu, H.264 MP4)
 */
async function main() {
  await prisma.storyView.deleteMany();
  await prisma.story.deleteMany();
  await prisma.storyGroup.deleteMany();

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // ── 1. Yeni Sezon (resim + video) ──
  await prisma.storyGroup.create({
    data: {
      name: "Yeni Sezon",
      avatarUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&h=200&fit=crop",
      type: StoryGroupType.brand,
      priority: 10,
      stories: {
        create: [
          {
            mediaUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1080&h=1920&fit=crop",
            thumbnailUrl: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=200&h=200&fit=crop",
            posterUrl: null,
            mediaType: MediaType.image,
            durationMs: 5000,
            order: 1,
            expiresAt: expires,
            ctaType: CtaType.product,
            ctaValue: "product_123",
            ctaLabel: "Ürünü İncele",
          },
          {
            // Test video: w3schools H.264 MP4 — iOS AVPlayer uyumlu, hotlink izinli
            mediaUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
            thumbnailUrl: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=200&h=200&fit=crop",
            posterUrl: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=1080&h=1920&fit=crop",
            mediaType: MediaType.video,
            durationMs: 15000,
            order: 2,
            expiresAt: expires,
            ctaType: CtaType.link,
            ctaValue: "https://example.com/kampanya",
            ctaLabel: "Kampanyayı Gör",
          },
        ],
      },
    },
  });

  // ── 2. Haftanın Ürünleri (sadece resim) ──
  await prisma.storyGroup.create({
    data: {
      name: "Haftanın Ürünleri",
      avatarUrl: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=200&h=200&fit=crop",
      type: StoryGroupType.brand,
      priority: 7,
      stories: {
        create: [
          {
            mediaUrl: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=1080&h=1920&fit=crop",
            thumbnailUrl: "https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?w=200&h=200&fit=crop",
            mediaType: MediaType.image,
            durationMs: 4000,
            order: 1,
            expiresAt: expires,
            ctaType: CtaType.collection,
            ctaValue: "col_99",
            ctaLabel: "Koleksiyonu Aç",
          },
        ],
      },
    },
  });

  // ── 3. Topluluk (sadece resim) ──
  await prisma.storyGroup.create({
    data: {
      name: "Topluluk",
      avatarUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&h=200&fit=crop",
      type: StoryGroupType.user,
      priority: 3,
      stories: {
        create: [
          {
            mediaUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=1080&h=1920&fit=crop",
            thumbnailUrl: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=200&h=200&fit=crop",
            mediaType: MediaType.image,
            durationMs: 6000,
            order: 1,
            expiresAt: expires,
            ctaType: CtaType.design,
            ctaValue: "design_42",
            ctaLabel: "Tasarımı Gör",
          },
        ],
      },
    },
  });

  console.log("✅ Seed tamamlandı — 3 grup, 4 story oluşturuldu.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
