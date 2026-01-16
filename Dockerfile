FROM oven/bun:1-debian

# Install system dependencies for Remotion (Chromium + FFmpeg)
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (ignoring bun.lock to ensure fresh resolution)
RUN bun install

# Copy source code
COPY . .

# Build the project (if needed, though bun runs ts directly)
# RUN bun run build

# Expose port
EXPOSE 3005

# Start the server
CMD ["bun", "run", "start"]
