/**
 * Catalog Category Overlay Seed — Metadata Only
 *
 * CategoryOverlay tablosu, ERP API'den gelen kategorilere
 * görsel zenginlik (banner görseli, CTA stili, aspect ratio) ekler.
 *
 * Görseller artık seed üzerinden değil, /v1/admin/catalog/overlays
 * endpoint'i üzerinden yüklenir (bkz. catalog-overlay.admin-controller.ts).
 *
 * Bu seed yalnızca varsayılan metadata'yı (display order, CTA, aspect ratio)
 * doldurur. imageUrl null bırakılır — admin upload sonrası dolar.
 *
 * Run with: npx ts-node prisma/seed-catalog.ts
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma';

/**
 * categoryId: ERP'deki gerçek kategori ID'leri.
 * Log çıktısından alınan ID'ler: ZİNCİRLER=1, MADALYONLAR=7, HİNT=11,
 * BİLEKLİKLER=17, SETLER=24, KELEPÇELER=36, KÜPE VE KÜNYE=42, YÜZÜKLER=56,
 * 14 AYAR=66, ŞAHMERAN=87.
 *
 * Yeni kategori eklendiğinde buraya ekleyebilir veya doğrudan
 * PATCH /v1/admin/catalog/overlays/:categoryId ile yaratabilirsin.
 */
const OVERLAYS = [
  {
    categoryId: 1, // ZİNCİRLER
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: 'Geleneksel dokunuşun modern yorumu.',
    displayOrder: 100,
    featured: true,
    ctaLabel: 'KEŞFET',
    ctaStyle: 'primary',
    aspectRatio: '3:4',
  },
  {
    categoryId: 7, // MADALYONLAR
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: 'Işığın en saf hali.',
    displayOrder: 90,
    featured: true,
    ctaLabel: 'İNCELE',
    ctaStyle: 'outline',
    aspectRatio: '1:1',
  },
  {
    categoryId: 17, // BİLEKLİKLER
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: 'Bir ömür boyu.',
    displayOrder: 80,
    featured: true,
    ctaLabel: 'KEŞFET',
    ctaStyle: 'primary',
    aspectRatio: '4:5',
  },
  {
    categoryId: 56, // YÜZÜKLER
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: 'Son eklenen parçalar.',
    displayOrder: 70,
    featured: true,
    ctaLabel: 'İNCELE',
    ctaStyle: 'outline',
    aspectRatio: '16:9',
  },
  {
    categoryId: 11, // HİNT
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: 'Hint işçiliğinin zarifliği.',
    displayOrder: 65,
    featured: true,
    ctaLabel: 'KEŞFET',
    ctaStyle: 'primary',
    aspectRatio: '3:4',
  },
  {
    categoryId: 24, // SETLER
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: 'Komple uyum.',
    displayOrder: 60,
    featured: true,
    ctaLabel: 'KEŞFET',
    ctaStyle: 'primary',
    aspectRatio: '3:4',
  },
  {
    categoryId: 36, // KELEPÇELER
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: 'Güçlü duruşun sembolü.',
    displayOrder: 55,
    featured: true,
    ctaLabel: 'İNCELE',
    ctaStyle: 'outline',
    aspectRatio: '3:4',
  },
  {
    categoryId: 42, // KÜPE VE KÜNYE
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: 'Her tarza uygun.',
    displayOrder: 50,
    featured: true,
    ctaLabel: 'KEŞFET',
    ctaStyle: 'primary',
    aspectRatio: '3:4',
  },
  {
    categoryId: 66, // 14 AYAR ÜRÜNLER
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: '14 ayar saflık.',
    displayOrder: 45,
    featured: true,
    ctaLabel: 'İNCELE',
    ctaStyle: 'outline',
    aspectRatio: '3:4',
  },
  {
    categoryId: 87, // ŞAHMERAN
    imageUrl: null,
    bannerTitle: null,
    bannerSubtitle: null,
    displayOrder: 40,
    featured: true,
    ctaLabel: 'KEŞFET',
    ctaStyle: 'primary',
    aspectRatio: '3:4',
  },
];

async function main() {
  console.log('🌱 Seeding catalog category overlay metadata (no images)...');

  // Geçersiz eski kayıtları temizle (ERP'de olmayan ID'ler)
  const validIds = OVERLAYS.map((o) => o.categoryId);
  const deleted = await prisma.categoryOverlay.deleteMany({
    where: { categoryId: { notIn: validIds } },
  });
  if (deleted.count > 0) {
    console.log(`  🗑  Silindi: ${deleted.count} stale overlay kaydı`);
  }

  for (const overlay of OVERLAYS) {
    // upsert ile çağırıyoruz — mevcut imageUrl'i KORU (varsa)
    const existing = await prisma.categoryOverlay.findUnique({
      where: { categoryId: overlay.categoryId },
    });

    if (existing) {
      // Mevcut imageUrl korunur, sadece metadata güncellenir
      const { imageUrl: _ignored, ...metadataOnly } = overlay;
      await prisma.categoryOverlay.update({
        where: { categoryId: overlay.categoryId },
        data: metadataOnly,
      });
      console.log(
        `  ↻ categoryId: ${overlay.categoryId} → metadata güncellendi (imageUrl korundu)`,
      );
    } else {
      await prisma.categoryOverlay.create({ data: overlay });
      console.log(`  ✅ categoryId: ${overlay.categoryId} → yeni kayıt (imageUrl: null)`);
    }
  }

  console.log(`\n🎉 Processed ${OVERLAYS.length} category overlays.`);
  console.log(`   Görselleri yüklemek için:`);
  console.log(`   curl -X POST --data-binary @photo.jpg \\`);
  console.log(`     -H "Authorization: Bearer <TOKEN>" \\`);
  console.log(`     -H "Content-Type: image/jpeg" \\`);
  console.log(`     https://akbenapi.ekler.app/v1/admin/catalog/overlays/<categoryId>/image`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
