# 🎓 LernBlox School Battle

Ein pädagogisches Quiz-Spiel für Gymnasiasten mit mathematischen, englischen, spanischen, geografischen und anderen Schulfächern. Das Spiel wurde aus dem ursprünglichen Roblox Arena Battle transformiert und um ein umfassendes Quiz-System erweitert.

## 🧠 **Spielkonzept**

**LernBlox School Battle** ist ein wettbewerbsorientiertes Lernspiel, das Bildung mit Gaming verbindet. Schüler treten in verschiedenen Schulfächern gegeneinander an, beantworten Fragen und sammeln Punkte für eine Highscore-Tafel.

### Hauptmerkmale
- **📚 8 Schulfächer**: Mathematik, Englisch, Spanisch, Geografie, Geschichte, Naturwissenschaften, Literatur, Kunst
- **🎯 10 Quests pro Spiel**: Zufällig ausgewählte Fragen aus verschiedenen Fächern
- **🏆 Punkte-System**: 100 Punkte für richtige Antworten, 25 Punkte für falsche Antworten (Trostpunkte)
- **🎁 Extra-Geschenk**: Belohnung für das Lösen aller 10 Quests in einem Spiel
- **📊 Highscore-Tafel**: Verschiedene Kategorien (Gesamtpunktzahl, Genauigkeit, Fach-Beherrschung)
- **🌍 Mehrsprachig**: Unterstützt Deutsch, Englisch und Spanisch
- **⚡ 42 Quest Limit**: Maximal 42 verschiedene Fragen pro Spiel-Session

## 📖 **Schulfächer & Quest-Typen**

### 🧮 Mathematik
**Quest-Typen**: Arithmetik, Algebra, Geometrie, Analysis
- Beispiel: "Was ist die Quadratwurzel von 144?"
- Beispiel: "Löse die Gleichung: 2x + 5 = 13"
- Beispiel: "Wie berechnet man den Flächeninhalt eines Kreises?"

### 🇬🇧 Englisch
**Quest-Typen**: Grammatik, Vokabular, Leseverständnis, Schreiben
- Beispiel: "Welcher Satz ist grammatisch korrekt?"
- Beispiel: "Was bedeutet das Wort 'ubiquitous'?"
- Beispiel: "Wähle das richtige Verb-Tempus"

### 🇪🇸 Spanisch
**Quest-Typen**: Grammatik, Vokabular, Kultur, Aussprache
- Beispiel: "Wie sagt man 'Ich gehe zur Schule' auf Spanisch?"
- Beispiel: "Was ist die weibliche Form von 'estudiante'?"
- Beispiel: "In welchem Land wird hauptsächlich Spanisch gesprochen?"

### 🌍 Geografie
**Quest-Typen**: Länder, Hauptstädte, Landschaftsformen, Klima
- Beispiel: "Was ist die Hauptstadt von Australien?"
- Beispiel: "Welcher Berg ist der höchste in Europa?"
- Beispiel: "In welcher Klimazone liegt die Sahara?"

### 🏛️ Geschichte
**Quest-Typen**: Antike, Mittelalter, Neuzeit, Persönlichkeiten
- Beispiel: "In welchem Jahr fiel die Berliner Mauer?"
- Beispiel: "Wer war der erste Kaiser des Römischen Reiches?"
- Beispiel: "Welche Schlacht fand 1815 statt?"

### 🔬 Naturwissenschaften
**Quest-Typen**: Physik, Chemie, Biologie, Umwelt
- Beispiel: "Was ist die chemische Formel für Wasser?"
- Beispiel: "Wie nennt man den Wechsel von fest zu flüssig?"
- Beispiel: "Welches Organ ist für die Photosynthese verantwortlich?"

### 📚 Literatur
**Quest-Typen**: Autoren, Werke, Gattungen, Poesie
- Beispiel: "Wer schrieb 'Romeo und Julia'?"
- Beispiel: "Was ist ein Haiku?"
- Beispiel: "Welches Genre gehört 'Der Herr der Ringe'?"

### 🎨 Kunst
**Quest-Typen**: Künstler, Bewegungen, Techniken, Epochen
- Beispiel: "Wer malte die 'Mona Lisa'?"
- Beispiel: "Was charakterisiert die Renaissance?"
- Beispiel: "Welche Farben sind Grundfarben?"

## 🏗️ **System-Integration**

Dieses Spiel wurde speziell für das **Roblox Multi-Game Management System** entwickelt und demonstriert:

### Game-Manager Integration
```bash
# Spiel über Game Manager starten
POST /api/games/lernblox-school-battle/start

# Spiel-Status überwachen
GET /api/instances

# Quiz-Analytik abrufen
GET /api/games/lernblox-school-battle/stats
```

### Web-Interface Integration
- **Dashboard**: Live-Überwachung des aktiven LernBlox-Spiels
- **Game Management**: Ein-Klick Start/Stop über Web-UI
- **Analytics**: Real-time Spieler-Statistiken und Lern-Fortschritt
- **Leaderboard**: Mehrere Ranking-Kategorien

