/**
 * Catalog Landing Controller
 *
 * GET /v1/catalog/overlays
 *   → Tüm CategoryOverlay kayıtlarını döndürür.
 *     Frontend bu verileri ERP'den gelen kategorilerle
 *     categoryId üzerinden eşleştirir.
 *
 * GET /v1/catalog/overlays/featured
 *   → Sadece featured=true olan overlay'leri döndürür
 *     (Katalog ana sayfasında gösterilecekler).
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '../../config/prisma';

const router = Router();

/**
 * GET /v1/catalog/overlays
 * Tüm overlay'leri döndür (displayOrder'a göre sıralı)
 */
router.get('/overlays', async (_req: Request, res: Response) => {
  try {
    const overlays = await prisma.categoryOverlay.findMany({
      orderBy: { displayOrder: 'desc' },
    });

    res.json({
      success: true,
      data: overlays,
    });
  } catch (error) {
    console.error('[Catalog] Overlays endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch category overlays',
    });
  }
});

/**
 * GET /v1/catalog/overlays/featured
 * Sadece featured olan overlay'leri döndür
 */
router.get('/overlays/featured', async (_req: Request, res: Response) => {
  try {
    const overlays = await prisma.categoryOverlay.findMany({
      where: { featured: true },
      orderBy: { displayOrder: 'desc' },
    });

    res.json({
      success: true,
      data: overlays,
    });
  } catch (error) {
    console.error('[Catalog] Featured overlays endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch featured category overlays',
    });
  }
});

export default router;
