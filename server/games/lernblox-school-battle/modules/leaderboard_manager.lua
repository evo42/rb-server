-- Leaderboard Manager Module für LernBlox School Battle
-- Verwaltet Highscore-Tafeln in verschiedenen Kategorien

local LeaderboardManager = {}
LeaderboardManager.__index = LeaderboardManager

function LeaderboardManager.new()
    local self = setmetatable({}, LeaderboardManager)

    -- Leaderboard-Kategorien
    self.categories = {
        total_score = {
            name = "Gesamtpunktzahl",
            description = "Höchste Gesamtpunktzahl aller Zeiten",
            order = "desc" -- Höhere Scores sind besser
        },
        accuracy_rate = {
            name = "Genauigkeitsrate",
            description = "Prozent richtiger Antworten",
            order = "desc"
        },
        subject_mastery = {
            name = "Fach-Beherrschung",
            description = "Beste Punktzahl in einem einzelnen Fach",
            order = "desc"
        },
        streak_record = {
            name = "Streak-Rekord",
            description = "Längste Serie richtiger Antworten",
            order = "desc"
        }
    }

    -- Gespeicherte Daten
    self.leaderboards = {
        total_score = {},
        accuracy_rate = {},
        subject_mastery = {},
        streak_record = {}
    }

    -- Persistente Speicherung (in echter Implementierung würde das in Datenbank gespeichert)
    self.persistentData = {
        lastSaved = tick(),
        version = "2.0.0"
    }

    -- Load persisted data
    self:loadFromStorage()

    return self
end

-- Registriere einen neuen Spieler-Score
function LeaderboardManager:registerPlayerScore(playerData)
    local playerId = playerData.playerId
    local playerName = playerData.playerName

    -- Validiere Input
    if not playerId or not playerName then
        error("Player ID and name are required")
    end

    -- Erstelle Player-Record falls nicht vorhanden
    if not self.playerRecords then
        self.playerRecords = {}
    end

    if not self.playerRecords[playerId] then
        self.playerRecords[playerId] = {
            playerId = playerId,
            playerName = playerName,
            totalGames = 0,
            totalScore = 0,
            totalCorrectAnswers = 0,
            totalQuestionsAnswered = 0,
            bestScore = 0,
            bestAccuracy = 0,
            bestStreak = 0,
            favoriteSubject = nil,
            subjectScores = {},
            achievements = {},
            firstPlayed = tick(),
            lastPlayed = tick(),
            totalPlayTime = 0
        }
    end

    local record = self.playerRecords[playerId]

    -- Aktualisiere Grund-Statistiken
    record.totalGames = record.totalGames + 1
    record.totalScore = record.totalScore + (playerData.points or 0)
    record.totalCorrectAnswers = record.totalCorrectAnswers + (playerData.correctAnswers or 0)
    record.totalQuestionsAnswered = record.totalQuestionsAnswered + (playerData.questionsAnswered or 0)
    record.lastPlayed = tick()

    -- Berechne Accuracy
    local accuracy = 0
    if record.totalQuestionsAnswered > 0 then
        accuracy = (record.totalCorrectAnswers / record.totalQuestionsAnswered) * 100
    end

    -- Aktualisiere Rekorde
    if playerData.points and playerData.points > record.bestScore then
        record.bestScore = playerData.points
    end

    if accuracy > record.bestAccuracy then
        record.bestAccuracy = accuracy
    end

    if playerData.maxStreak and playerData.maxStreak > record.bestStreak then
        record.bestStreak = playerData.maxStreak
    end

    -- Tracke Fach-spezifische Scores
    if playerData.subjectScores then
        for subject, score in pairs(playerData.subjectScores) do
            if not record.subjectScores[subject] or score > record.subjectScores[subject] then
                record.subjectScores[subject] = score

                -- Aktualisiere Lieblingsfach
                if not record.favoriteSubject or score > (record.subjectScores[record.favoriteSubject] or 0) then
                    record.favoriteSubject = subject
                end
            end
        end
    end

    -- Berechne beste Fach-Beherrschung
    local bestSubjectScore = 0
    for subject, score in pairs(record.subjectScores) do
        if score > bestSubjectScore then
            bestSubjectScore = score
        end
    end

    -- Aktualisiere Leaderboards
    self:updateLeaderboards(playerId, {
        totalScore = record.totalScore,
        accuracy = accuracy,
        subjectMastery = bestSubjectScore,
        streakRecord = record.bestStreak
    })

    -- Prüfe auf Achievements
    self:checkAchievements(record)

    print("[LEADERBOARD] Registered score for " .. playerName .. " (Score: " .. (playerData.points or 0) .. ", Accuracy: " .. string.format("%.1f", accuracy) .. "%)")

    return record
