# Roadmap: Spotify Live Lyrics Web App

## Milestones

- ✅ **v1.0 MVP** — Phases 1-4 (shipped 2026-03-??)
- ✅ **v1.1 Web Auth** — Phases 5-8 + 7.1 (shipped 2026-03-??)
- ✅ **v1.2 Fullscreen** — Phases 9-11 (shipped 2026-03-??)
- ✅ **v1.3 Timing** — Phases 12-14 (shipped 2026-04-??)
- ✅ **v1.4 Motion Model** — Phases 15-17 (shipped 2026-04-09)
- ✅ **v1.5 Viewport Lock** — Phases 18-20 (shipped 2026-04-??, with deferred Phase 20-06 drift blocker)
- ✅ **v1.6 Developer Panel** — Phases 21-22 (shipped 2026-04-19)
- 📋 **v1.7 TBD** — (planning)

## Phases

<details>
<summary>✅ v1.6 Developer Activity Panel (Phases 21–22) — SHIPPED 2026-04-19</summary>

- [x] Phase 21: Panel Container, Toggle, and UX Shell (2/2 plans) — completed 2026-04-18
- [x] Phase 22: Event Emission Wiring (1/1 plan) — completed 2026-04-19

Archive: `milestones/v1.6-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Viewport-Locked Live Lyrics (Phases 18–20) — shipped with Phase 20-06 deferred</summary>

- [x] Phase 18: Viewport anchor ownership unification
- [x] Phase 19: Song-boundary visibility and Back to Live recovery
- [x] Phase 20: Viewport regression and timing safety closure

Archive: *(not archived — v1.5 was not formally closed)*

</details>

<details>
<summary>✅ v1.0–v1.4 Foundation (Phases 1–17) — SHIPPED</summary>

- Phases 1-4: Spotify auth, live sync, lyrics resolution, cache (v1.0)
- Phases 5-8 + 7.1: Web runtime, auth hardening, lyrics parity (v1.1)
- Phases 9-11: Immersive fullscreen mode (v1.2)
- Phases 12-14: Playback clock, drift reconciliation, early cueing (v1.3)
- Phases 15-17: Hold-transition-settle motion model (v1.4)

Archive: `milestones/v1.4-ROADMAP.md`, `milestones/v1.4-REQUIREMENTS.md`

</details>

### 📋 v1.7 (Planning)

*Next milestone to be defined. Key candidates:*
- Resolve Phase 20-06 sustained viewport drift blocker (v1.5 deferred work)
- Motion polish (VIS-05, 16-03 quality gate, SAFE-01 timing proof)
- Private Karaoke Mode
- Fix pre-existing lrc-parser and plain-lyrics-timing test failures

## Progress

| Phase | Milestone | Plans | Status   | Completed  |
|-------|-----------|-------|----------|------------|
| 1-4   | v1.0      | —     | Complete | 2026-03    |
| 5-8+7.1 | v1.1    | —     | Complete | 2026-03    |
| 9-11  | v1.2      | —     | Complete | 2026-03    |
| 12-14 | v1.3      | —     | Complete | 2026-04    |
| 15-17 | v1.4      | —     | Complete | 2026-04-09 |
| 18-20 | v1.5      | —     | Complete | 2026-04    |
| 21    | v1.6      | 2/2   | Complete | 2026-04-18 |
| 22    | v1.6      | 1/1   | Complete | 2026-04-19 |
