-- Game Configuration Module für Arena Battle
-- Verwaltet alle spiel-relevanten Konfigurationen

local GameConfig = {}
GameConfig.__index = GameConfig

function GameConfig.new()
    local self = setmetatable({}, GameConfig)

    -- Game-Einstellungen (können aus game.json geladen werden)
    self.maxPlayers = 20
    self.minPlayers = 2
    self.roundTime = 300 -- 5 Minuten
    self.respawnTime = 5
    self.scoreLimit = 50

    -- Weapons Configuration
    self.weapons = {
        {
            id = "blaster",
            name = "Energy Blaster",
            damage = 25,
            range = 200,
            fireRate = 1.5,
            ammoCapacity = 30,
            reloadTime = 2,
            projectileSpeed = 300,
            spread = 0.1
        },
        {
            id = "rocket_launcher",
            name = "Rocket Launcher",
            damage = 75,
            range = 300,
            fireRate = 0.5,
            ammoCapacity = 5,
            reloadTime = 4,
            projectileSpeed = 200,
            explosionRadius = 15,
            splashDamage = true
        },
        {
            id = "laser_sword",
            name = "Laser Sword",
            damage = 50,
            range = 15,
            fireRate = 2,
            ammoCapacity = 999,
            reloadTime = 0,
            melee = true
        }
    }

    -- Power-ups Configuration
    self.powerUps = {
        {
            id = "health_pack",
            name = "Health Pack",
            effect = "heal",
            value = 50,
            spawnRate = 30, -- Sekunden zwischen Spawns
            duration = 0,
            color = Color3.new(1, 0, 0) -- Rot
        },
        {
            id = "speed_boost",
            name = "Speed Boost",
            effect = "speed",
            value = 2,
            spawnRate = 20,
            duration = 10,
            color = Color3.new(0, 1, 0) -- Grün
        },
        {
            id = "damage_boost",
            name = "Damage Boost",
            effect = "damage",
            value = 1.5,
            spawnRate = 15,
            duration = 15,
            color = Color3.new(1, 1, 0) -- Gelb
        },
        {
            id = "shield",
            name = "Energy Shield",
            effect = "shield",
            value = 100,
            spawnRate = 25,
            duration = 8,
            color = Color3.new(0, 0, 1) -- Blau
        }
    }

    -- Maps Configuration
    self.maps = {
        {
            id = "classic-arena",
            name = "Classic Arena",
            size = Vector3.new(200, 100, 200),
            description = "Traditionelles Arena-Layout mit zentraler Struktur"
        },
        {
            id = "crystal-cavern",
            name = "Crystal Cavern",
            size = Vector3.new(300, 150, 300),
            description = "Kristall-Höhlen mit erhöhten Plattformen"
        },
        {
            id = "industrial-fortress",
            name = "Industrial Fortress",
            size = Vector3.new(250, 120, 250),
            description = "Industrielle Festung mit Maschinen und Rohren"
        },
        {
            id = "sky-battlefield",
            name = "Sky Battlefield",
            size = Vector3.new(400, 200, 400),
            description = "Luftkampf-Arena mit schwebenden Plattformen"
        }
    }

    -- Spawn Points für jede Map
    self.spawnPoints = {
        ["classic-arena"] = {
            {x = -50, y = 5, z = -50, team = "red"},
            {x = 50, y = 5, z = 50, team = "blue"},
            {x = -50, y = 5, z = 50, team = "red"},
            {x = 50, y = 5, z = -50, team = "blue"},
            {x = 0, y = 10, z = 0, team = "neutral"}
        },
        ["crystal-cavern"] = {
            {x = 0, y = 10, z = -80, team = "red"},
            {x = 0, y = 10, z = 80, team = "blue"},
            {x = -80, y = 15, z = 0, team = "red"},
            {x = 80, y = 15, z = 0, team = "blue"},
            {x = 0, y = 20, z = 0, team = "neutral"}
        },
        ["industrial-fortress"] = {
            {x = -60, y = 8, z = -60, team = "red"},
            {x = 60, y = 8, z = 60, team = "blue"},
            {x = -60, y = 8, z = 60, team = "red"},
            {x = 60, y = 8, z = -60, team = "blue"},
            {x = 0, y = 15, z = 0, team = "neutral"}
        },
        ["sky-battlefield"] = {
            {x = -100, y = 20, z = -100, team = "red"},
            {x = 100, y = 20, z = 100, team = "blue"},
            {x = -100, y = 20, z = 100, team = "red"},
            {x = 100, y = 20, z = -100, team = "blue"},
            {x = 0, y = 30, z = 0, team = "neutral"}
        }
    }

    -- Power-up Spawn Points
    self.powerUpSpawns = {
        ["classic-arena"] = {
            {x = -30, y = 8, z = 0},
            {x = 30, y = 8, z = 0},
            {x = 0, y = 12, z = -30},
            {x = 0, y = 12, z = 30},
            {x = 0, y = 15, z = 0}
        },
        ["crystal-cavern"] = {
            {x = -50, y = 18, z = 0},
            {x = 50, y = 18, z = 0},
            {x = 0, y = 25, z = -50},
            {x = 0, y = 25, z = 50},
            {x = 0, y = 35, z = 0}
        }
    }

    -- Game Rules
    self.rules = {
        friendlyFire = false,
        autoBalance = true,
        killReward = 100,
        assistReward = 50,
        objective = "Eliminate enemies to score points"
    }

    return self
