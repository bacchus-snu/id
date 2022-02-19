FROM node:14-alpine as builder
RUN apk add --no-cache python3 make gcc g++
WORKDIR /app
COPY . .
RUN npm ci && npm run build && npm cache clean --force
RUN rm -rf node_modules
RUN npm ci --production && npm cache clean --force

FROM node:14-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/dist dist
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