### Repository System
- **Package Management**: Das Spiel kann als Package in das Repository hochgeladen werden
- **Plugin Architecture**: Unterstützt Plugins wie Quiz-System, Leaderboard-Manager
- **Version Control**: Semantic Versioning für Spiel-Updates

## 🎯 **Gameplay**

### Ziel
Beantworte 10 Fragen aus verschiedenen Schulfächern, sammle Punkte und erreiche einen hohen Platz in der Highscore-Tafel. Je weniger Fragen du brauchst, um alle 10 Quests zu lösen, desto höher deine Punktzahl!

### Punkte-System
- **Richtige Antwort**: +100 Punkte
- **Falsche Antwort**: +25 Trostpunkte + neue Frage
- **Extra-Geschenk**: Bei perfektem Spiel (alle 10 richtig) = +500 Bonus-Punkte
- **Streak-Bonus**: Mehrere richtige Antworten hintereinander erhöhen den Multiplikator

### Quest-Mechanik
1. **10 zufällige Fragen** werden pro Spiel ausgewählt
2. **Maximal 42 Fragen** sind in einer Session verfügbar
3. **Bei falschen Antworten** gibt es eine neue Frage und Trostpunkte
4. **Alle Fächer** sind gleichmäßig vertreten
5. **Progressive Schwierigkeit** je nach Spiel-Fortschritt

### Highscore-Kategorien
- **Gesamtpunktzahl**: Gesamtpunkte aller Spiele
- **Genauigkeitsrate**: Prozent richtiger Antworten
- **Fach-Beherrschung**: Punkte pro Schulfach
- **Streak-Rekord**: Längste Serie richtiger Antworten

## 🏆 **Belohnungssystem**

### Wissensabzeichen
- **Common**: Wissensabzeichen (+50 Punkte)
- **Rare**: Gelehrtenkrone (+100 Punkte)
- **Epic**: Weisheitskugel (Extra-Frage)
- **Legendary**: Meister-Trophäe (+500 Punkte, nur bei perfektem Spiel)

### Achievement-System
- **Erstes Spiel**: Willkommen bei LernBlox
- **Mathe-Meister**: 10 mathematische Fragen richtig
- **Sprach-Genius**: Fragen in 3 Sprachen beantwortet
- **Allrounder**: Mindestens 1 Frage aus jedem Fach
- **Perfektionist**: Alle 10 Fragen in einem Spiel richtig
- **Streak-König**: 5 richtige Antworten hintereinander

## 🔧 **Technische Details**

### Architektur
```
LernBloxSchoolBattle/
├── scripts/
│   └── main.lua              # Hauptspiel-Logik
├── modules/
│   ├── game_config.lua       # Spiel-Konfiguration
│   ├── quiz_system.lua       # Quiz-Engine
│   ├── question_generator.lua # Fragen-Generator
│   ├── leaderboard_manager.lua # Highscore-Verwaltung
│   ├── subject_tracker.lua   # Fach-Verfolgung
│   └── achievement_system.lua # Achievement-System
├── assets/
│   ├── questions/            # Fragen-Datenbank
│   │   ├── mathematics.json
│   │   ├── english.json
│   │   ├── spanish.json
│   │   ├── geography.json
│   │   ├── history.json
│   │   ├── science.json
│   │   ├── literature.json
│   │   └── art.json
│   └── sounds/              # Audio-Dateien
└── config/
    ├── subjects/            # Fach-Konfigurationen
    └── rewards/             # Belohnungs-Definitionen
```

### Fragen-Datenbank
Jedes Fach hat eine umfassende JSON-Datei mit:
- **Leicht**: Grundschul-Niveau
- **Medium**: Gymnasial-Niveau
- **Schwer**: Erweiterte Gymnasial-Themen

### Event-System
Das Spiel verwendet ein umfassendes Event-System für:
- Spieler-Management (Join/Leave/Progress)
- Quiz-Events (Question/Answer/Score)
- Lern-Fortschritt (Subject mastery/Accuracy)
- Achievement-Events (Unlock/Complete)
- Leaderboard-Updates

## 🚀 **Testing**

### Automatisierte Tests
```bash
# Spiel-Tests über Testing-Framework
./scripts/test-game.sh lernblox-school-battle

# Multi-Subject Testing
./scripts/test-multiclient.sh --game=lernblox-school-battle --clients=10

# Load Testing mit Quiz-Simulation
./scripts/load-test.sh --game=lernblox-school-battle --players=20 --duration=300
```

### Educational Testing
- **Pädagogische Validierung**: Fragen werden von Lehrern überprüft
- **Schwierigkeits-Balance**: Algorithmen für angemessene Herausforderung
- **Lern-Effektivität**: Tracking des Fortschritts über Zeit
- **Mehrsprachige Tests**: Qualitätssicherung in allen Sprachen

### Mock Students
Das System enthält Mock-Studenten für automatisierte Tests:
```lua
-- scripts/mock_students.lua
-- Simuliert realistisches Schüler-Verhalten
```

## 📊 **Analytics & Lern-Tracking**

