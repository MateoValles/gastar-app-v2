# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app


FROM base AS build

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/backend/package.json packages/backend/package.json
COPY packages/frontend/package.json packages/frontend/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

COPY tsconfig.base.json ./
COPY database/prisma ./database/prisma
COPY scripts ./scripts
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
COPY packages/backend ./packages/backend

RUN pnpm db:generate
RUN pnpm --filter @gastar/shared build
RUN pnpm --filter @gastar/frontend build
RUN pnpm --filter @gastar/backend build

# Create portable runtime directories for the workspace packages.
RUN pnpm --filter @gastar/backend --prod deploy --legacy /out/backend
RUN pnpm --filter @gastar/shared --prod deploy --legacy /out/shared


FROM node:22-bookworm-slim AS runtime

ENV NODE_ENV=production
ENV SERVE_FRONTEND=true
ENV FRONTEND_DIST_PATH=/app/packages/frontend/dist

WORKDIR /app

COPY --from=build /out/backend/package.json ./package.json
COPY --from=build /out/backend/node_modules ./node_modules
COPY --from=build /out/backend/dist ./packages/backend/dist
COPY --from=build /out/backend/package.json ./packages/backend/package.json
COPY --from=build /out/shared/dist ./node_modules/@gastar/shared/dist
COPY --from=build /out/shared/src/locales ./node_modules/@gastar/shared/src/locales
COPY --from=build /out/shared/package.json ./node_modules/@gastar/shared/package.json
COPY --from=build /app/packages/frontend/dist ./packages/frontend/dist
COPY --from=build /app/database/prisma ./database/prisma
COPY --from=build /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

RUN chmod +x ./scripts/docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./scripts/docker-entrypoint.sh"]
