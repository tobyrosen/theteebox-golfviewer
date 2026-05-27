# MultiViewer Deep Dive — Lessons for Teebox

## TL;DR

[MultiViewer](https://multiviewer.app/) (MV) wraps F1TV plus FOM's live-timing feed into a layout-driven, multi-stream, telemetry-rich dashboard. Core = **synced multi-stream + structured live data + saveable layouts**. Most _wow_ features (telemetry, race trace, mini-sectors, marshal sectors, AI radio) depend on FOM's live-timing socket — no golf equivalent. Portable: multi-stream sync, layouts, structured leaderboard, score-by-hole grid, no-spoilers, click-to-highlight, adapter/plugin model. Telemetry overlays are OOS until PGA Tour opens shot-level data — and then only at ShotLink events.

## 1. MV feature inventory

Sourced from MV's [site](https://multiviewer.app/), [changelog](https://multiviewer.app/changelog), [shortcuts docs](https://multiviewer.app/docs/usage/keyboard-shortcuts), [iMore](https://www.imore.com/music-movies-tv/multiviewer-for-f1-the-fan-built-formula-1-app-so-popular-even-f1-teams-use-it), [Apex Bite](https://apexbite.com/education/f1-multiviewer/).

| #   | Feature                                    | Notes                                       | FOM-dep? |
| --- | ------------------------------------------ | ------------------------------------------- | -------- |
| 1   | Multi-stream sync                          | N streams; re-sync on buffer                | No       |
| 2   | One-click setups                           | Save/restore layouts                        | No       |
| 3   | DRM player (Widevine)                      | Plays F1TV                                  | License  |
| 4   | Driver onboards                            | Per-car cam                                 | Yes      |
| 5   | Telemetry overlay                          | Speed/throttle/brake/gear/RPM/DRS           | **Yes**  |
| 6   | Live timing table                          | Pos/gap/sector/tyre/pit                     | Yes      |
| 7   | Mini-sector timing                         | Sub-sector deltas                           | Yes      |
| 8   | Track map V2                               | Cars + pit/sectors/DRS/speed traps          | Yes      |
| 9   | Marshal sectors                            | Y/G/R overlays                              | Yes      |
| 10  | Race control msgs                          | Color-coded                                 | Yes      |
| 11  | Race Trace                                 | Lap-by-lap gap, pit predictions             | Yes      |
| 12  | Lap Time Series                            | All laps + tyres                            | Yes      |
| 13  | Theoretical best lap                       | Sum of best sectors                         | Yes      |
| 14  | Investigations tracker                     | FIA penalty state                           | Yes      |
| 15  | AI radio transcripts                       | STT live + replay                           | Yes      |
| 16  | AI doc summaries                           | FIA docs                                    | Yes      |
| 17  | "No spoilers" catalog                      | Text-only                                   | No       |
| 18  | Click-to-highlight                         | Pin driver                                  | No       |
| 19  | Top-3/5/10 filters                         | Auto-select leaders                         | Data     |
| 20  | Light mode / driver colors                 | Theming                                     | No       |
| 21  | Keyboard shortcuts                         | `S` sync, `T` telem, `D` debug, `L` latency | No       |
| 22  | PiP / window snapping                      | Free-floating panes                         | No       |
| 23  | Replay + sync replay                       | Re-watch with live-timing                   | Yes      |
| 24  | Pit-stop popout                            | Stop times                                  | Yes      |
| 25  | Watch parties (beta)                       | Synced group                                | No       |
| 26  | Multi-series (F1/F2/F3/IndyCar/NASCAR/WEC) | Same shell                                  | Per-feed |
| 27  | Public API + plugins                       | 3rd-party extensions                        | Partial  |
| 28  | Stream settings memory                     | Vol/mute per window                         | No       |
| 29  | Predictions popout                         | Standings sims                              | Yes      |
| 30  | Transparent track map                      | Easier resize                               | No       |

**Reality:** ~22 of 30 depend on FOM's live-timing feed. Strip that → you're left with the _shell_ (sync, layouts, theming, no-spoilers, watch parties, plugins), not the _content_.

## 2. Golf adaptation table

Data sources:

- **Scraping** — TOURCast `holeview.json` ([Lohec](http://alexlohec.com/posts/2021-04-14-scrape/), [shotscraper](https://github.com/Pratted/shotscraper)); leaderboard HTML.
- **Paid APIs** — [DataGolf](https://datagolf.com/api-access) (live SG, 45 req/min), [SportsDataIO](https://sportsdata.io/developers/api-documentation/golf), [Sportradar](https://developer.sportradar.com/golf/reference/golf-overview), [Rolling Insights](https://rolling-insights.com/datafeeds/pga-api/).
- **Closed** — ShotLink raw ([PGA Tour](https://www.pgatour.com/shotlink), syndication only).
- **Streams** — PGA Tour Live (ESPN+: Main/Marquee/2 Featured Groups/Featured Holes); Peacock NBC. All DRM-locked.

Effort: S=hours, M=days, L=weeks, XL=months. V=1–5.

| MV feature           | Golf adaptation                     | Source             | Eff  | V   | Priority |
| -------------------- | ----------------------------------- | ------------------ | ---- | --- | -------- |
| Multi-stream sync    | Side-by-side ESPN+ groups + Marquee | User subs; YT free | M    | 5   | v1       |
| Saveable layouts     | "Masters Sunday" preset             | localStorage       | S    | 5   | **v0.x** |
| DRM player           | ESPN+/Peacock inside Teebox         | Widevine license   | XL   | 5   | OOS      |
| Driver onboards      | Marquee per-player                  | ESPN+ Marquee      | M    | 4   | v1       |
| Telemetry overlay    | Shot trace (club/dist/SG)           | DataGolf + scrape  | L    | 5   | v1.x     |
| Live timing table    | Live leaderboard (have v0)          | Adapter ext        | S    | 5   | **v0.x** |
| Mini-sector          | Shot-by-shot SG stream              | TOURCast+DataGolf  | L    | 4   | v1.x     |
| Track map            | Hole map + ball positions           | TOURCast coords    | M    | 5   | v1       |
| Marshal sectors      | Hole heat map vs par now            | Live scoring agg   | M    | 3   | v1.x     |
| Race control msgs    | Tournament alerts (weather/DQ)      | RSS+Twitter        | S    | 3   | v1       |
| Race Trace           | Position Trace over time            | Snapshot scoring   | M    | 4   | v1       |
| Lap Time Series      | Round Score-by-hole grid            | Live scoring       | S    | 4   | **v0.x** |
| Theoretical best     | Theoretical low round               | Live scoring       | S    | 2   | v1.x     |
| Investigations       | Rules review tracker                | Manual/RSS         | M    | 1   | OOS      |
| AI radio transcripts | Player/caddie audio STT             | Broadcast audio    | XL   | 3   | OOS      |
| AI doc summaries     | Weather/notes summary               | Notes scrape       | M    | 2   | v2       |
| No-spoilers          | Hide leaderboard/cut/totals         | UX                 | S    | 4   | **v0.x** |
| Click-to-highlight   | Pin player across panes             | UX                 | S    | 5   | **v0.x** |
| Top-N filters        | Auto-select leaders                 | Existing           | S    | 4   | **v0.x** |
| Light mode / colors  | Theming                             | UX                 | S    | 2   | v1       |
| Keyboard shortcuts   | `S` sync, `H` highlight, `L` toggle | UX                 | S    | 3   | v1       |
| PiP / window snap    | Resizable panes                     | CSS grid           | M    | 4   | v1       |
| Replay mode          | Re-watch w/ synced leaderboard      | Snapshot+YT ts     | L    | 4   | v1.x     |
| Pit-stop popout      | Pre-shot routine timer              | TOURCast           | M    | 1   | OOS      |
| Watch parties        | Synced group-watch                  | WebRTC             | L    | 3   | v2       |
| Multi-series         | PGA/LIV/DPWT/LPGA/KFT adapters      | Per-tour           | M ea | 5   | **v0.x** |
| API + plugins        | Adapter contract (SPEC)             | Existing           | S    | 4   | **v0.x** |
| Stream settings mem  | Vol/mute per stream                 | localStorage       | S    | 2   | v1       |
| Predictions popout   | Live win-prob                       | DataGolf           | S    | 4   | v1       |
| Transparent overlay  | Translucent leaderboard             | CSS                | S    | 3   | v1       |

## 3. Top 5 highest-value, lowest-effort

1. **Saveable layouts (v0.x, S, V5)** — Persist `{youtubeUrl, adapterId, customUrl, paneSizes}` to `localStorage`. Named presets ("Masters Sunday", "PGA Featured"). MV's most-loved feature; no new data.
2. **Click-to-highlight + top-N filter (v0.x, S, V5)** — Click row → pin, color, filter to leaders. Works on existing data.
3. **Score-by-hole grid (v0.x, S, V4)** — Adapters can give score per hole; render as golf's Lap Time Series. Tiny extension.
4. **No-spoilers mode (v0.x, S, V4)** — Toggle blurs leaderboard, hides totals/thumbnails. Pure CSS/state.
5. **Adapter expansion (v0.x ongoing, S each, V5)** — PGA, LIV, DP World, LPGA, KFT. MV's same shell across F1/F2/F3/IndyCar/NASCAR/WEC validates this.

## 4. Top 3 "cool but probably impossible"

1. **Live telemetry overlay** (MV's flagship). FOM publishes a live-timing socket at tens-of-Hz with per-car speed/throttle/brake/gear/RPM/DRS. Golf's analog (club, ball speed, launch, spin, distance) is captured by Trackman/broadcast graphics but **not exposed as a public live feed**. ShotLink captures [256k data points/week](https://www.pgatour.com/shotlink) but is syndication-only; SG calc is closed. DataGolf has live SG aggregates, not telemetry-grade per-shot sync. OOS until PGA Tour opens a developer tier.
2. **DRM-locked broadcast inside Teebox**. MV plays F1TV via Widevine + a working F1 relationship. ESPN+/Peacock won't license third-party DRM playback. Teebox can link or embed YT, not play ESPN+/Peacock directly. OOS; design multi-stream around user-provided streams.
3. **AI player/caddie radio transcripts**. F1 broadcasts driver radio as a discrete audio track. Golf picks up audio sporadically via shotgun mics with no isolated stream. Even transcribing broadcast audio yields low value-density (one snippet per 90s vs continuous F1 radio). OOS unless a broadcaster ships an isolated feed.

## 5. Roadmap implications

- **Lean into the shell, not the telemetry.** Teebox's defensible product is the layout-driven adapter shell — same bet MV made. Data-overlay arms race is unwinnable in golf.
- **Adapter pattern in [`SPEC.md`](../../SPEC.md) is the right primitive** — MV's multi-series model on day one. Ship adapters aggressively.
- **DataGolf is the single most useful paid API** for "telemetry-lite" overlays (live SG, win prob, position-over-time).
- **Don't build replay/multi-stream until v1+** — sync is real engineering, and golf streams are DRM-locked.
- **The 5 v0.x features above are 1–2 weeks of work and capture ~60% of the MV vibe** without telemetry, DRM, or paid APIs.

## Sources

- <https://multiviewer.app/> · <https://multiviewer.app/changelog> · <https://multiviewer.app/docs/usage/keyboard-shortcuts>
- <https://www.imore.com/music-movies-tv/multiviewer-for-f1-the-fan-built-formula-1-app-so-popular-even-f1-teams-use-it>
- <https://apexbite.com/education/f1-multiviewer/>
- <https://www.pgatour.com/shotlink> · <https://www.pgatour.com/tourcast/about>
- <http://alexlohec.com/posts/2021-04-14-scrape/> · <https://github.com/Pratted/shotscraper>
- <https://datagolf.com/api-access> · <https://sportsdata.io/developers/api-documentation/golf> · <https://developer.sportradar.com/golf/reference/golf-overview> · <https://rolling-insights.com/datafeeds/pga-api/>
- <https://www.golfdigest.com/story/players-championship-2026-how-to-watch-tpc-sawgrass-viewers-guide-tv-listings-streaming-times>