end

-- Aktualisiere Leaderboards in allen Kategorien
function LeaderboardManager:updateLeaderboards(playerId, scores)
    for category, score in pairs(scores) do
        if self.leaderboards[category] then
            -- Entferne alten Eintrag falls vorhanden
            for i, entry in ipairs(self.leaderboards[category]) do
                if entry.playerId == playerId then
                    table.remove(self.leaderboards[category], i)
                    break
                end
            end

            -- Füge neuen Eintrag hinzu
            local entry = {
                playerId = playerId,
                playerName = self.playerRecords[playerId].playerName,
                score = score,
                lastUpdated = tick()
            }

            table.insert(self.leaderboards[category], entry)

            -- Sortiere nach Score (höher ist besser für alle Kategorien)
            table.sort(self.leaderboards[category], function(a, b)
                return a.score > b.score
            end)

            -- Behalte nur die Top 10
            if #self.leaderboards[category] > 10 then
                table.remove(self.leaderboards[category], 11)
            end
        end
    end
end

-- Hole Leaderboard für eine Kategorie
function LeaderboardManager:getLeaderboard(category, limit)
    if not self.leaderboards[category] then
        return nil
    end

    local leaderboard = {}
    local limitCount = limit or 10

    for i = 1, math.min(limitCount, #self.leaderboards[category]) do
        local entry = self.leaderboards[category][i]
        table.insert(leaderboard, {
            rank = i,
            playerName = entry.playerName,
            score = entry.score,
            scoreFormatted = self:formatScore(category, entry.score),
            lastUpdated = entry.lastUpdated
        })
    end

    return {
        category = category,
        categoryName = self.categories[category].name,
        description = self.categories[category].description,
        order = self.categories[category].order,
        entries = leaderboard,
        totalEntries = #self.leaderboards[category]
    }
end

-- Hole den Rang eines Spielers
function LeaderboardManager:getPlayerRank(playerId, category)
    if not self.leaderboards[category] then
        return nil
    end

    for rank, entry in ipairs(self.leaderboards[category]) do
        if entry.playerId == playerId then
            return {
                rank = rank,
                totalPlayers = #self.leaderboards[category],
                score = entry.score,
                scoreFormatted = self:formatScore(category, entry.score)
            }
        end
    end

    return nil -- Spieler nicht im Leaderboard
end

-- Hole alle Leaderboards
function LeaderboardManager:getAllLeaderboards()
    local allBoards = {}

    for category, _ in pairs(self.leaderboards) do
        allBoards[category] = self:getLeaderboard(category)
    end

    return allBoards
end

-- Hole persönliche Statistiken eines Spielers
function LeaderboardManager:getPlayerStats(playerId)
    local record = self.playerRecords and self.playerRecords[playerId]
    if not record then
        return nil
    end

    -- Berechne verschiedene Stats
    local averageScore = 0
    if record.totalGames > 0 then
        averageScore = record.totalScore / record.totalGames
    end

    local accuracy = 0
    if record.totalQuestionsAnswered > 0 then
        accuracy = (record.totalCorrectAnswers / record.totalQuestionsAnswered) * 100
    end

    -- Bestimmte beste Fach-Beherrschung
    local bestSubjectScore = 0
    local bestSubject = nil
    for subject, score in pairs(record.subjectScores) do
        if score > bestSubjectScore then
            bestSubjectScore = score
            bestSubject = subject
        end
    end

    return {
        playerName = record.playerName,
        totalGames = record.totalGames,
        totalScore = record.totalScore,
        averageScore = averageScore,
        bestScore = record.bestScore,
        accuracy = accuracy,
        bestAccuracy = record.bestAccuracy,
        bestStreak = record.bestStreak,
        favoriteSubject = record.favoriteSubject,
        bestSubject = {
            name = bestSubject,
            score = bestSubjectScore
        },
        subjectScores = record.subjectScores,
        achievements = record.achievements,
        firstPlayed = record.firstPlayed,
        lastPlayed = record.lastPlayed,
        totalPlayTime = record.totalPlayTime,
        ranks = {
            totalScore = self:getPlayerRank(playerId, "total_score"),
            accuracyRate = self:getPlayerRank(playerId, "accuracy_rate"),
            subjectMastery = self:getPlayerRank(playerId, "subject_mastery"),
            streakRecord = self:getPlayerRank(playerId, "streak_record")
        }
    }
end

-- Prüfe Achievements
function LeaderboardManager:checkAchievements(record)
    if not record.achievements then
        record.achievements = {}
    end

    local newAchievements = {}

    -- Erstes Spiel
    if record.totalGames == 1 and not record.achievements["first_game"] then
        record.achievements["first_game"] = {
            id = "first_game",
            name = "Erstes Spiel",
            description = "Willkommen bei LernBlox!",
            icon = "🎮",
            earned = tick()
        }
        table.insert(newAchievements, record.achievements["first_game"])
    end

    -- Mathe-Meister
    if (record.subjectScores.mathematics or 0) >= 1000 and not record.achievements["math_master"] then
        record.achievements["math_master"] = {
            id = "math_master",
            name = "Mathe-Meister",
            description = "1000+ Punkte in Mathematik",
            icon = "🧮",
            earned = tick()
        }
        table.insert(newAchievements, record.achievements["math_master"])
    end

    -- Sprach-Genius
    local languageScore = (record.subjectScores.english or 0) + (record.subjectScores.spanish or 0)
    if languageScore >= 800 and not record.achievements["language_genius"] then
        record.achievements["language_genius"] = {
            id = "language_genius",
            name = "Sprach-Genius",
            description = "800+ Punkte in Sprachen",
            icon = "🗣️",
            earned = tick()
        }
        table.insert(newAchievements, record.achievements["language_genius"])
    end

    -- Allrounder
    local subjectsPlayed = 0
    for subject, _ in pairs(record.subjectScores) do
        if record.subjectScores[subject] > 0 then
            subjectsPlayed = subjectsPlayed + 1
        end
    end

    if subjectsPlayed >= 4 and not record.achievements["all_rounder"] then
        record.achievements["all_rounder"] = {
            id = "all_rounder",
            name = "Allrounder",
            description = "Mindestens 4 Fächer gespielt",
            icon = "🌟",
            earned = tick()
        }
        table.insert(newAchievements, record.achievements["all_rounder"])
    end

    -- Perfektionist (wird in Quiz-System geprüft)
    -- Streak-König
    if record.bestStreak >= 5 and not record.achievements["streak_king"] then
        record.achievements["streak_king"] = {
            id = "streak_king",
            name = "Streak-König",
            description = "5+ richtige Antworten hintereinander",
            icon = "🔥",
            earned = tick()
        }
        table.insert(newAchievements, record.achievements["streak_king"])
    end

    -- Score-Meister
    if record.bestScore >= 1500 and not record.achievements["score_master"] then
        record.achievements["score_master"] = {
            id = "score_master",
            name = "Score-Meister",
            description = "1500+ Punkte in einem Spiel",
            icon = "👑",
            earned = tick()
        }
        table.insert(newAchievements, record.achievements["score_master"])
    end

    print("[LEADERBOARD] New achievements for " .. record.playerName .. ": " .. #newAchievements)

    return newAchievements
end

-- Hole Achievement-Liste
function LeaderboardManager:getAchievements(playerId)
    local record = self.playerRecords and self.playerRecords[playerId]
    if not record or not record.achievements then
        return {}
    end

    local achievements = {}
    for _, achievement in pairs(record.achievements) do
        table.insert(achievements, achievement)
    end

    -- Sortiere nach Erwerb-Datum
    table.sort(achievements, function(a, b)
        return a.earned > b.earned
    end)

    return achievements
end

-- Format Score für Anzeige
function LeaderboardManager:formatScore(category, score)
    if category == "accuracy_rate" then
        return string.format("%.1f%%", score)
    elseif category == "streak_record" then
        return tostring(score) .. " Fragen"
    else
        return tostring(score) .. " Punkte"
    end
end

-- Persistente Speicherung (Simulation)
function LeaderboardManager:saveToStorage()
    -- In echter Implementierung würde das in eine Datenbank geschrieben
    self.persistentData.lastSaved = tick()
    print("[LEADERBOARD] Data saved to storage")
end

-- Lade persistente Daten
function LeaderboardManager:loadFromStorage()
    -- In echter Implementierung würde das aus einer Datenbank geladen
    -- Für Demo-Zwecke verwenden wir Mock-Daten
    if not self.leaderboards["total_score"] or #self.leaderboards["total_score"] == 0 then
        self:addMockData()
    end
    print("[LEADERBOARD] Data loaded from storage")
end

-- Mock-Daten für Demo
function LeaderboardManager:addMockData()
    local mockPlayers = {
        { name = "Max Mustermann", scores = { totalScore = 2500, accuracy = 85.5, subjectMastery = 900, streak = 8 } },
        { name = "Anna Schmidt", scores = { totalScore = 2200, accuracy = 90.2, subjectMastery = 850, streak = 6 } },
        { name = "Tom Müller", scores = { totalScore = 1800, accuracy = 78.3, subjectMastery = 700, streak = 5 } },
        { name = "Lisa Weber", scores = { totalScore = 2100, accuracy = 88.7, subjectMastery = 800, streak = 7 } },
        { name = "Tim Schmidt", scores = { totalScore = 1600, accuracy = 75.4, subjectMastery = 650, streak = 4 } },
        { name = "Julia Meyer", scores = { totalScore = 1900, accuracy = 82.1, subjectMastery = 750, streak = 5 } },
        { name = "David Klein", scores = { totalScore = 1700, accuracy = 79.8, subjectMastery = 680, streak = 6 } },
        { name = "Sarah Bauer", scores = { totalScore = 2300, accuracy = 91.5, subjectMastery = 880, streak = 9 } },
        { name = "Lukas Weber", scores = { totalScore = 1400, accuracy = 72.3, subjectMastery = 600, streak = 3 } },
        { name = "Emma Schulz", scores = { totalScore = 2000, accuracy = 86.9, subjectMastery = 780, streak = 6 } }
    }

    for i, player in ipairs(mockPlayers) do
        local playerId = "mock_" .. i
        self.playerRecords = self.playerRecords or {}
        self.playerRecords[playerId] = {
            playerId = playerId,
            playerName = player.name,
            totalGames = math.random(5, 20),
            totalScore = player.scores.totalScore,
            bestScore = math.floor(player.scores.totalScore * 0.8),
            bestAccuracy = player.scores.accuracy,
            bestStreak = player.scores.streak,
            favoriteSubject = "mathematics",
            subjectScores = {
                mathematics = player.scores.subjectMastery,
                english = math.floor(player.scores.subjectMastery * 0.7),
                spanish = math.floor(player.scores.subjectMastery * 0.6),
                geography = math.floor(player.scores.subjectMastery * 0.8)
            },
            achievements = {},
            firstPlayed = tick() - math.random(86400, 864000), -- 1-10 Tage ago
            lastPlayed = tick() - math.random(3600, 86400) -- 1-24 Stunden ago
        }

        -- Füge zu Leaderboards hinzu
        self:updateLeaderboards(playerId, {
            totalScore = player.scores.totalScore,
            accuracy = player.scores.accuracy,
            subjectMastery = player.scores.subjectMastery,
            streakRecord = player.scores.streak
        })
    end

    print("[LEADERBOARD] Added " .. #mockPlayers .. " mock players")
end

-- Export für Analytics
function LeaderboardManager:getAnalytics()
    if not self.playerRecords then
        return nil
    end

    local totalPlayers = 0
    local totalGames = 0
    local totalScore = 0
    local totalQuestions = 0
    local totalCorrectAnswers = 0
    local bestScore = 0
    local bestAccuracy = 0
    local subjectPopularity = {}

    for _, record in pairs(self.playerRecords) do
        totalPlayers = totalPlayers + 1
        totalGames = totalGames + record.totalGames
        totalScore = totalScore + record.totalScore
        totalQuestions = totalQuestions + record.totalQuestionsAnswered
        totalCorrectAnswers = totalCorrectAnswers + record.totalCorrectAnswers

        if record.bestScore > bestScore then
            bestScore = record.bestScore
        end

        if record.bestAccuracy > bestAccuracy then
            bestAccuracy = record.bestAccuracy
        end

        -- Tracke Fach-Popularität
        for subject, _ in pairs(record.subjectScores) do
            subjectPopularity[subject] = (subjectPopularity[subject] or 0) + 1
        end
    end

    return {
        totalPlayers = totalPlayers,
        totalGames = totalGames,
        averageGamesPerPlayer = totalGames / totalPlayers,
        totalScore = totalScore,
        averageScore = totalScore / totalPlayers,
        totalQuestions = totalQuestions,
        totalCorrectAnswers = totalCorrectAnswers,
        overallAccuracy = totalQuestions > 0 and (totalCorrectAnswers / totalQuestions) * 100 or 0,
        bestScore = bestScore,
        bestAccuracy = bestAccuracy,
        subjectPopularity = subjectPopularity,
        averageQuestionsPerGame = totalGames > 0 and totalQuestions / totalGames or 0
    }
end

-- Reset alle Daten (für Testing)
function LeaderboardManager:reset()
    self.leaderboards = {
        total_score = {},
        accuracy_rate = {},
        subject_mastery = {},
        streak_record = {}
    }
    self.playerRecords = {}
    self:saveToStorage()
    print("[LEADERBOARD] All data reset")
end

return LeaderboardManager