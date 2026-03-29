/**
 * EcoTrade — User Input Validators
 * 
 * Zod schemas for user profile and account-related inputs.
 */

import { z } from 'zod';

/** Profile update input validation */
export const UpdateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  bio: z.string().max(500).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  avatar_url: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  cover_url: z.string().optional().nullable(),
  social_links: z.union([z.string(), z.record(z.string())]).optional().nullable(),
});

/** Change password input validation */
export const ChangePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});

/** Request email change input validation */
export const RequestEmailChangeSchema = z.object({
  newEmail: z.string().email('Invalid email address'),
});

/** Verify national ID input validation */
export const VerifyIdSchema = z.object({
  nationalId: z.string().min(1, 'National ID is required'),
});

/** Delete account input validation */
export const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type RequestEmailChangeInput = z.infer<typeof RequestEmailChangeSchema>;
export type VerifyIdInput = z.infer<typeof VerifyIdSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
