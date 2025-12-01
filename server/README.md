# Roblox Server Projekt

Ein lokales Roblox Game Server Setup mit Docker Compose für Multiplayer-Testing und lokale Entwicklung.

## Projekt-Übersicht

Dieses Projekt stellt einen eigenständigen Roblox Game Server bereit, der mit PostgreSQL für Datenpersistierung und nginx als Reverse Proxy läuft.

### Services

- **Roblox Game Server**: Haupt-Game Server für Multiplayer-Sessions
- **PostgreSQL**: Datenbank für Spieler-Daten, Sessions und Spielzustände
- **nginx**: Reverse Proxy für Server-Kommunikation und Load Balancing

### Features

- Vollständig containerisierte Entwicklungsumgebung
- Multiplayer-Testing mit mehreren Clients
- Datenpersistierung mit PostgreSQL
- Skalierbare Server-Architektur
- Lokale Entwicklung und Testing

## Schnellstart

### Voraussetzungen

- Docker >= 20.10
- Docker Compose >= 2.0
- Mindestens 4GB RAM verfügbar

### Installation

1. Repository klonen:
```bash
git clone <repository-url>
cd roblox-server
```

2. Umgebungsvariablen konfigurieren:
```bash
cp .env.example .env
# .env Datei entsprechend anpassen
```

3. Server starten:
```bash
docker-compose up -d
```

4. Server-Status überprüfen:
```bash
docker-compose ps
```

## Konfiguration

### Umgebungsvariablen

Siehe `.env.example` für alle verfügbaren Konfigurationsoptionen.

### Roblox Game Server

- **Port**: 27015 (Standard)
- **Max Players**: Konfigurierbar
- **Session Timeout**: Konfigurierbar

### PostgreSQL

- **Port**: 5432
- **Database**: roblox_game
- **User**: roblox_user

### nginx

- **HTTP Port**: 80
- **HTTPS Port**: 443 (falls SSL konfiguriert)
- **WebSocket Support**: Aktiviert für Echtzeit-Kommunikation

## Entwicklung

### Game Code Integration

1. Ihre Lua-Scripts in `game/` Verzeichnis kopieren
2. Server-Konfiguration in `config/server.json` anpassen
3. Datenbank-Schema in `database/init.sql` prüfen

### Testing

```bash
# Server-Logs anzeigen
docker-compose logs -f roblox-server

# Datenbank-Verbindung testen
docker-compose exec postgres psql -U roblox_user -d roblox_game

# Server-Health-Check
curl http://localhost/api/health
```

## Deployment

### Lokale Entwicklung
```bash
docker-compose up -d
```

### Produktions-Deployment
```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Troubleshooting

### Häufige Probleme

1. **Port bereits belegt**
   - Prüfen Sie `.env` Konfiguration
   - Nutzen Sie `docker-compose down` zum Stoppen

2. **Datenbank-Verbindung fehlgeschlagen**
   - Überprüfen Sie PostgreSQL-Container Status
   - Prüfen Sie Umgebungsvariablen

3. **Roblox Server startet nicht**
   - Prüfen Sie Logs: `docker-compose logs roblox-server`
   - Verifizieren Sie Lua-Scripts Syntax

### Logs

```bash
# Alle Services
docker-compose logs

# Spezifischer Service
docker-compose logs roblox-server
docker-compose logs postgres
docker-compose logs nginx
```

## Contributing

1. Fork das Repository
2. Feature-Branch erstellen: `git checkout -b feature/amazing-feature`
3. Änderungen committen: `git commit -m 'Add amazing feature'`
4. Branch pushen: `git push origin feature/amazing-feature`
5. Pull Request erstellen

## Lizenz

MIT License - siehe [LICENSE](LICENSE) für Details.