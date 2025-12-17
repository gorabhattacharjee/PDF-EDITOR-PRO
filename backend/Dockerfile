FROM node:20-alpine

WORKDIR /app

# Install Python and required system dependencies
RUN apk add --no-cache python3 py3-pip gcc musl-dev python3-dev

# pnpm
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Copy ONLY backend package files (because build context = backend/)
COPY package.json pnpm-lock.yaml* ./

# Install Node deps
RUN pnpm install --no-frozen-lockfile

# Copy Python requirements and install
COPY python/ ./python/
RUN pip3 install --no-cache-dir -r python/requirements.txt || true

# Copy source
COPY . .

# Build TS -> dist/
RUN pnpm run build

# Render provides PORT, we just expose for clarity
EXPOSE 5000

# Start compiled server
CMD ["pnpm", "start"]
