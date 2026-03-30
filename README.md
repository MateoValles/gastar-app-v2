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

## Getting Started

> **Note**: The project is currently in the design phase. Implementation has not started yet.

Setup instructions will be added once the monorepo is bootstrapped.

---

## License

Private project — not open source.
