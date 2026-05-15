import "dotenv/config";
import { prisma } from "../src/config/prisma";
import { CtaType, MediaType, StoryGroupType } from "../src/generated/prisma";

/**
 * Seed — Geliştirme ortamı için örnek hikaye ve flash deal verileri.
 */
async function main() {
  await prisma.storyView.deleteMany();
  await prisma.story.deleteMany();
  await prisma.storyGroup.deleteMany();
  await prisma.flashDealInteraction.deleteMany();
  await prisma.flashDeal.deleteMany();

  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  // ── 1. Yeni Sezon ──
  await prisma.storyGroup.create({
    data: {
      name: "Yeni Sezon",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAegyctXDgJk0-5PJLxExHSSp-INbDHUefGI3COUA86ikwoQXFSTpLj3okjQkcDAExuiAILfxTQJyu2BnygiDThy3YUMjI4rMmnu4LnCPTeXcPtJmXan2yta5aZxce26ig4Wqr8DNOFmMh1qLWxNqfyqI-NXPYLJUaMG8KaWjr6PvxBut1fXuV3jEifMZuKUDybCpgrUwrya2MhvZmMdLKBSHRorYZIxlFkFw2vP9F1g3pCeCKuHh_rpaipFXwX67qIb3WUmUIDV0o",
      type: StoryGroupType.brand,
      priority: 40,
      stories: {
        create: [
          {
            mediaUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAegyctXDgJk0-5PJLxExHSSp-INbDHUefGI3COUA86ikwoQXFSTpLj3okjQkcDAExuiAILfxTQJyu2BnygiDThy3YUMjI4rMmnu4LnCPTeXcPtJmXan2yta5aZxce26ig4Wqr8DNOFmMh1qLWxNqfyqI-NXPYLJUaMG8KaWjr6PvxBut1fXuV3jEifMZuKUDybCpgrUwrya2MhvZmMdLKBSHRorYZIxlFkFw2vP9F1g3pCeCKuHh_rpaipFXwX67qIb3WUmUIDV0o",
            thumbnailUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuAegyctXDgJk0-5PJLxExHSSp-INbDHUefGI3COUA86ikwoQXFSTpLj3okjQkcDAExuiAILfxTQJyu2BnygiDThy3YUMjI4rMmnu4LnCPTeXcPtJmXan2yta5aZxce26ig4Wqr8DNOFmMh1qLWxNqfyqI-NXPYLJUaMG8KaWjr6PvxBut1fXuV3jEifMZuKUDybCpgrUwrya2MhvZmMdLKBSHRorYZIxlFkFw2vP9F1g3pCeCKuHh_rpaipFXwX67qIb3WUmUIDV0o",
            posterUrl: null,
            mediaType: MediaType.image,
            durationMs: 5000,
            order: 1,
            expiresAt: expires,
            ctaType: CtaType.product,
            ctaValue: "product_123",
            ctaLabel: "Ürünü İncele",
          }
        ],
      },
    },
  });

  // ── 2. Topluluk ──
  await prisma.storyGroup.create({
    data: {
      name: "Topluluk",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBWIcPkJsjD3Qm_NpVn1VSJukRV2bKpng_NofPqytX0j2KSyyo95luPcnOCUUk73ErGS-ZIYNLm9hLtIN2MCmtrxoJ7Qf3lmJ-35ta7l8KlSFKb-P5T93Y25CHm9PhOcYphbK4JAspObjagVokpRyE4dH2H7gdqAdc8XG9vDhxwTny3MrPWH3aziqm3yMJ4_4dxMnO_wuh-_MNbZN4B9pCDWuHkGGuM66esJb8nqd08NnmXUN7neWuA_EBA_eDHGMJaa5EOdj1-qHQ",
      type: StoryGroupType.user,
      priority: 30,
      stories: {
        create: [
          {
            mediaUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBWIcPkJsjD3Qm_NpVn1VSJukRV2bKpng_NofPqytX0j2KSyyo95luPcnOCUUk73ErGS-ZIYNLm9hLtIN2MCmtrxoJ7Qf3lmJ-35ta7l8KlSFKb-P5T93Y25CHm9PhOcYphbK4JAspObjagVokpRyE4dH2H7gdqAdc8XG9vDhxwTny3MrPWH3aziqm3yMJ4_4dxMnO_wuh-_MNbZN4B9pCDWuHkGGuM66esJb8nqd08NnmXUN7neWuA_EBA_eDHGMJaa5EOdj1-qHQ",
            thumbnailUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuBWIcPkJsjD3Qm_NpVn1VSJukRV2bKpng_NofPqytX0j2KSyyo95luPcnOCUUk73ErGS-ZIYNLm9hLtIN2MCmtrxoJ7Qf3lmJ-35ta7l8KlSFKb-P5T93Y25CHm9PhOcYphbK4JAspObjagVokpRyE4dH2H7gdqAdc8XG9vDhxwTny3MrPWH3aziqm3yMJ4_4dxMnO_wuh-_MNbZN4B9pCDWuHkGGuM66esJb8nqd08NnmXUN7neWuA_EBA_eDHGMJaa5EOdj1-qHQ",
            mediaType: MediaType.image,
            durationMs: 4000,
            order: 1,
            expiresAt: expires,
            ctaType: CtaType.collection,
            ctaValue: "col_99",
            ctaLabel: "Topluluğu İncele",
          },
        ],
      },
    },
  });

  // ── 3. Pırlanta ──
  await prisma.storyGroup.create({
    data: {
      name: "Pırlanta",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZApeMnAeeoeYeBwgG0jz3TVsuy7PqlhsWxM6S6DqshGgXMzBV2dUQYbTvMSFyEAo1wDrnN8wIu26y9ufi-9EFf7-Ggkl6J2OJBfcsgw_GMw4Cj8qoMyrHP2mefi2LD80vgxlXKIlfmtKJR2Xp3J39tqKL3i4rrOj-WXDYjVg1PHQbDKd99uWn9WnEn5yM0hr3iFVhSJauWISThiCpG7HchAYDiJfHLSckP8-4TGub8CiLubmsO9UHXIqU9kHuj-mRBQSmmBRENtw",
      type: StoryGroupType.brand,
      priority: 20,
      stories: {
        create: [
          {
            mediaUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZApeMnAeeoeYeBwgG0jz3TVsuy7PqlhsWxM6S6DqshGgXMzBV2dUQYbTvMSFyEAo1wDrnN8wIu26y9ufi-9EFf7-Ggkl6J2OJBfcsgw_GMw4Cj8qoMyrHP2mefi2LD80vgxlXKIlfmtKJR2Xp3J39tqKL3i4rrOj-WXDYjVg1PHQbDKd99uWn9WnEn5yM0hr3iFVhSJauWISThiCpG7HchAYDiJfHLSckP8-4TGub8CiLubmsO9UHXIqU9kHuj-mRBQSmmBRENtw",
            thumbnailUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuDZApeMnAeeoeYeBwgG0jz3TVsuy7PqlhsWxM6S6DqshGgXMzBV2dUQYbTvMSFyEAo1wDrnN8wIu26y9ufi-9EFf7-Ggkl6J2OJBfcsgw_GMw4Cj8qoMyrHP2mefi2LD80vgxlXKIlfmtKJR2Xp3J39tqKL3i4rrOj-WXDYjVg1PHQbDKd99uWn9WnEn5yM0hr3iFVhSJauWISThiCpG7HchAYDiJfHLSckP8-4TGub8CiLubmsO9UHXIqU9kHuj-mRBQSmmBRENtw",
            mediaType: MediaType.image,
            durationMs: 6000,
            order: 1,
            expiresAt: expires,
            ctaType: CtaType.design,
            ctaValue: "design_42",
            ctaLabel: "Pırlantayı Gör",
          },
        ],
      },
    },
  });

  // ── 4. Alyans ──
  await prisma.storyGroup.create({
    data: {
      name: "Alyans",
      avatarUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7-Q5_VOAqrDTd3mlYBGR1zPzVeM54nL8xFOxFzyW2dL1UcMoJBznwBCgw8tY7LFZ_mBgl_zzcI3Ws4X9EDStZH_LHMln4xBPusk6i1SYED44gxqYH8MbDLLHh5GOuoHiG4RBfIcyJCul-Z_oywqicKzmUb48Bqf2-8FlvrG5eYid8WU9Xp1ZGHAeWNuo3Q5CUmP-zR-RBCyycRhwbZxWiKrewAg04rQj6-geEWwdqaGY5oJVlZcsXPEi7s36mjckqY6s19uHamHc",
      type: StoryGroupType.brand,
      priority: 10,
      stories: {
        create: [
          {
            mediaUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7-Q5_VOAqrDTd3mlYBGR1zPzVeM54nL8xFOxFzyW2dL1UcMoJBznwBCgw8tY7LFZ_mBgl_zzcI3Ws4X9EDStZH_LHMln4xBPusk6i1SYED44gxqYH8MbDLLHh5GOuoHiG4RBfIcyJCul-Z_oywqicKzmUb48Bqf2-8FlvrG5eYid8WU9Xp1ZGHAeWNuo3Q5CUmP-zR-RBCyycRhwbZxWiKrewAg04rQj6-geEWwdqaGY5oJVlZcsXPEi7s36mjckqY6s19uHamHc",
            thumbnailUrl: "https://lh3.googleusercontent.com/aida-public/AB6AXuB7-Q5_VOAqrDTd3mlYBGR1zPzVeM54nL8xFOxFzyW2dL1UcMoJBznwBCgw8tY7LFZ_mBgl_zzcI3Ws4X9EDStZH_LHMln4xBPusk6i1SYED44gxqYH8MbDLLHh5GOuoHiG4RBfIcyJCul-Z_oywqicKzmUb48Bqf2-8FlvrG5eYid8WU9Xp1ZGHAeWNuo3Q5CUmP-zR-RBCyycRhwbZxWiKrewAg04rQj6-geEWwdqaGY5oJVlZcsXPEi7s36mjckqY6s19uHamHc",
            mediaType: MediaType.image,
            durationMs: 6000,
            order: 1,
            expiresAt: expires,
            ctaType: CtaType.design,
            ctaValue: "design_42",
            ctaLabel: "Alyansı Gör",
          },
        ],
      },
    },
  });

  // ── 4. Flash Deals ──
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Aktif Fırsat
  await prisma.flashDeal.create({
    data: {
      title: "22 Ayar Burma Bilezik",
      subtitle: "El İşçiliği — Trabzon",
      description: "Özel tasarım, 22 ayar altın burma bilezik. Düğün sezonuna özel sınırlı stok.",
      imageUrl: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80",
      imageUrls: [
        "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=800&q=80",
        "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&q=80"
      ],
      originalMilyem: 1.15,
      dealMilyem: 1.08,
      discountPercent: 6.09,
      totalStock: 10,
      remainingStock: 7,
      type: "daily",
      startsAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      endsAt: tomorrow,
      status: "active",
      priority: 10,
      ctaLabel: "Hemen Al",
      ctaType: "product",
      ctaValue: "p_bilezik_001",
      productId: "p_bilezik_001",
    }
  });

  // Yaklaşan Fırsat
  await prisma.flashDeal.create({
    data: {
      title: "Pırlanta Tektaş Kolye",
      subtitle: "0.25 Karat — I/VS1",
      description: "Zarif pırlanta tektaş kolye. Sertifikalı ve özel kutusunda.",
      imageUrl: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80",
      originalMilyem: 1.45,
      dealMilyem: 1.25,
      discountPercent: 13.79,
      totalStock: 5,
      remainingStock: 5,
      type: "flash",
      startsAt: tomorrow,
      endsAt: nextWeek,
      status: "scheduled",
      priority: 5,
      ctaLabel: "Alarm Kur",
      ctaType: "link",
      ctaValue: "/notify/p_kolye_002",
      productId: "p_kolye_002",
    }
  });

  console.log("✅ Seed tamamlandı — 3 grup, 4 story ve 2 flash deal oluşturuldu.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
