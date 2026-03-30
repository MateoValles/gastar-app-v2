# AGENTS.md — Project-Level AI Instructions

> This file provides project-specific context for any AI agent working on Gastar App v2.
> It supplements (does not replace) the global AGENTS.md in the user's config.

---

## Project Overview

**Gastar** is a personal finance tracker — PERN stack, TypeScript monorepo, <10 users.
The architecture is fully designed and documented. Do not deviate from it.

**Source of truth**: [`ARCHITECTURE.md`](./ARCHITECTURE.md) — if something isn't there, it doesn't exist yet.

**Visual identity**: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — colors, typography, layouts, components, toasts. Every UI decision traces back to this document.

---

## Tech Stack

| Layer      | Technology                    |
| ---------- | ----------------------------- |
| Database   | PostgreSQL 16 + Prisma ORM    |
| Backend    | Node.js 22 LTS, Express 5    |
| Frontend   | React 19, Vite, Tailwind 4   |
| Language   | TypeScript 5.x everywhere    |
| Monorepo   | pnpm workspaces               |
| Testing    | Vitest, RTL, Playwright       |

---

## Monorepo Structure

```
gastar-app-v2/
├── packages/
│   ├── shared/        # @gastar/shared — Zod schemas, types, constants, i18n
│   ├── backend/       # @gastar/backend — Express API (screaming architecture)
│   └── frontend/      # @gastar/frontend — React SPA (PWA)
├── database/
│   └── prisma/        # Schema, migrations, seed (NOT a workspace package)
├── ARCHITECTURE.md    # Single source of truth
├── DESIGN_SYSTEM.md   # Visual identity & UI conventions
├── COMMIT_RULES.md    # Git conventions
└── AGENTS.md          # This file
```

**Dependency direction**: `frontend` → `shared` ← `backend`. The `shared` package NEVER imports from `frontend` or `backend`.

---

## Architecture Decisions (Do Not Override)

These decisions are final. Do not question, change, or propose alternatives unless explicitly asked.

### Database

- **UUIDs** for all primary keys — no auto-increment.
- **Decimal(15,2)** for money, **Decimal(15,6)** for exchange rates. NEVER use floats for money.
- **`updatedAt`** on every model via Prisma's `@updatedAt`.
- **Reset tokens** stored as SHA-256 hash — never plain text.

### Multi-Currency

- Each account has exactly ONE currency (ARS, USD, EUR).
- Balances are **never consolidated** across currencies.
- Dashboard shows separate totals per currency group.
- Exchange rate only exists on cross-currency transfers, fixed at transaction time, entered manually.

### Transfer Model (2-Record Design)

- Every transfer creates **2 Transaction rows** linked by `transferGroupId` (shared UUID).
- One row with `transferSide: out` (debit), one with `transferSide: in` (credit).
- `transferPeerAccountId` is display-only (the other account in the transfer). Uses `SetNull` on delete.
- Same-currency: both amounts equal, `exchangeRate` null.
- Cross-currency: amounts differ, `exchangeRate` is set.

### Categories

- Every category belongs to a user (`userId` NOT NULL).
- Default categories are **copied to the user** at registration — templates live in auth service code, NOT in the database.
- `onDelete: Restrict` on transactions — must reassign transactions before deleting a category.

### Balance Integrity

- `Account.balance` is a stored field for fast reads.
- It MUST be updated inside `prisma.$transaction()` alongside the Transaction insert/update/delete.
- Never update balance outside of a Prisma transaction.

### Backend Patterns

- **Screaming architecture**: one folder per domain module (`auth/`, `accounts/`, `categories/`, `transactions/`, `users/`).
- Each module: `*.controller.ts`, `*.service.ts`, `*.routes.ts`, `__tests__/`.
- **Controllers** never access Prisma directly. **Services** never access `req`/`res`.
- Services throw typed `AppError` subclasses. Controllers do NOT wrap in try/catch.
- Global error middleware catches everything.
- Authorization is ownership-based — every query scoped to `userId`. Enforced in the SERVICE layer.

### Frontend Patterns

- **Feature-based organization**: pages, components, hooks, services, stores.
- **Server state** → React Query. **Client state** → Zustand. Never mix them.
- **Forms** → React Hook Form + Zod schemas from `@gastar/shared`.
- **No hardcoded strings** — always `t('key')` via react-i18next.
- **Container-presentational pattern**: presentational components receive ALL data via props.

### i18n

- Spanish-first (`es`), English secondary (`en`).
- Translation files in `@gastar/shared/locales/`.
- Backend sends error `code` (English), frontend translates via i18next.
- Numbers/dates formatted via `Intl` APIs using the active locale.

---

## Naming Conventions

| Context                 | Convention           | Example                         |
| ----------------------- | -------------------- | ------------------------------- |
| Variables, functions    | `camelCase`          | `getUserAccounts`               |
| Components, classes     | `PascalCase`         | `AccountCard`, `AppError`       |
| Constants               | `SCREAMING_SNAKE`    | `DEFAULT_CATEGORIES`            |
| Files (utilities)       | `kebab-case.ts`      | `api-client.ts`                 |
| Files (React)           | `PascalCase.tsx`     | `AccountCard.tsx`               |
| Files (types)           | `kebab-case.type.ts` | `account.types.ts`              |
| Prisma models           | `PascalCase`         | `UserSettings`                  |
| DB tables (@@map)       | `snake_case`         | `user_settings`                 |
| DB columns (@map)       | `snake_case`         | `created_at`                    |
| API endpoints           | Plural nouns         | `/accounts`, `/transactions`    |
| Translation keys        | Dot notation         | `dashboard.totalBalance`        |

---

## API Conventions

- **Base path**: `/v1`
- **Response envelope**: `{ success: boolean, data?: T, error?: { code, message, details? }, meta?: { page, limit, total } }`
- **HTTP methods**: GET (read), POST (create), PATCH (partial update), DELETE (remove)
- **Validation**: Zod schemas at the middleware level, before controllers.
- **Status codes**: 200, 201, 400, 401, 404, 409, 500.

---

## Git & Commit Rules

See [`COMMIT_RULES.md`](./COMMIT_RULES.md) for full details.

- Conventional Commits with scopes: `feat(backend):`, `fix(frontend):`, `chore(db):`.
- Squash merge to `main`.
- Never add AI attribution to commits.

---

## What NOT to Do

- **Don't consolidate balances across currencies** — no "total in ARS" calculations.
- **Don't store plain-text tokens** — always hash before persisting.
- **Don't use floats for money** — Decimal only.
- **Don't bypass Prisma transactions for balance updates** — balance and transaction must be atomic.
- **Don't put business logic in controllers** — controllers are thin, services are fat.
- **Don't put API calls in React components** — use hooks that wrap React Query.
- **Don't access `req`/`res` in services** — services are pure business logic.
- **Don't create global/shared categories** — every category has a `userId`.
