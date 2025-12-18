FROM node:20-alpine

WORKDIR /app

# Install Python and required system dependencies
# Added: libxml2, libxslt for pdf2docx, fontconfig for font rendering
RUN apk add --no-cache python3 py3-pip gcc musl-dev python3-dev libffi-dev openssl-dev \
    libxml2-dev libxslt-dev zlib-dev jpeg-dev fontconfig-dev

# pnpm
RUN corepack enable && corepack prepare pnpm@10.24.0 --activate

# Copy ONLY backend package files (because build context = backend/)
COPY package.json pnpm-lock.yaml* ./

# Install Node deps
RUN pnpm install --no-frozen-lockfile

# Copy Python requirements and install WITH dependencies
COPY python/ ./python/
RUN pip3 install --break-system-packages -r python/requirements.txt && \
    pip3 install --break-system-packages pdf2docx openpyxl python-pptx PyMuPDF pdfplumber

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
