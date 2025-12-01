# Kingdom Warriors Game - Dockerfile
# Roblox Multi-Game Management System - Kingdom Warriors Game Service
# Optimiert für Mittelalter-Strategiespiele mit Ressourcen-Management

FROM node:18-alpine AS base

# Metadaten
LABEL maintainer="Medieval Game Development Guild"
LABEL game="kingdom-warriors"
LABEL version="1.0.0"
LABEL description="Königreich der letzten Krieger - Epic Medieval Strategy Game"
LABEL category="strategy"
LABEL tags="medieval,strategy,rts,multiplayer,base-building"

# System-Dependencies für Kingdom Warriors
RUN apk add --no-cache \
    curl \
    wget \
    git \
    openssh-client \
    ca-certificates \
    tini \
    bash \
    jq \
    python3 \
    make \
    g++ \
    libc6-compat

# Arbeits-Verzeichnis
WORKDIR /app

# Package-Installation
COPY package*.json ./
RUN npm install --only=production

# Basic Dependencies
RUN npm install --save \
    express@^4.18.0 \
    cors@^2.8.5 \
    socket.io@^4.0.0 \
    dotenv@^16.0.0 \
    winston@^3.8.0 \
    uuid@^9.0.0 \
    lodash@^4.17.21 \
    moment@^2.29.4

# Game Assets und Konfiguration
# Erstelle Verzeichnis-Struktur
RUN mkdir -p ./game ./maps ./assets ./config ./scripts ./plugins

# Optionale Verzeichnisse kopieren (nur wenn vorhanden)
RUN [ -d "./maps" ] && cp -r maps/. ./maps/ || echo "No maps to copy"
RUN [ -d "./assets" ] && cp -r assets/. ./assets/ || echo "No assets to copy"
RUN [ -d "./config" ] && cp -r config/. ./config/ || echo "No config to copy"
RUN [ -d "./scripts" ] && cp -r scripts/. ./scripts/ || echo "No scripts to copy"
RUN [ -d "./plugins" ] && cp -r plugins/. ./plugins/ || echo "No plugins to copy"

