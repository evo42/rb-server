#!/bin/bash

# Roblox Server Testing Script
# Umfassende Server-Validierung und Health-Checks

set -e

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Konfiguration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${PROJECT_ROOT}/docker-compose.yml"
ENV_FILE="${PROJECT_ROOT}/.env"
TEST_RESULTS_DIR="${PROJECT_ROOT}/test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Test-Results Verzeichnis erstellen
mkdir -p "${TEST_RESULTS_DIR}"

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

# Test-Funktionen
test_docker_installation() {
    log "Teste Docker-Installation..."

    if ! command -v docker &> /dev/null; then
        error "Docker ist nicht installiert"
        return 1
    fi
    success "Docker ist installiert: $(docker --version)"

    if ! command -v docker compose &> /dev/null; then
        error "Docker Compose ist nicht installiert"
        return 1
    fi
    success "Docker Compose ist installiert: $(docker compose --version)"

    return 0
}

test_environment_config() {
    log "Teste Umgebungskonfiguration..."

    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f "${ENV_FILE}.example" ]]; then
            warning "Keine .env Datei gefunden. Kopiere .env.example zu .env"
            cp "${ENV_FILE}.example" "$ENV_FILE"
            success ".env Datei erstellt"
        else
            error "Keine .env oder .env.example Datei gefunden"
            return 1
        fi
    else
        success ".env Datei gefunden"
    fi

    # Wichtige Variablen prüfen
    local required_vars=("DB_PASSWORD" "REDIS_PASSWORD" "JWT_SECRET")
    for var in "${required_vars[@]}"; do
        if ! grep -q "^${var}=" "$ENV_FILE" || grep -q "change_me" "$ENV_FILE"; then
            warning "${var} sollte vor Produktions-Deployment geändert werden"
        else
            success "${var} ist konfiguriert"
        fi
    done

    return 0
}

