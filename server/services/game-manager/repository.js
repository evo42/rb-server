/**
 * Game Repository und Plugin System
 * Verwaltung von Game-Paketen, Plugins und Erweiterungen
 */

const express = require('express');
const archiver = require('archiver');
const unzipper = require('unzipper');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const semver = require('semver');
const axios = require('axios');
const crypto = require('crypto');

class GameRepository {
  constructor(config) {
    this.config = config;
    this.repositoryPath = path.join(__dirname, '../..', 'repository');
    this.packagesPath = path.join(this.repositoryPath, 'packages');
    this.pluginsPath = path.join(this.repositoryPath, 'plugins');
    this.uploadsPath = path.join(this.repositoryPath, 'uploads');

    this.packageRegistry = new Map();
    this.pluginRegistry = new Map();
    this.downloadStats = new Map();
    this.ratings = new Map();

    this.initializePaths();
  }

  async initializePaths() {
    await fs.ensureDir(this.packagesPath);
    await fs.ensureDir(this.pluginsPath);
    await fs.ensureDir(this.uploadsPath);
    await fs.ensureDir(path.join(this.repositoryPath, 'temp'));
  }

  // Package Management
  async createPackage(gameData, metadata = {}) {
    try {
      const packageId = metadata.id || uuidv4();
      const version = metadata.version || '1.0.0';
      const packageDir = path.join(this.packagesPath, packageId, version);

      await fs.ensureDir(packageDir);

      // Package-Struktur erstellen
      const packageInfo = {
        id: packageId,
        name: gameData.name,
        version: version,
        description: gameData.description || '',
        author: gameData.author || 'Unknown',
        category: gameData.category || 'Game',
        tags: gameData.tags || [],
        license: metadata.license || 'MIT',
        dependencies: gameData.dependencies || {},
        devDependencies: gameData.devDependencies || {},
        engines: gameData.engines || { node: '>=16.0.0' },
        scripts: gameData.scripts || {},
        files: gameData.files || [],
        repository: gameData.repository || {},
        keywords: gameData.keywords || [],
        publishDate: new Date().toISOString(),
        lastUpdate: new Date().toISOString(),
        downloadCount: 0,
        rating: 0,
        ratingCount: 0,
        verified: false,
        status: 'draft'
      };

      // Game-Dateien kopieren
      const gameSourcePath = path.join(this.config.gamesDirectory, gameData.id);
      const gameTargetPath = path.join(packageDir, 'game');

      if (await fs.pathExists(gameSourcePath)) {
        await fs.copy(gameSourcePath, gameTargetPath);
      }

      // Package.json erstellen
      await fs.writeJson(
        path.join(packageDir, 'package.json'),
        packageInfo,
        { spaces: 2 }
      );

      // README erstellen
      if (gameData.readme) {
        await fs.writeFile(
          path.join(packageDir, 'README.md'),
          gameData.readme
        );
      }

      // CHANGELOG erstellen
      await fs.writeFile(
        path.join(packageDir, 'CHANGELOG.md'),
        this.generateChangelog(gameData.version, gameData.changelog || [])
      );

      // Manifest erstellen
      const manifest = {
        id: packageId,
        version: version,
        signature: await this.generateSignature(packageDir),
        checksum: await this.generateChecksum(packageDir),
        size: await this.getDirectorySize(packageDir)
      };

      await fs.writeJson(
        path.join(packageDir, 'manifest.json'),
        manifest,
        { spaces: 2 }
      );

      // Package registrieren
      this.packageRegistry.set(packageId, {
        ...packageInfo,
        path: packageDir,
        manifest
      });

      // ZIP-Archiv erstellen
      await this.createPackageArchive(packageId, version);

      return packageInfo;
    } catch (error) {
      throw new Error(`Fehler beim Erstellen des Packages: ${error.message}`);
    }
  }

  async publishPackage(packageId, version = null) {
    const packageInfo = this.packageRegistry.get(packageId);
    if (!packageInfo) {
      throw new Error(`Package nicht gefunden: ${packageId}`);
    }

    packageInfo.status = 'published';
    packageInfo.lastUpdate = new Date().toISOString();

    if (version) {
      packageInfo.version = version;
    }

    // Package-Info aktualisieren
    await fs.writeJson(
      path.join(packageInfo.path, 'package.json'),
      packageInfo,
      { spaces: 2 }
    );

    logger.info(`Package veröffentlicht: ${packageInfo.name} v${packageInfo.version}`);
    return packageInfo;
  }

