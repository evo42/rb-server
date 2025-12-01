# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project overview

This repo contains a containerized Roblox game platform with a single-game server and an extended multi-game management system.

High-level layout:
- `server/`: main project root
  - `services/roblox-server/`: Node/Express game server exposing HTTP + WebSocket API, backed by PostgreSQL and Redis
  - `services/game-manager/`: Node/Express multi-game management and repository service, exposes `/api` used by the web UI
  - `games/`: individual game packages (e.g. `kingdom-warriors/`, `lernblox-school-battle/`) with their own build/test scripts
  - `web-interface/`: static web dashboard for managing games, backed by the game-manager API
  - `database/`, `config/`, `assets/`: DB schema and infra/app configuration
  - `docker-compose*.yml`: local, production, and hardened secure docker setups
  - `scripts/`: Node-based DevOps tooling (security scanning, dependency updates, license checks, CI security pipeline)
  - `*.md` in `server/`: architecture, deployment and testing guides

Important documentation (read for deeper context rather than duplicating here):
- `server/README.md`: German overview and quickstart for the Roblox server stack
- `server/DEPLOYMENT.md`: detailed local/prod deployment, monitoring, backup, scaling and troubleshooting
- `server/MULTI-GAME-SYSTEM.md`: architecture of the multi-game management system (services, games, plugins, web interface)
- `server/AI_DEVELOPMENT_RULES.md` and `server/DEVELOPMENT_STANDARDS.md`: AI- and review-focused coding, security and architecture standards
- `server/DEVOPS_TOOLKIT.md`: description and usage of the DevOps scripts in `server/scripts/`
- Game-specific docs under `server/games/**` (e.g. `PROJECT_OVERVIEW.md`, game READMEs)

## Core architecture (big picture)

### Runtime services

Most runtime behavior is driven from `server/` via Docker:
- `docker-compose.yml` – default local stack: `roblox-server`, `postgres`, `redis`, `nginx`, optional `monitoring` and `logging` services.
- `docker-compose.prod.yml` – production-optimized variant with resource limits, Prometheus/Grafana, Loki, backup and HAProxy.
- `docker-compose.secure.yml` – hardened deployment (dedicated secure network, Docker secrets, AppArmor, strict capabilities, ELK, etc.).

Core services (implemented under `server/services/`):
- `roblox-server/`
  - Node/Express API (`server.js`) with WebSocket support (`socket.io`).
  - Talks to PostgreSQL (`pg`) and Redis, uses JWT auth, Joi validation, rate limiting and cron jobs.
  - Dockerfile builds a game server image that mounts Lua game code and `config/server.json`.
- `game-manager/`
  - Node/Express service (`manager.js`) implementing multi-game orchestration, repository and plugin management.
  - Uses PostgreSQL + Redis, extensive configuration, validation and logging.
  - Exposes REST APIs used by `web-interface/js/main.js` (see `GameManagerAPI` class) for:
    - listing/creating games and packages
    - starting/stopping game instances and listing active instances
    - querying repository packages and installing them into local game folders.

### Web interface

The web UI under `server/web-interface/` is a static app rendered by nginx:
- `js/main.js` implements `GameManagerUI` and `GameManagerAPI`:
  - Tabs: dashboard, games, repository, plugins, analytics, settings.
  - Uses `fetch` against `/api/**` routes (served by the game-manager service).
  - Periodically refreshes metrics like active games, player counts and package info.

When editing or adding UI features, keep the contract with the `GameManagerAPI` endpoints consistent with the game-manager service.

### Games and packages

Individual games live under `server/games/` and are treated as packages:
- Each game (e.g. `games/kingdom-warriors/`) has its own `package.json` with scripts for start/stop, tests, validation, packaging and deployment.
- Game code (often Lua) is mounted into the `roblox-server` container via volumes (`./game`, per `docker-compose.yml`).
- Game metadata (max players, enabled plugins, ports, metrics, security, etc.) is usually expressed in the game’s `package.json` and related config files.

The game-manager’s repository logic (`server/services/game-manager/repository.js`) handles installing, validating and packaging these game folders, and the web UI surfaces operations over that API.

### DevOps / security tooling

The DevOps Node scripts in `server/scripts/` are first-class tools, not examples. See `server/DEVOPS_TOOLKIT.md` for full options; common roles:
- `dependency-security-scanner.js` – dependency vulnerability and license scan, multi-package-aware.
- `dependency-update-manager.js` – orchestrated `npm` dependency updates with backups and test integration.
- `license-compliance-checker.js` – license policy validation across packages.
- `ci-cd-security-pipeline.js` – composite pipeline combining the above for CI.

When modifying dependencies or CI, prefer integrating via these scripts instead of ad hoc shell commands.

## Development and runtime commands

Unless noted, run these from `server/`.

### Local environment via Docker

Basic lifecycle:
- Start full local stack:
  - `cp .env.example .env`
  - `docker compose up -d`
- Check status and logs:
  - `docker compose ps`
  - `docker compose logs -f roblox-server`
  - `docker compose logs -f postgres`
- Stop stack:
  - `docker compose down`

Production-like runs (see `server/DEPLOYMENT.md` for details):
- Production compose (with `.env.production`):
  - `docker compose -f docker-compose.prod.yml --env-file .env.production up -d`
- Hardened secure stack:
  - `docker compose -f docker-compose.secure.yml up -d`

