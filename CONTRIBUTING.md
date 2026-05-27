# Contributing to Teebox

Teebox is small and meant to stay readable. The goal is for someone to clone it and understand the whole codebase in 15 minutes.

## Project ethos

- Zero runtime dependencies — Node built-ins only on the server, vanilla JS in the browser
- One feature per file where possible
- Adapters are pure functions: `(html) => { columns, rows }`
- Anything that requires more than a tiny proxy belongs in a separate process, not in this repo

## Adding a tour adapter

Most contributions will be new tour adapters. Drop a file under `public/adapters/`:

```js
// public/adapters/mytour.js
function parse(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  // ... extract rows ...
  return {
    columns: [
      { key: "pos", label: "Pos", align: "center", width: 56 },
      { key: "score", label: "Score", align: "center", width: 64 },
      { key: "player", label: "Player", align: "left" },
      { key: "thru", label: "Thru", align: "center", width: 56 },
      { key: "today", label: "Today", align: "center", width: 64 },
    ],
    rows: [
      { pos: "1", score: "-5", player: "Player Name", thru: "7", today: "-5" },
      // ...
    ],
  };
}

export default {
  id: "mytour",
  name: "My Tour",
  defaultUrl: "https://example.com/leaderboard",
  broadcastSearch: '"My Tour" live',
  parse,
};
```

Then register it in `public/adapters/index.js`:

```js
import mytour from "./mytour.js";
export const ADAPTERS = [allthailand, mytour, custom];
```

And add the host to `server/allowlist.json`:

```json
{ "hosts": ["www.example.com"] }
```

That's it. No build step, no imports to wire, no manifest.

## Style

- 2-space indent
- Single quotes
- ES modules
- Prefer `const`, then `let`, never `var`
- Small functions over big ones
- No comments that just restate the code; do leave a comment when something is non-obvious or load-bearing

## Testing

There's no test framework yet. Manual checklist before opening a PR:

- [ ] `node server/index.js` boots cleanly
- [ ] <http://localhost:8787> loads
- [ ] Your adapter renders rows correctly with a real URL
- [ ] No `localStorage` keys other than `teebox.*`
- [ ] No new dependencies added to `package.json`

If you want to add a test framework, propose it in an issue first.

## Pull requests

- One feature per PR
- Title in imperative mood ("Add LIV Golf adapter")
- Describe the source URL pattern in the PR body
- Screenshots are appreciated for visible changes

## License

By contributing, you agree your contributions will be licensed under the MIT license that covers this project.
