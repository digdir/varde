ARG PORT
ARG HOST
ARG APP_ENV
FROM node:24.21.0-slim@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable
RUN corepack install

FROM base AS packages
COPY . /usr/src/app
WORKDIR /usr/src/app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM packages AS www-build
WORKDIR /usr/src/app
ARG PORT
ARG HOST
ARG APP_ENV
ENV PORT=$PORT HOST=$HOST APP_ENV=$APP_ENV
RUN pnpm build:www
RUN pnpm deploy --filter=www --prod /prod/www

FROM base AS www
COPY --from=www-build /prod/www /srv/app
WORKDIR /srv/app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8000
EXPOSE 8000
CMD ["./node_modules/.bin/react-router-serve", "./build/server/index.js"]
