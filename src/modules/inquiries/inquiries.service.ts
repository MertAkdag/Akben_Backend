/**
 * Inquiry Service — CRM Lead Generation
 *
 * Replaces the traditional cart-based checkout flow.
 * Wholesalers submit inquiries for pricing, availability,
 * or bulk orders. Each inquiry becomes a CRM lead assigned
 * to an account manager.
 *
 * @see Section 4: Product Presentation Without Prices
 */

import { prisma } from '../../config/prisma';
import type { InquiryType, InquiryStatus } from '../../generated/prisma';

// ─── Types ───

interface CreateInquiryInput {
  userId: string;
  productId?: string;
  productName?: string;
  type: InquiryType;
  message?: string;
  quantity?: number;
  preferredContact?: string;
  urgency?: string;
}

interface ListInquiriesInput {
  userId: string;
  status?: InquiryStatus;
  limit?: number;
  offset?: number;
}

// ─── Service ───

export const inquiryService = {
  /**
   * Create a new inquiry (from product detail or order sheet submission).
   */
  async create(input: CreateInquiryInput) {
    const inquiry = await prisma.inquiry.create({
      data: {
        userId: input.userId,
        productId: input.productId ?? null,
        productName: input.productName ?? null,
        type: input.type,
        message: input.message ?? null,
        quantity: input.quantity ?? null,
        preferredContact: input.preferredContact ?? 'whatsapp',
        urgency: input.urgency ?? 'standard',
        status: 'pending',
      },
    });

    // TODO: Trigger CRM notification (WhatsApp, push, email)
    // TODO: Auto-assign to account manager based on user's CRM profile

    return inquiry;
  },

  /**
   * List inquiries for a specific user.
   */
  async listByUser(input: ListInquiriesInput) {
    const where: any = { userId: input.userId };
    if (input.status) where.status = input.status;

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: input.limit ?? 20,
        skip: input.offset ?? 0,
      }),
      prisma.inquiry.count({ where }),
    ]);

    return { inquiries, total };
  },

  /**
   * Get a single inquiry by ID (ownership verified).
   */
  async getById(id: string, userId: string) {
    return prisma.inquiry.findFirst({
      where: { id, userId },
    });
  },

  /**
   * Update inquiry status (for admin/CRM use).
   */
  async updateStatus(id: string, status: InquiryStatus, assignedRepId?: string) {
    return prisma.inquiry.update({
      where: { id },
      data: {
        status,
        assignedRepId: assignedRepId ?? undefined,
        respondedAt: status === 'responded' || status === 'closed' ? new Date() : undefined,
      },
    });
  },
};
