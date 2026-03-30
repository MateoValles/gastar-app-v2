<p align="center">
  <img src="assets/logo-full.svg" alt="Gastar" height="48" />
</p>

<p align="center">
  Personal finance tracker — simple, fast, reliable.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-in%20development-orange" alt="Status" />
  <img src="https://img.shields.io/badge/stack-PERN-blue" alt="Stack" />
  <img src="https://img.shields.io/badge/typescript-5.x-3178c6" alt="TypeScript" />
  <img src="https://img.shields.io/badge/license-private-lightgrey" alt="License" />
</p>

---

## What is Gastar?

Gastar is a personal finance application for tracking accounts, categories, and transactions (income, expenses, and transfers). Built for personal use and a small circle of users — not a public SaaS.

**Core philosophy**: every screen has a purpose. No feature bloat.

### Key Features (MVP)

- Multi-account management (checking, savings, cash, credit cards)
- Income & expense tracking with custom categories
- Transfers between accounts (same and cross-currency)
- Multi-currency support (ARS, USD, EUR) — balances never consolidated
- PWA — installable, mobile-first, works offline
- Spanish-first UI with English option

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Database | PostgreSQL 16 + Prisma ORM |
| Backend | Node.js 22 LTS, Express 5 |
| Frontend | React 19, Vite, Tailwind 4 |
| Language | TypeScript 5.x everywhere |
| Monorepo | pnpm workspaces |
| Testing | Vitest, React Testing Library, Playwright |

---

## Project Structure

```
gastar-app-v2/
├── packages/
│   ├── shared/          # Zod schemas, types, constants, i18n
│   ├── backend/         # Express API (screaming architecture)
│   └── frontend/        # React SPA (PWA)
├── database/
│   └── prisma/          # Schema, migrations, seed
├── assets/              # Logo and brand assets
├── ARCHITECTURE.md      # Architecture & decisions
├── DESIGN_SYSTEM.md     # Visual identity & UI
├── COMMIT_RULES.md      # Git conventions
└── AGENTS.md            # AI agent instructions
```

> **Dependency direction**: `frontend` → `shared` ← `backend`. The shared package never imports from frontend or backend.

---

## Documentation

| Document | Description |
|----------|-------------|
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Single source of truth — tech stack, patterns, database schema, API design, feature scope |
| [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) | Visual identity — colors, typography, components, layouts, toasts |
| [`COMMIT_RULES.md`](./COMMIT_RULES.md) | Git conventions — conventional commits, branch naming, PR rules |
| [`AGENTS.md`](./AGENTS.md) | AI agent instructions — project context for automated assistants |

---

## Implementation Progress

### Backend API (`/v1`)

| Module | Status | PR | Endpoints |
|--------|--------|----|-----------|
| Auth | ✅ Done | [#3](https://github.com/MateoValles/gastar-app-v2/pull/3) | 8 endpoints (register, login, refresh, logout, Google OAuth, password reset) |
| Accounts | ✅ Done | [#5](https://github.com/MateoValles/gastar-app-v2/pull/5) | Full CRUD with ownership enforcement |
| Categories | ✅ Done | [#6](https://github.com/MateoValles/gastar-app-v2/pull/6) | Full CRUD with pre-flight delete checks |
| Transactions | ✅ Done | [#7](https://github.com/MateoValles/gastar-app-v2/pull/7) | Full CRUD, 2-record transfers, atomic balance updates, pagination + filtering |
| Users | ✅ Done | [#8](https://github.com/MateoValles/gastar-app-v2/pull/8) | GET/PATCH profile with settings |
| Dashboard | 🔲 Pending | — | Summary endpoint |

### Frontend
Not started yet.

### Infrastructure
Not started yet.

---

## Getting Started

### Prerequisites

- **Node.js** 22 LTS
- **pnpm** 9+
- **PostgreSQL** 16+

### Installation

```bash
# Clone the repository
git clone https://github.com/MateoValles/gastar-app-v2.git
cd gastar-app-v2

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database credentials and secrets

# Run database migrations
pnpm db:migrate

# Build the shared package
pnpm --filter @gastar/shared build

# Start the backend dev server
pnpm --filter @gastar/backend dev
```

---

## License

Private project — not open source.
