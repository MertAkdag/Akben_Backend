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
 * categoryId: ERP'deki gerçek kategori ID'leri ile eşleşmeli.
 * Uygulamada kategoriler yüklendiğinde, bu overlay'ler
 * categoryId üzerinden eşleştirilir.
 */
const OVERLAYS = [
  {
    categoryId: 1,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCmC48idixAz5GD0xuRCwVVQ5YhsXl71_7wrmOyWqoFm4wNPSOHQIW6XYySCxtdXTx2bw-ujBDWKEaVbXY6ROIpTm366WItnuzp3Q6zZm4o3XTGPYEoUgpH9RS1tqNzn7ylXD4fTKRTOClIHuQPkaBxH3iKDSW-Q7fPHTYOWZipp6cPaTA0pmyCMx_LcQW_hbD7rGxPqer_-FtGYnOMbTlHmuxqXZvLyoTE_5ChMSq8Hjzt9p9aretJKUSwnbq-osaTn7wv1NiC3Go',
    bannerTitle: null,     // Kategori adı API'den gelecek
    bannerSubtitle: 'Geleneksel dokunuşun modern yorumu.',
    displayOrder: 100,
    featured: true,
    ctaLabel: 'KEŞFET',
    ctaStyle: 'primary',
    aspectRatio: '3:4',
  },
  {
    categoryId: 2,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA9gjjaKxz0b1nRUtpoyrQdL0pV7D7WoXMrDMKDAJx5SOFcpNJNE_27ZdfPsGn0dbKt0i-uIfn2XdtIunxdMAtX6iFdRk1NOtj7y0ESeHcK4JMHJsqLXIg1N-FjHgMQtpYAQTLZZl0j9y0_MOixwPXub16-UxYplLuow-lVNuiupVPnJ37DuhsLNorNG37j8XWxi60o_fKWoyA5i3dch_NEoq5r-LG7gR0RJevRh_C7zu6siXVHmANFPxjZMn0s_ZL7zyQBivq4srU',
    bannerTitle: null,
    bannerSubtitle: 'Işığın en saf hali.',
    displayOrder: 90,
    featured: true,
    ctaLabel: 'İNCELE',
    ctaStyle: 'outline',
    aspectRatio: '1:1',
  },
  {
    categoryId: 3,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCC4IQakB9-5e6Qkv0X3ga6mz1FpBqqpZA4lRj-GdKCpkwuIcX1UsY8CCSCmioVGX1gklBLv0n6bCpuD8hHBnNnzyRq8Mhrb9ymK3OLOAe_9HjINtyfvpIXIcVeTNAR6nYoWsxRYxovJgKjvahs7TAduntdZFOqokOM8h72KvHAaMXsw09B9cMJiqfRyC6_h_sJwaYmi46kvXrm73e_HCaLXeqs9HBsAR4OpcY3aibYo34n8qqLajzvMi_iH7HvxAL3wJqppWApLIo',
    bannerTitle: null,
    bannerSubtitle: 'Bir ömür boyu.',
    displayOrder: 80,
    featured: true,
    ctaLabel: 'KEŞFET',
    ctaStyle: 'primary',
    aspectRatio: '4:5',
  },
  {
    categoryId: 4,
    imageUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA2KqUed1yQ0Fe1ORNaPG5hQM3-XxOHk1BF6dtk2WlY0RQn7uZa6ugbH63H5i_isfaXRB4rtFnV61eHEjbyOnQjA2z9TsGPzCusWBif5FG6r1WQKtSBg7cjshGux8oPJ38xXWMkV4ev4clpn3gSenPpZEXaTsLnnBvA7r9DnF6FBV1hfh1iYXgASjvpoGokcwXRWtBiMQ5aFV45k7IbqIUTPJ_c5U4KUCRqaUSfZd8axS55Z6T0b7jL5RRm5PMWf-UkibNz1FZJJYQ',
    bannerTitle: null,
    bannerSubtitle: 'Son eklenen parçalar.',
    displayOrder: 70,
    featured: true,
    ctaLabel: 'İNCELE',
    ctaStyle: 'outline',
    aspectRatio: '16:9',
  },
];

async function main() {
  console.log('🌱 Seeding catalog category overlays (visual data only)...');
  console.log('   ℹ️  Kategori isimleri ve detayları ERP API\'den gelecektir.');

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
