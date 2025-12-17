FROM node:20-alpine

WORKDIR /app

# pnpm
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Copy ONLY backend package files (because build context = backend/)
COPY package.json pnpm-lock.yaml* ./

# Install deps
RUN pnpm install --no-frozen-lockfile

# Copy source
COPY . .

# Build TS -> dist/
RUN pnpm run build

# Render provides PORT, we just expose for clarity
EXPOSE 5000

# Start compiled server
CMD ["pnpm", "start"]
