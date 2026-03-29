/**
 * EcoTrade — Listing Input Validators
 * 
 * Zod schemas for listing-related request inputs.
 */

import { z } from 'zod';

/** Create listing input validation */
export const CreateListingSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().min(1, 'Description is required').max(5000, 'Description too long'),
  category: z.string().min(1, 'Category is required'),
  condition: z.string().min(1, 'Condition is required'),
  price: z.number().positive('Price must be positive'),
  is_negotiable: z.boolean().optional().default(false),
  location: z.string().min(1, 'Location is required'),
  images: z.array(z.string().url()).optional().default([]),
});

/** Cart validation input */
export const ValidateCartSchema = z.object({
  ids: z.array(z.number().int().positive()),
});

export type CreateListingInput = z.infer<typeof CreateListingSchema>;
export type ValidateCartInput = z.infer<typeof ValidateCartSchema>;
