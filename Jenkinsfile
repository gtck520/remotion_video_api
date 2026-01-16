pipeline {
    agent any

    options {
        // 自动清理构建记录：只保留最近的 10 次构建
        buildDiscarder(logRotator(numToKeepStr: '10'))
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
                            # 调试信息
                            echo "Current User: $(id)"
                            echo "Docker Version Check:"
                            docker --version || echo "Docker not found"
                            
                            # 尝试直接构建
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
                        # 1. 从宿主机的 .env 文件中提取 PORT 配置
                        # 尝试从 /www/remotion/.env 读取
                        if [ -f "/www/remotion/.env" ]; then
                             HOST_PORT=$(docker run --rm -v /www/remotion/.env:/tmp/.env alpine sh -c 'grep "^PORT=" /tmp/.env | cut -d= -f2 | tr -d "\r\n"')
                        else
                             echo "Warning: /www/remotion/.env not found, using default port 3005."
                        fi
                        
                        # 如果没读到，默认 3005
                        if [ -z "$HOST_PORT" ]; then
                            HOST_PORT=3005
                        fi
                        
                        echo "Detected Configuration: PORT=${HOST_PORT}"
                        export PORT=$HOST_PORT

                        # 2. 启动服务（传入 PORT 环境变量供 docker-compose 替换）
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
