# Commit Rules

This project follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

---

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type         | When to use                                         |
| ------------ | --------------------------------------------------- |
| `feat`       | A new feature or capability                         |
| `fix`        | A bug fix                                           |
| `refactor`   | Code restructuring without changing behavior        |
| `test`       | Adding or updating tests                            |
| `docs`       | Documentation only (README, ARCHITECTURE, etc.)     |
| `chore`      | Tooling, config, dependencies, CI — no app logic    |
| `style`      | Formatting, whitespace, missing semicolons — no logic changes |
| `perf`       | Performance improvement without changing behavior   |
| `ci`         | CI/CD pipeline changes                              |

### Scopes

Scope identifies the **package or area** affected. Always lowercase.

| Scope        | Package / Area                                      |
| ------------ | --------------------------------------------------- |
| `backend`    | `packages/backend` — Express API                    |
| `frontend`   | `packages/frontend` — React SPA                     |
| `shared`     | `packages/shared` — schemas, types, constants, i18n |
| `db`         | `database/prisma` — schema, migrations, seed        |
| `docker`     | Docker, docker-compose, Dockerfiles                 |
| `root`       | Root config (pnpm-workspace, tsconfig base, etc.)   |
| *(omit)*     | Cross-cutting changes that span multiple packages   |

> When a commit touches multiple packages, omit the scope: `feat: add validation to accounts flow`

---

## Rules

1. **One logical change per commit.** Don't mix a feature with a refactor.
2. **Description in lowercase**, imperative mood: "add account form", NOT "Added account form" or "Adds account form".
3. **No periods** at the end of the description.
4. **Max 72 characters** for the first line (type + scope + description).
5. **Body** (optional): explain *why*, not *what*. The diff shows what changed.
6. **Breaking changes**: add `!` after scope and explain in footer.

---

## Examples

```bash
# Feature in backend
feat(backend): add account creation endpoint

# Bug fix in frontend
fix(frontend): prevent double submit on transaction form

# Schema change
feat(db): add transfer_side enum to transaction model

# Shared package
feat(shared): add transaction zod schemas

# Tooling / config
chore(root): configure pnpm workspaces and base tsconfig

# Tests
test(backend): add unit tests for auth service

# Cross-cutting (no scope)
refactor: rename amount fields across all packages

# Breaking change
feat(backend)!: change API response envelope format

BREAKING CHANGE: success responses now wrap data in { success: true, data: T }
```

---

## Pull Request Rules

1. **Branch naming**: `<type>/<short-description>` — e.g. `feat/accounts-crud`, `fix/login-redirect`, `chore/docker-setup`.
2. **One concern per PR.** A PR should be reviewable in under 30 minutes.
3. **PR title** follows the same conventional commit format: `feat(backend): add accounts CRUD`.
4. **PR description** must include:
   - **What** changed (summary)
   - **Why** it changed (motivation)
   - Link to related issue if applicable
5. **Squash merge only** to `main` — enforced via repository ruleset. No merge commits, no rebase merges.
6. **All checks must pass** before merging — including Copilot Code Review threads (must be resolved).
7. **No direct pushes to `main`** — always go through a PR.

---

## Code Review

### Pre-Commit: GGA (Gentleman Guardian Angel)

GGA is an AI-powered pre-commit hook that reviews ALL staged `.ts/.tsx/.js/.jsx` files against the rules in this document before a commit goes through. Configuration lives in the `.gga` file at the repo root. Provider: `opencode:github-copilot/gpt-5.4-mini`. The review MUST pass — if it fails, fix the issues and retry. Do not bypass it.

### Pull Request: GitHub Copilot Code Review

Copilot Code Review is configured as a repository ruleset and runs automatically on the first push to any PR. All review threads MUST be resolved before merge is allowed — this is enforced via `required_review_thread_resolution` in the ruleset. Note: Copilot Code Review does NOT always re-run on subsequent pushes. If you push fixes for Copilot's comments, you may be able to merge after resolving the threads without a second automated review.

---

## AI Agent Rules

- **Never** add "Co-Authored-By" or AI attribution lines to commits.
- **Never** skip pre-commit hooks (`--no-verify`) unless the diff exceeds the GGA provider's argument limit (e.g., very large modules like transactions with 600+ lines). Document the reason in the commit message body when skipping.
- Follow ALL rules above exactly as a human contributor would.
