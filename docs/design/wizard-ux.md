# First-Launch Wizard — UX Design

> **Status:** implemented in v0.1. This doc captures the design rationale and is preserved as a reference.

Local Teebox dashboard, first-clone experience. 3 steps, modal overlay, dark theme, vanilla JS. Skippable. Dismissed once via `localStorage["teebox.welcomed"] = "1"`.

## Goals

- First open feels intentional, not blank.
- User leaves the wizard with: a tour selected, the leaderboard already loading, and (if pasted) a YouTube URL applied.
- Never reappears after dismissal.

---

## Steps — verbatim copy

### Step 1 — Pick a tour

- Title: `Pick a tour`
- Body: `Teebox renders any leaderboard through a tour adapter. Pick one to start — you can switch later.`
- Control: same `<select>` markup as the header tour dropdown (mirrored, not moved). Default selection = first registered adapter (`allthailand`).
- Buttons: `Skip` (left, ghost) · `Next →` (right, primary).

### Step 2 — Drop a YouTube URL (optional)

- Title: `Drop a YouTube URL`
- Body: `Paste a broadcast link — or skip and use the broadcast-search shortcut later.`
- Control: `<input type="url">` styled exactly like the header field. Placeholder: `https://youtube.com/watch?v=…`
- Helper line below input: `No URL? No problem. You'll get a "Find broadcasts on YouTube" button on the next screen.`
- Buttons: `Back` · `Skip` · `Next →`.

### Step 3 — You're set

- Title: `You're set`
- Body (3 short lines, each on its own line):
  - `Leaderboard refreshes every 60 seconds.`
  - `Drag the divider to resize panes.`
  - `Hit ↻ to refresh now, ⏸ to pause.`
- Buttons: `Back` · `Start watching` (primary).
- Clicking `Start watching` writes the localStorage flag, applies wizard state to the live UI, and dismisses.

---

## ASCII mockup (representative — step 1)

```text
┌────────────────────────────────────────────────────────────────────┐
│  ████ dimmed teebox layout behind the modal (rgba 0,0,0,0.55) ████  │
│                                                                    │
│      ┌──────────────────────────────────────────────────┐          │
│      │  ●  Teebox                              ✕        │          │
│      │  ─────────────────────────────────────────────   │          │
│      │                                                  │          │
│      │  PICK A TOUR                                     │          │
│      │                                                  │          │
│      │  Teebox renders any leaderboard through a        │          │
│      │  tour adapter. Pick one to start — you can       │          │
│      │  switch later.                                   │          │
│      │                                                  │          │
│      │  ┌──────────────────────────────────────────┐    │          │
│      │  │ All Thailand Golf Tour              ▾    │    │          │
│      │  └──────────────────────────────────────────┘    │          │
│      │                                                  │          │
│      │                                  ● ○ ○           │          │
│      │  [ Skip ]                       [ Next → ]       │          │
│      └──────────────────────────────────────────────────┘          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

`● ○ ○` = step indicator (filled dot = current). Step 2 = `○ ● ○`. Step 3 = `○ ○ ●`.
Modal width 480px, vertically centered, 28px padding, radius 10px, 1px `--line` border, background `--panel`, shadow `0 24px 64px rgba(0,0,0,0.55)`.

---

## State machine

Single flag: `localStorage["teebox.welcomed"]`.

```text
boot
 │
 ├─ flag === "1"  ──► do nothing, wizard stays hidden
 │
 └─ flag missing ──► show wizard at step 1
                     │
                     ├─ Next → step 2 → step 3
                     ├─ Back ← step 2 ← step 3
                     ├─ Skip / Esc / ✕  ──► commitAndClose() at any step
                     └─ "Start watching" ──► commitAndClose()

commitAndClose():
  - apply tour selection to header <select>
  - if YT URL non-empty AND parses to a video id, set header input + applyYoutube()
  - localStorage.setItem("teebox.welcomed", "1")
  - hide overlay, restore focus to header tour <select>
  - call loadScores()  (always — leaderboard should be loading by the time wizard goes away)