Monitoring / logging profiles:
- Enable Prometheus / Grafana only:
  - `docker compose --profile monitoring up -d`
- Enable Loki-based logging:
  - `docker compose --profile logging up -d`

### roblox-server service (game server)

From `server/services/roblox-server/`:
- Install dependencies: `npm install`
- Start server directly (without Docker): `npm start`
- Development mode (nodemon): `npm run dev`
- Run Jest test suite: `npm test`
- Lint core JS files: `npm run lint`

Running a single Jest test or test file:
- Use Jest’s CLI from this directory, for example:
  - `npx jest path/to/test-file.test.js`
  - or `npx jest -t "test name substring"`

The HTTP health endpoint for this service (used by Docker healthchecks) is exposed under `/health` on port 8080.

### game-manager service (multi-game manager)

From `server/services/game-manager/`:
- Install dependencies: `npm install`
- Start manager: `npm start`
- Development mode (nodemon): `npm run dev`
- Run Jest tests: `npm test`
- Lint JS: `npm run lint`

As with `roblox-server`, you can run a single Jest test via:
- `npx jest path/to/test-file.test.js`
- `npx jest -t "test name substring"`

The manager’s HTTP API typically listens on port 8081 (see its config and Docker setup) and is the backend for the web-interface.

### Game package: kingdom-warriors

From `server/games/kingdom-warriors/`:
- Game lifecycle via game-manager:
  - Start game instance: `npm run start`
  - Stop game instance: `npm run stop`
  - Status: `npm run status`
- Test suite (Mocha-based and integration tools):
  - All tests via manager: `npm test`
  - Unit tests (Mocha): `npm run test:unit` (calls `npm run test:mocha`)
  - Integration tests: `npm run test:integration`
  - Performance/load tests: `npm run test:performance` (incl. `test:load`)
- Lint & validate Lua/config:
  - `npm run lint`
  - `npm run validate`
- Build/package:
  - Build game package: `npm run build`
  - Create distributable package: `npm run package`
- Dev workflow:
  - Development mode with auto-validation on file changes:
    - `npm run dev` (runs `dev:server` and `dev:watch` in parallel)

For a single Mocha test file, call Mocha directly from this directory, e.g.:
- `npx mocha tests/some-specific.test.js --timeout 10000`

Other game directories may follow similar patterns but check their individual `package.json` and READMEs.

### DevOps / security tooling

From `server/` (see `server/DEVOPS_TOOLKIT.md` for more options and flags):
- Dependency security scan across packages:
  - `node scripts/dependency-security-scanner.js`
- Run only high-severity scan and apply fixes:
  - `node scripts/dependency-security-scanner.js --audit-level high --fix`
- Dependency update manager (dry-run patch/minor updates):
  - `node scripts/dependency-update-manager.js --dry-run`
- License compliance check:
  - `node scripts/license-compliance-checker.js`
- Full CI-style security pipeline locally:
  - `node scripts/ci-cd-security-pipeline.js`

## AI and coding standards for agents in this repo

AI-focused rules are defined in `server/AI_DEVELOPMENT_RULES.md` and `server/DEVELOPMENT_STANDARDS.md`. When generating or editing code here:

### Security & configuration

- **Never introduce hardcoded secrets** (DB passwords, JWT secrets, Redis passwords, API keys). Always read them from environment variables or secret files, matching the patterns in the existing config.
- Prefer environment-driven configuration objects with explicit validation (see the centralized config examples in `DEVELOPMENT_STANDARDS.md`). If you add new config, ensure it is:
  - driven by `process.env.*`
  - validated at startup (throwing on missing required values)
  - captured in `.env.example` / deployment docs when appropriate.
- Preserve and, where possible, improve existing rate limiting, CORS, authentication and input validation. Do not weaken validators or widen `CORS_ORIGINS` without an explicit reason.

### Architecture & layering

- Follow the established Node layout described in `AI_DEVELOPMENT_RULES.md`:
  - configuration modules
  - controllers/route handlers
  - services/business logic
  - models/data access
  - middleware
  - utils/helpers
  - tests
- When adding new functionality in `services/roblox-server` or `services/game-manager`, keep controllers slim and push business rules into service classes or modules. New routes should:
  - validate inputs (e.g. via Joi schemas)
  - use standardized error types (e.g. `ValidationError`, `AuthenticationError`, `RobloxGameError`)
  - log with the structured logger
  - return JSON with consistent shape (`error`, `code`, optional `metadata`).

### Error handling, logging, performance

- Use the standardized error hierarchy and global error handler patterns from `DEVELOPMENT_STANDARDS.md`.
- All new code paths that can fail (DB queries, file IO, external services) should:
  - throw specific error types
  - be wrapped by async error handlers in Express
  - log enriched context (game id, user id, correlation/request id) via the configured logger.
- Preserve connection pooling, caching and memory management patterns when interacting with DB/Redis or long-lived state. Do not reintroduce N+1 queries or blocking filesystem operations on hot paths.

### Testing and CI integration

- Where tests are added, align with the existing tools per service:
  - `services/**`: Jest
  - `games/kingdom-warriors`: Mocha and custom scripts via game-manager.
- Prefer integrating new checks and flows into the existing DevOps scripts under `server/scripts/` so they remain available to CI/CD pipelines.

By adhering to these project-specific rules and using the documented commands and architecture above, future Warp agents can safely extend the Roblox multi-game platform without regressing its security, reliability or structure.