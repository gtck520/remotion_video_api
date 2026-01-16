FROM oven/bun:1-debian

# Install system dependencies for Remotion (Chromium + FFmpeg)
RUN apt-get update && apt-get install -y \
    chromium \
    ffmpeg \
    fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy source code
COPY . .

# Build the project (if needed, though bun runs ts directly)
# RUN bun run build

# Expose port
EXPOSE 3005

# Start the server
CMD ["bun", "run", "start"]
