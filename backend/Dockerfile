FROM node:20-bullseye

# Install Python (for your spawn('python', ...) calls)
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Copy backend package files first (better caching)
COPY package.json pnpm-lock.yaml* ./

# Install deps
RUN pnpm install --prod

# Copy backend source
COPY . .

# If you have Python requirements, install them (recommended)
# If you don’t have requirements.txt yet, create it later.
RUN if [ -f "python/requirements.txt" ]; then pip3 install -r python/requirements.txt; fi

ENV NODE_ENV=production
EXPOSE 5000

# Run backend
CMD ["pnpm", "start"]
