# ---- Base ----
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Copy only backend manifests first (better caching)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json

# Install dependencies for backend (workspace-aware)
RUN pnpm -C backend install --no-frozen-lockfile

# Copy backend source
COPY backend ./backend

# Build TypeScript -> dist/
RUN pnpm -C backend run build

# Expose (Render uses PORT env; this is just informational)
EXPOSE 5000

# Start backend
CMD ["pnpm", "-C", "backend", "start"]
