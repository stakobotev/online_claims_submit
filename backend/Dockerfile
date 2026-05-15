FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src/
RUN npx prisma generate
RUN npm run build

# ---

FROM node:20-alpine AS runner

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /build/dist ./dist
COPY --from=builder /build/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma/

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN mkdir -p /var/app/uploads && chown appuser:appgroup /var/app/uploads

USER appuser

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
