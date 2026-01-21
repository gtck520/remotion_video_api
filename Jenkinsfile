pipeline {
    agent any

    options {
        // 自动清理构建记录：只保留最近的 10 次构建
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    environment {
        // BuildKit 已禁用，以确保最大兼容性
        DOCKER_BUILDKIT = '0'
        COMPOSE_DOCKER_CLI_BUILD = '0'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build') {
            steps {
                script {
                    try {
                        echo '=== DEBUG: Starting Build Stage ==='
                        sh 'pwd'
                        sh 'ls -la'
                        
                        echo 'Building Docker images...'
                        sh '''
                            # Debug info
                            echo "Current User: $(id)"
                            echo "Docker Version Check:"
                            docker --version || echo "Docker not found"
                            
                            # Enable BuildKit
                            # NOTE: If build fails with "BuildKit is enabled but the buildx component is missing",
                            # set these to 0 to fallback to legacy builder.
                            export DOCKER_BUILDKIT=0
                            export COMPOSE_DOCKER_CLI_BUILD=0

                            # --- OPTIMIZATION START: Base Image Caching Strategy ---
                            
                            # 1. Calculate Hash of Dependency Files
                            # We hash package.json, bun.lockb (if exists), and Dockerfile.base
                            # This ensures that if any dependency or the base environment config changes, we get a new hash.
                            if [ -f bun.lockb ]; then
                                DEPS_HASH=$(cat package.json bun.lockb Dockerfile.base | md5sum | cut -d' ' -f1)
                            else
                                DEPS_HASH=$(cat package.json Dockerfile.base | md5sum | cut -d' ' -f1)
                            fi
                            
                            echo "Dependency Hash: $DEPS_HASH"
                            BASE_IMAGE_NAME="remotion-server-base"
                            BASE_IMAGE_TAG="$DEPS_HASH"
                            FULL_BASE_IMAGE="$BASE_IMAGE_NAME:$BASE_IMAGE_TAG"

                            # 2. Check if Base Image Exists
                            if docker image inspect "$FULL_BASE_IMAGE" > /dev/null 2>&1; then
                                echo "✅ Base image $FULL_BASE_IMAGE found. Reusing existing environment."
                            else
                                echo "⚠️ Base image $FULL_BASE_IMAGE not found or dependencies changed."
                                echo "🔨 Building new base image..."
                                
                                # Build Base Image
                                docker build -f Dockerfile.base -t "$FULL_BASE_IMAGE" .
                                
                                # Tag as latest for convenience (optional, useful for local debugging)
                                docker tag "$FULL_BASE_IMAGE" "$BASE_IMAGE_NAME:latest"
                                
                                echo "✅ Base image built successfully."

                                # --- CLEANUP: Remove old base images to prevent disk fill-up ---
                                echo "🧹 Cleaning up old base images..."
                                # List all tags for remotion-server-base, exclude current hash and latest, then delete
                                # We use || true to prevent failure if no images need to be deleted
                                docker images --format "{{.Repository}}:{{.Tag}}" | grep "^${BASE_IMAGE_NAME}:" | grep -v ":${BASE_IMAGE_TAG}$" | grep -v ":latest$" | xargs -r docker rmi || true
                            fi

                            # 3. Export Variable for Docker Compose
                            export BASE_IMAGE_TAG="$BASE_IMAGE_TAG"
                            echo "Using Base Image Tag: $BASE_IMAGE_TAG"

                            # --- OPTIMIZATION END ---

                            # 4. Build Application Image (using docker-compose)
                            if command -v docker-compose >/dev/null 2>&1; then
                                docker-compose -f docker-compose.jenkins.yml build
                            else
                                docker compose -f docker-compose.jenkins.yml build
                            fi
                        '''
                    } catch (Exception e) {
                        echo "Build Stage Failed: ${e.toString()}"
                        error("Build failed due to exception: ${e.toString()}")
                    }
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    echo 'Deploying application...'
                    sh '''
                        # --- 1. Retrieve Configuration ---
                        # Fetch .env.prod from the host machine to the workspace
                        echo "Retrieving .env.prod from host..."
                        if docker run --rm -v /www/remotion/.env.prod:/tmp/.env.prod alpine cat /tmp/.env.prod > .env.prod; then
                            echo "Successfully retrieved .env.prod"
                            export ENV_FILE=.env.prod
                        else
                            echo "Warning: Could not retrieve .env.prod from host. Trying fallback to .env..."
                            if docker run --rm -v /www/remotion/.env:/tmp/.env alpine cat /tmp/.env > .env; then
                                export ENV_FILE=.env
                            else
                                echo "Error: No environment file found on host!"
                                # Don't exit yet, might rely on defaults, but warn loudly
                            fi
                        fi

                        # --- 2. Configure Environment ---
                        # Export PORT for docker-compose.yml substitution (${PORT})
                        # We use the retrieved file to find the port
                        if [ -f "$ENV_FILE" ]; then
                            DETECTED_PORT=$(grep "^PORT=" "$ENV_FILE" | cut -d= -f2 | tr -d "\r\n")
                            export PORT=${DETECTED_PORT:-3005}
                            echo "Configuration: Using $ENV_FILE with PORT=$PORT"
                        else
                            export PORT=3005
                            echo "Configuration: Using default PORT=3005 (No env file)"
                        fi
                        
                        # Export ENV_FILE so docker-compose sees it for the 'env_file' directive
                        export ENV_FILE=$ENV_FILE

                        # --- 3. Start Service ---
                        echo "Starting Docker Compose..."
                        if command -v docker-compose >/dev/null 2>&1; then
                            docker-compose -f docker-compose.jenkins.yml up -d --remove-orphans
                        else
                            docker compose -f docker-compose.jenkins.yml up -d --remove-orphans
                        fi
                    '''
                }
            }
        }
        
        stage('Clean up') {
             steps {
                 script {
                     echo 'Pruning unused images...'
                     sh 'docker image prune -f'
                 }
             }
        }
    }
}
