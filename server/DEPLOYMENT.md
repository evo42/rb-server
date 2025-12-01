# Roblox Server Deployment Guide

Vollständige Anleitung für die Installation, Konfiguration und das Deployment des Roblox Server Projekts in verschiedenen Umgebungen.

## Inhaltsverzeichnis

1. [Voraussetzungen](#voraussetzungen)
2. [Schnellstart (Lokale Entwicklung)](#schnellstart-lokale-entwicklung)
3. [Konfiguration](#konfiguration)
4. [Lokale Entwicklung](#lokale-entwicklung)
5. [Produktions-Deployment](#produktions-deployment)
6. [Docker Compose Profile](#docker-compose-profile)
7. [Monitoring & Logging](#monitoring--logging)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)
10. [Performance-Optimierung](#performance-optimierung)

## Voraussetzungen

### Mindestanforderungen

**Hardware:**
- CPU: 2+ Kerne
- RAM: 4GB (8GB empfohlen)
- Speicher: 20GB freier Festplattenspeicher
- Netzwerk: Internet-Verbindung für Docker-Image-Downloads

**Software:**
- Docker Engine >= 20.10
- Docker Compose >= 2.0
- Git (für Repository-Klon)
- Bash (für Scripts)
- curl (für Health-Checks)

### Optionale Tools
- Visual Studio Code (für Entwicklung)
- Roblox Studio (für Game-Entwicklung)
- PostgreSQL Client (für direkte Datenbankzugriffe)

### Unterstützte Betriebssysteme
- Linux (Ubuntu 20.04+, CentOS 8+, Debian 10+)
- macOS 10.15+
- Windows 10+ (mit WSL2 empfohlen)

### Port-Anforderungen
| Service | Port | Beschreibung |
|---------|------|--------------|
| HTTP | 80 | nginx Web Interface |
| HTTPS | 443 | nginx SSL (optional) |
| Roblox Game | 27015 | Roblox Game Server |
| API | 8080 | Roblox Server HTTP API |
| PostgreSQL | 5432 | Datenbank |
| Redis | 6379 | Cache |
| Monitoring | 9090 | Prometheus (optional) |
| Grafana | 3000 | Dashboard (optional) |

## Schnellstart (Lokale Entwicklung)

### 1. Repository klonen
```bash
git clone <repository-url>
cd roblox-server
```

### 2. Umgebung konfigurieren
```bash
# Basis-Konfiguration kopieren
cp .env.example .env

# Wichtige Einstellungen anpassen
nano .env
```

### 3. Server starten
```bash
# Alle Services starten
docker-compose up -d

# Status überprüfen
docker-compose ps

# Logs anzeigen
docker-compose logs -f
```

### 4. Server testen
```bash
# Automatisierte Tests ausführen
chmod +x scripts/test-server.sh
./scripts/test-server.sh

# Manuelle Tests
curl http://localhost/api/health
curl http://localhost/api/status
```

## Konfiguration

### Umgebungsvariablen (.env)

**Wichtige Einstellungen für Entwicklung:**
```bash
# Server-Konfiguration
SERVER_NAME="Local Roblox Server"
MAX_PLAYERS=10
SESSION_TIMEOUT=1800

# Entwicklungsmodus
DEVELOPMENT_MODE=true
HOT_RELOAD=true
LOG_LEVEL=DEBUG

# Ports (nicht ändern für lokale Tests)
ROBLOX_SERVER_PORT=27015
ROBLOX_SERVER_HTTP_PORT=8080
HTTP_PORT=80
```

**Wichtige Einstellungen für Produktion:**
```bash
# Sicherheit (MANDATORY - ändern!)
DB_PASSWORD=your_secure_production_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=your_super_secret_jwt_key_for_production

# Performance
MAX_PLAYERS=50
SESSION_TIMEOUT=3600
LOG_LEVEL=WARN

# Domain und SSL
DOMAIN=your-domain.com
SSL_EMAIL=admin@your-domain.com
ENABLE_SSL=true
```

### Server-Konfiguration (config/server.json)

Anpassbare Game-Einstellungen:
```json
{
  "game": {
    "maxPlayers": 50,
    "sessionTimeout": 3600,
    "mapRotation": ["spawn_area", "arena_main"],
    "gameSettings": {
      "friendlyFire": false,
      "autoBalance": true,
      "roundTime": 300
    }
  },
  "features": {
    "development": {
      "hotReload": true,
      "debugMode": true,
      "testMode": true
    }
  }
}
```

## Lokale Entwicklung

### Game-Code entwickeln

1. **Lua-Scripts bearbeiten:**
   ```bash
   # Haupt-Game-Logik
   nano game/main.lua

   # Module hinzufügen
   nano game/modules/your_module.lua
   ```

2. **Hot-Reload aktivieren:**
   - Änderungen werden automatisch erkannt
   - Server muss nicht neugestartet werden
   - Konfiguration: `"hotReload": true`

3. **Testing:**
   ```bash
   # Multi-Client Tests
   ./scripts/test-server.sh performance

   # Health-Checks
   ./scripts/test-server.sh health
   ```

### Debugging

1. **Logs überwachen:**
   ```bash
   # Alle Services
   docker-compose logs -f

   # Spezifischer Service
   docker-compose logs -f roblox-server

   # Letzte 100 Zeilen
   docker-compose logs --tail=100 roblox-server
   ```

2. **Container-Shell:**
   ```bash
   # Roblox Server Container
   docker-compose exec roblox-server bash

   # PostgreSQL Database
   docker-compose exec postgres psql -U roblox_user -d roblox_game

   # Redis
   docker-compose exec redis redis-cli
   ```

3. **Web Interface:**
   - Health Check: http://localhost/api/health
   - Status: http://localhost/api/status
   - Players: http://localhost/api/players

### Datenbank-Management

```bash
# Verbindung zur Datenbank
docker-compose exec postgres psql -U roblox_user -d roblox_game

# Tabellen auflisten
\dt

# Daten abfragen
SELECT * FROM players.profiles LIMIT 5;

# Backup erstellen
docker-compose exec postgres pg_dump -U roblox_user roblox_game > backup.sql

# Daten wiederherstellen
docker-compose exec -T postgres psql -U roblox_user -d roblox_game < backup.sql
```

## Produktions-Deployment

### 1. Server-Vorbereitung

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Docker installieren (Ubuntu/Debian)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose installieren
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 2. Projekt-Setup

```bash
# Repository klonen
git clone <repository-url>
cd roblox-server

# Produktions-Umgebung erstellen
cp .env.example .env.production

# Sicherheitskritische Einstellungen anpassen
nano .env.production
```

### 3. Sicherheitskonfiguration

```bash
# Sichere Passwörter generieren
openssl rand -base64 32  # für DB_PASSWORD
openssl rand -base64 32  # für REDIS_PASSWORD
openssl rand -base64 64  # für JWT_SECRET

# Domain konfigurieren
echo "DOMAIN=your-domain.com" >> .env.production
echo "SSL_EMAIL=admin@your-domain.com" >> .env.production
```

### 4. Produktions-Start

```bash
# Mit Produktions-Konfiguration starten
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Services überprüfen
docker-compose -f docker-compose.prod.yml ps

# Health-Check
curl -f http://localhost/api/health
```

### 5. SSL-Zertifikat einrichten (Let's Encrypt)

```bash
# Certbot-Profile aktivieren
docker-compose -f docker-compose.prod.yml --profile ssl up -d

# Zertifikate automatisch erneuern
docker-compose -f docker-compose.prod.yml --profile ssl up -d certbot
```

### 6. Monitoring aktivieren

```bash
# Monitoring-Profile starten
docker-compose -f docker-compose.prod.yml --profile monitoring up -d

# Grafana-Dashboard
# http://your-domain.com:3000
# Standard-Login: admin / admin
```

## Docker Compose Profile

### Verfügbare Profile

```bash
# Standard-Services (immer aktiv)
docker-compose up -d

# Nur Monitoring
docker-compose --profile monitoring up -d

# Nur Logging
docker-compose --profile logging up -d

# Nur Backup
docker-compose --profile backup up -d

# Nur SSL
docker-compose --profile ssl up -d

# Load Balancer (für horizontale Skalierung)
docker-compose --profile load-balancer up -d

# Alle Profile
docker-compose --profile monitoring --profile logging --profile backup up -d
```

### Profile-Kombinationen

**Entwicklung:**
```bash
docker-compose --profile monitoring --profile logging up -d
```

**Produktion:**
```bash
docker-compose -f docker-compose.prod.yml \
  --profile monitoring --profile logging --profile backup \
  --profile ssl --env-file .env.production up -d
```

## Monitoring & Logging

### Prometheus + Grafana Setup

1. **Monitoring aktivieren:**
   ```bash
   docker-compose --profile monitoring up -d
   ```

2. **Zugriff:**
   - Prometheus: http://localhost:9090
   - Grafana: http://localhost:3000
     - Username: `admin`
     - Password: (aus .env: GRAFANA_PASSWORD)

3. **Wichtige Metriken:**
   - Server Response Time
   - Active Players
   - Database Connections
   - Memory Usage
   - CPU Usage

### Logging mit Loki

1. **Logging aktivieren:**
   ```bash
   docker-compose --profile logging up -d
   ```

2. **Log-Analyse:**
   - http://localhost:3100 (Loki API)
   - Integriert in Grafana-Dashboard

### Health Monitoring

```bash
# Automatischer Health-Check
docker-compose exec healthchecker crontab -l

# Manueller Health-Check
./scripts/healthcheck.sh
```

## Backup & Recovery

### Automatische Backups

```bash
# Backup-Service starten
docker-compose --profile backup up -d

# Backups werden automatisch erstellt:
# - Täglich um 2:00 Uhr
# - Aufbewahrung: 30 Tage
# - Speicher: ./backups/
```

### Manuelle Backups

```bash
# Vollständiges Backup
docker-compose exec postgres pg_dumpall -U roblox_user > full_backup.sql

# Nur Datenbank
docker-compose exec postgres pg_dump -U roblox_user roblox_game > database_backup.sql

# Redis Backup
docker-compose exec redis redis-cli BGSAVE
docker cp roblox-redis-prod:/data/dump.rdb ./backups/redis_dump.rdb
```

### Recovery-Prozess

```bash
# 1. Services stoppen
docker-compose down

# 2. Daten wiederherstellen
docker-compose up -d postgres

# Warten bis PostgreSQL bereit ist
docker-compose logs postgres | grep "database system is ready to accept connections"

# 3. Datenbank wiederherstellen
docker-compose exec -T postgres psql -U roblox_user < database_backup.sql

# 4. Andere Services starten
docker-compose up -d
```

### Backup-Scripts

```bash
# Eigenes Backup-Script erstellen
cat > scripts/custom_backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
mkdir -p $BACKUP_DIR

# PostgreSQL Backup
pg_dump -h localhost -U roblox_user -d roblox_game > $BACKUP_DIR/db_$DATE.sql

# Redis Backup
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb $BACKUP_DIR/redis_$DATE.rdb

# Komprimierung
gzip $BACKUP_DIR/db_$DATE.sql
gzip $BACKUP_DIR/redis_$DATE.rdb

# Alte Backups löschen (älter als 7 Tage)
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete
EOF

chmod +x scripts/custom_backup.sh
```

## Troubleshooting

### Häufige Probleme

#### 1. Container startet nicht

**Symptome:**
- `docker-compose ps` zeigt Exited Status
- Keine Logs verfügbar

**Lösungen:**
```bash
# Logs prüfen
docker-compose logs SERVICE_NAME

# Container-Details anzeigen
docker-compose ps -a

# Manuelle Ausführung testen
docker-compose run --rm SERVICE_NAME
```

#### 2. Datenbank-Verbindungsfehler

**Symptome:**
- "connection refused" Fehler
- "authentication failed" Fehler

**Lösungen:**
```bash
# PostgreSQL Status prüfen
docker-compose exec postgres pg_isready -U roblox_user

# Netzwerk-Verbindung testen
docker-compose exec roblox-server nc -zv postgres 5432

# Datenbank-Credentials überprüfen
docker-compose exec postgres psql -U roblox_user -d roblox_game -c "SELECT 1;"
```

#### 3. Port-Konflikte

**Symptome:**
- "Port already in use" Fehler

**Lösungen:**
```bash
# Belegte Ports finden
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443

# Prozess beenden
sudo kill -9 PID

# Alternative Ports verwenden
echo "HTTP_PORT=8080" >> .env
echo "HTTPS_PORT=8443" >> .env
```

#### 4. Speicherprobleme

**Symptome:**
- Container werden beendet
- "Out of Memory" Fehler

**Lösungen:**
```bash
# Speicherverbrauch prüfen
docker stats

# Container-Limits anpassen (docker-compose.yml)
deploy:
  resources:
    limits:
      memory: 1G

# Swap aktivieren
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### 5. Performance-Probleme

**Diagnose:**
```bash
# System-Resources
top
htop
iotop

# Docker-Container
docker stats --no-stream

# Netzwerk
netstat -i
ss -tuln

# Festplatte
df -h
du -sh ./*
```

**Optimierungen:**
- Container-Limits setzen
- Datenbank-Indizes optimieren
- Cache-Settings anpassen
- Log-Rotation konfigurieren

### Debug-Modus

```bash
# Debug-Log-Level aktivieren
echo "LOG_LEVEL=DEBUG" >> .env
docker-compose up -d

# Erweiterte Logs
docker-compose logs -f --tail=1000 roblox-server

# Container-Shell für manuelles Debugging
docker-compose exec roblox-server bash
```

### Log-Analyse

```bash
# Log-Dateien finden
find ./logs -name "*.log" -type f

# Fehler in Logs suchen
grep -i error ./logs/*.log
grep -i exception ./logs/*.log

# Zeitstempel-Filter
grep "2024-01-01" ./logs/server.log
```

## Performance-Optimierung

### Server-Optimierung

```bash
# Kernel-Parameter optimieren (Linux)
echo "net.core.somaxconn = 65535" >> /etc/sysctl.conf
echo "net.core.netdev_max_backlog = 5000" >> /etc/sysctl.conf
echo "net.ipv4.tcp_max_syn_backlog = 65535" >> /etc/sysctl.conf
sysctl -p

# Datei-Deskriptor-Limits erhöhen
echo "* soft nofile 65536" >> /etc/security/limits.conf
echo "* hard nofile 65536" >> /etc/security/limits.conf
```

### Docker-Optimierung

```dockerfile
# Multi-Stage Build in Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runtime
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 8080
CMD ["node", "server.js"]
```

### Datenbank-Optimierung

```sql
-- PostgreSQL Performance-Settings
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
SELECT pg_reload_conf();
```

### Monitoring-Performance

```bash
# Prometheus-Konfiguration optimieren
# config/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "alerting_rules.yml"

scrape_configs:
  - job_name: 'roblox-server'
    scrape_interval: 5s
    metrics_path: /api/metrics
    static_configs:
      - targets: ['roblox-server:8080']
```

## Skalierung

### Horizontale Skalierung

```yaml
# docker-compose.scale.yml
services:
  roblox-server:
    deploy:
      replicas: 3
    ports:
      - "27015-27017:27015"
```

```bash
# Skalierung starten
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up -d --scale roblox-server=3
```

### Load Balancer Setup

```bash
# HAProxy aktivieren
docker-compose --profile load-balancer up -d

# Konfiguration anpassen
nano config/haproxy/haproxy.cfg
```

## Sicherheit

### Firewall-Konfiguration

```bash
# UFW Firewall (Ubuntu)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### SSL/HTTPS Setup

```bash
# Let's Encrypt Zertifikat
docker-compose --profile ssl up -d certbot

# Automatische Erneuerung
0 12 * * * /usr/bin/docker-compose -f /path/to/docker-compose.prod.yml --profile ssl up -d certbot && /usr/bin/docker-compose -f /path/to/docker-compose.prod.yml exec certbot certbot renew --quiet
```

### Secrets Management

```bash
# Externe Secrets (empfohlen für Produktion)
# Docker Swarm: docker secret create
# Kubernetes: Kubernetes Secrets
# HashiCorp Vault: vault integration

# Beispiel: Vault Integration
export DB_PASSWORD=$(vault kv get -field=password secret/roblox/db)
export REDIS_PASSWORD=$(vault kv get -field=password secret/roblox/redis)
```

---

## Support & Community

- **GitHub Issues:** [Repository Issues](https://github.com/your-org/roblox-server/issues)
- **Wiki:** [Vollständige Dokumentation](https://github.com/your-org/roblox-server/wiki)
- **Discord:** [Community Server](https://discord.gg/your-server)

## Changelog

Siehe [CHANGELOG.md](CHANGELOG.md) für Versions-Historie und Updates.

---

**Deployment-Guide Version:** 1.0.0
**Letzte Aktualisierung:** 2024-12-01
**Kompatibilität:** Roblox Server v1.0.0+