/**
 * Catalog Serializer — Zero-Price Enforcement Layer
 *
 * This is the AUTHORITATIVE GATEKEEPER for product data leaving
 * the backend toward the mobile client. Every product response
 * MUST pass through serializeForClient().
 *
 * RULE: No pricing data (₺, milyem, margin, cost) may ever reach
 * the mobile client. This serializer uses an explicit pick-only
 * approach — only whitelisted fields are included.
 *
 * @see Section 4: Product Presentation Without Prices
 */

// ─── Kill List (documentation / validation reference) ───

/**
 * FORBIDDEN CLIENT FIELDS
 * These fields must NEVER appear in any API response to mobile client.
 * Listed here for documentation and automated validation.
 */
export const FORBIDDEN_CLIENT_FIELDS = [
  'satisFiyati',
  'alisFiyati',
  'iscilikMilyem',
  'karMarjOrani',
  'karMilyem',
  'milyemKatsayisi',
  'kdvOrani',
  'originalMilyem',
  'dealMilyem',
  'capturedPricePerUnit',
  'pricePerUnit',
  'iscilikAdet',
  'tasAgirlikGr',
  'minStokSeviyesi',
  'maxStokSeviyesi',
] as const;

// ─── Types ───

interface ShowcaseProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  images: { id: string; url: string; altText?: string }[];
  category: { id: number; name: string; slug: string } | null;
  brand: { id: number; name: string } | null;
  material: { id: number; name: string } | null;
  weightGrams: number | null;
  unit: { name: string; symbol: string } | null;
  description: string | null;
  craftsmanship: string | null;
  badges: { label: string; color: string; icon?: string }[];
  isNew: boolean;
  isLimited: boolean;
  collectionId: string | null;
  collectionName: string | null;
  availability: 'available' | 'limited' | 'on_request' | 'unavailable';
  primaryCta: { type: string; label: string; value?: string };
  secondaryCta: { type: string; label: string; value?: string } | null;
}

// ─── Core Serializer ───

/**
 * Serialize a Prisma product for the mobile client.
 * Uses EXPLICIT PICK — only whitelisted fields pass through.
 * Pricing data is NEVER included.
 */
export function serializeForClient(product: any): ShowcaseProduct {
  return {
    id: product.id,
    name: product.urunAdi,
    slug: (product.urunKodu ?? '').toLowerCase(),

    // Visual
    imageUrl: product.images?.[0]?.url ?? null,
    images: (product.images ?? []).map((img: any) => ({
      id: String(img.id),
      url: img.url,
      altText: img.altText ?? undefined,
    })),

    // Identity
    category: product.kategori
      ? {
          id: product.kategori.id,
          name: product.kategori.kategoriAdi,
          slug: (product.kategori.kategoriKodu ?? '').toLowerCase(),
        }
      : null,
    brand: product.marka
      ? {
          id: product.marka.id,
          name: product.marka.markaAdi,
        }
      : null,
    material: product.materyal
      ? {
          id: product.materyal.id,
          name: product.materyal.materyalAdi,
        }
      : null,

    // Physical attributes
    weightGrams: product.agirlikGr ?? null,
    unit: product.birim
      ? {
          name: product.birim.birimAdi,
          symbol: product.birim.birimKodu,
        }
      : null,

    // Descriptions
    description: product.aciklama ?? null,
    craftsmanship: product.iscilikTipi ?? null,

    // Badges
    badges: buildBadges(product),
    isNew: product.yeni ?? false,
    isLimited: false, // from future inventory rules
    collectionId: null, // from future collection system
    collectionName: null,

    // Availability
    availability: computeAvailability(product),

    // CTAs
    primaryCta: { type: 'view_detail', label: 'İncele' },
    secondaryCta: { type: 'add_to_order', label: 'Fişe Ekle' },

    // ╔═══════════════════════════════════════════════════════╗
    // ║ DELIBERATELY EXCLUDED — NEVER SENT TO CLIENT:        ║
    // ║ satisFiyati, alisFiyati, iscilikMilyem, karMarjOrani ║
    // ║ karMilyem, milyemKatsayisi, kdvOrani, pricePerUnit   ║
    // ╚═══════════════════════════════════════════════════════╝
  };
}

/**
 * Serialize an array of products for client consumption.
 */
export function serializeManyForClient(products: any[]): ShowcaseProduct[] {
  return products.map(serializeForClient);
}

// ─── Helpers (internal) ───

function computeAvailability(
  product: any,
): ShowcaseProduct['availability'] {
  if (!product.aktifMi) return 'unavailable';
  if (product.bakiyeCount == null) return 'on_request';
  if (product.bakiyeCount <= 0) return 'unavailable';
  if (
    product.kritikStokSeviyesi &&
    product.bakiyeCount <= product.kritikStokSeviyesi
  ) {
    return 'limited';
  }
  return 'available';
}

function buildBadges(
  product: any,
): ShowcaseProduct['badges'] {
  const badges: ShowcaseProduct['badges'] = [];

  if (product.yeni) {
    badges.push({ label: 'Yeni', color: '#C9963B', icon: 'sparkles' });
  }
  if (product.iscilikTipi === 'el') {
    badges.push({ label: 'El İşçiliği', color: '#8B5CF6' });
  }
  if (product.materyal?.materyalAdi) {
    badges.push({ label: product.materyal.materyalAdi, color: '#D4A853' });
  }

  return badges;
}

// ─── Validation Helper ───

/**
 * Validate that a serialized object contains no forbidden fields.
 * Use in tests and middleware to catch accidental leaks.
 */
export function validateNoForbiddenFields(obj: Record<string, any>): boolean {
  for (const field of FORBIDDEN_CLIENT_FIELDS) {
    if (field in obj) {
      console.error(
        `[SECURITY] Forbidden field "${field}" found in client-bound data!`,
      );
      return false;
    }
  }
  return true;
}
