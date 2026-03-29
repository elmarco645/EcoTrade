# 🌿 EcoTrade — Secure Modular Marketplace

[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Protocol](https://img.shields.io/badge/Protocol-AI_Engineering-FF4B4B)](.agent/protocol.md)

EcoTrade is a high-performance, secure marketplace designed for sustainable commerce. It features a robust **Escrow System**, real-time **Buyer-Seller Chat**, and a **Virtual Wallet**, all built on a hyper-modular backend architecture following the [AI Engineering Protocol](.agent/protocol.md).

---

## ✨ Key Features

- 🔐 **Secure Escrow** — Funds are only released when the buyer confirms satisfaction.
- 💬 **Real-time Chat** — Seamless communication via Socket.io.
- 💳 **Integrated Payments** — Swift transactions via Flutterwave (M-Pesa, Card, Bank).
- 👤 **Verified Profiles** — Identity verification for trusted trading.
- 🌈 **Premium UX** — Glassmorphism UI, smooth Framer Motion transitions, and Outfit typography.
- 🛡️ **Zod Validation** — Strict type safety for all API inputs.

---

## 🏗️ Modular Architecture

The project is structured for extreme maintainability and scalability:

```text
d:\EcoTrade\
├── src/                 — Backend Source (Decomposed Monolith)
│   ├── controllers/     — Request orchestration
│   ├── services/        — Business logic (Email, Payment, Captcha)
│   ├── routes/          — API definition layers
│   ├── validators/      — Zod schema definitions
│   └── utils/           — Middleware & constants
├── frontend/            — React 19 SPA (Vite 6)
│   ├── src/context/     — Global State (User, Cart)
│   └── src/pages/       — Advanced UI Components
└── docs/                — Technical Specs & API Docs
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **NPM** or **PNPM**

### 2. Setup environment
Copy `.env.example` to `.env` and fill in your keys:
- `GEMINI_API_KEY` (AI features)
- `FLW_SECRET_KEY` (Payment simulation)
- `VITE_RECAPTCHA_SITE_KEY` (Frontend bot protection)
- `RECAPTCHA_SECRET` (Backend validation)

### 3. Install & Run
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

---

## 🛠️ Tech Stack
- **Frontend**: React 19, Vite 6, TailwindCSS 4, Framer Motion
- **Backend**: Node.js, Express, TypeScript 5.8
- **Database**: SQLite (Better-SQLite3)
- **Security**: JWT, bcryptjs, reCAPTCHA v2
- **Real-time**: Socket.io

---

<div align="center">
  <sub>Built with ❤️ by Antigravity AI Engineering</sub>
</div>
