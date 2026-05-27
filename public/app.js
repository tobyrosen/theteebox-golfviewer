import { ADAPTERS, getAdapter } from "./adapters/index.js";

const REFRESH_MS = 60_000;

const $ = (sel) => document.querySelector(sel);

const els = {
  tour: $("#tour"),
  scoresUrl: $("#scoresUrl"),
  ytUrl: $("#ytUrl"),
  ytFrame: $("#ytFrame"),
  videoEmpty: $("#videoEmpty"),
  refreshBtn: $("#refreshNow"),
  pauseBtn: $("#togglePause"),
  fontToggle: $("#fontToggle"),
  shortcutHelp: $("#shortcutHelp"),
  shortcutOverlay: $("#shortcutOverlay"),
  shortcutClose: $("#shortcutClose"),
  shortcutBackdrop: $("#shortcutBackdrop"),
  status: $("#status"),
  scoresMeta: $("#scoresMeta"),
  scoresTitle: $("#scoresTitle"),
  scoresEmpty: $("#scoresEmpty"),
  tableWrap: $("#tableWrap"),
  scoresPane: document.querySelector(".pane.scores"),
  videoPane: document.querySelector(".pane.video"),
  divider: $("#divider"),
  split: document.querySelector(".split"),
  findBroadcasts: $("#findBroadcasts"),
};

let timer = null;
let paused = false;

// --- persistence ---
const STORE_KEY = "teebox.v1";
const stored = (() => {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
  } catch {
    return {};
  }
})();

function persist() {
  const data = {
    tour: els.tour.value,
    scoresUrl: els.scoresUrl.value.trim(),
    ytUrl: els.ytUrl.value.trim(),
    splitPct: splitPct,
  };
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch {
    /* private mode etc */
  }
}

// --- tour selector ---
for (const a of ADAPTERS) {
  const opt = document.createElement("option");
  opt.value = a.id;
  opt.textContent = a.name;
  els.tour.appendChild(opt);
}
if (stored.tour && ADAPTERS.some((a) => a.id === stored.tour)) {
  els.tour.value = stored.tour;
}

function applyAdapterDefaults({ keepScoresUrl = false } = {}) {
  const a = getAdapter(els.tour.value);
  if (!keepScoresUrl) els.scoresUrl.value = a.defaultUrl || "";
  els.scoresTitle.textContent = a.name;
  const q = a.broadcastSearch || `${a.name} live`;
  els.findBroadcasts.href = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
}
els.tour.addEventListener("change", () => {
  applyAdapterDefaults();
  persist();
  loadScores();
});
els.scoresUrl.addEventListener("change", () => {
  persist();
  loadScores();
});

// --- youtube ---
function youtubeIdFromUrl(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (u.hostname === "youtu.be") return u.pathname.slice(1) || null;
    if (u.hostname === "youtube.com" || u.hostname === "www.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(embed|live|shorts)\/([^/]+)/);
      if (m) return m[2];
    }
  } catch {
    /* fall through */
  }
  return null;
}

function applyYoutube() {
  const id = youtubeIdFromUrl(els.ytUrl.value.trim());
  if (!id) {
    els.ytFrame.hidden = true;
    els.ytFrame.src = "about:blank";
    els.videoEmpty.hidden = false;
    return;
  }
  const src = `https://www.youtube.com/embed/${id}?autoplay=0&modestbranding=1&rel=0`;
  if (els.ytFrame.dataset.src !== src) {
    els.ytFrame.src = src;
    els.ytFrame.dataset.src = src;
  }
  els.ytFrame.hidden = false;
  els.videoEmpty.hidden = true;
}

let ytDebounce;
els.ytUrl.addEventListener("input", () => {
  clearTimeout(ytDebounce);
  ytDebounce = setTimeout(() => {
    applyYoutube();
    persist();
  }, 250);
});

// --- scores ---
let failCount = 0;
let loadScoresController = null;
const MAX_FAILS = 5;

