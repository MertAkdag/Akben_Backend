/**
 * Homepage Controller — Feed Endpoint
 *
 * GET /v1/homepage/feed
 *
 * Returns the server-driven homepage section feed.
 * Tier is resolved from JWT. All product data is pre-serialized
 * with zero pricing.
 *
 * @see Section 2: Dynamic Section Engine
 */

import { Router, type Request, type Response } from 'express';
import { homepageService } from './homepage.service';

const router = Router();

/**
 * GET /v1/homepage/feed
 *
 * Query params:
 *   - platform: "ios" | "android"
 *   - appVersion: "1.2.0"
 *
 * Tier is resolved from JWT token (req.user.tier).
 */
router.get('/feed', async (req: Request, res: Response) => {
  try {
    const platform = (req.query.platform as string) ?? 'ios';
    const appVersion = (req.query.appVersion as string) ?? '1.0.0';

    // TODO: Extract tier from JWT when auth middleware is integrated
    const tier = ((req as any).user?.tier as 'wholesale' | 'vip_wholesale') ?? 'wholesale';
    const userId = (req as any).user?.id;

    const sections = await homepageService.buildFeed({
      platform,
      appVersion,
      tier,
      userId,
    });

    res.json({
      success: true,
      data: {
        sections,
        meta: {
          tier,
          fetchedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('[Homepage] Feed endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to build homepage feed',
    });
  }
});

export default router;
