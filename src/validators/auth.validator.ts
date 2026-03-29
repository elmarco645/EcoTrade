/**
 * EcoTrade — Auth Input Validators
 * 
 * Zod schemas for authentication-related request inputs.
 * Prevents invalid data from reaching controllers.
 */

import { z } from 'zod';

/** Registration input validation */
export const RegisterSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().optional().nullable(),
  captchaToken: z.string().optional(),
}).refine(
  (data) => !data.confirmPassword || data.password === data.confirmPassword,
  { message: 'Passwords do not match', path: ['confirmPassword'] }
);

/** Login input validation */
export const LoginSchema = z.object({
  identifier: z.string().min(1, 'Email, username or phone is required'),
  password: z.string().min(1, 'Password is required'),
  captchaToken: z.string().optional(),
});

/** Forgot password input validation */
export const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/** Reset password input validation */
export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

/** Resend verification input validation */
export const ResendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ResendVerificationInput = z.infer<typeof ResendVerificationSchema>;
