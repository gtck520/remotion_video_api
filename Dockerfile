ARG BASE_IMAGE_TAG=latest
FROM remotion-server-base:${BASE_IMAGE_TAG}

WORKDIR /app

# Copy source code (this layer changes frequently)
COPY . .

# Expose port
EXPOSE 3005

# Start the server
CMD ["bun", "server/index.ts"]
