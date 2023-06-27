FROM node:18-alpine as builder
RUN apk add --no-cache python3 make gcc g++
WORKDIR /app
COPY . .
RUN yarn install --immutable
RUN yarn build

FROM node:18-alpine as deps
RUN apk add --no-cache python3 make gcc g++
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
RUN yarn workspaces focus --production

FROM node:18-alpine as runner
RUN apk add --no-cache tini
WORKDIR /app
COPY package.json yarn.lock .yarnrc.yml ./
COPY --from=deps /app/.yarn ./.yarn
COPY --from=deps /app/.pnp.* ./
COPY --from=builder /app/dist dist
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "start"]
