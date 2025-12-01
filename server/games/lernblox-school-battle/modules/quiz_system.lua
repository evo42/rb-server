-- Quiz System Module für LernBlox School Battle
-- Verwaltet das pädagogische Quiz-System mit Fragen aus verschiedenen Schulfächern

local QuizSystem = {}
QuizSystem.__index = QuizSystem

-- Fragen-Datenbank pro Fach
local QUESTIONS_DATABASE = {
    mathematics = {
        {
            id = "math_001",
            question = "Was ist die Quadratwurzel von 144?",
            options = {"10", "11", "12", "13"},
            correct = 3,
            difficulty = "easy",
            explanation = "Die Quadratwurzel von 144 ist 12, weil 12 × 12 = 144"
        },
        {
            id = "math_002",
            question = "Löse die Gleichung: 2x + 5 = 13",
            options = {"x = 3", "x = 4", "x = 5", "x = 6"},
            correct = 2,
            difficulty = "medium",
            explanation = "2x + 5 = 13 → 2x = 8 → x = 4"
        },
        {
            id = "math_003",
            question = "Wie berechnet man den Flächeninhalt eines Kreises?",
            options = {"π × r²", "2 × π × r", "π × d", "r × r"},
            correct = 1,
            difficulty = "easy",
            explanation = "Die Fläche eines Kreises berechnet sich mit π × r²"
        },
        {
            id = "math_004",
            question = "Was ist der Wert von 3² + 4²?",
            options = {"7", "12", "25", "49"},
            correct = 3,
            difficulty = "easy",
            explanation = "3² + 4² = 9 + 16 = 25"
        },
        {
            id = "math_005",
            question = "Wie viele Grad hat ein rechtwinkliges Dreieck?",
            options = {"90°", "180°", "270°", "360°"},
            correct = 1,
            difficulty = "easy",
            explanation = "Ein rechtwinkliges Dreieck hat einen 90° Winkel"
        }
    },

    english = {
        {
            id = "eng_001",
            question = "Which sentence is grammatically correct?",
            options = {"He don't like coffee", "He doesn't like coffee", "He didn't liked coffee", "He not like coffee"},
            correct = 2,
            difficulty = "easy",
            explanation = "He doesn't like coffee - correct 3rd person singular form"
        },
        {
            id = "eng_002",
            question = "What does the word 'ubiquitous' mean?",
            options = {"Very rare", "Present everywhere", "Extremely large", "Very small"},
            correct = 2,
            difficulty = "hard",
            explanation = "Ubiquitous means present, appearing, or found everywhere"
        },
        {
            id = "eng_003",
            question = "Choose the correct verb tense: 'I _____ to Berlin last year.'",
            options = {"go", "went", "going", "will go"},
            correct = 2,
            difficulty = "medium",
            explanation = "Last year indicates past tense, so 'went' is correct"
        },
        {
            id = "eng_004",
            question = "What is the plural of 'child'?",
            options = {"childs", "children", "childes", "child"},
            correct = 2,
            difficulty = "easy",
            explanation = "Children is the irregular plural form of child"
        },
        {
            id = "eng_005",
            question = "Which word is a synonym for 'happy'?",
            options = {"sad", "angry", "joyful", "tired"},
            correct = 3,
            difficulty = "easy",
            explanation = "Joyful is a synonym for happy"
        }
    },

    spanish = {
        {
            id = "spa_001",
            question = "¿Cómo se dice 'I go to school' en español?",
            options = {"Yo voy a la escuela", "Yo voy a la casa", "Yo estudio mucho", "Yo soy estudiante"},
            correct = 1,
            difficulty = "easy",
            explanation = "'Yo voy a la escuela' means 'I go to school'"
        },
        {
            id = "spa_002",
            question = "¿Cuál es la forma femenina de 'estudiante'?",
            options = {"estudiante", "estudiantes", "estudianta", "estudiado"},
            correct = 1,
            difficulty = "medium",
            explanation = "'Estudiante' es el mismo para masculino y femenino"
        },
        {
            id = "spa_003",
            question = "¿En qué país se habla principalmente español?",
            options = {"Francia", "Brasil", "Argentina", "Alemania"},
            correct = 3,
            difficulty = "easy",
            explanation = "Argentina es un país hispanohablante"
        },
        {
            id = "spa_004",
            question = "¿Cómo se dice 'thank you' en español?",
            options = {"Hola", "Adiós", "Gracias", "Por favor"},
            correct = 3,
            difficulty = "easy",
            explanation = "'Gracias' es la forma de decir 'thank you'"
        },
        {
            id = "spa_005",
            question = "¿Cuál es el color del sol?",
            options = {"Azul", "Verde", "Amarillo", "Rojo"},
            correct = 3,
            difficulty = "easy",
            explanation = "El sol aparece amarillo desde la Tierra"
        }
    },

    geography = {
        {
            id = "geo_001",
            question = "Was ist die Hauptstadt von Australien?",
            options = {"Sydney", "Melbourne", "Canberra", "Perth"},
            correct = 3,
            difficulty = "medium",
            explanation = "Canberra ist die Hauptstadt von Australien, nicht Sydney"
        },
        {
            id = "geo_002",
            question = "Welcher Berg ist der höchste in Europa?",
            options = {"Mont Blanc", "Matterhorn", "Mount Elbrus", "Grossglockner"},
            correct = 1,
            difficulty = "hard",
            explanation = "Der Mont Blanc ist der höchste Berg in Europa"
        },
        {
            id = "geo_003",
            question = "In welcher Klimazone liegt die Sahara?",
            options = {"Tropisch", "Gemäßigt", "Wüste", "Polare Zone"},
            correct = 3,
            difficulty = "easy",
            explanation = "Die Sahara liegt in der Wüsten-Klimazone"
        },
        {
            id = "geo_004",
            question = "Welcher Ozean ist der größte?",
            options = {"Atlantik", "Indik", "Arktis", "Pazifik"},
            correct = 4,
            difficulty = "easy",
            explanation = "Der Pazifische Ozean ist der größte Ozean"
        },
        {
            id = "geo_005",
            question = "In welchem Kontinent liegt Brasilien?",
            options = {"Asien", "Europa", "Afrika", "Südamerika"},
            correct = 4,
            difficulty = "easy",
            explanation = "Brasilien liegt in Südamerika"
        }
    },

    history = {
        {
            id = "his_001",
            question = "In welchem Jahr fiel die Berliner Mauer?",
            options = {"1987", "1989", "1991", "1993"},
            correct = 2,
            difficulty = "medium",
            explanation = "Die Berliner Mauer fiel im Jahr 1989"
        },
        {
            id = "his_002",
            question = "Wer war der erste Kaiser des Römischen Reiches?",
            options = {"Julius Cäsar", "Augustus", "Nero", "Trajan"},
            correct = 2,
            difficulty = "hard",
            explanation = "Augustus war der erste Kaiser des Römischen Reiches"
        },
        {
            id = "his_003",
            question = "Welche Schlacht fand 1815 statt?",
            options = {"Schlacht bei Leipzig", "Schlacht bei Waterloo", "Schlacht bei Austerlitz", "Schlacht bei Jena"},
            correct = 2,
            difficulty = "medium",
            explanation = "Die Schlacht bei Waterloo fand 1815 statt"
        },
        {
            id = "his_004",
            question = "Wer entdeckte Amerika?",
            options = {"Ferdinand Magellan", "James Cook", "Christopher Kolumbus", "Vasco da Gama"},
            correct = 3,
            difficulty = "easy",
            explanation = "Christopher Kolumbus entdeckte Amerika 1492"
        },
        {
            id = "his_005",
            question = "In welchem Jahr begann der Zweite Weltkrieg?",
            options = {"1938", "1939", "1940", "1941"},
            correct = 2,
            difficulty = "medium",
            explanation = "Der Zweite Weltkrieg begann 1939"
        }
    },

    science = {
        {
            id = "sci_001",
            question = "Was ist die chemische Formel für Wasser?",
            options = {"HO", "H2O", "H3O", "H2O2"},
            correct = 2,
            difficulty = "easy",
            explanation = "Wasser hat die chemische Formel H2O"
        },
        {
            id = "sci_002",
            question = "Wie nennt man den Wechsel von fest zu flüssig?",
            options = {"Verdampfung", "Sublimation", "Schmelzen", "Kondensation"},
            correct = 3,
            difficulty = "medium",
            explanation = "Der Übergang von fest zu flüssig heißt Schmelzen"
        },
        {
            id = "sci_003",
            question = "Welches Organ ist für die Photosynthese verantwortlich?",
            options = {"Wurzeln", "Blätter", "Stamm", "Blüten"},
            correct = 2,
            difficulty = "easy",
            explanation = "Blätter enthalten Chlorophyll für die Photosynthese"
        },
        {
            id = "sci_004",
            question = "Wie nennt man den Planeten, der am nächsten zur Sonne ist?",
            options = {"Venus", "Mars", "Merkur", "Erde"},
            correct = 3,
            difficulty = "easy",
            explanation = "Merkur ist der Planet, der am nächsten zur Sonne ist"
        },
        {
            id = "sci_005",
            question = "Was ist die Einheit für elektrischen Widerstand?",
            options = {"Ampere", "Volt", "Ohm", "Watt"},
            correct = 3,
            difficulty = "medium",
            explanation = "Ohm ist die Einheit für elektrischen Widerstand"
        }
    },

    literature = {
        {
            id = "lit_001",
            question = "Wer schrieb 'Romeo und Julia'?",
            options = {"Charles Dickens", "William Shakespeare", "Jane Austen", "Leo Tolstoi"},
            correct = 2,
            difficulty = "easy",
            explanation = "William Shakespeare schrieb 'Romeo und Julia'"
        },
        {
            id = "lit_002",
            question = "Was ist ein Haiku?",
            options = {"Ein Gedicht", "Ein Roman", "Ein Theaterstück", "Eine Kurzgeschichte"},
            correct = 1,
            difficulty = "medium",
            explanation = "Ein Haiku ist ein japanisches Gedicht mit 5-7-5 Silben"
        },
        {
            id = "lit_003",
            question = "Welches Genre gehört 'Der Herr der Ringe'?",
            options = {"Science Fiction", "Fantasy", "Krimi", "Romantik"},
            correct = 2,
            difficulty = "easy",
            explanation = "'Der Herr der Ringe' ist ein Fantasy-Roman"
        },
        {
            id = "lit_004",
            question = "Wer schrieb 'Die Verwandlung'?",
            options = {"Thomas Mann", "Franz Kafka", "Heinrich Heine", "Johann Wolfgang von Goethe"},
            correct = 2,
            difficulty = "medium",
            explanation = "Franz Kafka schrieb 'Die Verwandlung'"
        },
        {
            id = "lit_005",
            question = "Was ist die bedeutendste Figur der deutschen Romantik?",
            options = {"Johann Wolfgang von Goethe", "Friedrich Schiller", "Novalis", "Heinrich Heine"},
            correct = 3,
            difficulty = "hard",
            explanation = "Novalis gilt als bedeutendste Figur der deutschen Romantik"
        }
    },

    art = {
        {
            id = "art_001",
            question = "Wer malte die 'Mona Lisa'?",
            options = {"Leonardo da Vinci", "Michelangelo", "Raphael", "Titian"},
            correct = 1,
            difficulty = "easy",
            explanation = "Leonardo da Vinci malte die berühmte Mona Lisa"
        },
        {
            id = "art_002",
            question = "Was charakterisiert die Renaissance?",
            options = {"Dunkle Farben", "Geometrische Muster", "Return zur Antike", "Abstraktion"},
            correct = 3,
            difficulty = "medium",
            explanation = "Die Renaissance war geprägt von der Rückkehr zur Antike"
        },
        {
            id = "art_003",
            question = "Welche Farben sind Grundfarben?",
            options = {"Rot, Grün, Blau", "Rot, Gelb, Blau", "Orange, Grün, Violett", "Schwarz, Weiß, Grau"},
            correct = 2,
            difficulty = "easy",
            explanation = "Die Grundfarben sind Rot, Gelb und Blau"
        },
        {
            id = "art_004",
            question = "Wer war ein berühmter impressionistischer Maler?",
            options = {"Pablo Picasso", "Claude Monet", "Vincent van Gogh", "Paul Cézanne"},
            correct = 2,
            difficulty = "medium",
            explanation = "Claude Monet war ein führender Impressionist"
        },
        {
            id = "art_005",
            question = "Was ist die berühmteste Höhle mit Höhlenmalereien?",
            options = {"Altamira", "Lascaux", "Chauvet", "Alle sind berühmt"},
            correct = 4,
            difficulty = "hard",
            explanation = "Alle genannten Höhlen sind berühmt für ihre Höhlenmalereien"
        }
    }
}