```

Edge cases:

- **User closes mid-wizard (Esc / ✕ / Skip on step 1):** flag is still set to `"1"`. Whatever fields they touched are committed. If they touched nothing, the default tour from `applyAdapterDefaults()` is what loads — same as no-wizard behavior. Wizard does not re-prompt.
- **User clears storage:** wizard returns on next load. By design — clearing storage is "fresh slate" and we honor it.
- **User reloads mid-wizard without dismissing:** flag is not yet set, wizard reopens at step 1. Acceptable — no partial-state recovery.
- **JS disabled / localStorage blocked:** wizard never sets flag, will show every load. Acceptable for v0; localStorage failure path is silent (try/catch around read+write).
- **Repeat-clone / new machine:** treated as new user. Correct.

---

## HTML to add to `index.html`

Append immediately before `<script type="module" src="app.js"></script>`:

```html
<div
  class="wizard"
  id="wizard"
  hidden
  role="dialog"
  aria-modal="true"
  aria-labelledby="wizardTitle"
>
  <div class="wizard-backdrop" data-wizard-dismiss></div>
  <div class="wizard-card" role="document">
    <header class="wizard-head">
      <div class="brand">
        <span class="dot"></span>
        <span class="name">Teebox</span>
      </div>
      <button
        class="wizard-x"
        type="button"
        data-wizard-dismiss
        aria-label="Close"
      >
        ✕
      </button>
    </header>

    <div class="wizard-body">
      <!-- Step 1 -->
      <section class="wizard-step" data-step="1">
        <h2 id="wizardTitle" class="wizard-title">Pick a tour</h2>
        <p class="wizard-copy">
          Teebox renders any leaderboard through a tour adapter. Pick one to
          start — you can switch later.
        </p>
        <label class="field grow">
          <span>Tour</span>
          <select id="wizardTour"></select>
        </label>
      </section>

      <!-- Step 2 -->
      <section class="wizard-step" data-step="2" hidden>
        <h2 class="wizard-title">Drop a YouTube URL</h2>
        <p class="wizard-copy">
          Paste a broadcast link — or skip and use the broadcast-search shortcut
          later.
        </p>
        <label class="field grow">
          <span>YouTube URL</span>
          <input
            id="wizardYt"
            type="url"
            spellcheck="false"
            autocomplete="off"
            placeholder="https://youtube.com/watch?v=…"
          />
        </label>
        <p class="wizard-hint">
          No URL? No problem. You'll get a "Find broadcasts on YouTube" button
          on the next screen.
        </p>
      </section>

      <!-- Step 3 -->
      <section class="wizard-step" data-step="3" hidden>
        <h2 class="wizard-title">You're set</h2>
        <ul class="wizard-bullets">
          <li>Leaderboard refreshes every 60 seconds.</li>
          <li>Drag the divider to resize panes.</li>
          <li>
            Hit <span class="kbd">↻</span> to refresh now,
            <span class="kbd">⏸</span> to pause.
          </li>
        </ul>
      </section>
    </div>

    <footer class="wizard-foot">
      <div class="wizard-dots" aria-hidden="true">
        <span class="wizard-dot is-active"></span>
        <span class="wizard-dot"></span>
        <span class="wizard-dot"></span>
      </div>
      <div class="wizard-actions">
        <button type="button" class="wizard-btn ghost" id="wizardBack" hidden>
          Back
        </button>
        <button
          type="button"
          class="wizard-btn ghost"
          id="wizardSkip"
          data-wizard-dismiss
        >
          Skip
        </button>
        <button type="button" class="wizard-btn primary" id="wizardNext">
          Next →
        </button>
      </div>
    </footer>
  </div>
</div>
```

Class naming follows existing convention (`bar`, `field`, `kbd`, `landing-*`).

---

## CSS additions to `styles.css`

Append at end of file:

```css
.wizard {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.wizard[hidden] {
  display: none;
}

.wizard-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

.wizard-card {
  position: relative;
  width: min(480px, calc(100vw - 32px));
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55);
  overflow: hidden;
}

.wizard-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--panel-2);
}
.wizard-x {
  background: transparent;
  border: 0;
  color: var(--muted);
  font-size: 14px;
  height: 24px;
  width: 24px;
  padding: 0;
  border-radius: 4px;
}
.wizard-x:hover {
  color: var(--text);
  background: var(--panel);
}

.wizard-body {
  padding: 24px 28px 8px;
  min-height: 200px;
}
.wizard-title {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 10px;
  letter-spacing: 0.3px;
}
.wizard-copy {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.55;
  margin: 0 0 18px;
}
.wizard-hint {
  color: var(--muted);
  font-size: 12px;
  margin: 10px 0 0;
}
.wizard-bullets {
  list-style: none;
  padding: 0;
  margin: 0;
  color: var(--text);
  font-size: 13px;
  line-height: 2;
}
.wizard-bullets li::before {
  content: "•";
  color: var(--accent-dim);
  margin-right: 10px;
}