end

-- Configuration Getters
function GameConfig:getMaxPlayers()
    return self.maxPlayers
end

function GameConfig:getMinPlayers()
    return self.minPlayers
end

function GameConfig:getRoundTime()
    return self.roundTime
end

function GameConfig:getRespawnTime()
    return self.respawnTime
end

function GameConfig:getScoreLimit()
    return self.scoreLimit
end

function GameConfig:getWeapons()
    return self.weapons
end

function GameConfig:getWeapon(weaponId)
    for _, weapon in ipairs(self.weapons) do
        if weapon.id == weaponId then
            return weapon
        end
    end
    return nil
end

function GameConfig:getPowerUps()
    return self.powerUps
end

function GameConfig:getPowerUp(powerUpId)
    for _, powerUp in ipairs(self.powerUps) do
        if powerUp.id == powerUpId then
            return powerUp
        end
    end
    return nil
end

function GameConfig:getMaps()
    return self.maps
end

function GameConfig:getMap(mapId)
    for _, map in ipairs(self.maps) do
        if map.id == mapId then
            return map
        end
    end
    return nil
end

function GameConfig:isValidMap(mapId)
    return self:getMap(mapId) ~= nil
end

function GameConfig:getSpawnPoints(mapId)
    return self.spawnPoints[mapId]
end

function GameConfig:getPowerUpSpawns(mapId)
    return self.powerUpSpawns[mapId] or {}
end

function GameConfig:getRandomPowerUpSpawn(mapId)
    local spawns = self:getPowerUpSpawns(mapId)
    if #spawns > 0 then
        local randomIndex = math.random(1, #spawns)
        return spawns[randomIndex]
    end
    return nil
end

function GameConfig:getRules()
    return self.rules
end

-- Utility Functions
function GameConfig:validateWeaponConfig(weapon)
    if not weapon.id or not weapon.name then
        return false, "Weapon must have id and name"
    end

    if not weapon.damage or weapon.damage <= 0 then
        return false, "Weapon must have positive damage"
    end

    if not weapon.range or weapon.range <= 0 then
        return false, "Weapon must have positive range"
    end

    return true
end

function GameConfig:validatePowerUpConfig(powerUp)
    if not powerUp.id or not powerUp.name then
        return false, "PowerUp must have id and name"
    end

    if not powerUp.effect then
        return false, "PowerUp must have effect type"
    end

    if not powerUp.value or powerUp.value <= 0 then
        return false, "PowerUp must have positive value"
    end

    return true
end

function GameConfig:validateMapConfig(map)
    if not map.id or not map.name then
        return false, "Map must have id and name"
    end

    if not map.size or type(map.size) ~= "userdata" then
        return false, "Map must have Vector3 size"
    end

    return true
end

-- Configuration Loading from JSON (falls später benötigt)
function GameConfig:loadFromJson(jsonData)
    -- Diese Funktion könnte erweitert werden, um
    -- Konfiguration aus einer JSON-Datei zu laden

    if jsonData.maxPlayers then
        self.maxPlayers = jsonData.maxPlayers
    end

    if jsonData.minPlayers then
        self.minPlayers = jsonData.minPlayers
    end

    if jsonData.rules then
        for key, value in pairs(jsonData.rules) do
            self.rules[key] = value
        end
    end

    -- Weitere Konfigurationsoptionen...

    print("[GAME CONFIG] Configuration loaded from JSON")
end

return GameConfig