function QuizSystem.new()
    local self = setmetatable({}, QuizSystem)

    -- Quiz-Einstellungen
    self.maxQuestionsPerGame = 10
    self.maxTotalQuestions = 42
    self.pointsPerCorrectAnswer = 100
    self.pointsForWrongAnswer = 25
    self.extraGiftThreshold = 10

    -- Aktuelle Session
    self.currentSession = nil
    self.usedQuestions = {} -- Track verwendete Fragen

    -- Statistiken
    self.sessionStats = {
        questionsAnswered = 0,
        correctAnswers = 0,
        wrongAnswers = 0,
        totalPoints = 0,
        streak = 0,
        maxStreak = 0
    }

    return self
end

-- Start einer neuen Quiz-Session
function QuizSystem:startNewSession(playerId, playerName)
    self.currentSession = {
        playerId = playerId,
        playerName = playerName,
        startTime = tick(),
        questions = {},
        answeredQuestions = {},
        currentQuestionIndex = 0,
        totalQuestions = self.maxQuestionsPerGame,
        points = 0,
        perfectGame = true, -- Annahme bis zum Beweis des Gegenteils
        completed = false
    }

    -- Session-Statistiken zurücksetzen
    self.sessionStats = {
        questionsAnswered = 0,
        correctAnswers = 0,
        wrongAnswers = 0,
        totalPoints = 0,
        streak = 0,
        maxStreak = 0
    }

    print("[QUIZ SYSTEM] New session started for " .. playerName .. " (ID: " .. playerId .. ")")
    return true