async function loadScores() {
  if (loadScoresController) loadScoresController.abort();
  loadScoresController = new AbortController();
  const adapter = getAdapter(els.tour.value);
  const url = els.scoresUrl.value.trim();
  if (!url) {
    showScoresMessage(
      'Pick a tour from the dropdown above. For All Thailand Golf Tour, expand "Data source" and paste the scoring URL.',
      "idle",
    );
    setStatus("ready", "idle");
    return;
  }
  setStatus("loading…", "live");
  els.tableWrap.classList.add("loading");
  try {
    const html = await fetchProxied(url, loadScoresController.signal);
    const data = adapter.parse(html);
    renderTable(data);
    failCount = 0;
    setStatus(`updated ${formatTime(new Date())}`, "live");
  } catch (err) {
    if (err.name === "AbortError") return;
    failCount++;
    if (failCount >= MAX_FAILS) {
      showScoresMessage(
        "Leaderboard unavailable after multiple attempts. Auto-refresh is still running — or click Refresh to try now.",
        "error",
      );
      setStatus("unavailable", "error");
    } else {
      showScoresMessage(friendlyError(err), "error");
      setStatus("error", "error");
    }
  } finally {
    els.tableWrap.classList.remove("loading");
  }
}

function friendlyError(err) {
  const msg = String((err && err.message) || err);
  if (msg.includes("proxy 403")) {
    return "This data source isn't available. Try a different tour or check the URL.";
  }
  if (msg.includes("proxy 502") || msg.includes("Upstream fetch failed")) {
    return "Couldn't reach the scoring site — it may be down, or the URL is wrong. Check the URL and try again in a minute.";
  }
  if (msg.includes("proxy 400")) {
    return "The proxy didn't like that URL. Make sure it's a full https://… link.";
  }
  return msg;
}

function showScoresMessage(text, kind = "idle") {
  clear(els.tableWrap);
  const div = document.createElement("div");
  div.className = `empty${kind === "error" ? " empty-error" : ""}`;
  div.textContent = text;
  els.tableWrap.appendChild(div);
  els.scoresMeta.textContent = "";
}

async function fetchProxied(url, signal) {
  const res = await fetch(`/proxy?url=${encodeURIComponent(url)}`, { signal });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`proxy ${res.status}: ${body || res.statusText}`);
  }
  return res.text();
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function holeClass(score, par) {
  if (par != null) {
    const strokes = parseInt(score, 10);
    if (!isNaN(strokes)) {
      if (strokes < par) return "hole-under";
      if (strokes === par) return "hole-par";
      return "hole-over";
    }
  }
  // score is a differential (ESPN) or par unknown — use sign-based coloring
  const s = String(score).trim();
  if (s.startsWith("-")) return "hole-under";
  if (s === "E" || s === "0") return "hole-par";
  if (/^\+?\d/.test(s)) return "hole-par"; // raw stroke count, par unknown → neutral
  return "hole-par";
}

function buildExpandRow(rounds, colSpan) {
  const tr = document.createElement("tr");
  tr.className = "expand-row";
  tr.hidden = true;
  const td = document.createElement("td");
  td.colSpan = colSpan;
  const grid = document.createElement("div");
  grid.className = "rounds-grid";
  for (const rd of rounds) {
    const cell = document.createElement("div");
    cell.className = "round-cell";
    const label = document.createElement("div");
    label.className = "round-label";
    label.textContent = rd.label;
    const score = document.createElement("div");
    score.className = `round-score ${holeClass(rd.score, rd.par ?? null)}`;
    score.textContent = rd.score;
    cell.appendChild(label);
    cell.appendChild(score);
    grid.appendChild(cell);
  }
  td.appendChild(grid);
  tr.appendChild(td);
  return tr;
}

function renderTable({ columns, rows }) {
  clear(els.tableWrap);

  if (!rows.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "no rows parsed";
    els.tableWrap.appendChild(empty);
    els.scoresMeta.textContent = "0 players";
    return;
  }

  const table = document.createElement("table");
  table.className = "lb";

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  for (const c of columns) {
    const th = document.createElement("th");
    th.textContent = c.label || "";
    if (c.width) th.style.width = `${c.width}px`;
    headRow.appendChild(th);
  }
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const r of rows) {
    const tr = document.createElement("tr");
    let playerTd = null;
    for (const c of columns) {
      const td = document.createElement("td");
      const val = r[c.key] ?? "";
      td.textContent = val;
      if (c.align === "left") {
        td.classList.add("player");
        playerTd = td;
      }
      if (c.key === "score" || c.key === "today")
        td.classList.add(scoreClass(val));
      if (c.key === "country") {
        td.textContent = "";
        const span = document.createElement("span");
        span.className = "country-flag";
        span.textContent = val;
        td.appendChild(span);
      }
      tr.appendChild(td);
    }

    const hasRounds = r.expand && r.expand.length > 0;
    if (hasRounds && playerTd) {
      playerTd.classList.add("expandable");
      const expandRow = buildExpandRow(r.expand, columns.length);
      playerTd.addEventListener("click", () => {
        const open = !expandRow.hidden;
        expandRow.hidden = open;
        playerTd.classList.toggle("is-expanded", !open);
      });
      tbody.appendChild(tr);
      tbody.appendChild(expandRow);
    } else {
      tbody.appendChild(tr);
    }
  }
  table.appendChild(tbody);

  els.tableWrap.appendChild(table);
  els.scoresMeta.textContent = `${rows.length} players`;
}

