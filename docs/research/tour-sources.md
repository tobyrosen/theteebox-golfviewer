# Tour Sources Research — Teebox v0.x

Goal: identify scoring data sources for each major tour so a `~30–80 line` adapter file can normalize rows to `{ pos, score, player, country, thru, today }`.

## Headline finding — ESPN's hidden API covers 6 of 8 tours

ESPN's undocumented public API (`site.api.espn.com`) returns full leaderboard JSON for PGA, DP World (eur), LIV, LPGA, Korn Ferry (ntw), and Champions (champions-tour). No auth, CORS-permissive enough to be widely reused, and refreshed during live play. Verified league list via `https://sports.core.api.espn.com/v2/sports/golf/leagues` (returned: `pga, eur, liv, lpga, champions-tour, ntw, tgl, mens-olympics-golf, women-olympics-golf`). LET and Asian Tour are NOT in ESPN's coverage and require their own sources.

Pattern: `https://site.api.espn.com/apis/site/v2/sports/golf/{league}/scoreboard` returns `events[0].competitions[0].competitors[]`, each containing `{ athlete.displayName, athlete.flag.alt, score, linescores[] , status }`. During live tournaments `score` populates with relative-to-par; `linescores[]` contain per-round strokes; the competition-level `status` carries `period` (current round) and per-competitor hole progress when play is live.

---

## PGA Tour

- **Site**: <https://www.pgatour.com/leaderboard>
- **Approach**: API (ESPN proxy)
- **Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`
- **Auth**: none
- **Format**: JSON
- **Live**: yes (refreshes during play)
- **Difficulty**: easy
- **Notes**: pgatour.com itself is server-rendered HTML but ToS-hostile and uses an internal GraphQL (`api.pga.com/graphql`, not openly documented). ESPN feed is the path of least resistance and what most OSS scrapers use. Position field: `competitors[].status.position.id` when live; otherwise derive from `order`.
- **Adapter feasibility**: 5

## DP World Tour

- **Site**: <https://www.europeantour.com/dpworld-tour/>
- **Approach**: API (ESPN proxy, league code `eur`)
- **Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/golf/eur/scoreboard`
- **Auth**: none
- **Format**: JSON
- **Live**: yes
- **Difficulty**: easy
- **Notes**: Same shape as PGA. europeantour.com is heavily CDN/Cloudflare-protected; native scrape unwise. ESPN's `eur` feed verified as "DP World Tour 2025-26".
- **Adapter feasibility**: 5

## LIV Golf

- **Site**: <https://www.livgolf.com>
- **Approach**: API (ESPN proxy, league code `liv`)
- **Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/golf/liv/scoreboard`
- **Auth**: none
- **Format**: JSON
- **Live**: yes (individual stroke play)
- **Difficulty**: easy–medium
- **Notes**: LIV's own site is a Next.js SPA; no clean public JSON found. Critically, ESPN's feed is INDIVIDUAL leaderboard only — LIV's signature TEAM standings are not in this feed. v0 ships individual; team is a v0.x+ research item.
- **Adapter feasibility**: 4

## LPGA Tour

- **Site**: <https://www.lpga.com>
- **Approach**: API (ESPN proxy, league code `lpga`)
- **Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/golf/lpga/scoreboard`
- **Auth**: none
- **Format**: JSON
- **Live**: yes
- **Difficulty**: easy
- **Notes**: lpga.com has no documented public API.
- **Adapter feasibility**: 5

## Korn Ferry Tour

- **Site**: <https://www.pgatour.com/korn-ferry-tour/leaderboard>
- **Approach**: API (ESPN proxy, league code `ntw` — legacy "Nationwide" code)
- **Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/golf/ntw/scoreboard`
- **Auth**: none
- **Format**: JSON
- **Live**: yes
- **Difficulty**: easy
- **Notes**: Verified — `leagues[0].name = "Korn Ferry Tour"`. Code `ntw` is non-obvious; document it in the adapter.
- **Adapter feasibility**: 5

## PGA Tour Champions

- **Site**: <https://www.pgatour.com/pgatour-champions/leaderboard>
- **Approach**: API (ESPN proxy, league code `champions-tour`)
- **Endpoint**: `https://site.api.espn.com/apis/site/v2/sports/golf/champions-tour/scoreboard`
- **Auth**: none
- **Format**: JSON
- **Live**: yes
- **Difficulty**: easy
- **Notes**: Verified — `leagues[0].name = "PGA TOUR Champions"`. 54-hole format; `linescores` has 3 periods.
- **Adapter feasibility**: 5

## Asian Tour

