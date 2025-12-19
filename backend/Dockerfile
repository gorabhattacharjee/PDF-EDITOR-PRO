FROM python:3.12-slim

WORKDIR /app

# Install Node.js and required system dependencies
# Using slim image which has build tools needed for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm curl git build-essential \
    libxml2-dev libxslt-dev libffi-dev libssl-dev \
    zlib1g-dev libjpeg-dev libpng-dev libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN npm install -g pnpm

# Copy ONLY backend package files (because build context = backend/)
COPY package.json pnpm-lock.yaml* ./

# Install Node deps
RUN pnpm install --no-frozen-lockfile

# Copy Python requirements and install
COPY python/ ./python/
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r python/requirements.txt && \
    pip install --no-cache-dir pdf2docx openpyxl python-pptx PyMuPDF pdfplumber

# Copy source
COPY . .

# Build TS -> dist/
RUN pnpm run build

# Create uploads directory for conversion output
RUN mkdir -p /app/uploads

# Set production environment
ENV NODE_ENV=production

# Render provides PORT, we just expose for clarity
EXPOSE 5000

# Start compiled server
CMD ["pnpm", "start"]
