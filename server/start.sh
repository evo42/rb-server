#!/bin/bash

# Roblox Server Quick Start Script
# Einfacher Start- und Management-Script für das Roblox Server Projekt

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
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
ENV_FILE="$PROJECT_ROOT/.env"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
PROD_COMPOSE_FILE="$PROJECT_ROOT/docker-compose.prod.yml"

# Logging
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

info() {
    echo -e "${CYAN}ℹ${NC} $1"
}

header() {
    echo -e "${PURPLE}"
    echo "=========================================="
    echo "   Roblox Server Management Script"
    echo "=========================================="
    echo -e "${NC}"
}

# Hilfe-Funktion
show_help() {
    header
    echo "Verwendung: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  start           Startet den Server (Development)"
    echo "  start-prod      Startet den Server (Production)"
    echo "  stop            Stoppt den Server"
    echo "  restart         Neustart des Servers"
    echo "  status          Zeigt Server-Status"
    echo "  logs            Zeigt Logs (mit -f für Follow)"
    echo "  test            Führt Server-Tests aus"
    echo "  setup           Initial-Setup (erstellt .env, etc.)"
    echo "  backup          Erstellt Backup"
    echo "  update          Update des Projekts"
    echo "  clean           Cleanup (Container, Images, Volumes)"
    echo "  health          Health-Check"
    echo "  shell           Shell in Container öffnen"
    echo "  help            Diese Hilfe anzeigen"
    echo ""
    echo "Options:"
    echo "  -h, --help      Diese Hilfe"
    echo "  -f, --follow    Follow logs (für logs Command)"
    echo "  -v, --verbose   Verbose output"
    echo "  --production    Production Mode"
    echo ""
    echo "Beispiele:"
    echo "  $0 start                    # Development Server starten"
    echo "  $0 start-prod               # Production Server starten"
    echo "  $0 logs -f                  # Logs mit Follow"
    echo "  $0 shell roblox-server      # Shell in Roblox Container"
    echo ""
}

# Prüfungen
check_requirements() {
    log "Prüfe Anforderungen..."

    # Docker prüfen
    if ! command -v docker &> /dev/null; then
        error "Docker ist nicht installiert"
        return 1
    fi
    success "Docker gefunden: $(docker --version)"

    # Docker Compose prüfen
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose ist nicht installiert"
        return 1
    fi
    success "Docker Compose gefunden: $(docker-compose --version)"

    return 0
}

