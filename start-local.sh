#!/bin/bash

# Define the environment file to use
ENV_FILE=".env.dev"

# Check if the environment file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Configuration file $ENV_FILE not found!"
    echo "Please create it or use .env.example as a template."
    exit 1
fi

echo "=== Starting Remotion Server in LOCAL MODE (No Docker) ==="
echo "Configuration File: $ENV_FILE"

# 1. Load environment variables from the file
# This allows the Node.js process to see variables like PORT, API Keys, etc.
echo "Loading environment variables..."
set -a
source "$ENV_FILE"
set +a

echo "Detected PORT: ${PORT:-3005}"

# Check if port is already in use and kill the process
TARGET_PORT=${PORT:-3005}
PID=$(lsof -t -i:$TARGET_PORT)
if [ ! -z "$PID" ]; then
    echo "Warning: Port $TARGET_PORT is already in use by PID $PID."
    echo "Killing process $PID to free up the port..."
    kill -9 $PID
    sleep 1
    echo "Port $TARGET_PORT freed."
fi

# 2. Check for node_modules
if [ ! -d "node_modules" ]; then
    echo "Warning: 'node_modules' not found."
    echo "Installing dependencies..."
    if command -v bun &> /dev/null; then
        bun install
    else
        npm install
    fi
fi

# 3. Start the server
# We check if 'bun' is installed, otherwise fallback to 'npm' and 'tsx'
if command -v bun &> /dev/null; then
    echo "Starting with Bun..."
    # bun run dev usually runs "bun --watch server/index.ts"
    bun run dev
else
    echo "Bun not found. Falling back to Node.js (via npx tsx)..."
    # We use 'npx tsx watch' to mimic 'bun --watch' behavior
    # Ensure dependencies are installed first
    npx tsx watch server/index.ts
fi