- **Site**: <https://www.asiantour.com/leaderboard/>
- **Approach**: scrape (or reverse-engineer OCS feed)
- **Endpoint**: Front-end is an Angular SPA; the embedded leaderboard widget at `https://wp-asiantour.ocs-sport.com/leaderboard/` calls OCS Sport endpoints of the form `https://asiantour-live.ocs-asia.com/tic/tmticx.cgi?...` and `tmscores.cgi?tourn={code}~season={code}~enhanced=Y~jsout=x`. Endpoint signatures extracted from the live `app.js` (`/wp-content/themes/ocs-quantum/js/app.js`).
- **Auth**: none observed, but my unauthenticated curl probes returned 404 — likely needs correct Referer/Origin headers, or the host requires a different sub-path. Needs DevTools session against a live event to capture the exact URL.
- **Format**: JSON-ish (`jsout=x` flag converts XSL output to JSON)
- **Live**: yes (uses socket.io for real-time push)
- **Difficulty**: medium-hard
- **Notes**: OCS Sport powers many tours globally — same vendor as LET. If we crack one, we likely get both. Tournament codes are 4-letter (e.g. `BDIP`); season codes look like `216S`. ESPN does not cover Asian Tour. Sky Sports embeds a third-party widget — not a clean source.
- **Adapter feasibility**: 2

## Ladies European Tour

- **Site**: <https://ladieseuropeantour.com/leaderboard/>
- **Approach**: scrape (OCS feed, same vendor as Asian Tour)
- **Endpoint**: Powered by `https://live-let.ocs-software.com/` (OCS Sport white-label, sister system to Asian Tour's `ocs-asia.com`). Same `tmticx.cgi` / `tmscores.cgi` URL pattern expected. Public ladieseuropeantour.com returns 403 to bots — would need browser-style headers.
- **Auth**: none, but anti-bot in front of the public site
- **Format**: JSON (via OCS) or HTML scrape from `live-let.ocs-software.com/tournaments/`
- **Live**: yes
- **Difficulty**: medium-hard
- **Notes**: ESPN does not cover LET. Engineering effort = ~1 OCS adapter shared with Asian Tour, parameterized by host + tour code.
- **Adapter feasibility**: 2

---

## Summary table — ranked by feasibility

| Rank | Tour             | Source                | Effort                      |
| ---- | ---------------- | --------------------- | --------------------------- |
| 1    | PGA Tour         | ESPN `pga`            | 1 hour                      |
| 1    | LPGA             | ESPN `lpga`           | 1 hour                      |
| 1    | DP World         | ESPN `eur`            | 1 hour                      |
| 1    | Korn Ferry       | ESPN `ntw`            | 1 hour                      |
| 1    | PGA Champions    | ESPN `champions-tour` | 1 hour                      |
| 6    | LIV (individual) | ESPN `liv`            | 1 hour                      |
| 7    | Asian Tour       | OCS Sport reverse     | 1 day +                     |
| 7    | Ladies European  | OCS Sport reverse     | 1 day + (shares Asian work) |

**Recommended v0.x roadmap**: build ONE shared `espn.js` adapter parameterized by league code → instantly covers 6 tours. Then attempt a single `ocs.js` adapter for Asian Tour + LET. Skip LIV team standings until somebody asks.

## Won't work / avoid

- **pgatour.com / europeantour.com / lpga.com direct scrape** — Cloudflare, ToS-hostile, brittle. ESPN proxy obviates the need.
- **livgolf.com direct** — Next.js SPA, no clean JSON; team scoring not in any free feed.
- **SportRadar / SportsDataIO / DataGolf paid feeds** — out of scope; this is a hobby viewer. Note for record they exist if Teebox ever needs licensed data.
- **ladieseuropeantour.com root** — 403 on bot UAs; route through `live-let.ocs-software.com` if pursuing LET.

## Prior art (GitHub)

- [joe-mcdonald/GolfProjectAPI](https://github.com/joe-mcdonald/GolfProjectAPI) — scrapes `espn.com/golf/leaderboard/_/tour/pga`. Confirms the ESPN approach is mainstream.
- [jmstjordan/PGALiveLeaderboard](https://github.com/jmstjordan/PGALiveLeaderboard) — Python ESPN scraper.
- [brett-hobbs/espn-pga-scraper](https://github.com/brett-hobbs/espn-pga-scraper) — round-by-round ESPN scraper, webhook per golfer.
- [Pratted/shotscraper](https://github.com/Pratted/shotscraper) — references the legacy `pgatour.com/data/r/{tournament_id}/{year}/{filename}.json` endpoints (still partly live but unreliable; ESPN preferred).
- [btatkinson/golf_scraper](https://github.com/btatkinson/golf_scraper) — historical PGA/Euro/Web Tour leaderboards.
- [pseudo-r/Public-ESPN-API](https://github.com/pseudo-r/Public-ESPN-API) — best general reference for ESPN's hidden endpoints.
- [coreyjs/data-golf-api](https://github.com/coreyjs/data-golf-api) — DataGolf wrapper (paid API; reference only).

No prior art found for OCS Sport (Asian Tour / LET) — pioneering work if we go there.

## Sources

- ESPN league list: verified at `https://sports.core.api.espn.com/v2/sports/golf/leagues`
- ESPN endpoints verified live: `pga`, `eur`, `liv`, `lpga`, `ntw`, `champions-tour`, `tgl` all returned HTTP 200 on `/scoreboard`
- Asian Tour endpoint patterns extracted from `https://wp-asiantour.ocs-sport.com/wp-content/themes/ocs-quantum/js/app.js`
- LET host confirmed at `https://live-let.ocs-software.com/`
- PGA Tour GraphQL playground exists at `https://api.pga.com/graphql` (undocumented, not used here)