  async installPackage(packageId, targetPath) {
    try {
      const packageInfo = this.packageRegistry.get(packageId);
      if (!packageInfo || packageInfo.status !== 'published') {
        throw new Error(`Package nicht verfügbar: ${packageId}`);
      }

      const archivePath = this.getPackageArchivePath(packageId, packageInfo.version);

      // Package entpacken
      await fs.ensureDir(targetPath);
      await fs.createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: targetPath }))
        .promise();

      // Dependencies installieren
      await this.installDependencies(targetPath, packageInfo.dependencies);

      // Download-Counter erhöhen
      packageInfo.downloadCount++;
      this.downloadStats.set(packageId, (this.downloadStats.get(packageId) || 0) + 1);

      return {
        success: true,
        path: targetPath,
        package: packageInfo
      };
    } catch (error) {
      throw new Error(`Fehler beim Installieren des Packages: ${error.message}`);
    }
  }

  // Plugin Management
  async createPlugin(pluginData) {
    try {
      const pluginId = pluginData.id || uuidv4();
      const version = pluginData.version || '1.0.0';
      const pluginDir = path.join(this.pluginsPath, pluginId, version);

      await fs.ensureDir(pluginDir);

      const pluginInfo = {
        id: pluginId,
        name: pluginData.name,
        version: version,
        description: pluginData.description || '',
        author: pluginData.author || 'Unknown',
        type: pluginData.type || 'gameplay', // gameplay, ui, utility, etc.
        compatibility: pluginData.compatibility || ['1.0.0'],
        permissions: pluginData.permissions || [],
        configuration: pluginData.configuration || {},
        files: pluginData.files || [],
        publishDate: new Date().toISOString(),
        status: 'draft',
        verified: false
      };

      // Plugin-Dateien kopieren
      const pluginSourcePath = path.join(this.config.pluginsDirectory, pluginData.id);
      const pluginTargetPath = path.join(pluginDir, 'plugin');

      if (await fs.pathExists(pluginSourcePath)) {
        await fs.copy(pluginSourcePath, pluginTargetPath);
      }

      // Plugin-Manifest erstellen
      const manifest = {
        id: pluginId,
        version: version,
        signature: await this.generateSignature(pluginDir),
        checksum: await this.generateChecksum(pluginDir)
      };

      await fs.writeJson(
        path.join(pluginDir, 'manifest.json'),
        manifest,
        { spaces: 2 }
      );

      // Plugin registrieren
      this.pluginRegistry.set(pluginId, {
        ...pluginInfo,
        path: pluginDir,
        manifest
      });

      return pluginInfo;
    } catch (error) {
      throw new Error(`Fehler beim Erstellen des Plugins: ${error.message}`);
    }
  }

  async enablePlugin(pluginId, gameId) {
    const plugin = this.pluginRegistry.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin nicht gefunden: ${pluginId}`);
    }

    const gamePath = path.join(this.config.gamesDirectory, gameId);
    const pluginTargetPath = path.join(gamePath, 'plugins', pluginId);

    // Plugin zu Game hinzufügen
    await fs.ensureDir(pluginTargetPath);
    await fs.copy(path.join(plugin.path, 'plugin'), pluginTargetPath);

    // Plugin-Config zu Game hinzufügen
    const gameConfigPath = path.join(gamePath, 'game.json');
    let gameConfig = await fs.readJson(gameConfigPath);

    gameConfig.plugins = gameConfig.plugins || [];
    gameConfig.plugins.push({
      id: pluginId,
      version: plugin.version,
      enabled: true,
      config: plugin.configuration
    });

    await fs.writeJson(gameConfigPath, gameConfig, { spaces: 2 });

    return plugin;
  }

  // Repository API
  searchPackages(query = '', filters = {}) {
    let packages = Array.from(this.packageRegistry.values())
      .filter(pkg => pkg.status === 'published');

    // Text-Suche
    if (query) {
      const searchTerm = query.toLowerCase();
      packages = packages.filter(pkg =>
        pkg.name.toLowerCase().includes(searchTerm) ||
        pkg.description.toLowerCase().includes(searchTerm) ||
        pkg.author.toLowerCase().includes(searchTerm) ||
        pkg.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Filter anwenden
    if (filters.category) {
      packages = packages.filter(pkg => pkg.category === filters.category);
    }

    if (filters.author) {
      packages = packages.filter(pkg =>
        pkg.author.toLowerCase().includes(filters.author.toLowerCase())
      );
    }

    if (filters.version) {
      packages = packages.filter(pkg => semver.satisfies(pkg.version, filters.version));
    }

    if (filters.verified !== undefined) {
      packages = packages.filter(pkg => pkg.verified === filters.verified);
    }

    // Sortierung
    const sortBy = filters.sortBy || 'downloadCount';
    packages.sort((a, b) => {
      if (sortBy === 'downloadCount') return b.downloadCount - a.downloadCount;
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.publishDate) - new Date(a.publishDate);
      return 0;
    });

    return packages;
  }

  searchPlugins(query = '', filters = {}) {
    let plugins = Array.from(this.pluginRegistry.values())
      .filter(plugin => plugin.status === 'published');

    // Ähnliche Suchlogik wie für Packages
    if (query) {
      const searchTerm = query.toLowerCase();
      plugins = plugins.filter(plugin =>
        plugin.name.toLowerCase().includes(searchTerm) ||
        plugin.description.toLowerCase().includes(searchTerm) ||
        plugin.author.toLowerCase().includes(searchTerm)
      );
    }

    if (filters.type) {
      plugins = plugins.filter(plugin => plugin.type === filters.type);
    }

    return plugins;
  }

  // Rating System
  async ratePackage(packageId, rating, comment = '') {
    const packageInfo = this.packageRegistry.get(packageId);
    if (!packageInfo) {
      throw new Error(`Package nicht gefunden: ${packageId}`);
    }

    const ratingId = uuidv4();
    const ratingData = {
      id: ratingId,
      packageId,
      rating: Math.max(1, Math.min(5, rating)), // 1-5 Sterne
      comment,
      date: new Date().toISOString()
    };

    this.ratings.set(ratingId, ratingData);

    // Durchschnitt berechnen
    const packageRatings = Array.from(this.ratings.values())
      .filter(r => r.packageId === packageId);

    const avgRating = packageRatings.reduce((sum, r) => sum + r.rating, 0) / packageRatings.length;
    packageInfo.rating = Math.round(avgRating * 10) / 10;
    packageInfo.ratingCount = packageRatings.length;

    return ratingData;
  }

  // Utility Functions
  async createPackageArchive(packageId, version) {
    const packageInfo = this.packageRegistry.get(packageId);
    if (!packageInfo) {
      throw new Error(`Package nicht gefunden: ${packageId}`);
    }

    const archivePath = this.getPackageArchivePath(packageId, version);

    await fs.ensureDir(path.dirname(archivePath));

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        logger.info(`Package-Archiv erstellt: ${archivePath} (${archive.pointer()} bytes)`);
        resolve(archivePath);
      });

      archive.on('error', reject);
      archive.pipe(output);

      archive.directory(packageInfo.path, false);
      archive.finalize();
    });
  }

  getPackageArchivePath(packageId, version) {
    return path.join(this.packagesPath, packageId, `${version}.zip`);
  }

  async generateSignature(directory) {
    // Vereinfachte Signatur-Generierung
    const files = await fs.readdir(directory);
    const signatureData = files.join('|');
    return crypto.createHash('sha256').update(signatureData).digest('hex');
  }

  async generateChecksum(directory) {
    // Checksum für Integritätsprüfung
    const archivePath = path.join(directory, '..', `${Date.now()}.zip`);
    await this.createPackageArchive(path.basename(path.dirname(directory)), path.basename(directory));

    const buffer = await fs.readFile(archivePath);
    await fs.remove(archivePath);

    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  async getDirectorySize(directory) {
    const files = await fs.readdir(directory);
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(directory, file);
      const stats = await fs.stat(filePath);

      if (stats.isDirectory()) {
        totalSize += await this.getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  generateChangelog(version, changes) {
    const date = new Date().toISOString().split('T')[0];

    let changelog = `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n`;
    changelog += `## [${version}] - ${date}\n\n`;

    changes.forEach(change => {
      changelog += `- ${change}\n`;
    });

    changelog += `\n## Older Versions\n\nSee [CHANGELOG.md](./CHANGELOG.md) for complete history.\n`;

    return changelog;
  }

  async installDependencies(targetPath, dependencies) {
    if (Object.keys(dependencies).length === 0) return;

    // Lua Dependencies
    const luaDeps = dependencies.lua || {};
    for (const [depName, version] of Object.entries(luaDeps)) {
      // Lua-Pakete installieren (vereinfacht)
      logger.debug(`Installing Lua dependency: ${depName}@${version}`);
    }

    // Node.js Dependencies
    const nodeDeps = dependencies.npm || {};
    if (Object.keys(nodeDeps).length > 0) {
      // NPM-Pakete installieren
      const packageJsonPath = path.join(targetPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.dependencies = { ...packageJson.dependencies, ...nodeDeps };
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }
    }
  }

  // Statistics
  getRepositoryStats() {
    const packages = Array.from(this.packageRegistry.values());
    const plugins = Array.from(this.pluginRegistry.values());

    const totalDownloads = packages.reduce((sum, pkg) => sum + pkg.downloadCount, 0);
    const avgRating = packages.length > 0
      ? packages.reduce((sum, pkg) => sum + pkg.rating, 0) / packages.length
      : 0;

    return {
      packages: {
        total: packages.length,
        published: packages.filter(pkg => pkg.status === 'published').length,
        draft: packages.filter(pkg => pkg.status === 'draft').length,
        verified: packages.filter(pkg => pkg.verified).length
      },
      plugins: {
        total: plugins.length,
        published: plugins.filter(plugin => plugin.status === 'published').length
      },
      downloads: totalDownloads,
      averageRating: Math.round(avgRating * 10) / 10,
      categories: [...new Set(packages.map(pkg => pkg.category))],
      authors: [...new Set(packages.map(pkg => pkg.author))]
    };
  }
}

