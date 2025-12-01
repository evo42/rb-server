/**
 * Main JavaScript für Roblox Game Manager Web Interface
 * Zentraler Controller für die Benutzeroberfläche
 */

class GameManagerUI {
    constructor() {
        this.currentTab = 'dashboard';
        this.games = [];
        this.activeGames = new Map();
        this.currentGame = null;
        this.api = new GameManagerAPI();

        this.init();
    }

    async init() {
        try {
            // Event Listeners
            this.setupEventListeners();

            // Navigation Setup
            this.setupNavigation();

            // Load initial data
            await this.loadDashboardData();

            // Setup periodic updates
            this.setupPeriodicUpdates();

            console.log('Game Manager UI initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Game Manager UI:', error);
            this.showError('Fehler beim Initialisieren der Benutzeroberfläche');
        }
    }

    setupEventListeners() {
        // Navigation tabs
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tab = link.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Create Game button
        const createGameBtn = document.getElementById('createGameBtn');
        if (createGameBtn) {
            createGameBtn.addEventListener('click', () => this.showCreateGameModal());
        }

        const createGameBtn2 = document.getElementById('createGameBtn2');
        if (createGameBtn2) {
            createGameBtn2.addEventListener('click', () => this.showCreateGameModal());
        }

        // Modal event listeners
        this.setupModalEvents();

        // Search and filter listeners
        this.setupSearchListeners();
    }

    setupNavigation() {
        // Set initial active tab
        this.switchTab('dashboard');
    }

