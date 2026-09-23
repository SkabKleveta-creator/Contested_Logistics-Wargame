# CONLOG Development Roadmap

## 0.1 — Browser prototype
- Scenario 001: The Last 72 Hours
- Role switching
- Supply / readiness / movement simulation
- Structured movement orders
- White Cell injects
- Local campaign persistence
- Event journal and basic AAR

## 0.2 — Virtual TTRPG
- Separate player and White Cell views
- Role-specific information visibility
- Adjudication queue
- Private inject delivery
- Scenario authoring schema
- Campaign save/export

## 0.3 — Multiplayer
- Authoritative server
- WebSocket synchronization
- Campaign room codes
- Player presence and role assignment
- Reconnect handling
- PostgreSQL persistence
- Server-side event journal

## 0.4 — Campaign layer
- Multiple linked missions
- Persistent inventory and equipment condition
- Personnel / organizational capability progression
- Autonomous resupply
- DDIL mechanics
- Expanded adversary effects
- AAR causal-chain reconstruction

## Design rule
Scenario data must remain separate from simulation logic so new wargames can reuse the same engine.