test_ports_available() {
    log "Teste Port-Verfügbarkeit..."

    local ports=(80 443 8080 27015 5432 6379)
    local occupied_ports=()

    for port in "${ports[@]}"; do
        if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            occupied_ports+=("$port")
        fi
    done

    if [[ ${#occupied_ports[@]} -gt 0 ]]; then
        warning "Folgende Ports sind bereits belegt: ${occupied_ports[*]}"
        warning "Das könnte zu Konflikten führen"
        return 1
    else
        success "Alle erforderlichen Ports sind verfügbar"
    fi

    return 0
}

start_services() {
    log "Starte Services für Testing..."

    cd "$PROJECT_ROOT"

    # Alte Container stoppen und entfernen
    docker compose down --remove-orphans

    # Services starten
    if docker compose up -d; then
        success "Services gestartet"
        return 0
    else
        error "Fehler beim Starten der Services"
        return 1
    fi
}

wait_for_services() {
    log "Warte auf Services-Bereitschaft..."

    local max_wait=120
    local wait_time=0
    local services=("postgres" "redis" "roblox-server" "nginx")

    for service in "${services[@]}"; do
        log "Warte auf $service..."
        while [[ $wait_time -lt $max_wait ]]; do
            if docker compose ps "$service" | grep -q "healthy\|Up"; then
                success "$service ist bereit"
                break
            fi
            sleep 5
            wait_time=$((wait_time + 5))
        done

        if [[ $wait_time -ge $max_wait ]]; then
            error "$service ist nach ${max_wait}s nicht bereit"
            return 1
        fi
    done

    return 0
}

test_health_endpoints() {
    log "Teste Health-Endpunkte..."

    local base_url="http://localhost"
    local endpoints=(
        "GET|/health|200"
        "GET|/api/health|200"
        "GET|/api/status|200"
        "GET|/api/players|200"
    )

    for endpoint in "${endpoints[@]}"; do
        IFS='|' read -r method path expected_status <<< "$endpoint"

        log "Teste $method $path (erwartet: $expected_status)"

        local response=$(curl -s -w "%{http_code}" -X "$method" "${base_url}${path}" -o "${TEST_RESULTS_DIR}/response_${path//\//_}.json" 2>/dev/null || echo "000")
        local status_code="${response: -3}"

        if [[ "$status_code" == "$expected_status" ]]; then
            success "$path antwortet korrekt ($status_code)"
        else
            error "$path Fehlerhafte Antwort ($status_code, erwartet: $expected_status)"
            return 1
        fi
    done

    return 0
}

test_database_connection() {
    log "Teste Datenbankverbindung..."

    if docker compose exec -T postgres psql -U roblox_user -d roblox_game -c "SELECT 1;" >/dev/null 2>&1; then
        success "PostgreSQL Verbindung erfolgreich"
    else
        error "PostgreSQL Verbindung fehlgeschlagen"
        return 1
    fi

    # Tabelle prüfen
    if docker compose exec -T postgres psql -U roblox_user -d roblox_game -c "\dt" | grep -q "profiles"; then
        success "Datenbank-Tabellen sind erstellt"
    else
        error "Datenbank-Tabellen fehlen"
        return 1
    fi

    return 0
}

test_redis_connection() {
    log "Teste Redis-Verbindung..."

    if docker compose exec -T redis redis-cli ping | grep -q "PONG"; then
        success "Redis Verbindung erfolgreich"
    else
        error "Redis Verbindung fehlgeschlagen"
        return 1
    fi

    return 0
}

test_websocket_connection() {
    log "Teste WebSocket-Verbindung..."

    # Prüfe Socket.IO Endpunkt
    local socket_response=$(curl -s "http://localhost/socket.io/" 2>/dev/null || echo "")

    if [[ -n "$socket_response" ]]; then
        success "Socket.IO Endpunkt ist erreichbar"
    else
        error "Socket.IO Endpunkt nicht erreichbar"
        return 1
    fi

    return 0
}

test_multiclient_simulation() {
    log "Simuliere Multi-Client Tests..."

    local test_players=(
        "TestPlayer1"
        "TestPlayer2"
        "TestPlayer3"
    )

    for player in "${test_players[@]}"; do
        log "Teste Spieler-Anmeldung: $player"

        # Simuliere Spieler-Join via Socket.IO oder HTTP
        local join_response=$(curl -s -X POST "http://localhost/api/players" \
            -H "Content-Type: application/json" \
            -d "{\"username\":\"$player\",\"action\":\"join\"}" 2>/dev/null || echo "")

        if [[ -n "$join_response" ]]; then
            success "Spieler $player kann beitreten"
        else
            warning "Spieler $player Beitritts-Test unvollständig (Socket.IO erforderlich für vollständigen Test)"
        fi
    done

    return 0
}

test_performance() {
    log "Führe Performance-Tests durch..."

    local test_duration=10
    local concurrent_requests=5

    log "Führe $concurrent_requests gleichzeitige Requests für ${test_duration}s durch..."

    local start_time=$(date +%s.%N)
    local request_count=0

    for i in $(seq 1 $concurrent_requests); do
        (
            local local_count=0
            local loop_start=$(date +%s.%N)

            while (( $(echo "$(date +%s.%N) - $loop_start < $test_duration" | bc -l) )); do
                if curl -s "http://localhost/api/health" >/dev/null 2>&1; then
                    local_count=$((local_count + 1))
                fi
                sleep 0.1
            done

            echo "$local_count" >> "${TEST_RESULTS_DIR}/performance_results.txt"
        ) &
    done

    # Warten bis alle Tests fertig sind
    wait

    local end_time=$(date +%s.%N)
    local total_duration=$(echo "$end_time - $start_time" | bc -l)

    # Ergebnisse aggregieren
    local total_requests=0
    while IFS= read -r count; do
        total_requests=$((total_requests + count))
    done < "${TEST_RESULTS_DIR}/performance_results.txt"

    local requests_per_second=$(echo "scale=2; $total_requests / $total_duration" | bc -l)

    log "Performance-Ergebnisse:"
    log "  Gesamte Requests: $total_requests"
    log "  Testdauer: ${total_duration}s"
    log "  Requests/Sekunde: $requests_per_second"

    if (( $(echo "$requests_per_second >= 10" | bc -l) )); then
        success "Server-Performance ist akzeptabel (${requests_per_second} req/s)"
    else
        warning "Server-Performance könnte optimiert werden (${requests_per_second} req/s)"
    fi

    return 0
}

generate_test_report() {
    log "Generiere Test-Report..."

    local report_file="${TEST_RESULTS_DIR}/test_report_${TIMESTAMP}.txt"

    cat > "$report_file" << EOF
Roblox Server Test Report
=========================
Test-Zeitpunkt: $(date)
Server-Name: ${SERVER_NAME:-"Local Roblox Server"}

System Information:
- Docker Version: $(docker --version 2>/dev/null || echo "N/A")
- Docker Compose Version: $(docker compose --version 2>/dev/null || echo "N/A")
- Betriebssystem: $(uname -s) $(uname -r)
- Architektur: $(uname -m)

Service Status:
$(docker compose ps)

Resource Usage:
$(docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" 2>/dev/null || echo "N/A")

Network Endpoints:
- HTTP: http://localhost:80
- HTTPS: https://localhost:443 (falls konfiguriert)
- API: http://localhost/api
- Health: http://localhost/api/health

Test-Dateien:
$(find "${TEST_RESULTS_DIR}" -name "*" -type f | sed 's/^/  /')

Test-Zusammenfassung:
- Gesamte Test-Dauer: ${SECONDS}s
- Test-Ergebnisse gespeichert in: ${TEST_RESULTS_DIR}

Nächste Schritte:
1. Prüfen Sie alle Warning-Nachrichten
2. Führen Sie manuelle Tests in der Roblox-Client-Anwendung durch
3. Überprüfen Sie die Logs: docker compose logs
4. Stellen Sie sicher, dass alle Secrets in der Produktionsumgebung geändert werden
EOF

    success "Test-Report erstellt: $report_file"
    log "Report-Inhalt:"
    cat "$report_file"

    return 0
}

cleanup() {
    log "Cleanup nach Tests..."

    # Test-Results komprimieren
    if command -v tar &> /dev/null; then
        local archive_file="${TEST_RESULTS_DIR}/test_results_${TIMESTAMP}.tar.gz"
        tar -czf "$archive_file" -C "$TEST_RESULTS_DIR" .
        success "Test-Ergebnisse komprimiert: $archive_file"
    fi

    log "Cleanup abgeschlossen"
}

# Haupt-Test-Funktion
run_all_tests() {
    log "Starte umfassende Server-Tests..."
    log "Test-Ergebnisse werden in: $TEST_RESULTS_DIR gespeichert"

    local test_results=()

    # Test-Suite ausführen
    local tests=(
        "test_docker_installation"
        "test_environment_config"
        "test_ports_available"
        "start_services"
        "wait_for_services"
        "test_health_endpoints"
        "test_database_connection"
        "test_redis_connection"
        "test_websocket_connection"
        "test_multiclient_simulation"
        "test_performance"
    )

    for test_func in "${tests[@]}"; do
        log "Führe $test_func aus..."

        if $test_func; then
            test_results+=("$test_func: SUCCESS")
            success "$test_func erfolgreich"
        else
            test_results+=("$test_func: FAILED")
            error "$test_func fehlgeschlagen"
        fi
        echo
    done

    # Report generieren
    generate_test_report
    cleanup

    # Zusammenfassung
    log "Test-Zusammenfassung:"
    for result in "${test_results[@]}"; do
        if [[ "$result" == *"SUCCESS"* ]]; then
            success "$result"
        else
            error "$result"
        fi
    done

    local failed_tests=$(printf '%s\n' "${test_results[@]}" | grep -c "FAILED" || echo "0")

    if [[ $failed_tests -eq 0 ]]; then
        success "Alle Tests erfolgreich! Server ist bereit für den Einsatz."
        return 0
    else
        warning "$failed_tests Test(s) fehlgeschlagen. Bitte prüfen Sie die Fehler."
        return 1
    fi
}

# Help-Funktion
show_help() {
    echo "Roblox Server Testing Script"
    echo ""
    echo "Verwendung: $0 [option]"
    echo ""
    echo "Optionen:"
    echo "  all         Führt alle Tests aus (Standard)"
    echo "  health      Nur Health-Checks"
    echo "  performance Nur Performance-Tests"
    echo "  cleanup     Cleanup der Test-Umgebung"
    echo "  help        Diese Hilfe anzeigen"
    echo ""
    echo "Umgebungsvariablen:"
    echo "  SERVER_NAME - Name des Servers für Reports"
    echo "  SKIP_START  - Nicht automatisch Services starten (skip_services=1)"
}

# Main Execution
main() {
    case "${1:-all}" in
        "all")
            run_all_tests
            ;;
        "health")
            start_services
            wait_for_services
            test_health_endpoints
            ;;
        "performance")
            wait_for_services
            test_performance
            ;;
        "cleanup")
            cleanup
            docker compose down --remove-orphans
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Unbekannte Option: $1"
            show_help
            exit 1
            ;;
    esac
}

# Ausführung
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi