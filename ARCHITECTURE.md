# Gastar App v2 — Architecture Document

> **Purpose**: This document is the single source of truth for the architecture, technology choices, and feature scope of Gastar App v2. Every implementation decision should trace back to this document. If it's not here, it doesn't exist yet.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Monorepo Structure](#3-monorepo-structure)
4. [Architecture Patterns](#4-architecture-patterns)
5. [Database Schema](#5-database-schema)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Error Handling](#7-error-handling)
8. [API Design](#8-api-design)
9. [Frontend Architecture](#9-frontend-architecture)
10. [Internationalization (i18n)](#10-internationalization-i18n)
11. [PWA Strategy](#11-pwa-strategy)
12. [Testing Strategy](#12-testing-strategy)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Feature Scope (MVP)](#14-feature-scope-mvp)
15. [Feature Scope (Post-MVP)](#15-feature-scope-post-mvp)
16. [Conventions & Standards](#16-conventions--standards)

> **Related documents**: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (visual identity, component variants, page layouts, toast catalog) · [`COMMIT_RULES.md`](./COMMIT_RULES.md) (git conventions) · [`AGENTS.md`](./AGENTS.md) (AI agent instructions)

---

## 1. Project Overview

**Gastar** is a personal finance tracking application designed for managing accounts, categories, and transactions (income, expenses, and transfers between accounts).

- **Target users**: Personal use + close circle (small user base, not public SaaS)
- **Platform**: Web application (PWA) — responsive, mobile-first design
- **Primary language**: Spanish (with English option)
- **Core philosophy**: Simple, fast, reliable. No feature bloat. Every screen has a purpose.

---

## 2. Tech Stack

### Core (PERN Stack)

| Layer      | Technology       | Version  | Purpose                          |
| ---------- | ---------------- | -------- | -------------------------------- |
| Database   | PostgreSQL       | 16+      | Primary data store               |
| ORM        | Prisma           | Latest   | Type-safe database access        |
| Backend    | Node.js          | 22 LTS   | Runtime                          |
| Framework  | Express.js       | 5.x      | HTTP server & routing            |
| Frontend   | React            | 19.x     | UI library                       |
| Bundler    | Vite             | Latest   | Frontend build tool              |
| Language   | TypeScript       | 5.x      | Across the entire monorepo       |

### Frontend Libraries

| Library              | Purpose                                    |
| -------------------- | ------------------------------------------ |
| Shadcn/ui            | Component library (built on Radix UI)      |
| Tailwind CSS 4       | Utility-first styling                      |
| React Router         | Client-side routing                        |
| TanStack React Query | Server state management (cache, sync)      |
| Zustand              | Client state (UI state, filters, modals)   |
| React Hook Form      | Form management                            |
| Zod                  | Schema validation (shared with backend)    |
| Recharts             | Charts and data visualization              |
| react-i18next        | Internationalization (Spanish + English)   |
| Lucide React         | Icon library (pairs with Shadcn)           |

### Backend Libraries

| Library              | Purpose                                    |
| -------------------- | ------------------------------------------ |
| Prisma Client        | Database queries                           |
| Zod                  | Request validation (shared schemas)        |
| jsonwebtoken (jose)  | JWT token generation & verification        |
| bcrypt               | Password hashing                           |
| Passport.js          | Authentication strategies (Google OAuth)   |
| Resend               | Transactional emails (password reset)      |
| helmet               | Security headers                           |
| cors                 | CORS configuration                         |
| express-rate-limit   | Rate limiting                              |

### DevOps & Tooling

| Tool                 | Purpose                                    |
| -------------------- | ------------------------------------------ |
| pnpm                 | Package manager + workspace management     |
| Docker               | Containerization (Dokploy deployment)      |
| Vitest               | Unit & integration testing                 |
| React Testing Lib    | Component testing                          |
| Playwright           | End-to-end testing                         |
| ESLint               | Linting                                    |
| Prettier             | Code formatting                            |
| husky + lint-staged  | Pre-commit hooks                           |

---

## 3. Monorepo Structure

Managed via **pnpm workspaces**. Three packages with clear boundaries.

```
gastar-app-v2/
├── package.json              # Root: workspace config, shared scripts
├── pnpm-workspace.yaml       # Workspace definition
├── docker-compose.yml        # Local dev + production compose
├── Dockerfile.frontend       # Frontend container
├── Dockerfile.backend        # Backend container
├── .env.example              # Environment variables template
├── ARCHITECTURE.md           # This document
│
├── packages/
│   ├── shared/               # @gastar/shared — shared code
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── schemas/      # Zod schemas (used by both front & back)
│   │       │   ├── auth.schema.ts
│   │       │   ├── account.schema.ts
│   │       │   ├── category.schema.ts
│   │       │   └── transaction.schema.ts
│   │       ├── types/        # Shared TypeScript types/interfaces
│   │       │   ├── api.types.ts        # API response wrappers
│   │       │   ├── account.types.ts
│   │       │   ├── category.types.ts
│   │       │   ├── transaction.types.ts
│   │       │   └── user.types.ts
│   │       ├── constants/    # Shared constants & enums
│   │       │   ├── currencies.ts
│   │       │   └── account-types.ts
│   │       └── locales/      # Translation files (JSON)
│   │           ├── es.json   # Spanish (primary)
│   │           └── en.json   # English
│   │
│   ├── backend/              # @gastar/backend — Express API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts              # Entry point
│   │       ├── app.ts                # Express app setup
│   │       ├── config/               # Environment & app config
│   │       │   ├── env.ts
│   │       │   ├── database.ts
│   │       │   └── auth.ts
│   │       ├── modules/              # Feature modules (screaming architecture)
│   │       │   ├── auth/
│   │       │   │   ├── auth.controller.ts
│   │       │   │   ├── auth.service.ts
│   │       │   │   ├── auth.routes.ts
│   │       │   │   ├── strategies/
│   │       │   │   │   ├── jwt.strategy.ts
│   │       │   │   │   └── google.strategy.ts
│   │       │   │   └── __tests__/
│   │       │   ├── accounts/
│   │       │   │   ├── accounts.controller.ts
│   │       │   │   ├── accounts.service.ts
│   │       │   │   ├── accounts.routes.ts
│   │       │   │   └── __tests__/
│   │       │   ├── categories/
│   │       │   │   ├── categories.controller.ts
│   │       │   │   ├── categories.service.ts
│   │       │   │   ├── categories.routes.ts
│   │       │   │   └── __tests__/
│   │       │   ├── transactions/
│   │       │   │   ├── transactions.controller.ts
│   │       │   │   ├── transactions.service.ts
│   │       │   │   ├── transactions.routes.ts
│   │       │   │   └── __tests__/
│   │       │   └── users/
│   │       │       ├── users.controller.ts
│   │       │       ├── users.service.ts
│   │       │       ├── users.routes.ts
│   │       │       └── __tests__/
│   │       ├── middleware/
│   │       │   ├── auth.middleware.ts
│   │       │   ├── error.middleware.ts
│   │       │   ├── validation.middleware.ts
│   │       │   └── rate-limit.middleware.ts
│   │       ├── lib/                  # Shared utilities
│   │       │   ├── prisma.ts         # Prisma client singleton
│   │       │   ├── resend.ts         # Email client
│   │       │   └── errors.ts         # AppError class hierarchy
│   │       └── types/                # Backend-only types
│   │           └── express.d.ts      # Express type extensions
│   │
│   └── frontend/             # @gastar/frontend — React SPA (PWA)
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── index.html
│       ├── public/
│       │   ├── manifest.json         # PWA manifest
│       │   ├── sw.js                 # Service worker
│       │   └── icons/                # PWA icons (multiple sizes)
│       └── src/
│           ├── main.tsx              # Entry point
│           ├── App.tsx               # Root component + providers
│           ├── routes/               # Route definitions
│           │   └── index.tsx
│           ├── pages/                # Page-level components (one per route)
│           │   ├── auth/
│           │   │   ├── LoginPage.tsx
│           │   │   ├── RegisterPage.tsx
│           │   │   └── ResetPasswordPage.tsx
│           │   ├── dashboard/
│           │   │   └── DashboardPage.tsx
│           │   ├── accounts/
│           │   │   └── AccountsPage.tsx
│           │   ├── categories/
│           │   │   └── CategoriesPage.tsx
│           │   └── transactions/
│           │       └── TransactionsPage.tsx
│           ├── components/           # Reusable components
│           │   ├── ui/               # Shadcn/ui components (auto-generated)
│           │   ├── layout/           # Layout components
│           │   │   ├── AppLayout.tsx
│           │   │   ├── Sidebar.tsx
│           │   │   ├── Header.tsx
│           │   │   ├── MobileNav.tsx
│           │   │   └── PageContainer.tsx
│           │   ├── forms/            # Form components
│           │   │   ├── AccountForm.tsx
│           │   │   ├── CategoryForm.tsx
│           │   │   └── TransactionForm.tsx
│           │   ├── data-display/     # Tables, cards, lists
│           │   │   ├── AccountCard.tsx
│           │   │   ├── TransactionTable.tsx
│           │   │   └── CategoryList.tsx
│           │   └── charts/           # Dashboard charts
│           │       ├── BalanceOverview.tsx
│           │       ├── ExpensesByCategory.tsx
│           │       └── MonthlyTrend.tsx
│           ├── hooks/                # Custom React hooks
│           │   ├── use-accounts.ts
│           │   ├── use-categories.ts
│           │   ├── use-transactions.ts
│           │   └── use-auth.ts
│           ├── services/             # API client layer
│           │   ├── api-client.ts     # Axios/fetch wrapper
│           │   ├── auth.service.ts
│           │   ├── accounts.service.ts
│           │   ├── categories.service.ts
│           │   └── transactions.service.ts
│           ├── stores/               # Zustand stores (client state only)
│           │   ├── ui.store.ts       # Sidebar, modals, theme
│           │   └── filters.store.ts  # Transaction filters state
│           ├── lib/                  # Utilities
│           │   ├── utils.ts          # General helpers (cn, formatters)
│           │   ├── query-client.ts   # React Query client config
│           │   └── i18n.ts           # i18next configuration
│           └── styles/
│               └── globals.css       # Tailwind base + custom tokens
│
└── database/                 # Database (not a workspace package)
    └── prisma/
        ├── schema.prisma
        ├── migrations/
        └── seed.ts           # Database seeding
```

### Workspace Configuration

```yaml
# pnpm-workspace.yaml
packages:
  - "packages/*"
```

### Package Dependencies

```
@gastar/frontend  →  depends on  →  @gastar/shared
@gastar/backend   →  depends on  →  @gastar/shared
@gastar/shared    →  standalone (no internal deps)
```

> **Rule**: `shared` NEVER imports from `frontend` or `backend`. Dependencies flow ONE direction: from edge packages toward the shared core.

---

## 4. Architecture Patterns

### Backend: Modular / Screaming Architecture

The backend follows a **module-based architecture** where each feature domain is self-contained:

```
modules/
├── auth/           # Everything about authentication
├── accounts/       # Everything about accounts
├── categories/     # Everything about categories
├── transactions/   # Everything about transactions
└── users/          # Everything about user profiles
```

Each module contains:
- **Controller**: Handles HTTP request/response. No business logic. Calls services.
- **Service**: Contains ALL business logic. Calls Prisma. Returns typed data.
- **Routes**: Express router definitions with middleware.
- **Tests**: Co-located tests for the module.

```
Request → Route → Middleware(s) → Controller → Service → Prisma → DB
                                     ↓
                                  Response
```

> **Rule**: Controllers NEVER access Prisma directly. Services NEVER access `req`/`res`.

### Frontend: Feature-Based Organization

The frontend follows a **feature-based structure** with clear separation:

- **Pages**: One component per route. Composes feature components. Handles data fetching via hooks.
- **Components**: Reusable UI pieces. Receive data via props. No direct API calls.
- **Hooks**: Encapsulate React Query calls. One hook per domain (accounts, transactions, etc.).
- **Services**: API client functions. Pure functions that return promises. No React dependencies.
- **Stores**: Zustand stores for UI-only state. Server state lives in React Query cache.

### Data Flow

```
User Action → Component → Hook (React Query) → Service (API call) → Backend
                                   ↓
                            Cache Update → Re-render
```

### State Management Split

| State Type      | Tool          | Examples                                    |
| --------------- | ------------- | ------------------------------------------- |
| Server state    | React Query   | Accounts, transactions, categories, user    |
| UI state        | Zustand       | Sidebar open/closed, active modal, theme    |
| Form state      | React Hook Form | Form inputs, validation errors            |
| URL state       | React Router  | Current page, query params for filters      |
| Filter state    | Zustand       | Transaction filters (synced to URL params)  |

> **Rule**: If data comes from the API, it lives in React Query. Zustand is for client-only state.

---

## 5. Database Schema

See `database/prisma/schema.prisma` for the full schema with inline documentation.

### Entity Relationship Summary

```
User (1) ──── (1) UserSettings
User (1) ──── (N) Account
User (1) ──── (N) Category
Account (1) ── (N) Transaction
Category (1) ── (N) Transaction
Account (1) ── (N) Transaction (as transfer peer — display only)
```

### Key Design Decisions

- **UUIDs** for all primary keys (no auto-increment — safer for distributed systems, non-guessable)
- **Decimal(15,2)** for monetary amounts, **Decimal(15,6)** for exchange rates. NEVER use floats for money.
- **`updatedAt`** on all models via Prisma's `@updatedAt`
- **Reset token stored as SHA-256 hash** (`resetTokenHash`) — never store plain-text tokens
- **UserSettings** extracted from User (SRP: identity ≠ preferences). Holds `language` for i18n.

### Transfer Model (2-record design)

Transfers create **2 Transaction records** linked by `transferGroupId`:

| Field                  | Source (out)         | Destination (in)     |
| ---------------------- | -------------------- | -------------------- |
| `transferGroupId`      | Same UUID            | Same UUID            |
| `transferSide`         | `out`                | `in`                 |
| `accountId`            | Source account        | Destination account  |
| `transferPeerAccountId`| Destination account   | Source account       |
| `amount`               | Amount in source currency | Amount in dest currency |
| `exchangeRate`         | Rate (if cross-currency) | Rate (if cross-currency) |
| `categoryId`           | `null`               | `null`               |

**Why 2 records?** Each account "owns" its transaction. Balance updates use the same code path for all types. If one account is deleted, the other side keeps its record (peer link becomes null via `SetNull`).

**Same-currency transfers**: Both amounts are equal, `exchangeRate` is null.
**Cross-currency transfers**: Amounts differ, `exchangeRate` is fixed at transaction time (user enters manually, never recalculated).

### Category Model

- Every category belongs to a user (`userId` NOT NULL)
- Default categories are **copied to the user** at registration time — they become the user's own
- Users can rename, change icon/color, or **delete** any category (including defaults they received)
- `onDelete: Restrict` on transactions — a category with transactions cannot be deleted until transactions are reassigned or removed

### Default Categories

These categories are copied to every new user at registration. The templates live in the auth service code, NOT in the database.

| Name       | Icon           | Color     |
| ---------- | -------------- | --------- |
| Auto       | `car`          | `#3B82F6` |
| Salud      | `heart-pulse`  | `#EF4444` |
| Personal   | `user`         | `#8B5CF6` |
| Social     | `users`        | `#F59E0B` |
| Comida     | `utensils`     | `#10B981` |
| Viajes     | `plane`        | `#06B6D4` |

> Icons reference Lucide icon names. Colors are Tailwind-compatible hex values for chart consistency.

### Multi-Currency

Each account has exactly ONE currency. Balances are **never consolidated** across currencies.

- Dashboard shows: "Tenés $500.000 ARS y $2.000 USD" — separate totals per currency group
- Exchange rate ONLY applies to cross-currency transfers
- Rate is FIXED at transaction time, entered manually, stored once, never recalculated
- No `arsBalance`, no `arsAmount`, no `ExchangeRatePreference` — all removed

### Delete Behavior

| Action                    | Cascade Behavior                                           |
| ------------------------- | ---------------------------------------------------------- |
| Delete User               | Cascades to Accounts, Categories, UserSettings             |
| Delete Account            | Cascades its Transactions. Peer transfer links → `SetNull` |
| Delete Category           | **Restricted** if it has transactions (must reassign first)|
| Delete Transaction        | Direct delete. If transfer, must delete both sides.        |

### Balance Integrity

Account `balance` is a stored field for fast reads. It MUST be updated inside `prisma.$transaction()` alongside the Transaction insert/update/delete to prevent desync.

---

## 6. Authentication & Authorization

### Strategy

Dual authentication with JWT tokens:

1. **Email/Password**: Traditional registration → bcrypt hash → JWT
2. **Google OAuth 2.0**: Via Passport.js Google strategy → JWT

Both flows converge to JWT token issuance. After authentication, every request uses the same JWT-based authorization.

### Token Strategy

| Token         | Lifetime  | Storage            | Purpose               |
| ------------- | --------- | ------------------ | --------------------- |
| Access Token  | 15 min    | Memory (JS variable) | API authorization   |
| Refresh Token | 7 days    | HttpOnly cookie    | Access token renewal  |

### Auth Flow

```
1. Login (email/pass OR Google) → Backend validates → Issues access + refresh tokens
2. Every API call → Access token in Authorization header
3. Access token expires → Frontend auto-calls /auth/refresh → New access token
4. Refresh token expires → User must re-login
```

### Password Reset Flow

```
1. User requests reset → Backend generates token → Stores SHA-256 hash → Resend sends email with plain token
2. User clicks link → Frontend shows reset form
3. User submits new password → Backend hashes submitted token → Matches against stored hash → Updates password → Invalidates token
```

> **Security**: The reset token is NEVER stored in plain text. Only the SHA-256 hash is persisted. The plain token is sent via email and discarded.

### Registration Side Effects

When a new user registers (email/password or Google OAuth), the auth service also:
1. Creates a `UserSettings` record (default language: `es`)
2. Copies the default category templates as user-owned Category records

### Authorization Model

Simple ownership-based authorization. No roles, no permissions matrix.

> **Rule**: Every data query is scoped to the authenticated user's ID. A user can ONLY access their own accounts, categories, and transactions. This is enforced at the SERVICE layer, not middleware.

---

## 7. Error Handling

### Strategy

Typed error classes + a global error middleware. Services throw semantic errors, controllers let them bubble up, the middleware formats and responds.

### Error Class Hierarchy

```
AppError (message, statusCode, code)
├── ValidationError    (400, "VALIDATION_ERROR")
├── UnauthorizedError  (401, "UNAUTHORIZED")
├── ForbiddenError     (403, "FORBIDDEN")
├── NotFoundError      (404, "NOT_FOUND")
├── ConflictError      (409, "CONFLICT")
└── InternalError      (500, "INTERNAL_ERROR")
```

### Flow

```
Service throws AppError → Controller does NOT catch → Global error middleware catches
    ↓
Is AppError?  → Respond with statusCode + standard format
Is other?     → Log full stack trace to console → Respond 500 generic
```

### Error Response Format

```typescript
// Standard error (e.g. NotFoundError)
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Account not found"
  }
}

// Validation error (Zod) — includes field-level details
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "email", "message": "Invalid email" },
      { "field": "amount", "message": "Must be greater than 0" }
    ]
  }
}
```

### i18n for Error Messages

- **Backend** sends `code` (always English) + `message` (English, developer-facing)
- **Frontend** translates the user-facing message using the `code` via i18next
- Translation keys follow the pattern: `errors.NOT_FOUND`, `errors.CONFLICT`, `errors.VALIDATION_ERROR`
- For validation details, the frontend maps `field` + Zod error to a translated message

> This keeps the backend language-agnostic and puts translation responsibility where it belongs — the UI layer.

### Prisma Error Mapping

The error middleware maps known Prisma error codes to AppErrors:

| Prisma Code | AppError          | Example                         |
| ----------- | ----------------- | ------------------------------- |
| `P2002`     | ConflictError     | Duplicate email on registration |
| `P2025`     | NotFoundError     | Record to update/delete not found |
| `P2003`     | ConflictError     | FK constraint (e.g. category in use) |

### Logging

- **4xx errors**: NOT logged (expected — bad input, auth failures)
- **5xx errors**: Logged to console with full stack trace, request method, URL, and body
- **No external logging service** for now — console output is sufficient for <10 users

### Rules

1. **Services** throw `AppError` subclasses — never send HTTP responses
2. **Controllers** do NOT wrap calls in try/catch — let errors propagate to middleware
3. **Validation middleware** catches Zod errors before they reach the controller
4. **Error middleware** is the LAST middleware registered in Express — catches everything

---

## 8. API Design

### Base URL

```
Production: https://api.gastar.app/v1
Development: http://localhost:3001/v1
```

### Response Format

All API responses follow a consistent envelope:

```typescript
// Success
{
  "success": true,
  "data": T,
  "meta": {                  // Optional: pagination, etc.
    "page": 1,
    "limit": 20,
    "total": 150
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable message",
    "details": []            // Optional: field-level errors
  }
}
```

### Endpoints

#### Auth (`/v1/auth`)

| Method | Path              | Description              | Auth |
| ------ | ----------------- | ------------------------ | ---- |
| POST   | `/register`       | Create account           | No   |
| POST   | `/login`          | Email/password login     | No   |
| GET    | `/google`         | Initiate Google OAuth    | No   |
| GET    | `/google/callback` | Google OAuth callback   | No   |
| POST   | `/refresh`        | Refresh access token     | Cookie |
| POST   | `/logout`         | Clear refresh token      | Yes  |
| POST   | `/forgot-password` | Request password reset  | No   |
| POST   | `/reset-password` | Submit new password      | No   |

#### Users (`/v1/users`)

| Method | Path              | Description              | Auth |
| ------ | ----------------- | ------------------------ | ---- |
| GET    | `/me`             | Get current user profile | Yes  |
| PATCH  | `/me`             | Update user profile      | Yes  |

#### Accounts (`/v1/accounts`)

| Method | Path              | Description              | Auth |
| ------ | ----------------- | ------------------------ | ---- |
| GET    | `/`               | List user's accounts     | Yes  |
| GET    | `/:id`            | Get account details      | Yes  |
| POST   | `/`               | Create account           | Yes  |
| PATCH  | `/:id`            | Update account           | Yes  |
| DELETE | `/:id`            | Delete account           | Yes  |

#### Categories (`/v1/categories`)

| Method | Path              | Description              | Auth |
| ------ | ----------------- | ------------------------ | ---- |
| GET    | `/`               | List user's categories   | Yes  |
| GET    | `/:id`            | Get category details     | Yes  |
| POST   | `/`               | Create category          | Yes  |
| PATCH  | `/:id`            | Update category          | Yes  |
| DELETE | `/:id`            | Delete category          | Yes  |

#### Transactions (`/v1/transactions`)

| Method | Path              | Description              | Auth |
| ------ | ----------------- | ------------------------ | ---- |
| GET    | `/`               | List transactions (filtered) | Yes |
| GET    | `/:id`            | Get transaction details  | Yes  |
| POST   | `/`               | Create transaction       | Yes  |
| PATCH  | `/:id`            | Update transaction       | Yes  |
| DELETE | `/:id`            | Delete transaction       | Yes  |

#### Dashboard (`/v1/dashboard`)

| Method | Path              | Description                    | Auth |
| ------ | ----------------- | ------------------------------ | ---- |
| GET    | `/summary`        | Account balances + month stats | Yes  |

### Transaction Filters (Query Params)

```
GET /v1/transactions?accountId=xxx&categoryId=xxx&type=expense&dateFrom=2025-01-01&dateTo=2025-01-31&page=1&limit=20
```

| Param        | Type   | Description                      |
| ------------ | ------ | -------------------------------- |
| `accountId`  | UUID   | Filter by account                |
| `categoryId` | UUID   | Filter by category               |
| `type`       | Enum   | `income`, `expense`, `transfer`  |
| `dateFrom`   | Date   | Start date (inclusive)           |
| `dateTo`     | Date   | End date (inclusive)             |
| `page`       | Number | Page number (default: 1)         |
| `limit`      | Number | Items per page (default: 20)     |

---

## 9. Frontend Architecture

### Routing

```
/login                → LoginPage
/register             → RegisterPage
/reset-password       → ResetPasswordPage
/dashboard            → DashboardPage (default after login)
/accounts             → AccountsPage
/categories           → CategoriesPage
/transactions         → TransactionsPage
```

### Layout Strategy: Responsive Mobile-First

Single responsive layout that adapts across breakpoints. NOT two separate layouts. See [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) for the complete layout specification per page, component variants, and responsive behavior details.

**Breakpoints** (Tailwind defaults):
- `sm`: 640px — Large phones
- `md`: 768px — Tablets
- `lg`: 1024px — Small desktops
- `xl`: 1280px — Desktops

**Layout behavior**:

| Viewport   | Navigation          | Content               |
| ---------- | ------------------- | --------------------- |
| Mobile     | Bottom tab bar      | Full-width, stacked   |
| Tablet+    | Collapsible sidebar | Grid layouts          |

**Key responsive patterns**:
- **Dashboard cards**: 1 column on mobile → 2 columns on tablet → 3-4 on desktop
- **Transaction table**: Card list on mobile → Full table on tablet+
- **Forms**: Full-screen modals on mobile → Side sheets or inline on desktop
- **Navigation**: Bottom bar on mobile (thumb-friendly) → Sidebar on desktop

### Component Architecture

```
Page (data fetching + layout)
├── Container components (orchestrate features)
│   ├── Presentational components (render UI)
│   │   └── Shadcn/ui primitives (Button, Input, Card, etc.)
│   └── Presentational components
└── Container components
```

> **Rule**: Presentational components receive ALL data via props. Container components use hooks for data.

---

## 10. Internationalization (i18n)

### Strategy

The app is **Spanish-first** with English as a secondary language. Internationalization is built-in from day 1 — NOT bolted on later.

### Implementation

| Aspect              | Approach                                              |
| ------------------- | ----------------------------------------------------- |
| Library             | `react-i18next` (i18next core)                        |
| Translation files   | JSON files in `@gastar/shared/locales/` (shared)      |
| Default language    | `es` (Spanish)                                        |
| Supported languages | `es`, `en`                                            |
| User preference     | Stored in `UserSettings.language`                     |
| Detection           | UserSettings → Browser language → fallback to `es`    |
| Loading             | Lazy-loaded per language (only active locale in memory)|

### Translation File Structure

```json
// es.json
{
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "loading": "Cargando..."
  },
  "auth": {
    "login": "Iniciar sesión",
    "register": "Registrarse",
    "logout": "Cerrar sesión"
  },
  "dashboard": {
    "title": "Panel principal",
    "totalBalance": "Balance total",
    "monthlyIncome": "Ingresos del mes",
    "monthlyExpenses": "Gastos del mes"
  },
  "accounts": { ... },
  "categories": { ... },
  "transactions": { ... }
}
```

### Rules

- **NEVER hardcode user-facing strings** in components. Always use `t('key')`.
- **Translation keys** use dot notation: `t('dashboard.totalBalance')`.
- **Namespace by feature**: `common`, `auth`, `dashboard`, `accounts`, `categories`, `transactions`.
- **Shared package** owns the translation files so both frontend AND backend (for error messages) can reference them.
- **Numbers and dates**: Formatted via `Intl.NumberFormat` and `Intl.DateTimeFormat` using the active locale.

---

## 11. PWA Strategy

PWA is part of the MVP. The app must be installable and provide a native-like experience on mobile.

### Requirements

- **Installable**: Web app manifest with proper icons, theme color, display mode
- **Offline-capable**: Basic shell caching so the app loads without network
- **App-like**: Standalone display mode, splash screen, status bar theming

### Implementation

| Aspect            | Approach                                           |
| ----------------- | -------------------------------------------------- |
| Build tool        | `vite-plugin-pwa` (Workbox under the hood)         |
| Caching strategy  | **Network-first** for API calls, **Cache-first** for static assets |
| Offline UX        | Show cached data with "offline" indicator. Disable mutations. |
| Install prompt    | Custom in-app banner (not browser default)         |
| Updates           | Prompt user when new version is available          |

### Manifest Essentials

```json
{
  "name": "Gastar — Finance Tracker",
  "short_name": "Gastar",
  "display": "standalone",
  "start_url": "/dashboard",
  "theme_color": "#...",
  "background_color": "#...",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192" },
    { "src": "/icons/icon-512.png", "sizes": "512x512" }
  ]
}
```

---

## 12. Testing Strategy

### Philosophy

Test behavior, not implementation. Prioritize tests that catch real bugs over tests that hit coverage numbers.

### Testing Pyramid

```
        ╱ E2E (Playwright) ╲          ← Few: critical user flows
       ╱───────────────────────╲
      ╱ Integration (Vitest + RTL) ╲   ← More: component + API integration
     ╱───────────────────────────────╲
    ╱     Unit (Vitest)               ╲ ← Most: services, utils, schemas
   ╱───────────────────────────────────╲
```

### What to Test

| Layer                    | Tool                  | What                                        |
| ------------------------ | --------------------- | ------------------------------------------- |
| Shared schemas           | Vitest                | Zod schema validation (valid + invalid)     |
| Backend services         | Vitest                | Business logic, edge cases                  |
| Backend controllers      | Vitest + supertest    | HTTP status codes, response shapes          |
| Frontend components      | Vitest + RTL          | Render, user interactions, conditional UI   |
| Frontend hooks           | Vitest + RTL          | Data fetching states (loading, error, data) |
| Critical flows           | Playwright            | Login, create transaction, view dashboard   |

### Test File Convention

Tests are co-located with the code they test:

```
modules/accounts/
├── accounts.service.ts
├── accounts.controller.ts
└── __tests__/
    ├── accounts.service.test.ts
    └── accounts.controller.test.ts
```

---

## 13. Deployment & Infrastructure

### Environment

| Component    | Production              | Development           |
| ------------ | ----------------------- | --------------------- |
| Host         | Hostinger VPS           | Local machine         |
| Orchestrator | Dokploy                 | docker-compose        |
| Database     | PostgreSQL (container)  | PostgreSQL (container)|
| Frontend     | Nginx (container)       | Vite dev server       |
| Backend      | Node.js (container)     | ts-node / tsx watch   |

### Docker Architecture

```
docker-compose.yml
├── frontend    (Nginx serving built React app)
├── backend     (Node.js Express API)
├── postgres    (PostgreSQL 16)
└── (Dokploy handles reverse proxy + SSL in production)
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/gastar

# Auth
JWT_ACCESS_SECRET=xxx
JWT_REFRESH_SECRET=xxx
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://api.gastar.app/v1/auth/google/callback

# Email
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=noreply@gastar.app

# App
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://gastar.app
CORS_ORIGIN=https://gastar.app
```

### Deployment Flow

```
Push to main → Dokploy detects → Builds Docker images → Deploys containers → Health check
```

---

## 14. Feature Scope (MVP)

These features constitute the Minimum Viable Product. Nothing more, nothing less.

### Auth
- [ ] Email/password registration
- [ ] Email/password login
- [ ] Google OAuth login
- [ ] JWT access + refresh token flow
- [ ] Password reset via email (Resend)
- [ ] Logout

### Accounts
- [ ] List all accounts with balances
- [ ] Create account (name, type, currency, initial balance)
- [ ] Edit account
- [ ] Delete account (with confirmation)

### Categories
- [ ] Default categories created on user registration
- [ ] List all categories
- [ ] Create category (name, icon, color)
- [ ] Edit category (including defaults — user owns them)
- [ ] Delete category (with confirmation — blocked if transactions exist, must reassign first)

### Transactions
- [ ] List transactions with pagination
- [ ] Filter by: account, category, type, date range
- [ ] Create income transaction
- [ ] Create expense transaction
- [ ] Create transfer between accounts (same and cross-currency)
- [ ] Edit transaction
- [ ] Delete transaction (transfers delete both sides atomically)

### i18n
- [ ] react-i18next setup with lazy-loaded locales
- [ ] Spanish translation file (complete)
- [ ] English translation file (complete)
- [ ] Language preference in UserSettings
- [ ] Language switcher in UI

### Dashboard
- [ ] Balance totals grouped by currency (e.g. "ARS: $500.000 | USD: $2.000")
- [ ] Per-account balance cards
- [ ] Current month income total (per currency)
- [ ] Current month expense total (per currency)
- [ ] Current month net (income - expenses, per currency)
- [ ] Expenses by category (pie/donut chart)
- [ ] Recent transactions list (last 5-10)

### PWA
- [ ] Installable with manifest
- [ ] Service worker for offline shell
- [ ] Dark mode with system preference detection and user toggle
- [ ] Responsive layout (mobile bottom nav + desktop sidebar)

### Infrastructure
- [ ] Docker Compose setup (dev + prod)
- [ ] Dokploy deployment configuration
- [ ] Database migrations pipeline

---

## 15. Feature Scope (Post-MVP)

These features are planned but NOT part of the initial build. They will each get their own design document when scoped.

- **Budgets**: Monthly budget per category with progress tracking
- **Recurring transactions**: Auto-generation of scheduled transactions
- **Data export**: CSV/Excel export of transactions
- **Reports**: Monthly/yearly reports with comparisons
- **Dark mode**: Theme toggle (light/dark)
- **Notifications**: Budget alerts, bill reminders

---

## 16. Conventions & Standards

### Code Style

- **Naming**: `camelCase` for variables/functions, `PascalCase` for components/classes/types, `SCREAMING_SNAKE` for constants
- **Files**: `kebab-case.ts` for utilities, `PascalCase.tsx` for React components, `kebab-case.type.ts` for type files
- **Imports**: Absolute paths via TypeScript path aliases (`@/modules/...`, `@/components/...`)

### Git

- **Branching**: `main` (production) + feature branches (`feat/accounts-crud`, `fix/login-redirect`)
- **Commits**: Conventional Commits — `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`
- **PR flow**: Feature branch → PR → Review → Merge to main

### API Conventions

- **Endpoints**: Plural nouns (`/accounts`, `/transactions`), never verbs
- **HTTP methods**: GET (read), POST (create), PATCH (partial update), DELETE (remove)
- **Status codes**: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)
- **Validation**: Request body validated via Zod schemas at the middleware level before reaching controllers

### Frontend Conventions

- **One page per route**: Each route maps to exactly one page component in `pages/`
- **Data fetching in hooks**: Pages use custom hooks that wrap React Query. Components never call services directly.
- **Shared schemas**: Frontend imports Zod schemas from `@gastar/shared` for form validation — same schemas the backend uses.

---

> **This document is a living artifact.** Update it as decisions evolve. Every deviation from this document should be a conscious, documented decision.
