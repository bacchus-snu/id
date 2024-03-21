FROM node:20-alpine AS base
ENV YARN_ENABLE_GLOBAL_CACHE=false

FROM base as builder
RUN apk add --no-cache python3 make gcc g++
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn install --immutable

COPY . .
RUN yarn build

FROM base as deps
RUN apk add --no-cache python3 make gcc g++
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn workspaces focus --production

FROM base as runner
RUN apk add --no-cache tini
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.pnp.* ./
COPY --from=builder /app/dist dist

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "start"]