// Repository Router für API
function createRepositoryRoutes(repository) {
  const router = express.Router();

  // Package Management
  router.post('/packages', async (req, res) => {
    try {
      const packageInfo = await repository.createPackage(req.body.gameData, req.body.metadata);
      res.status(201).json({ package: packageInfo });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/packages/:id/publish', async (req, res) => {
    try {
      const packageInfo = await repository.publishPackage(req.params.id, req.body.version);
      res.json({ package: packageInfo });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/packages/:id/install', async (req, res) => {
    try {
      const { targetPath } = req.body;
      const result = await repository.installPackage(req.params.id, targetPath);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Package Search
  router.get('/packages', (req, res) => {
    const { query, category, author, version, verified, sortBy } = req.query;
    const filters = { category, author, version, verified: verified === 'true', sortBy };

    const packages = repository.searchPackages(query, filters);
    res.json({ packages, count: packages.length });
  });

  // Plugin Management
  router.post('/plugins', async (req, res) => {
    try {
      const pluginInfo = await repository.createPlugin(req.body);
      res.status(201).json({ plugin: pluginInfo });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/plugins/:id/enable', async (req, res) => {
    try {
      const { gameId } = req.body;
      const plugin = await repository.enablePlugin(req.params.id, gameId);
      res.json({ plugin });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Plugin Search
  router.get('/plugins', (req, res) => {
    const { query, type } = req.query;
    const filters = { type };

    const plugins = repository.searchPlugins(query, filters);
    res.json({ plugins, count: plugins.length });
  });

  // Rating System
  router.post('/packages/:id/rate', async (req, res) => {
    try {
      const { rating, comment } = req.body;
      const ratingData = await repository.ratePackage(req.params.id, rating, comment);
      res.status(201).json({ rating: ratingData });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  // Statistics
  router.get('/stats', (req, res) => {
    const stats = repository.getRepositoryStats();
    res.json(stats);
  });

  return router;
}

module.exports = { GameRepository, createRepositoryRoutes };