# Teebox — Specification

## Goal

A local web dashboard for watching golf events: YouTube broadcast on the left, live leaderboard on the right. Users run it locally; nothing is hosted.

Reference: [multiviewer.app](https://multiviewer.app/) for F1. Teebox is the golf equivalent — for now, single stream + single leaderboard. Long-term, the same architecture should support multi-stream/multi-board.

## v0 scope

- One HTML page, two panes (50/50 split, resizable)
- Left pane: YouTube embed via paste-in URL
- Right pane: leaderboard rendered from a "tour adapter"
- Tour selector dropdown: built-in adapters + "Custom URL"
- 60-second auto-refresh on the leaderboard (not the video)
- Pause/resume refresh button
- Tiny Node proxy to bypass CORS on scoring-site fetches
- Zero external dependencies — Node 18+ built-ins only, browser DOMParser only

## Non-goals (v0)

- Hosting / deployment — local-only by design
- User accounts, persistence, history
- Mobile layout
- Multi-stream (post-v1)
- Live API integrations — scraping HTML is fine until adapters need more

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (http://localhost:8787)                        │
│  ┌────────────────────┐  ┌─────────────────────────┐    │
│  │   YouTube iframe   │  │   Leaderboard table     │    │
│  │   (direct embed)   │  │   ↑ rendered by adapter │    │
│  └────────────────────┘  └─────────────────────────┘    │
│           │                          ▲                  │
│           │                          │                  │
│           │              fetch /proxy?url=...           │
│           │                          │                  │
└───────────┼──────────────────────────┼──────────────────┘
            │                          │
            │ youtube.com              │
            │ (CORS-allowed embed)     │
            ▼                          ▼
                              ┌──────────────────────┐
                              │  Node proxy server   │
                              │  - serves /public    │
                              │  - /proxy?url=…      │
                              └─────────┬────────────┘
                                        │
                                        ▼
                              scoring-site HTML
```

### Server (`server/index.js`)

Zero-dep Node http server. Two responsibilities:

1. **Static file serving** for `/public`
2. **`/proxy?url=...`** — forwards a GET to the target URL with a browser-like UA, returns the body with `Access-Control-Allow-Origin: *`. Allowlist: only hostnames listed in `server/allowlist.json`. Refuses anything else with 403.

The allowlist is the open-source-clean way to keep the proxy from becoming an open relay.

### Frontend (`public/`)

- `index.html` — layout markup
- `styles.css` — minimal styling, dark theme, system font stack, no UI framework
- `app.js` — wires up the tour selector, YT input, refresh loop, and adapter rendering
- `adapters/` — one file per source, each exporting `{ id, name, defaultUrl, parse(html) }`
- `adapters/index.js` — registers adapters in display order

### Adapter contract

```js
export default {
  id: "allthailand",
  name: "All Thailand Golf Tour",
  defaultUrl:
    "https://www.allthailandgolftour.com/tournaments/gettable/3755/score",
  // Returns:
  // {
  //   columns: [{ key: 'pos', label: 'Pos' }, ...],
  //   rows:    [{ pos: '1', score: '-5', player: '...', country: 'THA', today: '-5', holesPlayed: 7 }, ...]
  // }
  parse(html) {
    /* DOMParser, return normalized data */
  },
};
```

The frontend renders any adapter's output through one generic `<table>` renderer. New adapter = one new file + one entry in `adapters/index.js`.

### Custom URL adapter

When the user picks "Custom URL", the frontend just passes the proxied HTML through unmodified inside an iframe-like container (sandbox `<div>` with the table extracted naively — first `<table>` element found). Useful as a fallback for tours we haven't written a real adapter for yet.

## File layout

```
teebox/
├── README.md
├── SPEC.md
├── LICENSE
├── .gitignore
├── package.json
├── server/
│   ├── index.js
│   └── allowlist.json
└── public/
    ├── index.html
    ├── styles.css
    ├── app.js
    └── adapters/
        ├── index.js
        ├── allthailand.js
        └── custom.js
```

## Data normalization (allthailand example)

Source: `https://www.allthailandgolftour.com/tournaments/gettable/3755/score`

Returns an HTML fragment with one `<table>`:

- thead row 1: rowspan=3 cells `Pos / Score / Player / Ctry`, then 18 hole-number cells, then `Today`
- thead row 2: par for each hole
- tbody `<tr data-score="-5">` rows:
  - td 1: position (blank when tied with row above)
  - td 2: score-to-par
  - td 3: player name
  - td 4: country flag `<img alt="THA">`
  - td 5–22: 18 hole strokes (span-wrapped, color-styled for under/over par)
  - td 23: today's score with `data-holes-played` attribute

Adapter normalizes to:

```js
{
  pos: '1',
  score: '-5',
  player: 'Amarin Kraivixien',
  country: 'THA',
  holes: ['','','','','','','','','','3','3','3','3','3','4','3','',''],
  today: '-5',
  holesPlayed: 7
}
```

## Tours in v0.2

ESPN's undocumented public API at `site.api.espn.com/apis/site/v2/sports/golf/{league}/scoreboard` returns the same JSON shape for every tour they cover. One shared `_espn.js` factory backs six adapters:

- **PGA Tour** — `pga`
- **DP World Tour** — `eur` (legacy "European Tour" code)
- **LIV Golf** — `liv` (individual leaderboard only; team standings not in any free feed)
- **LPGA Tour** — `lpga`
- **Korn Ferry Tour** — `ntw` (legacy "Nationwide" code, predates Korn Ferry rename)
- **PGA Tour Champions** — `champions-tour`

Plus:

- **All Thailand Golf Tour** — direct HTML scrape (`allthailandgolftour.com`)
- **Custom URL** — generic fallback for any HTML table

See [`docs/research/tour-sources.md`](docs/research/tour-sources.md) for full per-tour analysis.

### Future tours (post-v0.2)

- **Asian Tour** + **Ladies European Tour** — both run on OCS Sport (different vendor than ESPN). One OCS adapter would cover both, but reverse-engineering needs a live-event DevTools capture.
- **TGL** — ESPN league code `tgl`, easy add via the same factory.
- **Olympic golf** — `mens-olympics-golf` / `women-olympics-golf`.

## Inspirations & longer-term roadmap

The reference point is [MultiViewer for F1](https://multiviewer.app/). They've solved this problem space in motorsports. Golf parallels worth borrowing:

| MultiViewer (F1)                | Teebox equivalent (golf)                                       |
| ------------------------------- | -------------------------------------------------------------- |
| Multi-stream synced feeds       | Main broadcast + featured-group cams (where streams exist)     |
| Telemetry overlays (speed, etc) | Shot tracer / strokes-gained per shot / club / distance to pin |
| Saved layouts                   | Per-tournament layout presets                                  |
| Live timing tower               | Leaderboard (current v0 right pane)                            |
| Race control messages           | Tournament news / weather alerts / delay notices               |
| Track map                       | Hole map with player positions                                 |
| AI radio transcriptions         | On-course mic / interview audio (rare in golf, but exists)     |
| Race Trace (gain/loss graph)    | Score progression chart per round                              |
| Lap time series w/ compare      | Hole-by-hole scorecard, multi-player compare mode              |

### Phased plan

- **v0** (now): YT player + leaderboard, single tour adapter (All Thailand) + Custom URL fallback, 60s refresh, graceful empty state with broadcast-search shortcut.
- **v0.x**: more tour adapters (PGA, DP World, LIV, LPGA, KFT, Asian); player highlight/follow; sortable columns; persisted layout (localStorage).
- **v1**: hole-by-hole scorecard expansion; multi-player compare mode; score-progression chart per round.
- **v1.x**: multi-stream layout (multiviewer-style): N video panes + leaderboard, draggable/resizable, picture-in-picture, saved presets.
- **v2**: stat overlays (shot tracer / SG per shot) where public APIs allow; hole map with player positions.

## Open-source hygiene

- No client names, no internal company paths
- No API keys (none needed for v0)
- No tracking
- All copy uses generic "user" / "you", not the author's name
- README pitches the project; SPEC documents the design; both are public-facing
