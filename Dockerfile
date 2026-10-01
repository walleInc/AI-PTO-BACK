# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --ignore-scripts

FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts webpack.config.cjs ./
COPY src ./src
RUN yarn build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json yarn.lock prisma.config.ts ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
RUN printf '%s' '{"type":"commonjs"}' > ./dist/package.json
COPY src/prisma ./src/prisma
COPY migrations ./migrations
COPY docker/entrypoint.sh ./docker/entrypoint.sh
RUN sed -i 's/\r$//' ./docker/entrypoint.sh && chmod +x ./docker/entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["sh", "./docker/entrypoint.sh"]
