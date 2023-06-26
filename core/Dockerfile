FROM node:18-alpine as builder
RUN apk add --no-cache python3 make gcc g++
WORKDIR /app
COPY . .
RUN yarn install --frozen-lockfile
RUN yarn build

FROM node:18-alpine as deps
RUN apk add --no-cache python3 make gcc g++
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --prod --frozen-lockfile

FROM node:18-alpine as runner
RUN apk add --no-cache tini
WORKDIR /app
COPY package.json yarn.lock ./
COPY --from=deps /app/node_modules node_modules
COPY --from=builder /app/dist dist
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["yarn", "start"]
