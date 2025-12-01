-- Roblox Server Haupt-Game-Logik
-- Lua-Script für Multiplayer-Gaming-Tests

local GameState = require('modules.game_state')
local PlayerManager = require('modules.player_manager')
local EventSystem = require('modules.event_system')
local ChatSystem = require('modules.chat_system')

-- Server-Konfiguration
local config = {
    gameMode = "deathmatch",
    maxPlayers = 50,
    roundTime = 300, -- 5 Minuten
    respawnTime = 5,
    mapName = "testing_ground"
}

-- Globale Game-Variablen
local gameState = GameState.new()
local playerManager = PlayerManager.new()
local eventSystem = EventSystem.new()
local chatSystem = ChatSystem.new()

-- Server-Events
local ServerScriptService = game:GetService("ServerScriptService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")

-- =============================================================================
-- GAME STATE MANAGEMENT
-- =============================================================================

local GameStates = {
    WAITING = "waiting",
    STARTING = "starting",
    PLAYING = "playing",
    ENDING = "ending"
}

local currentGameState = GameStates.WAITING
local roundStartTime = nil
local playerCount = 0

-- =============================================================================
-- PLAYER MANAGEMENT
-- =============================================================================

local function onPlayerAdded(player)
    print("[GAME] Spieler beigetreten:", player.Name)

    -- Spieler zur Verwaltung hinzufügen
    local playerData = playerManager:addPlayer(player)

    -- Spawn-Position festlegen
    local spawnLocation = game.Workspace.Spawns:GetChildren()[math.random(1, #game.Workspace.Spawns:GetChildren())]
    player.Character:SetPrimaryPartCFrame(spawnLocation.CFrame + Vector3.new(0, 5, 0))

    -- Statistiken initialisieren
    playerData.stats = {
        kills = 0,
        deaths = 0,
        score = 0,
        playtime = 0,
        level = 1
    }

    -- Willkommens-Nachricht
    chatSystem:sendSystemMessage("Willkommen " .. player.Name .. " auf dem Server!")

    -- GUI für Spieler anzeigen
    playerManager:showPlayerGUI(player)

    -- Game-State an Spieler senden
    playerManager:sendGameState(player, currentGameState)

    -- Prüfen ob das Spiel starten kann
    if playerManager:getActivePlayerCount() >= 2 and currentGameState == GameStates.WAITING then
        startGameRound()
    end
end

local function onPlayerRemoving(player)
    print("[GAME] Spieler verlässt:", player.Name)

    -- Spieler-Data entfernen
    playerManager:removePlayer(player)

    -- Prüfen ob genug Spieler für das Spiel vorhanden sind
    if playerManager:getActivePlayerCount() < 2 and currentGameState == GameStates.PLAYING then
        endGameRound("Nicht genug Spieler")
    end
end

-- =============================================================================
-- GAME LOGIC
-- =============================================================================

local function startGameRound()
    if currentGameState ~= GameStates.WAITING then
        return
    end

    print("[GAME] Starte neue Runde...")

    currentGameState = GameStates.STARTING
    roundStartTime = tick() + 3 -- 3 Sekunden Countdown

    -- Countdown an alle Spieler senden
    playerManager:broadcastMessage("Neue Runde startet in 3 Sekunden!")

    -- Countdown-Timer
    local countdownTimer = 3
    for i = countdownTimer, 1, -1 do
        wait(1)
        playerManager:broadcastMessage("Runde startet in " .. i .. "...")
    end

    -- Spiel starten
    currentGameState = GameStates.PLAYING
    roundStartTime = tick()

    playerManager:broadcastMessage("SPIEL GESTARTET!")

    -- Game-Loop starten
    spawnGameLoop()

    -- Round-Timer starten
    spawnRoundTimer()
end

local function endGameRound(reason)
    if currentGameState ~= GameStates.PLAYING then
        return
    end

    print("[GAME] Runde beendet:", reason)

    currentGameState = GameStates.ENDING

    -- Spielstatistiken berechnen
    local results = playerManager:calculateGameResults()

    -- Ergebnisse anzeigen
    playerManager:broadcastMessage("Runde beendet! Grund: " .. reason)
    playerManager:broadcastMessage("=== ENDERGEBNISSE ===")

    for i, result in ipairs(results) do
        playerManager:broadcastMessage(i .. ". " .. result.playerName .. " - Punkte: " .. result.score)
    end

    -- Belohnungen verteilen
    playerManager:distributeRewards(results)

    -- 10 Sekunden warten vor neuer Runde
    wait(10)

    currentGameState = GameStates.WAITING

    -- Prüfen ob neue Runde gestartet werden kann
    if playerManager:getActivePlayerCount() >= 2 then
        startGameRound()
    end
end

local function spawnGameLoop()
    spawn(function()
        while currentGameState == GameStates.PLAYING do
            -- Game-Update-Logic hier
            playerManager:updatePlayerStats()
            eventSystem:processEvents()

            wait(1) -- 1 Sekunde Update-Intervall
        end
    end)
end

local function spawnRoundTimer()
    spawn(function()
        while currentGameState == GameStates.PLAYING do
            local elapsed = tick() - roundStartTime
            local remaining = config.roundTime - elapsed

            if remaining <= 0 then
                endGameRound("Zeit abgelaufen")
                break
            end

            -- 30 Sekunden vor Ende Warnung
            if remaining <= 30 and math.floor(remaining) % 10 == 0 then
                playerManager:broadcastMessage("Runde endet in " .. math.floor(remaining) .. " Sekunden!")
            end

            wait(1)
        end
    end)
end

-- =============================================================================
-- COMBAT SYSTEM
-- =============================================================================

local function onPlayerDied(player, killer, cause)
    print("[COMBAT] " .. player.Name .. " ist gestorben, getötet von: " .. (killer and killer.Name or "unbekannt"))

    local playerData = playerManager:getPlayerData(player)
    if playerData then
        playerData.stats.deaths = playerData.stats.deaths + 1
    end

    if killer and killer ~= player then
        local killerData = playerManager:getPlayerData(killer)
        if killerData then
            killerData.stats.kills = killerData.stats.kills + 1
            killerData.stats.score = killerData.stats.score + 100

            -- Kill-Benachrichtigung
            playerManager:broadcastMessage(killer.Name .. " hat " .. player.Name .. " eliminiert!")
        end
    end

    -- Respawn nachDelay
    wait(config.respawnTime)

    if player.Parent == Players then
        -- Spieler respawnen
        local spawnLocation = game.Workspace.Spawns:GetChildren()[math.random(1, #game.Workspace.Spawns:GetChildren())]
        player.Character:SetPrimaryPartCFrame(spawnLocation.CFrame + Vector3.new(0, 5, 0))

        -- Gesundheit wiederherstellen
        if player.Character and player.Character:FindFirstChild("Humanoid") then
            player.Character.Humanoid.Health = player.Character.Humanoid.MaxHealth
        end
    end
end

-- =============================================================================
-- EVENT CONNECTIONS
-- =============================================================================

-- Player Events
Players.PlayerAdded:Connect(onPlayerAdded)
Players.PlayerRemoving:Connect(onPlayerRemoving)

-- Character Events
local function onCharacterAdded(player, character)
    local humanoid = character:WaitForChild("Humanoid")
    local rootPart = character:WaitForChild("HumanoidRootPart")

    -- Movement Events
    local lastPosition = rootPart.Position
    spawn(function()
        while character.Parent do
            local currentPosition = rootPart.Position
            if (currentPosition - lastPosition).Magnitude > 5 then -- 5 Studs Bewegung
                playerManager:updatePlayerPosition(player, currentPosition)
                lastPosition = currentPosition
            end
            wait(0.5)
        end
    end)

    -- Health Events
    humanoid.HealthChanged:Connect(function(health)
        if health <= 0 then
            local killer = playerManager:getLastAttacker(player)
            onPlayerDied(player, killer, "Health depleted")
        end
    end)
end

local function onPlayerSpawned(player, character)
    onCharacterAdded(player, character)
end

-- Connections für alle aktuellen und neuen Spieler
Players.PlayerAdded:Connect(function(player)
    player.CharacterAdded:Connect(function(character)
        onPlayerSpawned(player, character)
    end)
end)

for _, player in pairs(Players:GetPlayers()) do
    if player.Character then
        onPlayerSpawned(player, player.Character)
    end
end

-- =============================================================================
-- GAME INITIALIZATION
-- =============================================================================

local function initializeGame()
    print("[GAME] Initialisiere Roblox Game Server...")

    -- Map laden (falls erforderlich)
    game.Workspace.CurrentMap.Value = config.mapName

    -- Spawn-Punkte erstellen falls nicht vorhanden
    if not game.Workspace:FindFirstChild("Spawns") then
        local spawnsFolder = Instance.new("Folder")
        spawnsFolder.Name = "Spawns"
        spawnsFolder.Parent = game.Workspace

        -- Beispiel Spawn-Punkte erstellen
        for i = 1, 4 do
            local spawn = Instance.new("Part")
            spawn.Name = "Spawn" .. i
            spawn.Size = Vector3.new(4, 1, 4)
            spawn.Material = Enum.Material.Neon
            spawn.BrickColor = BrickColor.new("Bright green")
            spawn.Position = Vector3.new(i * 20 - 40, 2, 0)
            spawn.Anchored = true
            spawn.Parent = spawnsFolder
        end
    end

    -- Game-Services initialisieren
    chatSystem:initialize()
    eventSystem:initialize()

    print("[GAME] Server bereit für Spieler!")

    -- Auto-Start Timer für Tests
    spawn(function()
        wait(10) -- 10 Sekunden warten
        if playerManager:getActivePlayerCount() == 0 then
            print("[GAME] Starte Test-Runde für leeren Server...")
            playerManager:addMockPlayer("Bot1")
            playerManager:addMockPlayer("Bot2")
            startGameRound()
        end
    end)
end

-- Server starten
initializeGame()

return {
    startGameRound = startGameRound,
    endGameRound = endGameRound,
    getGameState = function() return currentGameState end,
    getPlayerManager = function() return playerManager end,
    getConfig = function() return config end
}