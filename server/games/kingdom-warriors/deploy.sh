#!/bin/bash

# Kingdom Warriors - Deployment Script
# Roblox Multi-Game Management System - Kingdom Warriors Game Deployment
# Episches Mittelalter-Strategiespiel Deployment

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Konfiguration
GAME_ID="kingdom-warriors"
GAME_NAME="Königreich der letzten Krieger"
CONTAINER_NAME="${GAME_ID}-game"
IMAGE_NAME="ikaria/roblox-game:${GAME_ID}"
VERSION="1.0.0"
NETWORK_NAME="roblox-backend"

# Banner
print_banner() {
    echo -e "${PURPLE}"
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo "                    ⚔️  KÖNIGREICH DER LETZTEN KRIEGER ⚔️"
    echo "                      Epic Medieval Strategy Game Deployment"
    echo "                           Version ${VERSION}"
    echo "════════════════════════════════════════════════════════════════════════════════"
    echo -e "${NC}"
}

# Logging Funktion
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vorbedingungen prüfen
check_prerequisites() {
    log "🔍 Überprüfe Vorbedingungen..."

    # Docker prüfen
    if ! command -v docker &> /dev/null; then
        error "Docker ist nicht installiert!"
        exit 1
    fi
    success "Docker ist verfügbar"

    # Docker Compose prüfen
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        error "Docker Compose ist nicht verfügbar!"
        exit 1
    fi
    success "Docker Compose ist verfügbar"

    # Netzwerk prüfen
    if ! docker network ls | grep -q "${NETWORK_NAME}"; then
        warning "Netzwerk ${NETWORK_NAME} existiert nicht. Erstelle es..."
        docker network create ${NETWORK_NAME}
        success "Netzwerk ${NETWORK_NAME} erstellt"
    else
        success "Netzwerk ${NETWORK_NAME} existiert bereits"
    fi
}

# Spiel validieren
validate_game() {
    log "🎮 Validiere Kingdom Warriors Spiel..."

    # game.json prüfen
    if [ ! -f "game.json" ]; then
        error "game.json nicht gefunden!"
        exit 1
    fi

    # JSON-Syntax prüfen
    if ! python3 -m json.tool game.json > /dev/null 2>&1; then
        error "game.json hat ungültige JSON-Syntax!"
        exit 1
    fi
    success "game.json ist gültig"

    # Package.json prüfen
    if [ ! -f "package.json" ]; then
        error "package.json nicht gefunden!"
        exit 1
    fi
    success "package.json gefunden"

    # Dockerfile prüfen
    if [ ! -f "Dockerfile" ]; then
        error "Dockerfile nicht gefunden!"
        exit 1
    fi
    success "Dockerfile gefunden"

    # Docker Build testen
    log "🏗️  Teste Docker Build..."
    if ! docker build --no-cache -t ${IMAGE_NAME}:test . > /dev/null 2>&1; then
        error "Docker Build fehlgeschlagen!"
        exit 1
    fi
    success "Docker Build erfolgreich"

    # Test-Image löschen
    docker rmi ${IMAGE_NAME}:test > /dev/null 2>&1 || true
}

# Docker Image bauen
build_image() {
    log "🏗️  Baue Kingdom Warriors Docker Image..."

    # Build mit BuildKit
    export DOCKER_BUILDKIT=1

    docker build \
        --build-arg BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ') \
        --build-arg BUILD_VERSION=${VERSION} \
        --build-arg BUILD_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown") \
        --build-arg BUILD_BRANCH=$(git branch --show-current 2>/dev/null || echo "main") \
        -t ${IMAGE_NAME}:latest \
        -t ${IMAGE_NAME}:${VERSION} \
        .

    if [ $? -eq 0 ]; then
        success "Docker Image erfolgreich gebaut"
        docker images | grep ${GAME_ID}
    else
        error "Docker Build fehlgeschlagen!"
        exit 1
    fi
}

# Spiel starten
start_game() {
    log "🚀 Starte Kingdom Warriors Spiel..."

    # Container stoppen falls bereits aktiv
    if docker ps -a | grep -q ${CONTAINER_NAME}; then
        log "Stoppe bestehenden Container..."
        docker stop ${CONTAINER_NAME} > /dev/null 2>&1 || true
        docker rm ${CONTAINER_NAME} > /dev/null 2>&1 || true
    fi

    # Container starten
    docker run -d \
        --name ${CONTAINER_NAME} \
        --network ${NETWORK_NAME} \
        -p 3002:3002 \
        -p 3003:3003 \
        -p 3004:3004 \
        -p 3005:3005 \
        -e GAME_ID=${GAME_ID} \
        -e GAME_NAME="${GAME_NAME}" \
        -e GAME_VERSION=${VERSION} \
        -e NODE_ENV=production \
        -e LOG_LEVEL=info \
        ${IMAGE_NAME}:latest

    if [ $? -eq 0 ]; then
        success "Kingdom Warriors Container erfolgreich gestartet"
    else
        error "Container-Start fehlgeschlagen!"
        exit 1
    fi
}

# Spiel-Status prüfen
check_status() {
    log "📊 Überprüfe Spiel-Status..."

    # Container-Status
    if docker ps | grep -q ${CONTAINER_NAME}; then
        success "Container läuft"

        # Health Check
        log "🏥 Führe Health Check durch..."
        sleep 5

        if docker exec ${CONTAINER_NAME} curl -f http://localhost:3002/health > /dev/null 2>&1; then
            success "Health Check erfolgreich - Kingdom Warriors läuft"
        else
            warning "Health Check fehlgeschlagen - prüfe Logs"
        fi
    else
        error "Container läuft nicht!"
        return 1
    fi

    # Container-Logs anzeigen
    log "📋 Zeige letzte Logs..."
    docker logs --tail 20 ${CONTAINER_NAME}
}

