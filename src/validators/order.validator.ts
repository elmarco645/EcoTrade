/**
 * EcoTrade — Order & Transaction Input Validators
 * 
 * Zod schemas for order, transaction, and review inputs.
 */

import { z } from 'zod';

/** Direct wallet purchase input */
export const BuySchema = z.object({
  listing_id: z.number().int().positive('Valid listing ID required'),
});

/** Checkout input validation */
export const CheckoutSchema = z.object({
  items: z.array(z.number().int().positive()).min(1, 'At least one item required'),
  total: z.number().positive('Total must be positive'),
  shipping_address: z.string().min(1, 'Shipping address is required'),
});

/** Ship order input validation */
export const ShipOrderSchema = z.object({
  tracking_id: z.string().optional(),
});

/** Dispute order input validation */
export const DisputeSchema = z.object({
  reason: z.string().min(1, 'Dispute reason is required'),
  evidence: z.array(z.string()).optional().default([]),
});

/** Create review input validation */
export const ReviewSchema = z.object({
  transaction_id: z.number().int().positive('Valid transaction ID required'),
  rating: z.number().int().min(1).max(5, 'Rating must be between 1 and 5'),
  review_text: z.string().optional().nullable(),
});

/** Create offer input validation */
export const CreateOfferSchema = z.object({
  listing_id: z.number().int().positive('Valid listing ID required'),
  amount: z.number().positive('Offer amount must be positive'),
});

/** Payment initiation input */
export const PaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be positive'),
  transaction_ids: z.array(z.number().int().positive()).min(1, 'At least one transaction required'),
});

export type BuyInput = z.infer<typeof BuySchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;
export type ShipOrderInput = z.infer<typeof ShipOrderSchema>;
export type DisputeInput = z.infer<typeof DisputeSchema>;
export type ReviewInput = z.infer<typeof ReviewSchema>;
export type CreateOfferInput = z.infer<typeof CreateOfferSchema>;
export type PaymentInput = z.infer<typeof PaymentSchema>;
