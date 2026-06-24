/**
 * Homepage Section Seed — Initial Section Configuration
 *
 * Run with: npx ts-node prisma/seed-homepage.ts
 */

import 'dotenv/config';
import { prisma } from '../src/config/prisma';

const SECTIONS = [
  {
    sectionType: 'market_ticker',
    title: null,
    subtitle: null,
    layoutVariant: 'default',
    priority: 100,
    enabled: false, // Disabled because it is manually rendered in discover.tsx
    targetTiers: [] as string[],
    platforms: [] as string[],
    dataConfig: {
      prices: [
        { key: 'gold_gram', label: 'Has Altın', value: 0, change: 0 },
        { key: 'usd', label: 'USD/TRY', value: 0, change: 0 },
        { key: 'eur', label: 'EUR/TRY', value: 0, change: 0 },
      ],
    },
  },
  {
    sectionType: 'story_row',
    title: null,
    subtitle: null,
    layoutVariant: 'default',
    priority: 90,
    enabled: true,
    targetTiers: [] as string[],
    platforms: [] as string[],
    dataConfig: {},
  },
  {
    sectionType: 'editorial_hero',
    title: null,
    subtitle: null,
    layoutVariant: 'hero',
    priority: 80,
    enabled: true,
    targetTiers: [] as string[],
    platforms: [] as string[],
    dataConfig: {
      slides: [
        {
          id: 'slide1',
          title: 'Zarafetin Yeni Tanımı',
          subtitle: 'Dorika Koleksiyonu Yayında',
          imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxj4DpJHtbO45LVgeWpkfl-hul0dHHObJ9EtiEDn7-qopqfkpfgswE2xgpzOS33A3yrlgzbghYntpolqo499VIU65z6CPUi6KttY-dBC0RSqV0aQsctGcbk9GqvPfw8FYGzyE-QM1TMz4anKgGUCZHsfGQzz8MIbWbPE5hinAqid9xamm2JgeHu7B6quubcMfmk9Pb0XTItaJ0t6dpUNsqf-VIAWvtNzhfkZnAMHatSF6I38As1ufC61G4W0IcmkN9XuVn5SKw0Fk',
          badge: 'YENİ SEZON',
          accent: '#C9963B',
          ctaLabel: 'Koleksiyonu İncele',
          ctaLink: '/catalog?category=dorika',
        },
      ],
    },
  },
  {
    sectionType: 'product_showcase',
    title: 'Öne Çıkanlar',
    subtitle: 'Sizin için seçtiklerimiz',
    layoutVariant: 'default',
    priority: 70,
    enabled: true,
    targetTiers: [] as string[],
    platforms: [] as string[],
    dataConfig: { source: 'featured', limit: 4, viewAllLabel: 'TÜMÜNÜ GÖR' },
  },
  {
    sectionType: 'curated_collections',
    title: 'Küratör Koleksiyonları',
    subtitle: null,
    layoutVariant: 'default',
    priority: 60,
    enabled: true,
    targetTiers: [] as string[],
    platforms: [] as string[],
    dataConfig: {
      collections: [
        {
          id: 'c1',
          name: 'Düğün Setleri',
          imageUrl: 'https://cdn03.ciceksepeti.com/cicek/kcm73052055-1/XL/su-yolu-sari-altin-dugun-set-takimi-kcm73052055-1-46a787e4fd6441d183395c03a824a71a.jpg',
          slug: 'dugun-setleri',
        },
        {
          id: 'c2',
          name: 'Pırlanta',
          imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDs-fCiwKvwBHp-fCSOg9fahIcGzCT0YOKNjyxfG_TBoqEwDKmILp7-vi47LVcjV3i5cI2V46hoX4UPvMmRtqtLP-to6IKwxYzs3KrdbIq9zXyWAGa4TMERaWJfie17F7Gawi9itQzAWAIwcwHETLepV60f_oBu2QIQWsm-qboI2b6RIUl_jgvU60FicjXhqqKxH6tfLmxrOoyi-lVbl6zX970L0Q5T5o-wrLJpXmQnRec-aFvsoi8KLo5Hsg8Qqc_txqhwxz_jVh0',
          slug: 'pirlanta',
        },
        {
          id: 'c3',
          name: 'Çocuk & Bebek',
          imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD6l1ZMxjoT_LbuE97DE3aLyJcYJY5LbdxYA5Na6V3hmuzdkX5FtCn4S6ZXPOm480fMAoaPD_2Zl5EsF-G4q9d3kAjvEQlTG-h1MSnw8GmtoCc90f5U0bKyv02kwZq9iJoCtUauXoKHe2QpXMzDsQrOJVLSsLiHhkSX5J2L4GdUL-DTLZHL9ALb5eyikxR-pU2Hs8oVoTG2jXk2nSoxtS-6V64ckHUYFSelU9rqiS7ShE4TClIV-pUEEo3kZX-Z8-f0cLQIQxT5lrE',
          slug: 'cocuk-bebek',
        },
      ],
    },
  },
  {
    sectionType: 'concierge_card',
    title: 'Temsilcinizle Görüşün',
    subtitle: 'Burak Yılmaz',
    layoutVariant: 'default',
    priority: 40,
    enabled: true,
    targetTiers: [] as string[],
    platforms: [] as string[],
    dataConfig: {
      avatarUrl: 'https://c38c9c.cdn.akinoncloud.com/products/2024/02/27/388339/7eceabd2-6853-40ee-bb1f-b6d565745c57_size600x600_cropCenter.jpg',
      whatsappNumber: '+905555555555'
    },
  },
];

async function main() {
  console.log('🌱 Seeding homepage sections...');

  await prisma.homepageSection.deleteMany();

  for (const section of SECTIONS) {
    const created = await prisma.homepageSection.create({ data: section });
    console.log(`  ✅ ${section.sectionType} (priority: ${section.priority}) — ${created.id}`);
  }

  console.log(`\n🎉 Seeded ${SECTIONS.length} homepage sections.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