# Directory Setup
RUN mkdir -p /app/plugins \
    /app/logs \
    /app/data \
    /app/cache \
    /app/temp \
    /app/backup \
    && chmod +x /app/scripts/*.sh 2>/dev/null || true \
    && (find ./plugins -name "*.js" -exec chmod +x {} \; 2>/dev/null || echo "No plugins to set permissions")

# Performance-Optimierung für Kingdom Warriors
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size"
ENV UV_THREADPOOL_SIZE=16
ENV NODE_TLS_REJECT_UNAUTHORIZED=1

# Kingdom Warriors Game-spezifische Konfiguration
ENV GAME_ENGINE=roblox
ENV GAME_TYPE=strategy
ENV GAME_CATEGORY=medieval
ENV GAME_VERSION=1.0.0
ENV GAME_MAX_PLAYERS=8
ENV GAME_MIN_PLAYERS=2
ENV GAME_SESSION_TIMEOUT=7200
ENV GAME_HEARTBEAT_INTERVAL=5000
ENV GAME_STATE_SYNC_INTERVAL=100
ENV GAME_COMMAND_QUEUE_SIZE=1000
ENV GAME_PLAYER_TIMEOUT=30000

# Kingdom Warriors Monitoring
ENV METRICS_ENABLED=true
ENV METRICS_PORT=3004
ENV HEALTH_CHECK_INTERVAL=30000
ENV ALERT_THRESHOLD_CPU=85
ENV ALERT_THRESHOLD_MEMORY=80
ENV ALERT_THRESHOLD_LATENCY=1000

# Kingdom Warriors Security
ENV AUTHENTICATION_REQUIRED=true
ENV JWT_SECRET=kingdom-warriors-jwt-secret-2025
ENV SESSION_SECRET=kingdom-warriors-session-secret-2025
ENV ENCRYPTION_KEY=kingdom-warriors-encryption-key-2025
ENV RATE_LIMIT_WINDOW_MS=60000
ENV RATE_LIMIT_MAX_REQUESTS=100

# Kingdom Warriors Database
ENV DATABASE_URL=postgresql://user:pass@localhost:5432/kingdom_warriors
ENV REDIS_URL=redis://localhost:6379/0
ENV CACHE_TTL=3600
ENV DB_CONNECTION_POOL_SIZE=20

# Kingdom Warriors Logging
ENV LOG_LEVEL=info
ENV LOG_FORMAT=json
ENV LOG_MAX_SIZE=10m
ENV LOG_MAX_FILES=3
ENV LOG_DATE_PATTERN=YYYY-MM-DD

# Kingdom Warriors Performance Tuning
ENV GC_HEAP_LIMIT=256
ENV STACK_SIZE_LIMIT=64
ENV ASYNC_HOOKS_TRACKING=true
ENV HTTP_KEEP_ALIVE_TIMEOUT=60000
ENV HTTP_MAX_HEADER_LINES=1000

# Kingdom Warriors Plugin System
ENV PLUGIN_PATH=/app/plugins
ENV PLUGIN_TIMEOUT=5000
ENV PLUGIN_MEMORY_LIMIT=64
ENV PLUGIN_MAX_EXECUTION_TIME=30000

# Kingdom Warriors Analytics
ENV ANALYTICS_ENABLED=true
ENV ANALYTICS_RETENTION=7d
ENV ANALYTICS_SAMPLING_RATE=0.1
ENV ANALYTICS_BATCH_SIZE=100
ENV ANALYTICS_BATCH_TIMEOUT=5000

# Kingdom Warriors Localization
ENV DEFAULT_LANGUAGE=de
ENV SUPPORTED_LANGUAGES=de,en,fr,es
ENV LOCALIZATION_CACHE_TTL=3600

# Kingdom Warriors Audio/Video
ENV AUDIO_ENABLED=true
ENV VIDEO_ENABLED=false
ENV AUDIO_QUALITY=high
ENV AUDIO_FORMAT=mp3

# Benutzer für Kingdom Warriors
RUN addgroup -g 1001 -S roblox \
    && adduser -S roblox -u 1001 -G roblox \
    && chown -R roblox:roblox /app

USER roblox

# Exposed Ports für Kingdom Warriors
EXPOSE 3002 3003 3004 3005

# Kingdom Warriors Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3002/health || exit 1

# Startup Command für Kingdom Warriors
ENTRYPOINT ["tini", "--"]
CMD ["node", "services/game-manager/manager.js", "start", "kingdom-warriors"]

# Build Information
ARG BUILD_DATE
ARG BUILD_VERSION=1.0.0
ARG BUILD_COMMIT
ARG BUILD_BRANCH=main

LABEL build.date=$BUILD_DATE
LABEL build.version=$BUILD_VERSION
LABEL build.commit=$BUILD_COMMIT
LABEL build.branch=$BUILD_BRANCH

# Kingdom Warriors Runtime Information
ARG NODE_VERSION
LABEL runtime.node_version=${NODE_VERSION:-18.x}
LABEL runtime.os=alpine
LABEL runtime.memory_limit=512MB
LABEL runtime.cpu_limit=50%

# Kingdom Warriors Game Metadata
LABEL game.engine=roblox
LABEL game.category=strategy
LABEL game.theme=medieval
LABEL game.max_players=8
LABEL game.min_players=2
LABEL game.session_timeout=7200
LABEL game.maps.count=5
LABEL game.factions.count=4
LABEL game.languages.supported=de,en,fr,es

# Kingdom Warriors Performance Metrics
LABEL performance.target_fps=60
LABEL performance.memory_target=256MB
LABEL performance.cpu_target=50%
LABEL performance.latency_target=100ms

# Kingdom Warriors Compatibility
LABEL compatibility.docker_version=20.10+
LABEL compatibility.node_version=18+
LABEL compatibility.redis_version=7+
LABEL compatibility.postgres_version=15+

# Kingdom Warriors Features
LABEL features.multiplayer=true
LABEL features.cross_platform=true
LABEL features.voice_chat=false
LABEL features.moderation=true
LABEL features.analytics=true
LABEL features.telemetry=true
LABEL features.plugin_system=true
LABEL features.auto_scaling=true
LABEL features.backup=true
LABEL features.monitoring=true

# Kingdom Warriors Security
LABEL security.authentication=jwt
LABEL security.encryption=aes256
LABEL security.rate_limiting=true
LABEL security.cors=enabled
LABEL security.helmet=enabled
LABEL security.input_validation=strict

# Development und Testing (nur in Development-Builds)
# Diese Layer werden nur bei --target=development geladen

FROM base AS development

USER root

# Development Dependencies
RUN npm install --save-dev \
    jest@^29.0.0 \
    supertest@^6.3.0 \
    nock@^13.2.0 \
    sinon@^14.0.0 \
    eslint@^8.0.0 \
    prettier@^2.7.0 \
    nodemon@^2.0.0 \
    concurrently@^7.0.0 \
    chokidar@^3.5.0 \
    puppeteer@^19.0.0

# Development Tools
RUN apk add --no-cache \
    vim \
    nano \
    htop \
    curl \
    git \
    openssh-client

# Development Scripts
RUN mkdir -p ./scripts/dev
RUN [ -d "./scripts/dev" ] && cp -r scripts/dev/. ./scripts/dev/ || echo "No dev scripts to copy"
RUN chmod +x /app/scripts/dev/*.sh 2>/dev/null || true

# Development Environment
ENV NODE_ENV=development
ENV DEBUG=true
ENV LOG_LEVEL=debug
ENV HEAP_DUMP_ON_ERROR=true
ENV PROFILING_ENABLED=true

USER roblox

# Development Command
CMD ["npm", "run", "dev"]

# Production Stage (optimiert für Production)
FROM base AS production

# Production optimierte Einstellungen
ENV NODE_ENV=production
ENV DEBUG=false
ENV LOG_LEVEL=info
ENV HEAP_DUMP_ON_ERROR=false
ENV PROFILING_ENABLED=false

# Production Security
ENV NODE_OPTIONS="--max-old-space-size=512 --optimize-for-size --gc-interval=100 --optimize-for-size"

# Production Performance
ENV UV_THREADPOOL_SIZE=16
ENV NODE_TLS_REJECT_UNAUTHORIZED=1
ENV HTTP_KEEP_ALIVE_TIMEOUT=60000

# Production Monitoring
ENV MONITORING_ENABLED=true
ENV ALERTING_ENABLED=true
ENV METRICS_EXPORT_INTERVAL=60000

# Production Command
CMD ["node", "services/game-manager/manager.js", "start", "kingdom-warriors"]