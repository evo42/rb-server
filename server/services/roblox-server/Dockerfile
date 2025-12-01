# Roblox Game Server Dockerfile
# Basierend auf Ubuntu 22.04 LTS für maximale Kompatibilität

FROM ubuntu:22.04

# Metadaten
LABEL maintainer="roblox-server-team"
LABEL description="Roblox Game Server Container"
LABEL version="1.0.0"

# Umgebungsvariablen für nicht-interaktive Installation
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Vienna

# System-Updates und grundlegende Abhängigkeiten installieren
RUN apt-get update && apt-get install -y \
    # Grundlegende System-Tools
    curl \
    wget \
    gnupg \
    lsb-release \
    ca-certificates \
    software-properties-common \
    apt-transport-https \
    build-essential \
    cmake \
    git \
    # Python und Lua-Abhängigkeiten
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    lua5.3 \
    lua5.3-dev \
    luarocks \
    # Netzwerk und Tools
    net-tools \
    iputils-ping \
    netcat-openbsd \
    telnet \
    # Monitoring und Logging
    htop \
    iotop \
    strace \
    procps \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

# Node.js 18.x für Backend-Services installieren
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs

# PM2 global für Process Management installieren
RUN npm install -g pm2

# Roblox Server spezifische Lua-Module installieren
RUN luarocks install lua-cjson \
    && luarocks install luasocket

# Arbeitsverzeichnis erstellen
WORKDIR /app

# Benutzer für den Container erstellen (nicht-root)
RUN useradd -m -u 1000 roblox \
    && chown -R roblox:roblox /app

# Package.json für Node.js Dependencies erstellen
COPY package.json package-lock.json ./

# Node.js Dependencies installieren
RUN npm ci --only=production

# Game Code und Konfiguration kopieren
COPY . .

# Log-Verzeichnis erstellen
RUN mkdir -p logs data \
    && chown -R roblox:roblox logs data

# Server-Port freigeben
EXPOSE 27015 8080

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Als non-root Benutzer ausführen
USER roblox

# Container starten
CMD ["node", "server.js"]