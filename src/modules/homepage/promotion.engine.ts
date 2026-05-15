/**
 * Internal Promotion Engine — Strategic Product Surfacing
 *
 * Algorithmically surfaces our own high-priority inventory without
 * making it look like advertising. The buyer NEVER knows why a
 * product appears in "Öne Çıkanlar" — it just appears curated.
 *
 * RULES:
 * - Zero visual distinction between promoted and organic content
 * - No "Sponsorlu" or "Önerilen" labels — ever
 * - Maximum 2 promotion-engine-powered sections per feed
 * - Promotion reason is INTERNAL ONLY, never sent to client
 *
 * @see Section 9: Internal Promotion Engine
 */

// ─── Types ───

export interface PromotionSignal {
  productId: string;
  score: number;
  reason: 'overstock' | 'high_margin' | 'new_arrival' | 'strategic' | 'slow_mover';
}

// ─── Strategy Weights ───

const OVERSTOCK_WEIGHT = 0.30;
const NEW_ARRIVAL_WEIGHT = 0.25;
const HIGH_MARGIN_WEIGHT = 0.20;
const SLOW_MOVER_WEIGHT = 0.15;

const NEW_ARRIVAL_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SLOW_MOVER_THRESHOLD_DAYS = 14;
const SLOW_MOVER_VIEW_THRESHOLD = 10;

// ─── Engine ───

/**
 * Compute promotion scores for a list of products.
 *
 * NOTE: Product data comes from the catalog API, not from this Prisma schema.
 * The caller fetches products and passes them here for scoring.
 *
 * Returns products sorted by score (highest first).
 * The `reason` field is INTERNAL ONLY — never sent to client.
 */
export async function computePromotionScores(
  products: any[],
): Promise<PromotionSignal[]> {
  const signals: PromotionSignal[] = [];
  const now = Date.now();

  for (const p of products) {
    let score = 0;
    let reason: PromotionSignal['reason'] = 'new_arrival';

    // Strategy 1: Overstock Push
    // Products with inventory way above critical level need movement
    if (
      p.bakiyeCount != null &&
      p.kritikStokSeviyesi != null &&
      p.bakiyeCount > p.kritikStokSeviyesi * 3
    ) {
      score += OVERSTOCK_WEIGHT;
      reason = 'overstock';
    }

    // Strategy 2: New Arrival Boost
    // Fresh products get temporary visibility boost (first 7 days)
    const ageMs = now - new Date(p.createdAt).getTime();
    if (ageMs < NEW_ARRIVAL_WINDOW_MS) {
      score += NEW_ARRIVAL_WEIGHT;
      reason = 'new_arrival';
    }

    // Strategy 3: Slow Mover Rescue
    // Products listed > 14 days with low engagement need help
    if (ageMs > SLOW_MOVER_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) {
      // Note: viewCount would come from UserEvent aggregation
      // For now, use age as proxy — old products get rescue boost
      score += SLOW_MOVER_WEIGHT;
      reason = 'slow_mover';
    }

    // Strategy 4: High Margin Highlight
    // Internal field — never exposed to client
    // TODO: Add marginScore field to Product model when ready
    // if (p.marginScore && p.marginScore > 0.7) {
    //   score += HIGH_MARGIN_WEIGHT;
    //   reason = 'high_margin';
    // }

    if (score > 0) {
      signals.push({ productId: p.id, score, reason });
    }
  }

  return signals.sort((a, b) => b.score - a.score);
}

/**
 * Get the top promoted product IDs.
 * These feed into product_showcase sections.
 *
 * @param products - Array of raw product objects from catalog API
 * @param limit - Maximum number of promoted products to return
 */
export async function getPromotedProductIds(
  products: any[],
  limit: number = 10,
): Promise<string[]> {
  const signals = await computePromotionScores(products);
  return signals.slice(0, limit).map((s) => s.productId);
}
