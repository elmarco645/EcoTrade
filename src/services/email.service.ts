/**
 * EcoTrade — Email Service
 * 
 * Handles all outbound email communication:
 * - Email verification on registration
 * - Password reset emails
 * - Email change confirmation
 * - Account deletion undo emails
 * 
 * Uses Nodemailer with Gmail SMTP. Falls back to console simulation
 * if email credentials are not configured (useful for development).
 */

import nodemailer from 'nodemailer';
import { EMAIL_USER, EMAIL_PASS } from '../utils/constants.ts';

/** Gmail SMTP transporter */
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

/**
 * Reusable HTML email template with EcoTrade branding.
 * 
 * @param title - Email heading
 * @param message - Body text
 * @param buttonText - CTA button label
 * @param link - CTA button URL
 */
export const emailTemplate = (title: string, message: string, buttonText: string, link: string): string => {
  return `
  <div style="font-family: Arial, sans-serif; background:#f4f6f8; padding:20px; color: #333;">
    <div style="max-width:500px; margin:auto; background:white; padding:30px; border-radius:16px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align:center; margin-bottom: 20px;">
        <h2 style="color:#2ecc71; margin: 0; font-size: 28px;">🌱 EcoTrade</h2>
      </div>
      
      <h3 style="color: #1a1a1a; margin-top: 0;">${title}</h3>
      <p style="line-height: 1.6; color: #4a5568;">${message}</p>

      <div style="text-align:center; margin:30px 0;">
        <a href="${link}" 
           style="background:#2ecc71; color:white; padding:14px 28px; 
                  text-decoration:none; border-radius:8px; font-weight: bold; display: inline-block;">
          ${buttonText}
        </a>
      </div>

      <p style="font-size:12px; color:#94a3b8; text-align: center; margin-top: 30px; border-top: 1px solid #edf2f7; padding-top: 20px;">
        If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>
  `;
};

/**
 * Send email verification link to newly registered users.
 * Falls back to console logging if SMTP credentials are not set.
 */
export const sendVerificationEmail = async (email: string, token: string, origin: string): Promise<void> => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials missing. Verification email simulation only.');
    console.log(`[EMAIL SIMULATION] Verification link for ${email}: ${origin}/verify-email?token=${token}`);
    return;
  }

  const link = `${origin}/verify-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"EcoTrade" <${EMAIL_USER}>`,
      to: email,
      subject: 'Verify your EcoTrade account',
      html: emailTemplate(
        "Verify Your Email",
        "Welcome to EcoTrade! We're excited to have you join our community of sustainable traders. Click the button below to verify your account and start trading.",
        "Verify Email",
        link
      ),
    });
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send account deletion undo email.
 * Gives user 7 days to restore their account.
 */
export const sendDeleteUndoEmail = async (email: string, token: string, origin: string): Promise<void> => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials missing. Delete undo email simulation only.');
    console.log(`[EMAIL SIMULATION] Undo delete link for ${email}: ${origin}/undo-delete?token=${token}`);
    return;
  }

  const link = `${origin}/undo-delete?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"EcoTrade" <${EMAIL_USER}>`,
      to: email,
      subject: 'Account Deletion Scheduled',
      html: emailTemplate(
        "Account Deletion Scheduled",
        "Your account has been scheduled for deletion. If this wasn't you, or if you've changed your mind, you have 7 days to restore your account by clicking the button below.",
        "Restore Account",
        link
      ),
    });
    console.log(`Delete undo email sent to ${email}`);
  } catch (error) {
    console.error('Error sending delete undo email:', error);
  }
};

/**
 * Send email change verification to the NEW email address.
 */
export const sendEmailChangeVerificationEmail = async (email: string, token: string, origin: string): Promise<void> => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials missing. Email change simulation only.');
    console.log(`[EMAIL SIMULATION] Email change link for ${email}: ${origin}/api/user/confirm-email-change?token=${token}`);
    return;
  }

  const link = `${origin}/api/user/confirm-email-change?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"EcoTrade" <${EMAIL_USER}>`,
      to: email,
      subject: 'Confirm your EcoTrade email change',
      html: emailTemplate(
        "Confirm Email Change",
        "You requested to change your email address on EcoTrade. Click the button below to confirm this change. If you didn't request this, please ignore this email.",
        "Confirm Email Change",
        link
      ),
    });
    console.log(`Email change verification sent to ${email}`);
  } catch (error) {
    console.error('Error sending email change verification:', error);
  }
};

/**
 * Send password reset link via email.
 */
export const sendForgotPasswordEmail = async (email: string, token: string, origin: string): Promise<void> => {
  if (!EMAIL_USER || !EMAIL_PASS) {
    console.warn('Email credentials missing. Forgot password email simulation only.');
    console.log(`[EMAIL SIMULATION] Reset link for ${email}: ${origin}/reset-password?token=${token}`);
    return;
  }

  const link = `${origin}/reset-password?token=${token}`;

  try {
    await transporter.sendMail({
      from: `"EcoTrade" <${EMAIL_USER}>`,
      to: email,
      subject: 'Reset your EcoTrade password',
      html: emailTemplate(
        "Reset Your Password",
        "We received a request to reset your password. If you didn't make this request, you can safely ignore this email. Otherwise, click the button below to choose a new password.",
        "Reset Password",
        link
      ),
    });
    console.log(`Forgot password email sent to ${email}`);
  } catch (error) {
    console.error('Error sending forgot password email:', error);
    throw new Error('Failed to send reset email');
  }
};
