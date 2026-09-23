# Contested Logistics Wargame

**CONLOG 0.1 — Scenario 001: The Last 72 Hours**

A browser-based virtual cooperative sustainment wargame. The prototype models supply, transportation, maintenance, readiness, degraded communications, role-based information, White Cell injects, structured orders, persistent campaign state, and an event journal.

## Run
Open the repository through GitHub Pages, or serve the repository root with any static web server.

## Prototype roles
- Commander
- Operations
- Logistics
- Supply
- Maintenance
- Transportation
- Intel / Information
- White Cell

## Current design
The browser is the virtual table. Scenario data is separated from simulation logic so future scenarios can be added without rebuilding the engine.

## Scenario 001
**The Last 72 Hours:** Sustain RAVEN, VIPER, and NOMAD through a degrading distribution network and preserve sufficient mission capability for the final operational requirement at H+72.

## Repository
- `index.html` — application shell
- `src/styles.css` — responsive operations-room interface
- `src/app.js` — simulation, role views, orders, White Cell controls, persistence, AAR
- `data/scenario.json` — scenario data
- `docs/ROADMAP.md` — planned multiplayer/server evolution
- `.github/workflows/pages.yml` — GitHub Pages deployment workflow
