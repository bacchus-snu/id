FROM node:14-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY . .
RUN npm ci && npm run build && npm cache clean --force
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["npm", "start"]
