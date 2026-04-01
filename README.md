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

| Layer    | Technology                                |
| -------- | ----------------------------------------- |
| Database | PostgreSQL 16 + Prisma ORM                |
| Backend  | Node.js 22 LTS, Express 5                 |
| Frontend | React 19, Vite, Tailwind 4                |
| Language | TypeScript 5.x everywhere                 |
| Monorepo | pnpm workspaces                           |
| Testing  | Vitest, React Testing Library, Playwright |

---

## Project Structure

```
gastar-app-v2/
├── packages/
│   ├── shared/          # Zod schemas, types, constants, i18n
│   ├── backend/         # Express API (screaming architecture)
│   └── frontend/        # React SPA (PWA)
├── database/
│   └── prisma/          # Schema & migrations
├── docs/                # Project documentation
├── assets/              # Logo and brand assets
├── AGENTS.md            # AI agent instructions
└── README.md            # This file
```

> **Dependency direction**: `frontend` → `shared` ← `backend`. The shared package never imports from frontend or backend.

---

## Documentation

| Document                                      | Description                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md)   | Single source of truth — tech stack, patterns, database schema, API design, feature scope |
| [`DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | Visual identity — colors, typography, components, layouts, toasts                         |
| [`COMMIT_RULES.md`](./docs/COMMIT_RULES.md)   | Git conventions — conventional commits, branch naming, PR rules                           |
| [`AGENTS.md`](./AGENTS.md)                    | AI agent instructions — project context for automated assistants                          |

---

## Implementation Progress

### Backend API (`/v1`)

| Module       | Status  | PR                                                          | Endpoints                                                                                       |
| ------------ | ------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Auth         | ✅ Done | [#3](https://github.com/MateoValles/gastar-app-v2/pull/3)   | Email/password auth (register, login), refresh, logout, password reset                          |
| Accounts     | ✅ Done | [#5](https://github.com/MateoValles/gastar-app-v2/pull/5)   | Full CRUD with ownership enforcement                                                            |
| Categories   | ✅ Done | [#6](https://github.com/MateoValles/gastar-app-v2/pull/6)   | Full CRUD with pre-flight delete checks                                                         |
| Transactions | ✅ Done | [#7](https://github.com/MateoValles/gastar-app-v2/pull/7)   | Full CRUD, 2-record transfers, atomic balance updates, pagination + filtering                   |
| Users        | ✅ Done | [#8](https://github.com/MateoValles/gastar-app-v2/pull/8)   | GET/PATCH profile with settings                                                                 |
| Dashboard    | ✅ Done | [#11](https://github.com/MateoValles/gastar-app-v2/pull/11) | Summary endpoint with currency groups, account cards, expenses by category, recent transactions |

### Backend Tests

| Type              | Count | PR                                                          | Notes                           |
| ----------------- | ----- | ----------------------------------------------------------- | ------------------------------- |
| Unit tests        | 321   | [#14](https://github.com/MateoValles/gastar-app-v2/pull/14) | Services — all 6 modules        |
| Integration tests | 92    | [#15](https://github.com/MateoValles/gastar-app-v2/pull/15) | Real PostgreSQL — all 6 modules |

### Frontend

| Batch | Feature      | Status  | PR                                                          |
| ----- | ------------ | ------- | ----------------------------------------------------------- |
| 0     | Foundation   | ✅ Done | [#18](https://github.com/MateoValles/gastar-app-v2/pull/18) |
| 1     | Auth         | ✅ Done | [#19](https://github.com/MateoValles/gastar-app-v2/pull/19) |
| 2     | Accounts     | ✅ Done | [#20](https://github.com/MateoValles/gastar-app-v2/pull/20) |
| 3     | Categories   | ✅ Done | [#21](https://github.com/MateoValles/gastar-app-v2/pull/21) |
| 4     | Transactions | ✅ Done | [#22](https://github.com/MateoValles/gastar-app-v2/pull/22) |
| 5     | Dashboard    | ✅ Done | [#23](https://github.com/MateoValles/gastar-app-v2/pull/23) |
| 6     | Profile      | ✅ Done | [#24](https://github.com/MateoValles/gastar-app-v2/pull/24) |
| 7     | PWA          | ✅ Done | [#25](https://github.com/MateoValles/gastar-app-v2/pull/25) |

### Infrastructure

In progress — Dockerfile and GitHub Actions workflow to publish the container image to GHCR are now in place. Dokploy apps were aligned to Docker/GHCR as deployment targets, but final secrets, domains, and the first production rollout are still pending.

Current deployment target contract:

- `development` branch publishes `ghcr.io/mateovalles/gastar-app-v2:development`
- `main` branch publishes `ghcr.io/mateovalles/gastar-app-v2:latest`
- Dokploy `production` and `development` apps are expected to run the container on port `3001`
- The container entrypoint runs `prisma migrate deploy` automatically before starting the backend
- Dokploy secrets/domains must be finalized before the first real deployment

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
cp .env.example packages/backend/.env
# Edit .env with your database credentials and secrets

# Generate Prisma client
pnpm db:generate

# Run database migrations
pnpm db:migrate

# Build the shared package
pnpm --filter @gastar/shared build

# Start development (backend + frontend in parallel)
pnpm dev
```

---

## License

Private project — not open source.
