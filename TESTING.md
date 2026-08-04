# Test gates

Run the repository gate with Node 22:

```bash
npm ci
npm run test:gate
```

The gate unit-tests the shared ESPN leaderboard normalization and adapter
registry, then parses every shipped server and browser JavaScript file with
Node's syntax checker.

## Full harness follow-up

A full app harness needs a real browser runner (for example, Playwright), an
ephemeral server port, and a deterministic HTTPS scoring upstream or an
injectable proxy fetch. It should exercise tour selection, YouTube URL
handling, refresh/abort behavior, leaderboard rendering, persistence, and
proxy allowlist/redirect enforcement without calling live tour services.
