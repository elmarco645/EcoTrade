# EcoTrade AI Engineering Protocol

> This file is a reference copy of the project's AI engineering standards.
> See the root `AI protocol.md` for the full, canonical version.

## Quick Reference

### Project Structure
```
src/
  controllers/   — Request handling logic
  services/      — Business logic & external API integrations
  routes/        — Express route definitions
  validators/    — Zod input validation schemas
  types/         — TypeScript interfaces & type definitions
  utils/         — Middleware, upload config, constants
backend/
  server.ts      — Express server bootstrap
  db.ts          — SQLite database configuration & schema
frontend/
  src/           — React application source
docs/            — Project documentation
.agent/          — AI metadata (this directory)
directives/      — Project metadata & environment templates
execution/       — Application entry points
```

### Architecture
- **Pattern**: Modular MVC with Service Layer
- **API Response Format**: `{ success: boolean; data?: T; error?: string }`
- **Auth**: JWT tokens (7-day expiry)
- **Database**: SQLite via better-sqlite3
- **Payments**: Flutterwave (with simulation mode)
- **Validation**: Zod schemas
- **Real-time**: Socket.io

### Transaction States (Escrow-Safe)
- `pending` → `paid` → `shipped` → `delivered` → `completed`
- `disputed` → `refunded`

### Escrow States
- `pending` → `held` → `released`
- `refunded`