Das Spiel trackt umfassende Lern-Metriken:
- **Lern-Engagement**: Session-Dauer, Rückkehr-Rate
- **Fach-Progression**: Verbesserung pro Schulfach
- **Fragen-Effizienz**: Geschwindigkeit der Beantwortung
- **Accuracy-Trends**: Genauigkeit über Zeit
- **Subject Mastery**: Beherrschung einzelner Fächer

### Tracking Events
- `question_answered` / `correct_answer` / `wrong_answer`
- `quest_completed` / `extra_gift_earned`
- `leaderboard_update` / `perfect_score`
- `subject_mastery` / `streak_record`

## 🛠️ **Development**

### Lokale Entwicklung
```bash
# Spiel manuell starten für Development
cd games/lernblox-school-battle
lua scripts/main.lua

# Mit Debug-Modus
lua scripts/main.lua --debug

# Mit Mock-Students
lua scripts/main.lua --mock-students=5
```

### Fragen-Management
- **Dynamische Generierung**: Algorithmen für Variation
- **Schwierigkeits-Anpassung**: Adaptive Herausforderung
- **Mehrsprachige Unterstützung**: Lokalisierte Inhalte
- **Curriculum-Alignment**: Abstimmung mit Bildungsplänen

### Plugin Development
Das Spiel unterstützt erweiterte Plugins:
- **Quiz-Generator**: Erweiterte Frage-Erstellung
- **Lern-Analytics**: Detailliertes Fortschritts-Tracking
- **Curriculum-Integration**: Schulplan-Integration
- **Parent-Dashboard**: Eltern-Überwachung

## 🎮 **Verwendung im Multi-Game-System**

### 1. Spiel-Registrierung
Das Spiel wird automatisch vom Game-Manager erkannt und registriert.

### 2. Spiel-Start
```bash
# Über Web-Interface
1. Öffne Web-Interface (http://localhost)
2. Gehe zu "Games" Tab
3. Klicke "Start" bei LernBlox School Battle

# Über API
POST /api/games/lernblox-school-battle/start
{
  "config": {
    "studyEnvironment": "classroom",
    "maxQuestions": 10,
    "difficulty": "adaptive"
  }
}
```

### 3. Quiz-Monitoring
- Live Player Count
- Question Progress
- Subject Distribution
- Accuracy Tracking

### 4. Lern-Analytics
- Individual Progress per Subject
- Class Performance (bei Multi-Player)
- Teacher Dashboard Integration
- Parent Report Generation

## 📈 **Pädagogischer Wert**

### Lernziele
- **Wissen festigen**: Durch spielerische Wiederholung
- **Motivation steigern**: Durch Wettbewerb und Belohnungen
- **Selbständiges Lernen**: Durch adaptive Schwierigkeit
- **Soziales Lernen**: Durch Multi-Player-Herausforderungen

### Curriculum-Integration
- **Mathematik**: Alle Gymnasial-Stufen abgedeckt
- **Sprachen**: Grammatik und Vokabular-Training
- **Naturwissenschaften**: Grundlagen und Anwendungen
- **Geisteswissenschaften**: Kultur und Geschichte

### Adaptive Lernpfade
- **Individuelle Anpassung**: Schwierigkeit basierend auf Performance
- **Schwächen adressieren**: Mehr Fragen zu schwächeren Fächern
- **Stärken nutzen**: Bonus-Punkte für exzellente Leistungen

## 🔮 **Erweiterungen**

### Geplante Features
- **KI-Tutor**: Personalisierte Lern-Empfehlungen
- **Klassen-Modus**: Lehrer vs. Schüler
- **Eltern-Dashboard**: Fortschritts-Überwachung
- **Curriculum-Alignment**: Integration mit nationalen Lehrplänen

### Bildungs-Integration
- **LMS-Anbindung**: Integration in Schul-Management-Systeme
- **Bewertungs-Integration**: Automatische Benotung
- **Zeugnis-Integration**: Berücksichtigung in Schulzeugnissen
- **Klassenbuch-Integration**: Automatische Anwesenheits-Tracking

## 📝 **Changelog**

### v2.0.0 (2025-12-01) - LernBlox Transformation
- **Vollständige Transformation** von Arena Battle zu Educational Quiz
- **8 Schulfächer** mit über 1000 Fragen implementiert
- **Quest-System** mit 10 Fragen pro Spiel
- **Punkte-Belohnungssystem** mit Trostpunkten
- **Highscore-Tafel** mit 4 Kategorien
- **Mehrsprachige Unterstützung** (DE, EN, ES)
- **Achievement-System** mit 6 verschiedenen Erfolgen
- **Extra-Geschenk** für perfekte Spiele
- **42 Quest-Limit** pro Session

### v1.0.0 (2024-12-01) - Original Arena Battle
- Basic Arena Combat
- 3 Weapon Types
- 4 Maps
- Multi-Game-System Integration

---

**LernBlox School Battle** transformiert Bildung durch Gaming und zeigt die vielseitigen Möglichkeiten des Multi-Game-Management-Systems für pädagogische Anwendungen.