FROM node:20-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY shared/package.json shared/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm build

FROM node:20-bookworm-slim AS runtime

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production

RUN corepack enable

WORKDIR /app

COPY --from=base /pnpm /pnpm
COPY --from=base /app /app

EXPOSE 3000
EXPOSE 5173

CMD ["bash", "-lc", "pnpm --filter @ai-novel/server prisma:generate && pnpm --filter @ai-novel/server prisma:push && (pnpm --filter @ai-novel/server start &) && pnpm --filter @ai-novel/client preview --host 0.0.0.0 --port 5173"]
