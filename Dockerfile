# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

# Боевые зависимости без devDependencies. Пакет prisma тянет через composer-cli
# ~640 МБ (alchemy, @cloudflare, @distilled.cloud), которые нужны только командам
# deploy/dev, а `prisma db migrate` без них работает (проверено). Если после апгрейда
# prisma миграции в контейнере падают с "Cannot find module", уберите эту строку rm.
FROM node:24-bookworm-slim AS prod-deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production --ignore-scripts \
  && rm -rf node_modules/alchemy node_modules/@cloudflare node_modules/@distilled.cloud \
  && yarn cache clean

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY src ./src
RUN yarn build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json yarn.lock prisma.config.ts ./
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY src/prisma ./src/prisma
# Для `docker compose exec api yarn user:create` (Node 24 запускает .ts нативно)
COPY src/modules/auth/password.ts ./src/modules/auth/password.ts
COPY scripts ./scripts
COPY migrations ./migrations
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN sed -i 's/\r$//' ./docker/entrypoint.sh && chmod +x ./docker/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["sh", "./docker/entrypoint.sh"]
