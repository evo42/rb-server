/**
 * Roblox Game Server
 * Haupt-Server-Datei für Multiplayer-Gaming-Tests
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const winston = require('winston');
const cron = require('node-cron');

// Server-Konfiguration
const config = {
  port: process.env.ROBLOX_SERVER_HTTP_PORT || 8080,
  gamePort: parseInt(process.env.ROBLOX_SERVER_PORT) || 27015,
  maxPlayers: parseInt(process.env.MAX_PLAYERS) || 50,
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600,
  serverName: process.env.SERVER_NAME || 'Local Roblox Server',
  logLevel: process.env.LOG_LEVEL || 'INFO',

  // Datenbank-Konfiguration
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'roblox_game',
    user: process.env.DB_USER || 'roblox_user',
    password: process.env.DB_PASSWORD || 'secure_password'
  },

  // Redis-Konfiguration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || ''
  }
};

// Logger konfigurieren
const logger = winston.createLogger({
  level: config.logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'roblox-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Express App initialisieren
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGINS || "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Game State Management
class GameState {
  constructor() {
    this.players = new Map();
    this.gameSessions = new Map();
    this.maxPlayers = config.maxPlayers;
    this.currentPlayers = 0;
  }

  addPlayer(player) {
    if (this.currentPlayers >= this.maxPlayers) {
      throw new Error('Server ist voll');
    }

    this.players.set(player.id, player);
    this.currentPlayers++;
    logger.info(`Spieler beigetreten: ${player.username} (${this.currentPlayers}/${this.maxPlayers})`);

    return player;
  }

  removePlayer(playerId) {
    if (this.players.has(playerId)) {
      this.players.delete(playerId);
      this.currentPlayers--;
      logger.info(`Spieler verlassen: ${playerId} (${this.currentPlayers}/${this.maxPlayers})`);
      return true;
    }
    return false;
  }

  getPlayers() {
    return Array.from(this.players.values());
  }

  getPlayer(playerId) {
    return this.players.get(playerId);
  }

  isFull() {
    return this.currentPlayers >= this.maxPlayers;
  }
}

const gameState = new GameState();

// Socket.IO Event-Handler
io.on('connection', (socket) => {
  logger.info(`Neue Verbindung: ${socket.id}`);

  // Spieler beitreten
  socket.on('player_join', async (playerData) => {
    try {
      const player = {
        id: socket.id,
        username: playerData.username,
        position: { x: 0, y: 0, z: 0 },
        rotation: { x: 0, y: 0, z: 0 },
        health: 100,
        score: 0,
        joinedAt: new Date()
      };

      gameState.addPlayer(player);

      // Spieler informieren
      socket.emit('join_success', {
        playerId: player.id,
        playerCount: gameState.currentPlayers,
        maxPlayers: gameState.maxPlayers
      });

      // Alle anderen Spieler informieren
      socket.broadcast.emit('player_joined', player);

      // Aktuelle Spielerliste senden
      socket.emit('current_players', gameState.getPlayers());

    } catch (error) {
      logger.error('Fehler beim Beitreten:', error);
      socket.emit('join_error', { message: error.message });
    }
  });

  // Spielerposition aktualisieren
  socket.on('player_move', (data) => {
    const player = gameState.getPlayer(socket.id);
    if (player) {
      player.position = data.position;
      player.rotation = data.rotation;

      // An andere Spieler weiterleiten
      socket.broadcast.emit('player_moved', {
        playerId: socket.id,
        position: data.position,
        rotation: data.rotation
      });
    }
  });

  // Chat-Nachrichten
  socket.on('chat_message', (data) => {
    const player = gameState.getPlayer(socket.id);
    if (player) {
      const message = {
        playerId: socket.id,
        username: player.username,
        message: data.message,
        timestamp: new Date()
      };

      // An alle Spieler senden
      io.emit('chat_message', message);
      logger.info(`Chat: ${player.username}: ${data.message}`);
    }
  }

  // Spieleraktionen
  socket.on('player_action', (data) => {
    const player = gameState.getPlayer(socket.id);
    if (player) {
      // Aktion verarbeiten
      switch (data.action) {
        case 'jump':
          player.position.y += 5;
          break;
        case 'score_up':
          player.score += 10;
          break;
      }

      // Status an andere Spieler senden
      socket.broadcast.emit('player_updated', {
        playerId: socket.id,
        health: player.health,
        score: player.score,
        position: player.position
      });
    }
  });

  // Verbindung trennen
  socket.on('disconnect', () => {
    logger.info(`Verbindung getrennt: ${socket.id}`);
    gameState.removePlayer(socket.id);

    // Andere Spieler informieren
    socket.broadcast.emit('player_left', { playerId: socket.id });
  });
});

// REST API Routes
const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: config.serverName,
    version: '1.0.0',
    uptime: process.uptime(),
    players: {
      current: gameState.currentPlayers,
      max: gameState.maxPlayers
    },
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString()
  });
});

// Server-Status
router.get('/status', (req, res) => {
  res.json({
    server: config.serverName,
    players: gameState.getPlayers(),
    stats: {
      currentPlayers: gameState.currentPlayers,
      maxPlayers: gameState.maxPlayers,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    }
  });
});

// Spieler-Liste
router.get('/players', (req, res) => {
  res.json({
    players: gameState.getPlayers(),
    count: gameState.currentPlayers
  });
});

// Server-Neustart (Admin only)
router.post('/restart', (req, res) => {
  // TODO: Admin-Authentifizierung implementieren
  logger.info('Server-Neustart angefordert');

  // Graceful shutdown
  setTimeout(() => {
    process.exit(0);
  }, 5000);

  res.json({ message: 'Server wird neu gestartet...' });
});

// API Routes registrieren
app.use('/api', router);

// Root Route
app.get('/', (req, res) => {
  res.json({
    name: config.serverName,
    version: '1.0.0',
    status: 'online',
    players: `${gameState.currentPlayers}/${gameState.maxPlayers}`,
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      players: '/api/players'
    }
  });
});

// Cron Jobs für regelmäßige Aufgaben
cron.schedule('*/5 * * * *', () => {
  // Server-Statistiken alle 5 Minuten loggen
  logger.info(`Server-Status: ${gameState.currentPlayers}/${gameState.maxPlayers} Spieler`);

  // Memory-Check
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed / 1024 / 1024 > 500) {
    logger.warn('Hoher Speicherverbrauch erkannt', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB'
    });
  }
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM empfangen, fahre Server herunter...');
  server.close(() => {
    logger.info('Server heruntergefahren');
    process.exit(0);
  });
});

// Server starten
server.listen(config.port, () => {
  logger.info(`${config.serverName} läuft auf Port ${config.port}`);
  logger.info(`Game Port: ${config.gamePort}`);
  logger.info(`Max Players: ${config.maxPlayers}`);
  logger.info(`Log Level: ${config.logLevel}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Fehlerbehandlung
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server, io, gameState, config, logger };