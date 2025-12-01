/**
 * Roblox Multi-Game Management System
 * Zentrale Verwaltung für mehrere Roblox Games
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
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');

// Game Manager Konfiguration
const config = {
  port: process.env.GAME_MANAGER_PORT || 8081,
  gamesDirectory: path.join(__dirname, '../..', 'games'),
  pluginsDirectory: path.join(__dirname, '../..', 'plugins'),
  assetsDirectory: path.join(__dirname, '../..', 'assets'),
  uploadsDirectory: path.join(__dirname, '../..', 'uploads'),
  maxGames: parseInt(process.env.MAX_GAMES) || 10,
  maxPlayersPerGame: parseInt(process.env.MAX_PLAYERS_PER_GAME) || 50,
  sessionTimeout: parseInt(process.env.SESSION_TIMEOUT) || 3600,
  logLevel: process.env.LOG_LEVEL || 'INFO',

  // Datenbank-Konfiguration
  db: {
    host: process.env.DB_HOST || 'postgres',
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'roblox_game',
    user: process.env.DB_USER || 'roblox_user',
    password: process.env.DB_PASSWORD || 'secure_password'
  },

  // Redis-Konfiguration
  redis: {
    host: process.env.REDIS_HOST || 'redis',
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
  defaultMeta: { service: 'game-manager' },
  transports: [
    new winston.transports.File({ filename: 'logs/game-manager.log' }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' })
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
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(config.assetsDirectory));
app.use('/uploads', express.static(config.uploadsDirectory));

// =============================================================================
// GAME MANAGER CORE CLASSES
// =============================================================================

class GameRegistry {
  constructor() {
    this.games = new Map();
    this.activeGames = new Set();
    this.gameInstances = new Map();
  }

  async registerGame(gameConfig) {
    try {
      const gameId = gameConfig.id || uuidv4();
      const game = {
        id: gameId,
        name: gameConfig.name,
        version: gameConfig.version || '1.0.0',
        description: gameConfig.description || '',
        author: gameConfig.author || 'Unknown',
        category: gameConfig.category || 'Other',
        tags: gameConfig.tags || [],
        status: 'registered',
        createdAt: new Date(),
        updatedAt: new Date(),
        config: gameConfig,
        path: path.join(config.gamesDirectory, gameId),
        assets: {},
        dependencies: gameConfig.dependencies || [],
        settings: gameConfig.settings || {}
      };

      // Spiel-Verzeichnis erstellen
      await fs.ensureDir(game.path);
      await fs.ensureDir(path.join(game.path, 'scripts'));
      await fs.ensureDir(path.join(game.path, 'modules'));
      await fs.ensureDir(path.join(game.path, 'assets'));
      await fs.ensureDir(path.join(game.path, 'config'));

      // Game-Config speichern
      await fs.writeJson(
        path.join(game.path, 'game.json'),
        game.config,
        { spaces: 2 }
      );

      this.games.set(gameId, game);
      logger.info(`Game registriert: ${game.name} (${gameId})`);

      return game;
    } catch (error) {
      logger.error('Fehler beim Registrieren des Games:', error);
      throw error;
    }
  }

  async unregisterGame(gameId) {
    if (this.activeGames.has(gameId)) {
      throw new Error('Aktives Game kann nicht deregistriert werden');
    }

    const game = this.games.get(gameId);
    if (game) {
      await fs.remove(game.path);
      this.games.delete(gameId);
      logger.info(`Game deregistriert: ${game.name} (${gameId})`);
      return true;
    }
    return false;
  }

  getGame(gameId) {
    return this.games.get(gameId);
  }

  getAllGames() {
    return Array.from(this.games.values());
  }

  async startGame(gameId, options = {}) {
    try {
      const game = this.games.get(gameId);
      if (!game) {
        throw new Error(`Game nicht gefunden: ${gameId}`);
      }

      if (this.activeGames.has(gameId)) {
        throw new Error(`Game bereits aktiv: ${gameId}`);
      }

      // Game-Instanz erstellen
      const instance = new GameInstance(game, options);
      await instance.initialize();

      this.gameInstances.set(gameId, instance);
      this.activeGames.add(gameId);

      logger.info(`Game gestartet: ${game.name} (${gameId})`);
      return instance;
    } catch (error) {
      logger.error(`Fehler beim Starten des Games ${gameId}:`, error);
      throw error;
    }
  }

  async stopGame(gameId) {
    const instance = this.gameInstances.get(gameId);
    if (instance) {
      await instance.shutdown();
      this.gameInstances.delete(gameId);
      this.activeGames.delete(gameId);

      const game = this.games.get(gameId);
      logger.info(`Game gestoppt: ${game.name} (${gameId})`);
      return true;
    }
    return false;
  }

  getGameInstance(gameId) {
    return this.gameInstances.get(gameId);
  }

  getActiveGames() {
    return Array.from(this.activeGames).map(id => this.games.get(id));
  }

  isGameActive(gameId) {
    return this.activeGames.has(gameId);
  }
}

class GameInstance {
  constructor(game, options = {}) {
    this.game = game;
    this.instanceId = uuidv4();
    this.options = options;
    this.status = 'starting';
    this.startTime = null;
    this.players = new Map();
    this.stats = {
      sessions: 0,
      totalPlaytime: 0,
      peakPlayers: 0
    };
  }

  async initialize() {
    try {
      this.status = 'initializing';

      // Game-Logik laden
      await this.loadGameLogic();

      // Assets laden
      await this.loadAssets();

      // Dependencies laden
      await this.loadDependencies();

      // Event-Handler registrieren
      this.setupEventHandlers();

      this.status = 'running';
      this.startTime = new Date();

      logger.info(`Game-Instanz initialisiert: ${this.game.name} (${this.instanceId})`);
    } catch (error) {
      this.status = 'error';
      logger.error(`Fehler bei Game-Initialisierung:`, error);
      throw error;
    }
  }

  async loadGameLogic() {
    const mainScriptPath = path.join(this.game.path, 'scripts', 'main.lua');
    if (await fs.pathExists(mainScriptPath)) {
      this.mainScript = await fs.readFile(mainScriptPath, 'utf8');
      logger.debug(`Game-Logik geladen: ${this.game.name}`);
    } else {
      throw new Error(`Hauptskript nicht gefunden: ${mainScriptPath}`);
    }
  }

  async loadAssets() {
    const assetsPath = path.join(this.game.path, 'assets');
    if (await fs.pathExists(assetsPath)) {
      const assets = await fs.readdir(assetsPath);
      for (const asset of assets) {
        this.game.assets[asset] = path.join(assetsPath, asset);
      }
      logger.debug(`${Object.keys(this.game.assets).length} Assets geladen für ${this.game.name}`);
    }
  }

  async loadDependencies() {
    // Hier würden Plugin-Dependencies geladen werden
    logger.debug(`Dependencies geladen für ${this.game.name}`);
  }

  setupEventHandlers() {
    // Game-spezifische Event-Handler
    this.game.onPlayerJoin = (player) => {
      this.players.set(player.id, player);
      this.stats.peakPlayers = Math.max(this.stats.peakPlayers, this.players.size);
    };

    this.game.onPlayerLeave = (playerId) => {
      this.players.delete(playerId);
    };
  }

  async shutdown() {
    this.status = 'stopping';

    // Alle Spieler benachrichtigen
    for (const [playerId, player] of this.players) {
      player.socket.emit('game_shutdown', { reason: 'Server restart' });
    }

    this.status = 'stopped';
    logger.info(`Game-Instanz gestoppt: ${this.game.name} (${this.instanceId})`);
  }

  getStatus() {
    return {
      instanceId: this.instanceId,
      gameId: this.game.id,
      gameName: this.game.name,
      status: this.status,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      players: this.players.size,
      maxPlayers: this.game.config.maxPlayers || config.maxPlayersPerGame,
      stats: this.stats
    };
  }
}

// Global Game Registry
const gameRegistry = new GameRegistry();

// =============================================================================
// REST API ROUTES
// =============================================================================

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'game-manager',
    version: '1.0.0',
    uptime: process.uptime(),
    activeGames: gameRegistry.getActiveGames().length,
    totalGames: gameRegistry.getAllGames().length,
    timestamp: new Date().toISOString()
  });
});

// Game Management Routes

// Alle Games auflisten
router.get('/games', (req, res) => {
  const games = gameRegistry.getAllGames().map(game => ({
    ...game,
    isActive: gameRegistry.isGameActive(game.id)
  }));
  res.json({ games, count: games.length });
});

// Einzelnes Game abrufen
router.get('/games/:gameId', (req, res) => {
  const game = gameRegistry.getGame(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game nicht gefunden' });
  }

  res.json({
    game,
    isActive: gameRegistry.isGameActive(req.params.gameId),
    instance: gameRegistry.getGameInstance(req.params.gameId)?.getStatus()
  });
});

// Neues Game registrieren
router.post('/games', async (req, res) => {
  try {
    const gameConfig = req.body;
    const game = await gameRegistry.registerGame(gameConfig);

    res.status(201).json({
      message: 'Game erfolgreich registriert',
      game
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Game starten
router.post('/games/:gameId/start', async (req, res) => {
  try {
    const instance = await gameRegistry.startGame(req.params.gameId, req.body);

    res.json({
      message: 'Game erfolgreich gestartet',
      instanceId: instance.instanceId,
      status: instance.getStatus()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Game stoppen
router.post('/games/:gameId/stop', async (req, res) => {
  try {
    await gameRegistry.stopGame(req.params.gameId);

    res.json({
      message: 'Game erfolgreich gestoppt'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Game löschen
router.delete('/games/:gameId', async (req, res) => {
  try {
    await gameRegistry.unregisterGame(req.params.gameId);

    res.json({
      message: 'Game erfolgreich gelöscht'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Aktive Games
router.get('/instances', (req, res) => {
  const instances = gameRegistry.getActiveGames().map(game => ({
    ...gameRegistry.getGameInstance(game.id).getStatus(),
    game
  }));

  res.json({ instances, count: instances.length });
});

// Game-Statistiken
router.get('/games/:gameId/stats', (req, res) => {
  const instance = gameRegistry.getGameInstance(req.params.gameId);
  if (!instance) {
    return res.status(404).json({ error: 'Game-Instanz nicht gefunden' });
  }

  res.json({
    gameId: req.params.gameId,
    stats: instance.stats,
    uptime: instance.startTime ? Date.now() - instance.startTime.getTime() : 0
  });
});

// API Routes registrieren
app.use('/api', router);

// Root Route
app.get('/', (req, res) => {
  res.json({
    name: 'Roblox Game Manager',
    version: '1.0.0',
    status: 'online',
    endpoints: {
      games: '/api/games',
      instances: '/api/instances',
      health: '/api/health'
    },
    stats: {
      totalGames: gameRegistry.getAllGames().length,
      activeGames: gameRegistry.getActiveGames().length
    }
  });
});

// =============================================================================
// SOCKET.IO EVENT HANDLERS
// =============================================================================

io.on('connection', (socket) => {
  logger.info(`Game Manager Client verbunden: ${socket.id}`);

  // Client-Funktionen
  socket.on('discover_games', () => {
    const games = gameRegistry.getAllGames();
    socket.emit('games_list', { games });
  });

  socket.on('start_game', async (data) => {
    try {
      const { gameId, options } = data;
      const instance = await gameRegistry.startGame(gameId, options);
      socket.emit('game_started', {
        gameId,
        instanceId: instance.instanceId,
        status: instance.getStatus()
      });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('stop_game', async (data) => {
    try {
      const { gameId } = data;
      await gameRegistry.stopGame(gameId);
      socket.emit('game_stopped', { gameId });
    } catch (error) {
      socket.emit('error', { message: error.message });
    }
  });

  socket.on('get_game_status', (data) => {
    const { gameId } = data;
    const instance = gameRegistry.getGameInstance(gameId);

    if (instance) {
      socket.emit('game_status', instance.getStatus());
    } else {
      socket.emit('error', { message: 'Game nicht aktiv' });
    }
  });

  socket.on('disconnect', () => {
    logger.info(`Game Manager Client getrennt: ${socket.id}`);
  });
});

// =============================================================================
// CRON JOBS
// =============================================================================

// Regelmäßige Game-Statistiken
cron.schedule('*/5 * * * *', () => {
  const activeGames = gameRegistry.getActiveGames();
  logger.info(`Game Manager Status: ${activeGames.length} aktive Games`);
});

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

