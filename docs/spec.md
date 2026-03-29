# EcoTrade — Project Specification

## Overview
EcoTrade is a secure online marketplace for buying and selling new and second-hand items with an integrated escrow payment system. Built with React (Vite) frontend and Express.js backend using SQLite.

## Core Features
1. **Secure Escrow System** — Funds held until buyer confirms delivery
2. **Real-time Chat** — Socket.io powered buyer-seller messaging
3. **Virtual Wallet** — In-app balance for transactions
4. **User Ratings & Trust** — Review system with seller verification
5. **Multi-auth** — Email/password, Google OAuth, GitHub OAuth
6. **Payment Gateway** — Flutterwave integration (M-Pesa, Card, Airtel)
7. **Identity Verification** — National ID verification for sellers

## Tech Stack
| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 19, Vite 6, TailwindCSS 4    |
| Backend     | Express 4, TypeScript 5.8           |
| Database    | SQLite (better-sqlite3)             |
| Auth        | JWT, bcryptjs, Google/GitHub OAuth  |
| Payments    | Flutterwave API                     |
| Real-time   | Socket.io                          |
| Validation  | Zod                                |
| Email       | Nodemailer (Gmail SMTP)             |
| File Upload | Multer                             |

## Database Schema

### users
| Column                | Type     | Notes                          |
|-----------------------|----------|--------------------------------|
| id                    | INTEGER  | PK, autoincrement              |
| email                 | TEXT     | Unique, not null               |
| password              | TEXT     | bcrypt hashed                  |
| name                  | TEXT     | Display name                   |
| full_name             | TEXT     | Legal name                     |
| username              | TEXT     | Unique                         |
| role                  | TEXT     | Default 'buyer'                |
| bio                   | TEXT     | Profile bio                    |
| location              | TEXT     | User location                  |
| avatar_url            | TEXT     | Profile photo URL              |
| wallet_balance        | REAL     | Default 1000.0 (demo)          |
| rating                | REAL     | Average review score            |
| is_verified           | INTEGER  | Identity verification          |
| is_email_verified     | INTEGER  | Email verified flag            |
| is_seller_verified    | INTEGER  | Seller verification            |
| phone                 | TEXT     | Unique                         |
| google_id / github_id | TEXT     | OAuth provider IDs             |
| created_at            | DATETIME | Auto timestamp                 |

### listings
| Column       | Type     | Notes                    |
|--------------|----------|--------------------------|
| id           | INTEGER  | PK, autoincrement        |
| seller_id    | INTEGER  | FK → users               |
| title        | TEXT     | Not null                 |
| description  | TEXT     | Not null                 |
| category     | TEXT     | Not null                 |
| condition    | TEXT     | Not null                 |
| price        | REAL     | Not null                 |
| is_negotiable| INTEGER  | 0 or 1                   |
| location     | TEXT     | Not null                 |
| status       | TEXT     | available/reserved/sold  |
| images       | TEXT     | JSON array of URLs       |
| created_at   | DATETIME | Auto timestamp           |

### transactions
| Column            | Type     | Notes                              |
|-------------------|----------|------------------------------------|
| id                | INTEGER  | PK, autoincrement                  |
| listing_id        | INTEGER  | FK → listings                      |
| buyer_id          | INTEGER  | FK → users                         |
| seller_id         | INTEGER  | FK → users                         |
| amount            | REAL     | Item price                         |
| shipping_fee      | REAL     | Default 0                          |
| total_amount      | REAL     | amount + shipping_fee              |
| status            | TEXT     | pending/paid/shipped/delivered/completed/disputed/refunded |
| escrow_status     | TEXT     | pending/held/released/refunded     |
| payment_method    | TEXT     | Payment method used                |
| payment_reference | TEXT     | Gateway reference                  |
| shipping_address  | TEXT     | Delivery address                   |
| tracking_id       | TEXT     | Shipping tracking number           |

