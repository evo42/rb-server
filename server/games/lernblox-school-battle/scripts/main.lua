-- Roblox Arena Battle - Hauptspiel-Logik
-- Multiplayer Arena Combat Game für Testing des Multi-Game-Systems

local GameConfig = require('modules.game_config')
local PlayerManager = require('modules.player_manager')
local WeaponSystem = require('modules.weapon_system')
local PowerUpSystem = require('modules.powerup_system')
local MapManager = require('modules.map_manager')
local ScoreSystem = require('modules.score_system')
local ChatSystem = require('modules.chat_system')

-- =============================================================================
-- GAME STATE MANAGEMENT
-- =============================================================================

local ArenaBattleGame = {}
ArenaBattleGame.__index = ArenaBattleGame

-- Game States
local GameStates = {
    WAITING = "waiting",
    STARTING = "starting",
    PLAYING = "playing",
    ENDING = "ending"
end

-- Teams
local Teams = {
    RED = "red",
    BLUE = "blue"
}

function ArenaBattleGame.new(gameInstance)
    local self = setmetatable({}, ArenaBattleGame)

    -- Game Configuration
    self.config = GameConfig.new()
    self.currentMap = "classic-arena"
    self.currentState = GameStates.WAITING
    self.gameStartTime = nil
    self.roundNumber = 1

    -- Game Systems
    self.playerManager = PlayerManager.new()
    self.weaponSystem = WeaponSystem.new()
    self.powerUpSystem = PowerUpSystem.new()
    self.mapManager = MapManager.new()
    self.scoreSystem = ScoreSystem.new()
    self.chatSystem = ChatSystem.new()

    -- Game Data
    self.activePlayers = {}
    self.playerStats = {}
    self.gameEvents = {}
    self.powerUpSpawns = {}

    -- Timers
    self.roundTimer = nil
    self.powerUpTimer = nil
    self.stateTimer = nil

    -- References
    self.gameInstance = gameInstance

    return self
end

-- =============================================================================
-- GAME INITIALIZATION
-- =============================================================================

function ArenaBattleGame:initialize()
    print("[ARENA BATTLE] Initialisiere Arena Battle Game...")

    -- Game-Systems initialisieren
    self.playerManager:initialize()
    self.weaponSystem:initialize()
    self.powerUpSystem:initialize()
    self.mapManager:initialize()
    self.scoreSystem:initialize()
    self.chatSystem:initialize()

    -- Map laden
    self:loadMap(self.currentMap)

    -- Event-Handler registrieren
    self:registerEventHandlers()

    -- Chat-System initialisieren
    self.chatSystem:sendSystemMessage("Willkommen bei Roblox Arena Battle!")
    self.chatSystem:sendSystemMessage("Warte auf Spieler...")

    print("[ARENA BATTLE] Spiel erfolgreich initialisiert")
    return true
end

function ArenaBattleGame:loadMap(mapName)
    print("[ARENA BATTLE] Lade Map: " .. mapName)

    -- Map-spezifische Spawn-Points laden
    local spawnPoints = self.config:getSpawnPoints(mapName)
    if spawnPoints then
        self.mapManager:setSpawnPoints(spawnPoints)
        self.chatSystem:sendSystemMessage("Map geladen: " .. mapName)
    else
        error("Spawn points for map " .. mapName .. " not found")
    end

    self.currentMap = mapName
end

function ArenaBattleGame:registerEventHandlers()
    -- Player Events
    self.gameInstance:onPlayerJoin(function(playerData)
        self:onPlayerJoined(playerData)
    end)

    self.gameInstance:onPlayerLeave(function(playerData)
        self:onPlayerLeft(playerData)
    end)

    -- Game Events
    self.gameInstance:onPlayerMove(function(playerData, position)
        self:onPlayerMoved(playerData, position)
    end)

    self.gameInstance:onPlayerAction(function(playerData, action, data)
        self:onPlayerAction(playerData, action, data)
    end)

    -- Chat Events
    self.gameInstance:onChatMessage(function(playerData, message)
        self:onChatMessage(playerData, message)
    end)
end

-- =============================================================================
-- GAME LOOP
-- =============================================================================

function ArenaBattleGame:update()
    -- Game-State Update
    self:updateGameState()

    -- Player Updates
    self:updatePlayers()

    -- System Updates
    self.powerUpSystem:update()
    self.scoreSystem:update()

    -- Round Management
    if self.currentState == GameStates.PLAYING then
        self:updateRound()
    end
end

function ArenaBattleGame:updateGameState()
    local activePlayers = self.playerManager:getActivePlayers()

    if self.currentState == GameStates.WAITING then
        -- Prüfen ob genug Spieler für Start vorhanden
        if #activePlayers >= self.config.minPlayers then
            self:startGameCountdown()
        end
    elseif self.currentState == GameStates.STARTING then
        -- Countdown läuft
        if self.stateTimer and self.stateTimer <= 0 then
            self:startRound()
        end
    elseif self.currentState == GameStates.PLAYING then
        -- Prüfen ob Runde enden soll
        self:checkRoundEnd()
    elseif self.currentState == GameStates.ENDING then
        -- Kurzzeitige Pause vor neuer Runde
        if self.stateTimer and self.stateTimer <= 0 then
            self.currentState = GameStates.WAITING
            self.chatSystem:sendSystemMessage("Warte auf Spieler...")
        end
    end
end

function ArenaBattleGame:updatePlayers()
    local activePlayers = self.playerManager:getActivePlayers()

    for _, player in ipairs(activePlayers) do
        -- Player-Status aktualisieren
        self:updatePlayerStatus(player)

        -- Weapon Status
        self.weaponSystem:updatePlayer(player)

        -- Power-up Effects
        self.powerUpSystem:updatePlayerEffects(player)
    end
end

function ArenaBattleGame:updateRound()
    -- Round Timer
    if self.roundTimer then
        self.roundTimer = self.roundTimer - 1

        -- 30 Sekunden vor Ende warnen
        if self.roundTimer <= 30 and self.roundTimer % 10 == 0 then
            self.chatSystem:broadcastMessage("Runde endet in " .. self.roundTimer .. " Sekunden!")
        end

        -- Timer abgelaufen?
        if self.roundTimer <= 0 then
            self:endRound("Zeit abgelaufen")
        end
    end

    -- Power-up Spawns
    if self.powerUpTimer then
        self.powerUpTimer = self.powerUpTimer - 1

        if self.powerUpTimer <= 0 then
            self:spawnPowerUp()
            self.powerUpTimer = math.random(20, 40) -- 20-40 Sekunden
        end
    end
end

-- =============================================================================
-- PLAYER MANAGEMENT
-- =============================================================================

function ArenaBattleGame:onPlayerJoined(playerData)
    print("[ARENA BATTLE] Spieler beigetreten: " .. playerData.username)

    -- Player zur Verwaltung hinzufügen
    self.playerManager:addPlayer(playerData)

    -- Player-Statistiken initialisieren
    self.playerStats[playerData.id] = {
        kills = 0,
        deaths = 0,
        score = 0,
        accuracy = 0,
        shotsFired = 0,
        shotsHit = 0,
        favoriteWeapon = "blaster",
        timePlayed = 0,
        powerUpsCollected = 0
    }

    -- Player spawnen
    self:spawnPlayer(playerData)

    -- Weapons zuweisen
    self.weaponSystem:assignDefaultWeapons(playerData)

    -- Welcome Message
    self.chatSystem:sendSystemMessage(playerData.username .. " ist dem Kampf beigetreten!")

    -- Player Count Update
    self:broadcastPlayerCount()

    -- Event Tracking
    self:trackEvent("player_join", {
        playerId = playerData.id,
        playerName = playerData.username,
        timestamp = os.time()
    })
end

function ArenaBattleGame:onPlayerLeft(playerData)
    print("[ARENA BATTLE] Spieler verlassen: " .. playerData.username)

    -- Player aus Verwaltung entfernen
    self.playerManager:removePlayer(playerData)

    -- Team-Escape entfernen
    self:removePlayerFromTeam(playerData)

    -- Stats finalisieren
    if self.playerStats[playerData.id] then
        self.playerStats[playerData.id].timePlayed =
            self.playerStats[playerData.id].timePlayed + (os.time() - playerData.joinedAt)
    end

    -- Leave Message
    self.chatSystem:sendSystemMessage(playerData.username .. " hat den Kampf verlassen")

    -- Player Count Update
    self:broadcastPlayerCount()

    -- Event Tracking
    self:trackEvent("player_leave", {
        playerId = playerData.id,
        playerName = playerData.username,
        timestamp = os.time(),
        reason = "disconnect"
    })
end

function ArenaBattleGame:onPlayerMoved(playerData, position)
    -- Movement Tracking für Anti-Cheat
    self.playerManager:updatePlayerPosition(playerData, position)
end

function ArenaBattleGame:onPlayerAction(playerData, action, data)
    print("[ARENA BATTLE] Player Action: " .. action)

    if action == "weapon_fire" then
        self:handleWeaponFire(playerData, data)
    elseif action == "weapon_reload" then
        self:handleWeaponReload(playerData, data)
    elseif action == "use_powerup" then
        self:handlePowerUpUse(playerData, data)
    elseif action == "jump" then
        self:handlePlayerJump(playerData)
    elseif action == "interact" then
        self:handlePlayerInteract(playerData, data)
    end
end

function ArenaBattleGame:onChatMessage(playerData, message)
    -- Chat Message verarbeiten
    local formattedMessage = {
        playerId = playerData.id,
        username = playerData.username,
        message = message,
        timestamp = os.time(),
        type = "chat"
    }

    -- System Commands
    if message:sub(1, 1) == "/" then
        self:handleCommand(playerData, message)
        return
    end

    -- Broadcast Chat Message
    self.chatSystem:broadcastMessage(formattedMessage)

    print("[CHAT] " .. playerData.username .. ": " .. message)
end

-- =============================================================================
-- GAME FLOW
-- =============================================================================

function ArenaBattleGame:startGameCountdown()
    if self.currentState ~= GameStates.WAITING then
        return
    end

    print("[ARENA BATTLE] Starte Game-Countdown")
    self.currentState = GameStates.STARTING
    self.stateTimer = 10 -- 10 Sekunden Countdown

    self.chatSystem:broadcastMessage("Runde startet in 10 Sekunden!")
    self.chatSystem:broadcastMessage("Spieler: " .. #self.playerManager:getActivePlayers() .. "/" .. self.config.maxPlayers)

    -- Countdown Timer
    spawn(function()
        for i = 9, 1, -1 do
            wait(1)
            if self.currentState == GameStates.STARTING then
                self.chatSystem:broadcastMessage(i .. "...")
            end
        end
    end)
end

function ArenaBattleGame:startRound()
    print("[ARENA BATTLE] Starte Runde " .. self.roundNumber)

    self.currentState = GameStates.PLAYING
    self.gameStartTime = os.time()
    self.roundTimer = self.config.roundTime

    -- Teams zuweisen
    self:assignTeams()

    -- Spieler respawnen
    self:respawnAllPlayers()

    -- Power-ups zurücksetzen
    self.powerUpSystem:reset()

    -- Runde beginnen
    self.chatSystem:broadcastMessage("=== RUNDE " .. self.roundNumber .. " BEGINNT! ===")
    self.chatSystem:broadcastMessage("Ziel: Erreiche " .. self.config.scoreLimit .. " Punkte!")

    -- Power-up Timer starten
    self.powerUpTimer = math.random(10, 20)

    -- Event Tracking
    self:trackEvent("round_start", {
        roundNumber = self.roundNumber,
        map = self.currentMap,
        playerCount = #self.playerManager:getActivePlayers(),
        timestamp = os.time()
    })
end

function ArenaBattleGame:endRound(reason)
    print("[ARENA BATTLE] Runde beendet: " .. reason)

    self.currentState = GameStates.ENDING

    -- Gewinner ermitteln
    local winner = self.scoreSystem:getWinner()
    local scoreboard = self.scoreSystem:getScoreboard()

    -- Runde beenden
    self.chatSystem:broadcastMessage("=== RUNDE " .. self.roundNumber .. " BEENDET ===")
    self.chatSystem:broadcastMessage("Grund: " .. reason)

    if winner then
        self.chatSystem:broadcastMessage("Gewinner: " .. winner.name .. " (" .. winner.score .. " Punkte)")
    end

    -- Scoreboard anzeigen
    self.chatSystem:broadcastMessage("=== SCOREBOARD ===")
    for i, entry in ipairs(scoreboard) do
        if i <= 10 then -- Top 10 anzeigen
            self.chatSystem:broadcastMessage(i .. ". " .. entry.name .. " - " .. entry.score .. " Punkte")
        end
    end

    -- Nächste Runde vorbereiten
    self.roundNumber = self.roundNumber + 1
    self.stateTimer = 15 -- 15 Sekunden Pause

    -- Event Tracking
    self:trackEvent("round_end", {
        roundNumber = self.roundNumber - 1,
        winner = winner and winner.id or nil,
        reason = reason,
        timestamp = os.time(),
        duration = self.gameStartTime and (os.time() - self.gameStartTime) or 0
    })
end

function ArenaBattleGame:checkRoundEnd()
    -- Score-Limit erreicht?
    local leader = self.scoreSystem:getLeader()
    if leader and leader.score >= self.config.scoreLimit then
        self:endRound("Score-Limit erreicht")
        return
    end

    -- Nicht genug Spieler?
    if #self.playerManager:getActivePlayers() < self.config.minPlayers then
        self:endRound("Nicht genug Spieler")
        return
    end
end

-- =============================================================================
-- COMBAT SYSTEM
-- =============================================================================

function ArenaBattleGame:handleWeaponFire(playerData, weaponData)
    local playerStats = self.playerStats[playerData.id]
    if not playerStats then return end

    -- Stats aktualisieren
    playerStats.shotsFired = playerStats.shotsFired + 1

    -- Weapon System
    local hitResult = self.weaponSystem:fireWeapon(playerData, weaponData)

    if hitResult.hit then
        playerStats.shotsHit = playerStats.shotsHit + 1

        -- Damage berechnen
        local damage = hitResult.damage
        local victimData = hitResult.victim

        if victimData then
            -- Victim treffen
            self:damagePlayer(victimData, damage, playerData, weaponData.weaponId)

            -- Kill Detection
            if victimData.health <= 0 then
                self:handleKill(playerData, victimData, weaponData.weaponId)
            end
        end

        -- Accuracy Update
        playerStats.accuracy = (playerStats.shotsHit / playerStats.shotsFired) * 100
    end
end

function ArenaBattleGame:handleWeaponReload(playerData, weaponData)
    self.weaponSystem:reloadWeapon(playerData, weaponData.weaponId)
end

function ArenaBattleGame:handleKill(killerData, victimData, weaponId)
    print("[ARENA BATTLE] KILL: " .. killerData.username .. " -> " .. victimData.username)

    -- Killer Stats
    local killerStats = self.playerStats[killerData.id]
    if killerStats then
        killerStats.kills = killerStats.kills + 1
        killerStats.score = killerStats.score + 100
        killerStats.favoriteWeapon = weaponId
    end

    -- Victim Stats
    local victimStats = self.playerStats[victimData.id]
    if victimStats then
        victimStats.deaths = victimStats.deaths + 1
    end

    -- Score System Update
    self.scoreSystem:addScore(killerData.id, 100)

    -- Kill Feed
    self.chatSystem:broadcastMessage(killerData.username .. " eliminated " .. victimData.username .. " with " .. weaponId)

    -- Event Tracking
    self:trackEvent("kill", {
        killerId = killerData.id,
        killerName = killerData.username,
        victimId = victimData.id,
        victimName = victimData.username,
        weaponId = weaponId,
        timestamp = os.time()
    })

    -- Respawn nach Delay
    wait(self.config.respawnTime)
    self:spawnPlayer(victimData)
end

function ArenaBattleGame:damagePlayer(playerData, damage, attackerData, weaponId)
    playerData.health = playerData.health - damage

    -- Damage Event
    self:trackEvent("damage", {
        victimId = playerData.id,
        victimName = playerData.username,
        attackerId = attackerData and attackerData.id or nil,
        attackerName = attackerData and attackerData.username or nil,
        damage = damage,
        weaponId = weaponId,
        remainingHealth = playerData.health,
        timestamp = os.time()
    })

    -- Health Update an Client
    self.gameInstance:updatePlayerHealth(playerData.id, playerData.health, playerData.maxHealth)
end

-- =============================================================================
-- POWER-UP SYSTEM
-- =============================================================================

function ArenaBattleGame:handlePowerUpUse(playerData, powerUpData)
    local playerStats = self.playerStats[playerData.id]
    if not playerStats then return end

    -- Power-up anwenden
    local success = self.powerUpSystem:applyPowerUp(playerData, powerUpData.powerUpId)

    if success then
        playerStats.powerUpsCollected = playerStats.powerUpsCollected + 1

        -- Event Tracking
        self:trackEvent("powerup_pickup", {
            playerId = playerData.id,
            playerName = playerData.username,
            powerUpId = powerUpData.powerUpId,
            timestamp = os.time()
        })
    end
end

function ArenaBattleGame:spawnPowerUp()
    local powerUpType = self.powerUpSystem:getRandomPowerUpType()
    if powerUpType then
        local spawnPosition = self.mapManager:getRandomPowerUpSpawn()

        if spawnPosition then
            local powerUp = {
                id = powerUpType.id,
                type = powerUpType.name,
                position = spawnPosition,
                spawnTime = os.time(),
                duration = powerUpType.duration or 30
            }

            self.powerUpSystem:spawnPowerUp(powerUp)

            -- Notification
            self.chatSystem:broadcastMessage("Power-up spawned: " .. powerUpType.name)

            print("[ARENA BATTLE] Power-up spawned: " .. powerUpType.name .. " at " .. spawnPosition.x .. "," .. spawnPosition.z)
        end
    end
end

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

function ArenaBattleGame:spawnPlayer(playerData)
    -- Team-spezifischen Spawn-Point finden
    local team = self:getPlayerTeam(playerData)
    local spawnPoint = self.mapManager:getSpawnPoint(team)

    if spawnPoint then
        playerData.position = spawnPoint
        playerData.health = playerData.maxHealth or 100
        playerData.weapons = self.weaponSystem:getDefaultWeapons()

        -- Spawn an Client senden
        self.gameInstance:spawnPlayer(playerData.id, spawnPoint, playerData.health)

        print("[ARENA BATTLE] Player spawned: " .. playerData.username .. " at team " .. team)
    end
end

function ArenaBattleGame:respawnAllPlayers()
    local activePlayers = self.playerManager:getActivePlayers()

    for _, player in ipairs(activePlayers) do
        self:spawnPlayer(player)
    end
end

function ArenaBattleGame:assignTeams()
    local activePlayers = self.playerManager:getActivePlayers()
    local redTeam = {}
    local blueTeam = {}

    -- Teams ausbalancieren
    for i, player in ipairs(activePlayers) do
        if i % 2 == 0 then
            table.insert(redTeam, player)
            player.team = Teams.RED
        else
            table.insert(blueTeam, player)
            player.team = Teams.BLUE
        end
    end

    print("[ARENA BATTLE] Teams assigned - Red: " .. #redTeam .. ", Blue: " .. #blueTeam)
end

function ArenaBattleGame:getPlayerTeam(playerData)
    return playerData.team or Teams.RED -- Default to RED team
end

function ArenaBattleGame:removePlayerFromTeam(playerData)
    playerData.team = nil
end

function ArenaBattleGame:updatePlayerStatus(playerData)
    -- Status-Update für Diagnostics
    playerData.lastUpdate = os.time()
end

function ArenaBattleGame:broadcastPlayerCount()
    local count = #self.playerManager:getActivePlayers()
    self.chatSystem:broadcastMessage("Aktive Spieler: " .. count .. "/" .. self.config.maxPlayers)
end

function ArenaBattleGame:handleCommand(playerData, command)
    local parts = {}
    for part in command:gmatch("%S+") do
        table.insert(parts, part)
    end

    local cmd = parts[1]:sub(2) -- Entferne "/"
    local args = {select(2, unpack(parts))}

    if cmd == "weapons" then
        self:showWeapons(playerData)
    elseif cmd == "stats" then
        self:showStats(playerData)
    elseif cmd == "score" then
        self:showScore(playerData)
    elseif cmd == "help" then
        self:showHelp(playerData)
    elseif cmd == "map" then
        if args[1] then
            self:changeMap(args[1], playerData)
        else
            self.chatSystem:sendMessage(playerData.id, "Aktuelle Map: " .. self.currentMap)
        end
    end
end

function ArenaBattleGame:showWeapons(playerData)
    local weapons = self.config.weapons
    local message = "Verfügbare Waffen:\\n"

    for i, weapon in ipairs(weapons) do
        message = message .. i .. ". " .. weapon.name .. " (Damage: " .. weapon.damage .. ")\\n"
    end

    self.chatSystem:sendMessage(playerData.id, message)
end

function ArenaBattleGame:showStats(playerData)
    local stats = self.playerStats[playerData.id]
    if stats then
        local message = "Deine Statistiken:\\n"
        message = message .. "Kills: " .. stats.kills .. "\\n"
        message = message .. "Deaths: " .. stats.deaths .. "\\n"
        message = message .. "Score: " .. stats.score .. "\\n"
        message = message .. "Accuracy: " .. string.format("%.1f", stats.accuracy) .. "%\\n"
        message = message .. "K/D Ratio: " .. string.format("%.2f", stats.kills / math.max(1, stats.deaths))

        self.chatSystem:sendMessage(playerData.id, message)
    end
end

function ArenaBattleGame:showScore(playerData)
    local scoreboard = self.scoreSystem:getScoreboard()
    local message = "Scoreboard:\\n"

    for i, entry in ipairs(scoreboard) do
        if i <= 5 then -- Top 5 anzeigen
            message = message .. i .. ". " .. entry.name .. " - " .. entry.score .. "\\n"
        end
    end

    self.chatSystem:sendMessage(playerData.id, message)
end

function ArenaBattleGame:showHelp(playerData)
    local message = "Befehle:\\n"
    message = message .. "/weapons - Verfügbare Waffen\\n"
    message = message .. "/stats - Deine Statistiken\\n"
    message = message .. "/score - Scoreboard\\n"
    message = message .. "/map [name] - Map wechseln\\n"
    message = message .. "/help - Diese Hilfe"

    self.chatSystem:sendMessage(playerData.id, message)
end

function ArenaBattleGame:changeMap(mapName, requestingPlayer)
    -- Map-Validierung
    if not self.config:isValidMap(mapName) then
        self.chatSystem:sendMessage(requestingPlayer.id, "Ungültige Map: " .. mapName)
        return
    end

    -- Map wechseln
    self:loadMap(mapName)

    -- Alle Spieler respawnen
    self:respawnAllPlayers()

    self.chatSystem:broadcastMessage("Map gewechselt zu: " .. mapName)

    print("[ARENA BATTLE] Map gewechselt zu: " .. mapName .. " von " .. requestingPlayer.username)
end

function ArenaBattleGame:trackEvent(eventType, data)
    -- Event für Analytics und Debugging
    table.insert(self.gameEvents, {
        type = eventType,
        data = data,
        timestamp = os.time()
    })

    -- Max Events begrenzen (Memory Management)
    if #self.gameEvents > 1000 then
        table.remove(self.gameEvents, 1)
    end
end

-- =============================================================================
-- GAME SHUTDOWN
-- =============================================================================

function ArenaBattleGame:shutdown()
    print("[ARENA BATTLE] Shutdown eingeleitet...")

    -- Timer stoppen
    if self.roundTimer then
        self.roundTimer = nil
    end

    if self.powerUpTimer then
        self.powerUpTimer = nil
    end

    if self.stateTimer then
        self.stateTimer = nil
    end

    -- Final Statistics
    self:logFinalStatistics()

    print("[ARENA BATTLE] Shutdown abgeschlossen")
end

function ArenaBattleGame:logFinalStatistics()
    local activePlayers = self.playerManager:getActivePlayers()
    local totalPlaytime = 0
    local totalKills = 0

    for _, player in ipairs(activePlayers) do
        local stats = self.playerStats[player.id]
        if stats then
            stats.timePlayed = stats.timePlayed + (os.time() - player.joinedAt)
            totalPlaytime = totalPlaytime + stats.timePlayed
            totalKills = totalKills + stats.kills
        end
    end

    print("[ARENA BATTLE] Final Statistics:")
    print("  Players: " .. #activePlayers)
    print("  Rounds Played: " .. (self.roundNumber - 1))
    print("  Total Playtime: " .. totalPlaytime .. " seconds")
    print("  Total Kills: " .. totalKills)
    print("  Events Tracked: " .. #self.gameEvents)
end

return ArenaBattleGame