process.on('SIGTERM', async () => {
  logger.info('Game Manager SIGTERM empfangen, fahre herunter...');

  // Alle aktiven Games stoppen
  for (const gameId of Array.from(gameRegistry.activeGames)) {
    await gameRegistry.stopGame(gameId);
  }

  server.close(() => {
    logger.info('Game Manager heruntergefahren');
    process.exit(0);
  });
});

// =============================================================================
// SERVER START
// =============================================================================

server.listen(config.port, async () => {
  logger.info(`Game Manager läuft auf Port ${config.port}`);
  logger.info(`Games Directory: ${config.gamesDirectory}`);
  logger.info(`Max Games: ${config.maxGames}`);

  // Games Directory initialisieren
  await fs.ensureDir(config.gamesDirectory);
  await fs.ensureDir(config.pluginsDirectory);
  await fs.ensureDir(config.assetsDirectory);
  await fs.ensureDir(config.uploadsDirectory);

  // Verfügbare Games laden
  await loadAvailableGames();
});

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

async function loadAvailableGames() {
  try {
    const gamesPath = config.gamesDirectory;
    const gameIds = await fs.readdir(gamesPath);

    for (const gameId of gameIds) {
      const gamePath = path.join(gamesPath, gameId);
      const stats = await fs.stat(gamePath);

      if (stats.isDirectory()) {
        const gameConfigPath = path.join(gamePath, 'game.json');

        if (await fs.pathExists(gameConfigPath)) {
          try {
            const gameConfig = await fs.readJson(gameConfigPath);
            gameConfig.id = gameId;
            await gameRegistry.registerGame(gameConfig);
            logger.debug(`Game geladen: ${gameConfig.name}`);
          } catch (error) {
            logger.error(`Fehler beim Laden des Games ${gameId}:`, error);
          }
        }
      }
    }

    logger.info(`${gameRegistry.getAllGames().length} Games geladen`);
  } catch (error) {
    logger.error('Fehler beim Laden der Games:', error);
  }
}

// Fehlerbehandlung
process.on('uncaughtException', (error) => {
  logger.error('Game Manager Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Game Manager Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server, io, gameRegistry, config, logger };