/**
 * Catalog Category Overlay Seed — Visual Enrichment Data
 *
 * CategoryOverlay tablosu, ERP API'den gelen kategorilere
 * görsel zenginlik (banner görseli, CTA stili, aspect ratio) ekler.
 * Kategori isimleri ve ID'leri ERP'den gelir — burada sadece
 * görseller ve sunum bilgileri seed edilir.
 *
 * Run with: npx ts-node prisma/seed-catalog.ts
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma';

/**
 * categoryId: ERP'deki gerçek kategori ID'leri.
 * Log çıktısından alınan ID'ler: ZİNCİRLER=1, MADALYONLAR=7, HİNT=11,
 * BİLEKLİKLER=17, SETLER=24, KELEPÇELER=36, KÜPE VE KÜNYE=42, YÜZÜKLER=56, 14 AYAR=66
 */
const OVERLAYS = [
  {
    categoryId: 1, // ZİNCİRLER
    imageUrl: 'https://lh3.googleusercontent.com/aida/ADBb0ujFriYsj3ctkXlbkoKcTNDqXXf7Icn-k4J3rca9daYIxLeimu9d21v2SCUNswA2IPPPsnCshcTCauZcFx0qkoX4hfYchTarwX2tWD1jL5QQmVLONZZtUWRQVA7Y7VFsHnrqshkezfqqe5XpLkjsGpy11HZVaFoL9MXnOy83WqqIenmcqoAULNAYVJfnro5tRCsCJzSzYHsUd0jaA3wc64S_WoLe1H6ctPqqjz9YzVEHB8WYnA9BZXuSs9Y',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida/ADBb0uh8QNVE9AeR2WJRQL-ZI-1CBR8LO7cZmWdo1ck71TurhRHkFIKindwvJc5Xq9htJIuGqj45kzU9jiHWKooNEkytDOjAmQTvQ3QN_wqlyVwnQP65pHA_L8-OoNZgX1SWNE5BXu-grPYNqEyIYFUR4nW4Je8xRVhSleiMy3ycVaLIIS8AfjII5q2d0wetzFLxGdJUyH_2QOaBgQdIh61-jV3t3aT-7E1-jbn1ogWae9wxB2q1Jo322iSJ934',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida/ADBb0uiiS60GIYBSeLp_DCXtMrbeawMNm7yIVnp0uI-MI6XbsOyMonK6RHJOBYlkBQ-tq6FItvYu2hBcfdG6zWC3o-iqp3OmkoV-j8Teygv1S6epszYP6LhVWhkiwPVjOIz2aD8tIVhGuOx_YdoeX4VCV4I-s3qCY9tQg0PfgzvforRDN4pSjoX5-kdzoGclOomJbZar5ISPGmPwVd8Fi01t7Ec63jydpNZ4mfVbrBmu8e4wG3T1m6XStptet5s',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida/ADBb0uh0Ewaq2CP8rA0mIYf0xq6eit3ksshrvr07gnTRP6F4DHLVJUqmzHwIBuRGWYNSVDLrt-wWUaRuMSH57JUZ7hw2Sa8I1jeja_pPm1MiD7vm0_qtRZ-BMGQ29d-iILjbrRNejvs7ZhfZGPxEs6wJ3oQ2dOHG4SbP2kSNqb86-KpyrU5HP5CGPeX27fUnf_4PFdTzNnez9eQZD0pD5ae23aULWKDA0R_Eccwk_pfIcjL0mdbIS1uaJq1Oyw',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida/ADBb0uh6rZlk1CuezKAsQ4DNgNNMFf-sXQjy5vytvAt9qUUBBroN7r5t30IyKXWKWK2riRAIGzRJrzEWAJTmkSzEdvU2o-DFyKnOCEFScZcUB_1mdUONR77xZ9560BtqjMwAx-NO3bBOEIQCZPxXXKgzZQR3MH4Xl-3wK0piBSsB_iR2tOmgOnKIB1pXiuDSKCLHqrDeVA2-DUpcyFhSo8RRCJhFw7UWDIt_61gvhzoL54K5Uw-GbVDhHlblFw',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida/ADBb0uidE7r3sBQP_2qPT9DgxOf5-eqI5cMhoMSR7XjorxzcipyocWQpnThhZVa0GPF_Z-g4UU4UAWfjjF26hZyFx6qwDRQqeIdlA-oHfg-hrf0Bt6HUK2OiEl0eWKVdYC3i1IJhv6KTUYVo-Bnv8wIRt4Z8wUmqfDK1rTd0EGXIP3FTho8y02B_-gYNNaSiDUx3plhit6PO-A0RoLtRUfZLcvVz2GbZ_qSFZhLDjfM-zXeHV7ARmoKrr6A6aA',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida/ADBb0uhNoDytd8Ld6kI-AH-WT4HENELPDjLKD8sBTaXUMzIwCxduxYhE26IDG0y-QaXmCB-gp1gMOKafLmUkOQs3THl2_guuw9mr2yQAvfri_1hZnJhUUfsxFQxm-vEtBbT3yzJW35RFX2SqO0Sy-lPxQoJAg7sHaH8Gjnh442LcP_s-sUpgTmeifNKPKkv8Q6xLl29g3rRiJF-2NDeuCbWMcuGRcj1Gr1RHECHLUlzF5YyssYULf1_4b9B-m_4',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida/ADBb0ujWBwFfs2qym8ru_uRQ3J7xpDa0r_dPSY4kiHh0kAzgbruub3wl3k30TSukgOEduQaAHgRxnNjTk16FP5zfYTGaJW5Hc_DVrlkoDZnQX_GA9S2_cmYc1nZLmF1IdgWPpEKMRKzdMqUHoWxiQoWCZ7h2YDGZt4eEssq3YXlBVmF_Vd9-u5t0I3t3bwZIx-L2C0J8oibtvsf864Ukry997Rg6SP176gZBI9ODH1DzTUETjAhii6sY5EQOapA',
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
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB2nb0g3p51gyuKvhHKS20o6JyZxBpBdjeLEb64x3kFREbHy7hx9wThPIK9O-EFNFZVhkPdKzNb0LuW7-SvyralY7DJojzaONHjcXi2cEqmjql_c1Uq-QXjRdkgXcuEzFu-wnilfwclpHxmx9ICagLJA0UbUdbWyFKWB1WdLvQ42txbpZAnpgaAQbGnHmgDeqxcM5NOTe0XEcAH5z5hrJ_dhzb8HB4gsABEk0G8eGJuNU7ACBLbeGeNhwCuqCMX-VoG66M5ey7lTJo',
    bannerTitle: null,
    bannerSubtitle: '14 ayar saflık.',
    displayOrder: 45,
    featured: true,
    ctaLabel: 'İNCELE',
    ctaStyle: 'outline',
    aspectRatio: '3:4',
  },
];

async function main() {
  console.log('🌱 Seeding catalog category overlays (visual data only)...');

  // Geçersiz eski kayıtları temizle (ERP'de olmayan ID'ler)
  const validIds = OVERLAYS.map((o) => o.categoryId);
  const deleted = await prisma.categoryOverlay.deleteMany({
    where: { categoryId: { notIn: validIds } },
  });
  if (deleted.count > 0) {
    console.log(`  🗑  Silindi: ${deleted.count} stale overlay kaydı`);
  }

  for (const overlay of OVERLAYS) {
    const result = await prisma.categoryOverlay.upsert({
      where: { categoryId: overlay.categoryId },
      update: overlay,
      create: overlay,
    });
    console.log(
      `  ✅ categoryId: ${overlay.categoryId} → overlay ${result.id}`,
    );
  }

  console.log(`\n🎉 Seeded ${OVERLAYS.length} category overlays.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