### offers
| Column     | Type     | Notes                              |
|------------|----------|------------------------------------|
| id         | INTEGER  | PK, autoincrement                  |
| listing_id | INTEGER  | FK → listings                      |
| buyer_id   | INTEGER  | FK → users                         |
| seller_id  | INTEGER  | FK → users                         |
| amount     | REAL     | Offered price                      |
| status     | TEXT     | pending/accepted/rejected/countered/expired |
| expires_at | DATETIME | 24-hour expiry                     |

### messages
| Column      | Type     | Notes              |
|-------------|----------|--------------------|
| id          | INTEGER  | PK, autoincrement  |
| sender_id   | INTEGER  | FK → users         |
| receiver_id | INTEGER  | FK → users         |
| listing_id  | INTEGER  | FK → listings      |
| content     | TEXT     | Not null           |

### reviews
| Column         | Type     | Notes                    |
|----------------|----------|--------------------------|
| id             | INTEGER  | PK, autoincrement        |
| transaction_id | INTEGER  | FK → transactions, unique per buyer |
| buyer_id       | INTEGER  | FK → users               |
| seller_id      | INTEGER  | FK → users               |
| rating         | INTEGER  | 1–5                      |
| review_text    | TEXT     | Optional                 |

## API Routes

### Auth (`/api/auth/`)
- `POST /register` — Create account with email verification
- `POST /login` — Login via email/username/phone
- `GET /verify-email` — Verify email token
- `POST /resend-verification` — Resend verification email
- `POST /forgot-password` — Request password reset
- `POST /reset-password` — Reset password with token
- `GET /google/url` — Get Google OAuth URL
- `GET /github/url` — Get GitHub OAuth URL
- `GET /callback` — OAuth callback handler

### User (`/api/user/`)
- `GET /profile` — Get current user profile
- `PATCH /profile` — Update profile
- `POST /change-password` — Change password
- `POST /request-email-change` — Request email change
- `GET /confirm-email-change` — Confirm email change
- `POST /upload-avatar` — Upload avatar image
- `POST /upload-cover` — Upload cover image
- `POST /verify-id` — Verify national ID
- `GET /export-data` — Export all user data (GDPR)
- `POST /delete-account` — Schedule account deletion
- `GET /undo-delete` — Restore deleted account
- `GET /wallet` — Get wallet balance
- `GET /transactions` — Get user's transactions

### Listings (`/api/listings/`)
- `GET /` — Get all available listings
- `GET /:id` — Get listing details
- `POST /` — Create new listing

### Offers (`/api/offers/`)
- `POST /` — Create offer
- `GET /` — Get user's offers
- `POST /:id/accept` — Accept offer
- `POST /:id/reject` — Reject offer

### Orders (`/api/orders/`)
- `GET /` — Get user's orders
- `POST /:id/ship` — Mark as shipped
- `POST /:id/deliver` — Mark as delivered
- `POST /:id/confirm` — Confirm receipt (releases escrow)
- `POST /:id/dispute` — Dispute order

### Payments (`/api/pay/`)
- `POST /` — Initiate Flutterwave payment
- `GET /verify` — Verify payment
- `POST /webhook/flutterwave` — Flutterwave webhook

### Other
- `GET /api/health` — Health check
- `POST /api/cart/validate` — Validate cart items
- `POST /api/transactions/buy` — Direct wallet purchase
- `POST /api/transactions/checkout` — Cart checkout
- `POST /api/transactions/:id/confirm` — Confirm transaction
- `POST /api/reviews` — Create review
- `GET /api/sellers/:id/reviews` — Get seller reviews

## Folder Structure
```
d:\EcoTrade\
├── .agent/          — AI metadata & protocol
├── backend/         — Express server & database
├── directives/      — Project metadata & environment templates
├── docs/            — Project documentation
├── execution/       — Application entry points (boot.ts)
├── frontend/        — React application (Vite)
├── src/             — Modular backend source code
│   ├── controllers/ — Request handlers
│   ├── routes/      — Express route definitions
│   ├── services/    — Business logic & integrations
│   ├── types/       — TypeScript interfaces
│   ├── utils/       — Middleware, upload, constants
│   └── validators/  — Zod validation schemas
└── uploads/         — User uploaded files
```
