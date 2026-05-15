FROM node:20-alpine AS builder

WORKDIR /build

COPY package*.json ./
RUN npm ci

COPY tsconfig.json tsconfig.node.json ./
COPY vite.config.ts tailwind.config.ts postcss.config.js ./
COPY index.html ./
COPY src ./src/
COPY public ./public/ 2>/dev/null || true

RUN npm run build

# ---

FROM nginx:alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
