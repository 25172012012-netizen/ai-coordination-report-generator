# Multi-stage Docker build for production
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
RUN npm ci --omit=dev

# Copy server and built static frontend from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/work ./work
COPY tsconfig*.json ./

# Install tsx for running typescript server in production
RUN npm install -g tsx

EXPOSE 3001

CMD ["tsx", "server/index.ts"]
