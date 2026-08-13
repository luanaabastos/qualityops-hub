FROM node:20.20.1-bookworm-slim

ARG DEBIAN_FRONTEND=noninteractive
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV CYPRESS_CACHE_FOLDER=/opt/cypress

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.34.5 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile
RUN pnpm exec playwright install --with-deps --only-shell chromium \
    && apt-get update \
    && apt-get install -y --no-install-recommends libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth xvfb unzip \
    && rm -rf /var/lib/apt/lists/* \
    && pnpm exec cypress verify

COPY . .
RUN pnpm build
RUN mkdir -p /app/artifacts/demo-runs \
    && chown -R node:node /app/artifacts

USER node
ENV NODE_ENV=production
ENV HOST=0.0.0.0
EXPOSE 10000

CMD ["node", "scripts/start-production.mjs"]
