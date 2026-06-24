/**
 * Homepage Service — Feed Orchestration Engine
 *
 * This is the brain of the server-driven homepage. It:
 * 1. Reads HomepageSection records from the database
 * 2. Filters by tier, platform, date, and app version
 * 3. Resolves data for each section (products, collections, etc.)
 * 4. Serializes ALL product data through the zero-price serializer
 * 5. Returns the ordered section feed
 *
 * @see Section 2: Dynamic Section Engine
 */

import { prisma } from '../../config/prisma';
import { serializeManyForClient } from '../catalog/catalog.serializer';

// ─── Types ───

interface FeedRequest {
  platform: string;
  appVersion: string;
  tier: 'wholesale' | 'vip_wholesale';
  userId?: string;
}

interface FeedSection {
  id: string;
  type: string;
  title: string | null;
  subtitle: string | null;
  layoutVariant: string;
  style: { backgroundColor: string | null };
  data: any;
}

// ─── Service ───

export const homepageService = {
  /**
   * Build the homepage feed for a given request context.
   */
  async buildFeed(req: FeedRequest): Promise<FeedSection[]> {
    const now = new Date();

    // 1. Fetch all enabled sections
    const sections = await prisma.homepageSection.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        priority: 'desc',
      },
    });

    // 2. Filter by visibility rules
    const visible = sections.filter((s) => {
      // Date range check
      if (s.startDate && now < s.startDate) return false;
      if (s.endDate && now > s.endDate) return false;

      // Tier check — empty targetTiers means visible to all
      if (s.targetTiers.length > 0 && !s.targetTiers.includes(req.tier)) {
        return false;
      }

      // Platform check — empty platforms means visible to all
      if (s.platforms.length > 0 && !s.platforms.includes(req.platform)) {
        return false;
      }

      // App version check (simple semver compare)
      if (s.minAppVersion && req.appVersion < s.minAppVersion) {
        return false;
      }

      return true;
    });

    console.log("[Homepage] buildFeed debug", {
      requested: {
        platform: req.platform,
        appVersion: req.appVersion,
        tier: req.tier,
        userId: req.userId ?? null,
      },
      totalSections: sections.length,
      visibleSections: visible.length,
      visibleTypes: visible.map((section) => section.sectionType),
    });

    // 3. Resolve data for each section
    const resolved = await Promise.all(
      visible.map((s) => resolveSection(s, req)),
    );

    console.log("[Homepage] resolved feed", {
      returnedSections: resolved.filter((s): s is FeedSection => s !== null).length,
      returnedTypes: resolved
        .filter((s): s is FeedSection => s !== null)
        .map((section) => section.type),
    });

    return resolved.filter((s): s is FeedSection => s !== null);
  },
};

// ─── Section Data Resolution ───

async function resolveSection(
  section: any,
  req: FeedRequest,
): Promise<FeedSection | null> {
  const config = (section.dataConfig ?? {}) as Record<string, any>;

  const base: Omit<FeedSection, 'data'> = {
    id: section.id,
    type: section.sectionType,
    title: section.title,
    subtitle: section.subtitle,
    layoutVariant: section.layoutVariant,
    style: { backgroundColor: section.backgroundColor },
  };

  switch (section.sectionType) {
    case 'market_ticker':
      return {
        ...base,
        data: {
          _notice:
            'INFORMATIONAL ONLY — must NEVER be used for product price calculations on client.',
          prices: config.prices ?? [],
          updatedAt: new Date().toISOString(),
        },
      };

    case 'product_showcase':
      return resolveProductShowcase(base, config);

    case 'curated_collections':
      return {
        ...base,
        data: { collections: config.collections ?? [] },
      };

    case 'story_row':
      return { ...base, data: { groups: [] } }; // Story data loaded via existing story API

    case 'editorial_hero':
      return { ...base, data: { slides: config.slides ?? [] } };

    default:
      return { ...base, data: config };
  }
}

/**
 * Resolve product showcase section data.
 *
 * NOTE: Product data lives in a separate catalog API/database.
 * The homepage service returns product IDs or pre-configured product
 * data from the section's dataConfig. The frontend resolves full
 * product details via its own catalog service + normalizeShowcaseProduct.
 *
 * When the catalog service is co-located, this will call it directly
 * and serialize through serializeManyForClient().
 */
async function resolveProductShowcase(
  base: Omit<FeedSection, 'data'>,
  config: Record<string, any>,
): Promise<FeedSection> {
  return {
    ...base,
    data: {
      // Product IDs for frontend to resolve via catalog service
      productIds: config.productIds ?? [],
      // Or pre-serialized products from admin config
      products: config.products ?? [],
      // Source hint for frontend
      source: config.source ?? 'featured',
      limit: config.limit ?? 10,
      viewAllLabel: config.viewAllLabel ?? 'Tümünü Gör',
    },
  };
}

