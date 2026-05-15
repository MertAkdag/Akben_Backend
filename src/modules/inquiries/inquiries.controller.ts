/**
 * Inquiry Controller — CRM Lead Endpoints
 *
 * POST /v1/inquiries          — Create an inquiry
 * GET  /v1/inquiries          — List user's inquiries
 * GET  /v1/inquiries/:id      — Get inquiry detail
 *
 * @see Section 4: Product Presentation Without Prices
 */

import { Router, type Request, type Response } from 'express';
import { inquiryService } from './inquiries.service';

const router = Router();

/**
 * POST /v1/inquiries
 * Create a new inquiry (price request, availability check, bulk order, etc.)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { productId, productName, type, message, quantity, preferredContact, urgency } = req.body;

    const inquiry = await inquiryService.create({
      userId,
      productId,
      productName,
      type: type ?? 'general',
      message,
      quantity,
      preferredContact,
      urgency,
    });

    res.status(201).json({ success: true, data: inquiry });
  } catch (error) {
    console.error('[Inquiry] Create error:', error);
    res.status(500).json({ success: false, error: 'Failed to create inquiry' });
  }
});

/**
 * GET /v1/inquiries
 * List inquiries for the authenticated user.
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await inquiryService.listByUser({
      userId,
      status: status as any,
      limit,
      offset,
    });

    res.json({
      success: true,
      data: result.inquiries,
      meta: { total: result.total, limit, offset },
    });
  } catch (error) {
    console.error('[Inquiry] List error:', error);
    res.status(500).json({ success: false, error: 'Failed to list inquiries' });
  }
});

/**
 * GET /v1/inquiries/:id
 * Get a specific inquiry (ownership enforced).
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const inquiry = await inquiryService.getById(req.params.id, userId);
    if (!inquiry) {
      return res.status(404).json({ success: false, error: 'Inquiry not found' });
    }

    res.json({ success: true, data: inquiry });
  } catch (error) {
    console.error('[Inquiry] Get error:', error);
    res.status(500).json({ success: false, error: 'Failed to get inquiry' });
  }
});

export default router;
