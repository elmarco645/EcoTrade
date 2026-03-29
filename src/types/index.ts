/**
 * EcoTrade — Core Type Definitions
 * These interfaces mirror the SQLite database schema in backend/db.ts
 */

export interface User {
  id: number;
  email: string;
  password: string;
  name: string;
  full_name: string | null;
  username: string | null;
  role: 'buyer' | 'seller' | 'admin';
  bio: string | null;
  location: string | null;
  avatar_url: string | null;
  avatar: string | null;
  wallet_balance: number;
  rating: number;
  is_verified: number;
  is_email_verified: number;
  is_seller_verified: number;
  failed_attempts: number;
  lock_until: string | null;
  phone: string | null;
  verification_token: string | null;
  reset_token: string | null;
  reset_token_expiry: string | null;
  national_id_encrypted: string | null;
  username_updated_at: string | null;
  cover_url: string | null;
  social_links: string | null;
  deleted_at: string | null;
  delete_token: string | null;
  delete_expires: string | null;
  google_id: string | null;
  github_id: string | null;
  email_change_token: string | null;
  new_email: string | null;
  created_at: string;
}

export interface Listing {
  id: number;
  seller_id: number;
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  is_negotiable: number;
  location: string;
  status: 'available' | 'reserved' | 'sold';
  images: string | null; // JSON array of image URLs
  created_at: string;
  // Joined fields
  seller_name?: string;
  seller_avatar?: string;
  seller_rating?: number;
  seller_reviews_count?: number;
  is_seller_verified?: number;
}

export interface Transaction {
  id: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  amount: number;
  shipping_fee: number;
  total_amount: number;
  status: 'pending' | 'pending_payment' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'disputed' | 'refunded';
  escrow_status: 'pending' | 'held' | 'released' | 'refunded';
  payment_method: string | null;
  payment_reference: string | null;
  gateway_response: string | null;
  shipping_address: string | null;
  tracking_id: string | null;
  dispute_reason: string | null;
  dispute_evidence: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  listing_title?: string;
  listing_images?: string;
  seller_name?: string;
  buyer_name?: string;
}

export interface Offer {
  id: number;
  listing_id: number;
  buyer_id: number;
  seller_id: number;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected' | 'countered' | 'expired';
  expires_at: string | null;
  created_at: string;
  // Joined fields
  listing_title?: string;
  buyer_name?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  listing_id: number | null;
  content: string;
  created_at: string;
}

export interface Review {
  id: number;
  transaction_id: number;
  buyer_id: number;
  seller_id: number;
  rating: number;
  review_text: string | null;
  created_at: string;
  // Joined fields
  buyer_name?: string;
  buyer_avatar?: string;
}