.wizard-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--line);
  background: var(--panel);
}
.wizard-dots {
  display: flex;
  gap: 6px;
}
.wizard-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line);
}
.wizard-dot.is-active {
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}

.wizard-actions {
  display: flex;
  gap: 8px;
}
.wizard-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 7px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.wizard-btn.ghost {
  background: transparent;
  color: var(--muted);
  border: 1px solid var(--line);
}
.wizard-btn.ghost:hover {
  color: var(--text);
  border-color: var(--accent-dim);
}
.wizard-btn.primary {
  background: var(--accent);
  color: #06120b;
  font-weight: 600;
  border: 1px solid transparent;
}
.wizard-btn.primary:hover {
  background: #6cf09c;
}
```

---

## JS additions to `app.js`

Append after `startTimer();` (last line of current bootstrap):

```js
// --- first-launch wizard ---
const WIZARD_KEY = "teebox.welcomed";

function safeGet(k) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function safeSet(k, v) {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* ignore */
  }
}

function initWizard() {
  if (safeGet(WIZARD_KEY) === "1") return;

  const root = document.getElementById("wizard");
  const wTour = document.getElementById("wizardTour");
  const wYt = document.getElementById("wizardYt");
  const btnBack = document.getElementById("wizardBack");
  const btnNext = document.getElementById("wizardNext");
  const dots = root.querySelectorAll(".wizard-dot");
  const steps = root.querySelectorAll(".wizard-step");
  const dismissEls = root.querySelectorAll("[data-wizard-dismiss]");

  // Mirror tour options into the wizard select
  for (const a of ADAPTERS) {
    const opt = document.createElement("option");
    opt.value = a.id;
    opt.textContent = a.name;
    wTour.appendChild(opt);
  }
  wTour.value = els.tour.value;

  let step = 1;
  const total = steps.length;

  function render() {
    steps.forEach((s) => {
      s.hidden = Number(s.dataset.step) !== step;
    });
    dots.forEach((d, i) => d.classList.toggle("is-active", i === step - 1));
    btnBack.hidden = step === 1;
    btnNext.textContent = step === total ? "Start watching" : "Next →";
    // Focus the primary control on each step
    const focusTarget = step === 1 ? wTour : step === 2 ? wYt : btnNext;
    setTimeout(() => focusTarget.focus(), 0);
  }

  function commitAndClose() {
    if (wTour.value && wTour.value !== els.tour.value) {
      els.tour.value = wTour.value;
      applyAdapterDefaults();
    }
    const yt = (wYt.value || "").trim();
    if (yt) {
      els.ytUrl.value = yt;
      applyYoutube();
    }
    safeSet(WIZARD_KEY, "1");
    root.hidden = true;
    document.removeEventListener("keydown", onKey);
    loadScores();
    els.tour.focus();
  }

  function onKey(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      commitAndClose();
      return;
    }
    if (e.key === "Tab") trapFocus(e);
  }

  // Focus trap: keep Tab cycling within the modal
  function trapFocus(e) {
    const focusables = root.querySelectorAll(
      'button:not([hidden]), select, input, [tabindex]:not([tabindex="-1"])',
    );
    const visible = Array.from(focusables).filter(
      (el) => !el.closest("[hidden]"),
    );
    if (!visible.length) return;
    const first = visible[0],
      last = visible[visible.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  btnBack.addEventListener("click", () => {
    if (step > 1) {
      step--;
      render();
    }
  });
  btnNext.addEventListener("click", () => {
    if (step < total) {
      step++;
      render();
    } else commitAndClose();
  });
  dismissEls.forEach((el) => el.addEventListener("click", commitAndClose));
  document.addEventListener("keydown", onKey);

  root.hidden = false;
  render();
}

initWizard();
```

---

## Accessibility

- `role="dialog"` + `aria-modal="true"` + `aria-labelledby="wizardTitle"` on overlay.
- Focus moves into modal on open (step 1 → tour `<select>`); on close, returns to header tour `<select>`.
- **Esc** dismisses (commits whatever is filled, sets flag).
- **Tab / Shift+Tab** trapped within the modal via `trapFocus`.
- Buttons are real `<button type="button">` — Enter/Space activate natively.
- Step dots are `aria-hidden` decorative; progress is conveyed by the `Next → / Start watching` label change.
- Backdrop click = dismiss (same path as Esc/Skip/✕).
- All text uses existing color tokens (`--muted` for secondary, `--text` for primary) — meets the same contrast as the rest of the app.
- No animations beyond browser-default focus rings; respects `prefers-reduced-motion` by virtue of having none.