    setupModalEvents() {
        // Create Game Modal
        const createGameModal = document.getElementById('createGameModal');
        const createGameForm = document.getElementById('createGameForm');
        const createGameSubmit = document.getElementById('createGameSubmit');

        // Modal close events
        document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) this.hideModal(modal.id);
            });
        });

        // Create game form submission
        if (createGameSubmit) {
            createGameSubmit.addEventListener('click', () => this.createGame());
        }

        // Escape key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal.active').forEach(modal => {
                    this.hideModal(modal.id);
                });
            }
        });
    }

    setupSearchListeners() {
        // Game search
        const gameSearch = document.getElementById('gameSearch');
        if (gameSearch) {
            gameSearch.addEventListener('input', (e) => {
                this.filterGames(e.target.value);
            });
        }

        // Repository search
        const repoSearch = document.getElementById('repoSearch');
        if (repoSearch) {
            repoSearch.addEventListener('input', (e) => {
                this.searchRepository(e.target.value);
            });
        }
    }

    switchTab(tabName) {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });

        // Remove active class from all nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show target tab
        const targetTab = document.getElementById(tabName);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        // Set active nav link
        const activeLink = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        this.currentTab = tabName;

        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        switch (tabName) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'games':
                await this.loadGamesData();
                break;
            case 'repository':
                await this.loadRepositoryData();
                break;
            case 'plugins':
                await this.loadPluginsData();
                break;
            case 'analytics':
                await this.loadAnalyticsData();
                break;
            case 'settings':
                await this.loadSettingsData();
                break;
        }
    }

    async loadDashboardData() {
        try {
            this.showLoading(true);

            // Load games data
            const response = await this.api.getGames();
            this.games = response.games || [];

            // Update stats
            this.updateDashboardStats();

            // Load active games
            await this.loadActiveGames();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Fehler beim Laden der Dashboard-Daten');
        } finally {
            this.showLoading(false);
        }
    }

    updateDashboardStats() {
        const totalGamesEl = document.getElementById('totalGames');
        const activeGamesEl = document.getElementById('activeGames');
        const totalPlayersEl = document.getElementById('totalPlayers');
        const totalDownloadsEl = document.getElementById('totalDownloads');

        if (totalGamesEl) totalGamesEl.textContent = this.games.length;

        const activeGames = this.games.filter(game => game.isActive);
        if (activeGamesEl) activeGamesEl.textContent = activeGames.length;

        // Calculate total players across active games
        let totalPlayers = 0;
        activeGames.forEach(game => {
            totalPlayers += game.players || 0;
        });
        if (totalPlayersEl) totalPlayersEl.textContent = totalPlayers;

        // Calculate total downloads
        let totalDownloads = 0;
        this.games.forEach(game => {
            totalDownloads += game.downloadCount || 0;
        });
        if (totalDownloadsEl) totalDownloadsEl.textContent = totalDownloads;
    }

    async loadGamesData() {
        try {
            const response = await this.api.getGames();
            this.games = response.games || [];
            this.renderGamesGrid();
        } catch (error) {
            console.error('Error loading games data:', error);
            this.showError('Fehler beim Laden der Games-Daten');
        }
    }

    renderGamesGrid() {
        const gamesGrid = document.getElementById('gamesGrid');
        if (!gamesGrid) return;

        if (this.games.length === 0) {
            gamesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-dice" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3>Keine Games vorhanden</h3>
                    <p>Erstellen Sie Ihr erstes Game, um zu beginnen.</p>
                    <button class="btn btn-primary" onclick="gameManager.showCreateGameModal()">
                        <i class="fas fa-plus"></i> Neues Game erstellen
                    </button>
                </div>
            `;
            return;
        }

        gamesGrid.innerHTML = this.games.map(game => this.renderGameCard(game)).join('');

        // Add event listeners to game cards
        gamesGrid.querySelectorAll('.game-card').forEach(card => {
            const gameId = card.dataset.gameId;
            card.addEventListener('click', () => this.showGameDetail(gameId));

            // Action buttons
            const startBtn = card.querySelector('[data-action="start"]');
            if (startBtn) {
                startBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.startGame(gameId);
                });
            }

            const editBtn = card.querySelector('[data-action="edit"]');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.editGame(gameId);
                });
            }
        });
    }

    renderGameCard(game) {
        const statusBadge = game.isActive
            ? '<span class="badge badge-success">Aktiv</span>'
            : '<span class="badge badge-outline">Inaktiv</span>';

        const playersInfo = game.isActive
            ? `<span class="badge">${game.players || 0} Spieler</span>`
            : '';

        return `
            <div class="game-card" data-game-id="${game.id}">
                <div class="game-card-header">
                    <h3 class="game-card-title">${game.name}</h3>
                    <p class="game-card-description">${game.description || 'Keine Beschreibung verfügbar'}</p>
                    <div class="game-card-meta">
                        <span class="badge">${game.version}</span>
                        ${statusBadge}
                        ${playersInfo}
                    </div>
                </div>
                <div class="game-card-body">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <small style="color: var(--text-secondary);">von ${game.author}</small>
                        </div>
                        <div class="game-card-actions">
                            ${game.isActive
                                ? `<button class="btn btn-success btn-sm" data-action="stop" disabled>
                                     <i class="fas fa-stop"></i> Läuft
                                   </button>`
                                : `<button class="btn btn-success btn-sm" data-action="start">
                                     <i class="fas fa-play"></i> Starten
                                   </button>`
                            }
                            <button class="btn btn-outline btn-sm" data-action="edit">
                                <i class="fas fa-edit"></i> Bearbeiten
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadRepositoryData() {
        try {
            const response = await this.api.getRepositoryPackages();
            const packages = response.packages || [];

            this.renderRepositoryGrid(packages);
        } catch (error) {
            console.error('Error loading repository data:', error);
            this.showError('Fehler beim Laden der Repository-Daten');
        }
    }

    renderRepositoryGrid(packages) {
        const repositoryGrid = document.getElementById('repositoryGrid');
        if (!repositoryGrid) return;

        if (packages.length === 0) {
            repositoryGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-store" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 1rem;"></i>
                    <h3>Keine Packages gefunden</h3>
                    <p>Das Repository ist leer oder Ihre Suchkriterien haben keine Ergebnisse gefunden.</p>
                </div>
            `;
            return;
        }

        repositoryGrid.innerHTML = packages.map(pkg => `
            <div class="package-card">
                <div class="package-header">
                    <h3>${pkg.name}</h3>
                    <p>${pkg.description || 'Keine Beschreibung'}</p>
                </div>
                <div class="package-meta">
                    <span class="badge">${pkg.version}</span>
                    <span class="badge">${pkg.category}</span>
                    <span class="badge">${pkg.downloadCount} Downloads</span>
                </div>
                <div class="package-actions">
                    <button class="btn btn-primary btn-sm" onclick="gameManager.installPackage('${pkg.id}')">
                        <i class="fas fa-download"></i> Installieren
                    </button>
                </div>
            </div>
        `).join('');
    }

    showCreateGameModal() {
        const modal = document.getElementById('createGameModal');
        if (modal) {
            this.showModal('createGameModal');

            // Reset form
            const form = document.getElementById('createGameForm');
            if (form) form.reset();
        }
    }

    async createGame() {
        try {
            const form = document.getElementById('createGameForm');
            const formData = new FormData(form);

            const gameData = {
                name: document.getElementById('gameName').value,
                version: document.getElementById('gameVersion').value,
                description: document.getElementById('gameDescription').value,
                category: document.getElementById('gameCategory').value,
                maxPlayers: parseInt(document.getElementById('gameMaxPlayers').value),
                tags: document.getElementById('gameTags').value.split(',').map(tag => tag.trim()).filter(tag => tag)
            };

            this.showLoading(true);

            await this.api.createGame(gameData);

            this.hideModal('createGameModal');
            await this.loadGamesData();
            await this.loadDashboardData();

            this.showSuccess('Game erfolgreich erstellt!');

        } catch (error) {
            console.error('Error creating game:', error);
            this.showError('Fehler beim Erstellen des Games: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async startGame(gameId) {
        try {
            this.showLoading(true);

            await this.api.startGame(gameId);

            // Refresh games data
            await this.loadGamesData();
            await this.loadDashboardData();

            this.showSuccess('Game erfolgreich gestartet!');

        } catch (error) {
            console.error('Error starting game:', error);
            this.showError('Fehler beim Starten des Games: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadActiveGames() {
        try {
            const response = await this.api.getActiveGames();
            const activeGames = response.instances || [];

            // Update active games list
            this.updateActiveGamesList(activeGames);
            this.updateSystemStatus(activeGames);

        } catch (error) {
            console.error('Error loading active games:', error);
        }
    }

    updateActiveGamesList(instances) {
        const activeGamesList = document.getElementById('activeGamesList');
        if (!activeGamesList) return;

        if (instances.length === 0) {
            activeGamesList.innerHTML = `
                <div class="empty-state">
                    <p>Keine aktiven Games</p>
                </div>
            `;
            return;
        }

        activeGamesList.innerHTML = instances.map(instance => `
            <div class="list-item">
                <div>
                    <div class="status-indicator online"></div>
                    <strong>${instance.gameName}</strong>
                </div>
                <div style="display: flex; gap: 1rem; align-items: center;">
                    <span>${instance.players}/${instance.maxPlayers} Spieler</span>
                    <button class="btn btn-danger btn-sm" onclick="gameManager.stopGame('${instance.gameId}')">
                        <i class="fas fa-stop"></i> Stoppen
                    </button>
                </div>
            </div>
        `).join('');
    }

    updateSystemStatus(instances) {
        const systemStatus = document.getElementById('systemStatus');
        if (!systemStatus) return;

        const statusItems = [
            {
                name: 'Game Manager',
                status: 'online',
                description: 'Service läuft normal'
            },
            {
                name: 'Games Server',
                status: instances.length > 0 ? 'online' : 'offline',
                description: `${instances.length} aktive Games`
            },
            {
                name: 'Repository',
                status: 'online',
                description: 'Packages verfügbar'
            },
            {
                name: 'Database',
                status: 'online',
                description: 'PostgreSQL verbunden'
            }
        ];

        systemStatus.innerHTML = statusItems.map(item => `
            <div class="list-item">
                <div>
                    <div class="status-indicator ${item.status}"></div>
                    <strong>${item.name}</strong>
                </div>
                <div>
                    <small>${item.description}</small>
                </div>
            </div>
        `).join('');
    }

    setupPeriodicUpdates() {
        // Update dashboard every 30 seconds
        setInterval(async () => {
            if (this.currentTab === 'dashboard' || this.currentTab === 'games') {
                await this.loadActiveGames();
                if (this.currentTab === 'games') {
                    await this.loadGamesData();
                }
            }
        }, 30000);
    }

    // Utility methods
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('active');
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('active', show);
        }
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type = 'info') {
        // Simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background: ${type === 'success' ? 'var(--success)' : type === 'error' ? 'var(--danger)' : 'var(--primary)'};
            color: white;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 10000;
            max-width: 300px;
        `;
        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    filterGames(searchTerm) {
        const filteredGames = this.games.filter(game =>
            game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            game.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            game.author.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Temporarily store original games and show filtered
        const originalGames = this.games;
        this.games = filteredGames;
        this.renderGamesGrid();
        this.games = originalGames;
    }
}

// Game Manager API Client
class GameManagerAPI {
    constructor() {
        this.baseURL = '/api';
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Games API
    async getGames() {
        return this.request('/games');
    }

    async getGame(gameId) {
        return this.request(`/games/${gameId}`);
    }

    async createGame(gameData) {
        return this.request('/games', {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }

    async startGame(gameId) {
        return this.request(`/games/${gameId}/start`, {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    async stopGame(gameId) {
        return this.request(`/games/${gameId}/stop`, {
            method: 'POST',
            body: JSON.stringify({})
        });
    }

    async deleteGame(gameId) {
        return this.request(`/games/${gameId}`, {
            method: 'DELETE'
        });
    }

    async getActiveGames() {
        return this.request('/instances');
    }

    // Repository API
    async getRepositoryPackages(filters = {}) {
        const queryParams = new URLSearchParams(filters);
        return this.request(`/repository/packages?${queryParams}`);
    }

    async installPackage(packageId, targetPath) {
        return this.request(`/repository/packages/${packageId}/install`, {
            method: 'POST',
            body: JSON.stringify({ targetPath })
        });
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }
}

// Initialize the application
let gameManager;

document.addEventListener('DOMContentLoaded', () => {
    gameManager = new GameManagerUI();
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    if (gameManager) {
        gameManager.showError('Ein unerwarteter Fehler ist aufgetreten');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    if (gameManager) {
        gameManager.showError('Ein Netzwerkfehler ist aufgetreten');
    }
});