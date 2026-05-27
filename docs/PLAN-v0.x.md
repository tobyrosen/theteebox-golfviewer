# Teebox v0.x — Plan

Synthesis of two research artifacts:

- [`docs/research/tour-sources.md`](research/tour-sources.md) — scoring data feasibility per tour
- [`docs/research/multiviewer-deepdive.md`](research/multiviewer-deepdive.md) — what to borrow from MultiViewer

## Headlines from research

1. **ESPN's hidden API covers 6 tours with one shared adapter.** PGA / DP World / LIV / LPGA / Korn Ferry / Champions all served by `site.api.espn.com/apis/site/v2/sports/golf/{league}/scoreboard`. No auth, JSON, live during play.
2. **Asian Tour and LET need a separate adapter** — both run on OCS Sport (different vendor). One OCS adapter would cover both.
3. **MultiViewer's "shell" is the lesson, not its telemetry.** ~22 of 30 MV features depend on F1's live-timing socket; golf has no equivalent. Teebox's defensible product is the **layout-driven adapter shell**, not data-overlay arms races we can't win.
4. **Top 5 high-value, low-effort wins** for v0.x map cleanly onto the existing architecture.
5. **DataGolf** is the single most useful paid API if/when we want telemetry-lite (live strokes-gained, win probability). Cheap, well-documented. Out of scope until paying users exist.

## What shipped in v0.2 (already merged)

- 6 ESPN-backed adapters: PGA, DP World, LIV, LPGA, Korn Ferry, PGA Tour Champions — all via shared `_espn.js` factory
- Existing All Thailand Golf Tour adapter (HTML scrape) preserved
- Custom URL fallback adapter
- Total: **8 tours** in v0.2 vs. 2 in v0.1

## v0.x backlog — prioritized

Each item is sized S/M/L (S = hours, M = days, L = weeks) and rated 1–5 for user value.

### Tier 1 — ship next

| #   | Feature                               | Eff | Val | Notes                                                                                                |
| --- | ------------------------------------- | --- | --- | ---------------------------------------------------------------------------------------------------- |
| 1   | **Click-to-highlight + Top-N filter** | S   | 5   | Click a row → pin/color/filter to leaders. Works against existing data. MV's most-loved interaction. |
| 2   | **No-spoilers mode**                  | S   | 4   | Toggle blurs leaderboard, hides totals. Pure CSS/state.                                              |
| 3   | **Score-by-hole grid**                | S   | 4   | Adapter extension: per-hole strokes already in ESPN `linescores[]`. Render as expandable row.        |
| 4   | **Saveable layouts (named presets)**  | S   | 5   | Extend localStorage from single-state to named slots: "Masters Sunday", "PGA Featured", etc.         |
| 5   | **Keyboard shortcuts**                | S   | 3   | `S` toggle scores, `H` highlight, `?` help. Borrowed from MV.                                        |

Tier 1 total ≈ 1 week of focused work. Captures ~60% of the MV vibe.

### Tier 2 — second pass

| #   | Feature                            | Eff | Val | Notes                                                                                            |
| --- | ---------------------------------- | --- | --- | ------------------------------------------------------------------------------------------------ |
| 6   | **OCS adapter** (Asian Tour + LET) | M   | 4   | Reverse-engineer endpoint patterns; needs live-event capture session. Two tours for one adapter. |
| 7   | **Sortable columns**               | S   | 3   | Click `Score` / `Today` headers to sort.                                                         |
| 8   | **Player follow / search**         | S   | 4   | Type a name, jump to / pin that player across refreshes.                                         |
| 9   | **Score-color rules editor**       | S   | 2   | Let user customize the green/red thresholds.                                                     |
| 10  | **Refresh interval picker**        | S   | 2   | 30s / 60s / 5m / off.                                                                            |

### Tier 3 — v1 territory

- Multi-stream layout (N video panes, MultiViewer-style) — M
- Tournament news / weather / wind alerts panel — M
- Score-progression chart per round (golf's Race Trace) — M
- Theming (light mode / accent color) — S
- Hole map with player positions — M (needs TOURCast)
- Win probability widget — S (needs DataGolf API key)

### Out of scope (for the foreseeable future)

| Feature                                                      | Why out                                                                      |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Live telemetry overlay (shot tracer / per-shot SG sync)      | ShotLink raw is syndication-only; DataGolf has aggregates, not per-shot sync |
| DRM-locked broadcast playback (ESPN+, Peacock inside Teebox) | Won't license third-party Widevine                                           |
| AI player/caddie radio transcripts                           | Golf has no isolated mic feed; broadcast audio is too sparse                 |
| Replay mode w/ synced leaderboard                            | Hard problem + DRM-locked source                                             |
| Watch parties (synced group viewing)                         | Substantial WebRTC build; v2 territory at best                               |

## Architectural notes

- **Adapter pattern is the bet.** Same model MV used to span F1 → F2 → IndyCar → NASCAR → WEC. Lean into adding tours, not features that need data we can't get.
- **ESPN dependency.** 6 of 8 v0.2 tours route through one host. If ESPN ever shuts the API or rate-limits, all 6 break. Mitigation: keep the adapter abstraction; if forced, swap to Rolling Insights or DataGolf as paid backup.
- **Allowlist is the security boundary.** Every new adapter requires an entry in `server/allowlist.json`. Document this in CONTRIBUTING.md (already done).
- **Don't build telemetry mocks.** Tempting to fake shot-tracer overlays for demo-ware; resist. The adapter shell is a real product; fake telemetry isn't.

## Open questions

1. **Tier 1 order** — recommended sequence: (4) saveable layouts → (1) click-to-highlight → (2) no-spoilers → (3) score-by-hole → (5) shortcuts. Opinions welcome in issues.
2. **Custom URL placement** — should it stay top-level in the dropdown, or move behind a settings menu once we have 8+ real tours? The current placement is v0 pragmatism; happy to revisit.
3. **DataGolf API** — win probability + live strokes-gained would be the closest golf equivalent to MV's telemetry overlays. Out of scope until there's a reason to pay for it. Flag in issues if this matters to you.
4. **OCS adapter (Asian Tour + LET)** — needs a DevTools capture session against a live event to reverse-engineer the endpoint. If you have access to a live Asian Tour or LET feed, open an issue — this would cover two tours with one adapter.