# Setup-Funktion
setup_project() {
    log "Setup Projekt..."

    # .env-Datei erstellen falls nicht vorhanden
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f "${ENV_FILE}.example" ]]; then
            cp "${ENV_FILE}.example" "$ENV_FILE"
            success ".env Datei erstellt"
            warning "Bitte passen Sie die .env Datei vor dem Start an!"
        else
            error ".env.example nicht gefunden"
            return 1
        fi
    else
        info ".env Datei bereits vorhanden"
    fi

    # Verzeichnisse erstellen
    mkdir -p logs data/backups data/postgres data/redis data/game data/monitoring

    # Berechtigungen setzen
    chmod +x scripts/*.sh

    success "Setup abgeschlossen"
    info "Nächste Schritte:"
    info "1. Bearbeiten Sie die .env Datei: nano $ENV_FILE"
    info "2. Starten Sie den Server: $0 start"

    return 0
}

# Server starten
start_server() {
    local production=false

    # Argumente parsen
    while [[ $# -gt 0 ]]; do
        case $1 in
            --production)
                production=true
                shift
                ;;
            *)
                shift
                ;;
        esac
    done

    log "Starte Roblox Server..."

    # Anforderungen prüfen
    if ! check_requirements; then
        return 1
    fi

    # Setup prüfen
    if [[ ! -f "$ENV_FILE" ]]; then
        warning "Setup wird durchgeführt..."
        setup_project
        return 0
    fi

    # Docker Compose Datei wählen
    if [[ "$production" == "true" ]]; then
        COMPOSE_ARGS="-f $PROD_COMPOSE_FILE --env-file $ENV_FILE"
        MODE="Production"
    else
        COMPOSE_ARGS=""
        MODE="Development"
    fi

    log "Modus: $MODE"

    # Alte Container stoppen
    log "Stoppe alte Container..."
    eval "docker-compose $COMPOSE_ARGS down --remove-orphans" || true

    # Neue Container starten
    log "Starte neue Container..."
    if eval "docker-compose $COMPOSE_ARGS up -d"; then
        success "Server erfolgreich gestartet (Modus: $MODE)"

        # Warte auf Services
        wait_for_services

        # Status anzeigen
        show_status

        return 0
    else
        error "Fehler beim Starten des Servers"
        return 1
    fi
}

# Services auf Bereitschaft warten
wait_for_services() {
    log "Warte auf Service-Bereitschaft..."

    local services=("postgres" "redis" "roblox-server" "nginx")
    local max_wait=60
    local wait_time=0

    for service in "${services[@]}"; do
        log "Warte auf $service..."
        while [[ $wait_time -lt $max_wait ]]; do
            if eval "docker-compose $COMPOSE_ARGS ps $service" | grep -q "Up\|healthy"; then
                success "$service ist bereit"
                break
            fi
            sleep 2
            wait_time=$((wait_time + 2))
        done

        if [[ $wait_time -ge $max_wait ]]; then
            warning "$service ist nach ${max_wait}s nicht bereit"
        fi
    done
}

# Server stoppen
stop_server() {
    log "Stoppe Roblox Server..."

    if eval "docker-compose $COMPOSE_ARGS down"; then
        success "Server gestoppt"
    else
        error "Fehler beim Stoppen des Servers"
        return 1
    fi

    return 0
}

# Server neustarten
restart_server() {
    log "Neustart Roblox Server..."

    if stop_server && start_server; then
        success "Server erfolgreich neugestartet"
    else
        error "Fehler beim Neustart des Servers"
        return 1
    fi

    return 0
}

# Status anzeigen
show_status() {
    log "Server Status:"
    echo

    eval "docker-compose $COMPOSE_ARGS ps"
    echo

    # Services-Status
    info "Service Health-Checks:"
    local services=("roblox-server" "postgres" "redis" "nginx")

    for service in "${services[@]}"; do
        if eval "docker-compose $COMPOSE_ARGS ps $service" | grep -q "healthy\|Up"; then
            success "$service: Running"
        else
            warning "$service: Not Ready"
        fi
    done

    echo

    # URLs anzeigen
    info "Verfügbare Endpunkte:"
    echo "  Health Check:     http://localhost/api/health"
    echo "  Server Status:    http://localhost/api/status"
    echo "  Player List:      http://localhost/api/players"
    echo "  Roblox Game:      localhost:27015"
    echo

    # System-Info
    info "System-Informationen:"
    echo "  Docker Version:   $(docker --version 2>/dev/null || echo 'N/A')"
    echo "  Compose Version:  $(docker-compose --version 2>/dev/null || echo 'N/A')"
    echo "  Modus:            ${MODE:-Unknown}"
    echo "  Uptime:           $(uptime | cut -d',' -f1 | cut -d' ' -f4-)"
}

# Logs anzeigen
show_logs() {
    local follow=false
    local service=""

    # Argumente parsen
    while [[ $# -gt 0 ]]; do
        case $1 in
            -f|--follow)
                follow=true
                shift
                ;;
            -h|--help)
                show_help
                return 0
                ;;
            *)
                service="$1"
                shift
                ;;
        esac
    done

    log "Zeige Logs$([[ -n "$service" ]] && echo " für: $service")..."

    local args="--tail=100"
    if [[ "$follow" == "true" ]]; then
        args="-f $args"
    fi

    if [[ -n "$service" ]]; then
        eval "docker-compose $COMPOSE_ARGS logs $args $service"
    else
        eval "docker-compose $COMPOSE_ARGS logs $args"
    fi
}

# Tests ausführen
run_tests() {
    log "Führe Server-Tests aus..."

    if [[ -f "$PROJECT_ROOT/scripts/test-server.sh" ]]; then
        chmod +x "$PROJECT_ROOT/scripts/test-server.sh"
        "$PROJECT_ROOT/scripts/test-server.sh" all
    else
        error "Test-Script nicht gefunden"
        return 1
    fi
}

# Backup erstellen
create_backup() {
    log "Erstelle Backup..."

    local backup_dir="$PROJECT_ROOT/backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    mkdir -p "$backup_dir"

    # Datenbank-Backup
    log "Sichere Datenbank..."
    eval "docker-compose $COMPOSE_ARGS exec -T postgres pg_dump -U roblox_user roblox_game" > "$backup_dir/database_$timestamp.sql"
    gzip "$backup_dir/database_$timestamp.sql"

    # Redis-Backup
    log "Sichere Redis..."
    eval "docker-compose $COMPOSE_ARGS exec redis redis-cli BGSAVE"
    eval "docker-compose $COMPOSE_ARGS cp redis:/data/dump.rdb $backup_dir/redis_$timestamp.rdb"

    # Komprimierung
    gzip "$backup_dir/redis_$timestamp.rdb"

    success "Backup erstellt: $backup_dir/"
    info "Dateien:"
    info "  - database_$timestamp.sql.gz"
    info "  - redis_$timestamp.rdb.gz"
}

# Projekt update
update_project() {
    log "Update Projekt..."

    # Git-Status prüfen
    if [[ -d "$PROJECT_ROOT/.git" ]]; then
        log "Prüfe Git-Repository..."
        git status

        log "Lade Updates herunter..."
        git pull origin main

        log "Baue Images neu..."
        eval "docker-compose $COMPOSE_ARGS build --no-cache"

        success "Update abgeschlossen"
        info "Starten Sie den Server neu: $0 restart"
    else
        warning "Kein Git-Repository gefunden"
        return 1
    fi
}

# Cleanup
cleanup() {
    log "Cleanup..."

    read -p "Möchten Sie wirklich alle Container, Images und Volumes löschen? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        log "Stoppe Container..."
        eval "docker-compose $COMPOSE_ARGS down --volumes --remove-orphans"

        log "Entferne Images..."
        docker system prune -af --volumes

        success "Cleanup abgeschlossen"
    else
        info "Cleanup abgebrochen"
    fi
}

# Health-Check
health_check() {
    log "Health-Check..."

    # HTTP Health-Check
    if curl -sf http://localhost/api/health >/dev/null 2>&1; then
        success "HTTP Health-Check: OK"
    else
        error "HTTP Health-Check: FEHLER"
    fi

    # Docker-Container Health
    local failed_containers=0
    local containers=$(eval "docker-compose $COMPOSE_ARGS ps -q")

    for container in $containers; do
        local status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "none")
        if [[ "$status" != "healthy" && "$status" != "none" ]]; then
            error "Container $container: Unhealthy"
            failed_containers=$((failed_containers + 1))
        fi
    done

    if [[ $failed_containers -eq 0 ]]; then
        success "Container Health: OK"
    else
        error "Container Health: $failed_containers unhealthy"
    fi
}

# Shell in Container
open_shell() {
    local service="$1"

    if [[ -z "$service" ]]; then
        error "Service-Name erforderlich"
        info "Verfügbare Services:"
        eval "docker-compose $COMPOSE_ARGS config --services"
        return 1
    fi

    log "Öffne Shell in $service..."
    eval "docker-compose $COMPOSE_ARGS exec $service bash"
}

# Haupt-Funktion
main() {
    # Argumente prüfen
    if [[ $# -eq 0 ]]; then
        show_help
        return 0
    fi

    local command="$1"
    shift

    case $command in
        "start")
            start_server "$@"
            ;;
        "start-prod")
            start_server --production "$@"
            ;;
        "stop")
            stop_server
            ;;
        "restart")
            restart_server
            ;;
        "status")
            show_status
            ;;
        "logs")
            show_logs "$@"
            ;;
        "test")
            run_tests
            ;;
        "setup")
            setup_project
            ;;
        "backup")
            create_backup
            ;;
        "update")
            update_project
            ;;
        "clean")
            cleanup
            ;;
        "health")
            health_check
            ;;
        "shell")
            open_shell "$@"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unbekannter Command: $command"
            show_help
            return 1
            ;;
    esac
}

# Ausführung
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi