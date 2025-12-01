-- Game State Management Module
-- Verwaltet den globalen Zustand des Spiels

local GameState = {}
GameState.__index = GameState

function GameState.new()
    local self = setmetatable({}, GameState)

    -- Game States
    self.States = {
        WAITING = "waiting",
        STARTING = "starting",
        PLAYING = "playing",
        ENDING = "ending"
    }

    -- Aktueller Zustand
    self.currentState = self.States.WAITING
    self.previousState = nil
    self.stateStartTime = tick()
    self.stateData = {}

    -- Event-Callbacks
    self.stateChangeCallbacks = {}
    self.stateUpdateCallbacks = {}

    -- Round-Informationen
    self.roundNumber = 0
    self.roundStartTime = nil
    self.roundDuration = 300 -- 5 Minuten

    return self
end

-- State-Änderung
function GameState:changeState(newState, data)
    if self.currentState == newState then
        return false
    end

    local oldState = self.currentState
    self.previousState = oldState
    self.currentState = newState
    self.stateStartTime = tick()
    self.stateData = data or {}

    -- Round-Start für Playing State
    if newState == self.States.PLAYING then
        self.roundNumber = self.roundNumber + 1
        self.roundStartTime = tick()
    end

    -- State-Change Events auslösen
    self:_triggerStateChangeCallbacks(oldState, newState, data)

    print("[GAME_STATE] State geändert: " .. oldState .. " -> " .. newState)
    return true
end

-- Aktuellen State abrufen
function GameState:getCurrentState()
    return self.currentState
end

-- State-Dauer abrufen
function GameState:getStateDuration()
    return tick() - self.stateStartTime
end

-- Prüfen ob State aktiv ist
function GameState:isState(state)
    return self.currentState == state
end

-- State-Change Callback registrieren
function GameState:onStateChange(callback)
    table.insert(self.stateChangeCallbacks, callback)
    return #self.stateChangeCallbacks
end

-- State-Update Callback registrieren
function GameState:onStateUpdate(callback)
    table.insert(self.stateUpdateCallbacks, callback)
    return #self.stateUpdateCallbacks
end

-- Private: State-Change Callbacks auslösen
function GameState:_triggerStateChangeCallbacks(oldState, newState, data)
    for _, callback in ipairs(self.stateChangeCallbacks) do
        local success, error = pcall(callback, oldState, newState, data)
        if not success then
            print("[GAME_STATE] Fehler in State-Change Callback:", error)
        end
    end
end

-- State-Information serialisieren
function GameState:getStateInfo()
    return {
        currentState = self.currentState,
        previousState = self.previousState,
        stateDuration = self:getStateDuration(),
        roundNumber = self.roundNumber,
        roundDuration = self.roundDuration,
        roundTimeLeft = self.roundStartTime and (self.roundDuration - (tick() - self.roundStartTime)) or nil,
        stateData = self.stateData
    }
end

-- Game State zurücksetzen
function GameState:reset()
    self.currentState = self.States.WAITING
    self.previousState = nil
    self.stateStartTime = tick()
    self.stateData = {}
    self.roundNumber = 0
    self.roundStartTime = nil
    print("[GAME_STATE] State zurückgesetzt")
end

return GameState