function scoreClass(v) {
  if (typeof v !== "string") return "score-even";
  const s = v.trim();
  if (s.startsWith("-")) return "score-neg";
  if (s === "E" || s === "0") return "score-even";
  if (/^\+?\d/.test(s)) return "score-pos";
  return "score-even";
}

function formatTime(d) {
  return d.toTimeString().slice(0, 8);
}

function setStatus(text, kind) {
  els.status.textContent = text;
  els.status.className = `status ${kind || ""}`;
}

// --- refresh loop ---
function startTimer() {
  stopTimer();
  if (paused) return;
  timer = setInterval(loadScores, REFRESH_MS);
}
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

els.refreshBtn.addEventListener("click", loadScores);
els.pauseBtn.addEventListener("click", () => {
  paused = !paused;
  els.pauseBtn.textContent = paused ? "▶ Resume" : "⏸ Pause";
  if (paused) stopTimer();
  else startTimer();
});

// --- font size ---
const FONT_SIZES = ["compact", "normal", "large"];
const FONT_KEY = "teebox.fontsize";
let fontIdx = Math.max(0, FONT_SIZES.indexOf(safeGet(FONT_KEY) || "normal"));

function applyFontSize() {
  els.scoresPane.dataset.fontsize = FONT_SIZES[fontIdx];
  safeSet(FONT_KEY, FONT_SIZES[fontIdx]);
  els.fontToggle.title = `Font size: ${FONT_SIZES[fontIdx]} (click to cycle)`;
}
applyFontSize();

els.fontToggle.addEventListener("click", () => {
  fontIdx = (fontIdx + 1) % FONT_SIZES.length;
  applyFontSize();
});

// --- keyboard shortcuts ---
function toggleShortcuts() {
  els.shortcutOverlay.hidden = !els.shortcutOverlay.hidden;
}

els.shortcutHelp.addEventListener("click", toggleShortcuts);
els.shortcutClose.addEventListener("click", toggleShortcuts);
els.shortcutBackdrop.addEventListener("click", toggleShortcuts);

document.addEventListener("keydown", (e) => {
  if (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "SELECT" ||
    e.target.tagName === "TEXTAREA"
  )
    return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;

  switch (e.key) {
    case "r":
    case "R":
      e.preventDefault();
      loadScores();
      break;
    case "f":
    case "F":
      e.preventDefault();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        els.videoPane.requestFullscreen().catch(() => {});
      }
      break;
    case "[":
      e.preventDefault();
      applySplit(splitPct - 5);
      persist();
      break;
    case "]":
      e.preventDefault();
      applySplit(splitPct + 5);
      persist();
      break;
    case "a":
    case "A":
      if (e.shiftKey) break;
      e.preventDefault();
      fontIdx = (fontIdx + 1) % FONT_SIZES.length;
      applyFontSize();
      break;
    case "?":
      e.preventDefault();
      toggleShortcuts();
      break;
    case "Escape":
      if (!els.shortcutOverlay.hidden) {
        e.preventDefault();
        els.shortcutOverlay.hidden = true;
      }
      break;
  }
});

// --- resizer ---
let dragging = false;
let splitPct = typeof stored.splitPct === "number" ? stored.splitPct : 50;
function applySplit(pct) {
  splitPct = Math.max(20, Math.min(80, pct));
  els.split.style.setProperty("--left", `${splitPct}fr`);
  els.split.style.setProperty("--right", `${100 - splitPct}fr`);
}
applySplit(splitPct);

els.divider.addEventListener("mousedown", (e) => {
  e.preventDefault();
  dragging = true;
  document.body.style.cursor = "col-resize";
});
window.addEventListener("mouseup", () => {
  if (dragging) persist();
  dragging = false;
  document.body.style.cursor = "";
});
window.addEventListener("mousemove", (e) => {
  if (!dragging) return;
  applySplit((e.clientX / window.innerWidth) * 100);
});

// --- boot ---
if (stored.scoresUrl) els.scoresUrl.value = stored.scoresUrl;
if (stored.ytUrl) els.ytUrl.value = stored.ytUrl;
applyAdapterDefaults({ keepScoresUrl: !!stored.scoresUrl });
applyYoutube();
loadScores();
startTimer();

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
    persist();
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
