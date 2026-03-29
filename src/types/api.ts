/**
 * EcoTrade — API Response Types
 * 
 * All API endpoints should return responses conforming to this structure.
 * Per the AI Protocol: { success: boolean; data?: T; error?: string }
 */

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Authenticated request type extending Express Request
 */
export interface AuthenticatedRequest extends Express.Request {
  user?: {
    id: number;
    email: string;
    username: string | null;
  };
}