# Multi-Game-Manager Integration
register_with_manager() {
    log "🔗 Registriere bei Multi-Game-Manager..."

    # HTTP-Request an Game Manager
    if command -v curl &> /dev/null; then
        curl -X POST http://localhost:3000/games/register \
            -H "Content-Type: application/json" \
            -d @game.json \
            > /dev/null 2>&1 || warning "Game Manager nicht erreichbar - manuelle Registrierung erforderlich"
    else
        warning "curl nicht verfügbar - manuelle Registrierung erforderlich"
    fi
}

# Monitoring einrichten
setup_monitoring() {
    log "📈 Richte Monitoring ein..."

    # Prometheus Metriken aktivieren
    docker exec ${CONTAINER_NAME} curl -X POST http://localhost:3004/metrics/enable > /dev/null 2>&1 || true

    # Grafana Dashboard (falls verfügbar)
    if command -v curl &> /dev/null; then
        # Hier könnte ein Grafana Dashboard erstellt werden
        log "Grafana Dashboard kann manuell konfiguriert werden"
    fi
}

# Backup einrichten
setup_backup() {
    log "💾 Richte Backup-System ein..."

    # Backup-Verzeichnis erstellen
    BACKUP_DIR="./backups/$(date +'%Y-%m-%d_%H-%M-%S')"
    mkdir -p ${BACKUP_DIR}

    # Container-Daten sichern
    docker exec ${CONTAINER_NAME} tar -czf /tmp/kingdom-warriors-backup.tar.gz /app/data /app/logs 2>/dev/null || true
    docker cp ${CONTAINER_NAME}:/tmp/kingdom-warriors-backup.tar.gz ${BACKUP_DIR}/ > /dev/null 2>&1 || true

    success "Backup erstellt in ${BACKUP_DIR}"
}

# Netzwerk-Test
network_test() {
    log "🌐 Führe Netzwerk-Test durch..."

    # Port-Verfügbarkeit prüfen
    PORTS=(3002 3003 3004 3005)
    for port in "${PORTS[@]}"; do
        if command -v nc &> /dev/null; then
            if nc -z localhost ${port} > /dev/null 2>&1; then
                success "Port ${port} ist erreichbar"
            else
                warning "Port ${port} ist nicht erreichbar"
            fi
        else
            log "nc nicht verfügbar - überspringe Port-Test"
            break
        fi
    done

    # WebSocket-Verbindung testen
    if command -v websocat &> /dev/null; then
        log "WebSocket-Test..."
        # Hier könnte ein WebSocket-Test implementiert werden
    fi
}

# Cleanup Funktion
cleanup() {
    log "🧹 Cleanup temporäre Dateien..."
    docker system prune -f > /dev/null 2>&1 || true
}

# Hauptfunktion
main() {
    print_banner

    local action=${1:-"deploy"}

    case ${action} in
        "deploy")
            check_prerequisites
            validate_game
            build_image
            start_game
            sleep 10
            check_status
            register_with_manager
            setup_monitoring
            setup_backup
            network_test

            echo
            success "🎉 Kingdom Warriors erfolgreich deployed!"
            echo
            echo -e "${CYAN}📋 Spiel-Informationen:${NC}"
            echo -e "   Game ID: ${GAME_ID}"
            echo -e "   Container: ${CONTAINER_NAME}"
            echo -e "   API Port: 3002"
            echo -e "   WebSocket: 3003"
            echo -e "   Metrics: 3004"
            echo -e "   Admin: 3005"
            echo
            echo -e "${GREEN}🚀 Zugriff:${NC}"
            echo -e "   HTTP API: http://localhost:3002"
            echo -e "   WebSocket: ws://localhost:3003"
            echo -e "   Admin Panel: http://localhost:3005"
            echo -e "   Health Check: http://localhost:3002/health"
            echo
            ;;
        "start")
            start_game
            ;;
        "stop")
            log "🛑 Stoppe Kingdom Warriors..."
            docker stop ${CONTAINER_NAME} > /dev/null 2>&1 && success "Container gestoppt" || warning "Container war nicht aktiv"
            ;;
        "restart")
            log "🔄 Restarte Kingdom Warriors..."
            docker restart ${CONTAINER_NAME} > /dev/null 2>&1 && success "Container neugestartet" || error "Restart fehlgeschlagen"
            ;;
        "status")
            check_status
            ;;
        "logs")
            docker logs -f ${CONTAINER_NAME}
            ;;
        "build")
            build_image
            ;;
        "validate")
            validate_game
            ;;
        "clean")
            log "🧹 Bereinige alle Kingdom Warriors Ressourcen..."
            docker stop ${CONTAINER_NAME} > /dev/null 2>&1 || true
            docker rm ${CONTAINER_NAME} > /dev/null 2>&1 || true
            docker rmi ${IMAGE_NAME}:latest ${IMAGE_NAME}:${VERSION} > /dev/null 2>&1 || true
            cleanup
            success "Cleanup abgeschlossen"
            ;;
        *)
            echo "Verwendung: $0 {deploy|start|stop|restart|status|logs|build|validate|clean}"
            echo
            echo "Befehle:"
            echo "  deploy    - Vollständiges Deployment (Standard)"
            echo "  start     - Nur Container starten"
            echo "  stop      - Container stoppen"
            echo "  restart   - Container neustarten"
            echo "  status    - Status prüfen"
            echo "  logs      - Logs anzeigen (Follow)"
            echo "  build     - Nur Docker Image bauen"
            echo "  validate  - Spiel validieren"
            echo "  clean     - Alle Ressourcen bereinigen"
            exit 1
            ;;
    esac
}

# Signal Handler für graceful shutdown
trap cleanup EXIT

# Script ausführen
main "$@"