end

-- Generiere zufällige Fragen für die Session
function QuizSystem:generateQuestions()
    if not self.currentSession then
        error("No active session")
    end

    local allQuestions = {}
    local subjectPool = {}

    -- Sammle alle Fragen aus allen Fächern
    for subject, questions in pairs(QUESTIONS_DATABASE) do
        for _, question in ipairs(questions) do
            table.insert(allQuestions, {
                subject = subject,
                data = question
            })
        end
        table.insert(subjectPool, subject)
    end

    -- Mische die Fragen
    local shuffledQuestions = self:shuffleArray(allQuestions)

    -- Wähle die ersten 10 Fragen aus
    local selectedQuestions = {}
    for i = 1, math.min(self.maxQuestionsPerGame, #shuffledQuestions) do
        table.insert(selectedQuestions, shuffledQuestions[i])
    end

    self.currentSession.questions = selectedQuestions
    self.currentSession.currentQuestionIndex = 0

    print("[QUIZ SYSTEM] Generated " .. #selectedQuestions .. " questions for " .. self.currentSession.playerName)
    return selectedQuestions
end

-- Hole die nächste Frage
function QuizSystem:getNextQuestion()
    if not self.currentSession or self.currentSession.completed then
        return nil
    end

    self.currentSession.currentQuestionIndex = self.currentSession.currentQuestionIndex + 1

    if self.currentSession.currentQuestionIndex <= #self.currentSession.questions then
        local questionData = self.currentSession.questions[self.currentSession.currentQuestionIndex]
        return {
            id = questionData.data.id,
            question = questionData.data.question,
            options = questionData.data.options,
            subject = questionData.subject,
            difficulty = questionData.data.difficulty,
            questionNumber = self.currentSession.currentQuestionIndex,
            totalQuestions = #self.currentSession.questions,
            timeLimit = 30 -- 30 Sekunden pro Frage
        }
    end

    return nil
end

-- Beantworte eine Frage
function QuizSystem:answerQuestion(questionId, selectedOption)
    if not self.currentSession then
        return { success = false, error = "No active session" }
    end

    -- Finde die Frage in der aktuellen Session
    local currentQuestion = self.currentSession.questions[self.currentSession.currentQuestionIndex]
    if not currentQuestion or currentQuestion.data.id ~= questionId then
        return { success = false, error = "Invalid question" }
    end

    -- Prüfe ob die Frage schon beantwortet wurde
    for _, answeredId in ipairs(self.currentSession.answeredQuestions) do
        if answeredId == questionId then
            return { success = false, error = "Question already answered" }
        end
    end

    local questionData = currentQuestion.data
    local isCorrect = (selectedOption == questionData.correct)

    -- Berechne Punkte
    local pointsEarned = 0
    if isCorrect then
        pointsEarned = self.pointsPerCorrectAnswer
        self.sessionStats.correctAnswers = self.sessionStats.correctAnswers + 1
        self.sessionStats.streak = self.sessionStats.streak + 1
        self.sessionStats.maxStreak = math.max(self.sessionStats.maxStreak, self.sessionStats.streak)
    else
        pointsEarned = self.pointsForWrongAnswer
        self.sessionStats.wrongAnswers = self.sessionStats.wrongAnswers + 1
        self.sessionStats.streak = 0
        self.currentSession.perfectGame = false -- Kein perfektes Spiel mehr möglich
    end

    -- Aktualisiere Session-Daten
    self.currentSession.points = self.currentSession.points + pointsEarned
    self.sessionStats.totalPoints = self.sessionStats.totalPoints + pointsEarned
    self.sessionStats.questionsAnswered = self.sessionStats.questionsAnswered + 1
    table.insert(self.currentSession.answeredQuestions, questionId)

    -- Prüfe ob alle Fragen beantwortet wurden
    if #self.currentSession.answeredQuestions >= self.maxQuestionsPerGame then
        self.currentSession.completed = true
        self.currentSession.endTime = tick()
    end

    return {
        success = true,
        isCorrect = isCorrect,
        pointsEarned = pointsEarned,
        totalPoints = self.currentSession.points,
        explanation = questionData.explanation,
        correctAnswer = questionData.correct,
        correctOption = questionData.options[questionData.correct],
        completed = self.currentSession.completed,
        perfectGame = self.currentSession.perfectGame,
        isLastQuestion = #self.currentSession.answeredQuestions >= self.maxQuestionsPerGame
    }
end

-- Prüfe ob ein Extra-Geschenk verdient wurde
function QuizSystem:checkExtraGift()
    if not self.currentSession then
        return false
    end

    -- Extra-Geschenk nur bei perfektem Spiel (alle 10 richtig)
    if self.currentSession.perfectGame and self.currentSession.completed then
        return {
            earned = true,
            reward = {
                type = "master_trophy",
                name = "Meister-Trophäe",
                points = 500,
                description = "Belohnung für perfektes Spiel!"
            }
        }
    end

    return { earned = false }
end

-- Hole aktuelle Session-Statistiken
function QuizSystem:getSessionStats()
    if not self.currentSession then
        return nil
    end

    local accuracy = 0
    if self.sessionStats.questionsAnswered > 0 then
        accuracy = (self.sessionStats.correctAnswers / self.sessionStats.questionsAnswered) * 100
    end

    return {
        playerName = self.currentSession.playerName,
        points = self.currentSession.points,
        questionsAnswered = self.sessionStats.questionsAnswered,
        correctAnswers = self.sessionStats.correctAnswers,
        wrongAnswers = self.sessionStats.wrongAnswers,
        accuracy = accuracy,
        streak = self.sessionStats.streak,
        maxStreak = self.sessionStats.maxStreak,
        completed = self.currentSession.completed,
        perfectGame = self.currentSession.perfectGame,
        sessionDuration = self.currentSession.endTime and (self.currentSession.endTime - self.currentSession.startTime) or (tick() - self.currentSession.startTime)
    }
end

-- Beende die aktuelle Session
function QuizSystem:endSession()
    if self.currentSession then
        print("[QUIZ SYSTEM] Session ended for " .. self.currentSession.playerName .. " with " .. self.currentSession.points .. " points")
        self.currentSession = nil
    end
end

-- Utility-Funktion: Array mischen
function QuizSystem:shuffleArray(array)
    local shuffled = {}
    for i, value in ipairs(array) do
        local randomIndex = math.random(1, #shuffled + 1)
        table.insert(shuffled, randomIndex, value)
    end
    return shuffled
end

-- Hole verfügbare Fächer
function QuizSystem:getAvailableSubjects()
    local subjects = {}
    for subject, _ in pairs(QUESTIONS_DATABASE) do
        table.insert(subjects, {
            id = subject,
            name = self:getSubjectDisplayName(subject),
            questionCount = #QUESTIONS_DATABASE[subject]
        })
    end
    return subjects
end

-- Hole Anzeige-Name für Fach
function QuizSystem:getSubjectDisplayName(subject)
    local subjectNames = {
        mathematics = "Mathematik",
        english = "Englisch",
        spanish = "Spanisch",
        geography = "Geografie",
        history = "Geschichte",
        science = "Naturwissenschaften",
        literature = "Literatur",
        art = "Kunst"
    }
    return subjectNames[subject] or subject
end

-- Hole Frage-Statistiken für Analytics
function QuizSystem:getQuestionAnalytics()
    local analytics = {}

    for subject, questions in pairs(QUESTIONS_DATABASE) do
        analytics[subject] = {
            totalQuestions = #questions,
            easyCount = 0,
            mediumCount = 0,
            hardCount = 0
        }

        for _, question in ipairs(questions) do
            if question.difficulty == "easy" then
                analytics[subject].easyCount = analytics[subject].easyCount + 1
            elseif question.difficulty == "medium" then
                analytics[subject].mediumCount = analytics[subject].mediumCount + 1
            elseif question.difficulty == "hard" then
                analytics[subject].hardCount = analytics[subject].hardCount + 1
            end
        end
    end

    return analytics
end

-- Reset alle Session-Daten (für Testing)
function QuizSystem:reset()
    self.currentSession = nil
    self.usedQuestions = {}
    self.sessionStats = {
        questionsAnswered = 0,
        correctAnswers = 0,
        wrongAnswers = 0,
        totalPoints = 0,
        streak = 0,
        maxStreak = 0
    }
    print("[QUIZ SYSTEM] All session data reset")
end

return QuizSystem