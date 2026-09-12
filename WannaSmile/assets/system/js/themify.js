"use strict";

const DEFAULT_THEME    = "redux";
const DEFAULT_GIF_SIZE = 128;

const THEME_CACHE_KEY    = "ws_theme_cache";     // { [id]: rawRowArray }
const THEME_SHORTCUT_KEY = "ws_selected_themes"; // [id, id, ...] up to 9, pick order

// Declared up front (rather than near _injectAllThemes further down) so it's
// already initialized for the IIFEs later in this file that call
// _resolveTheme() before the sheet fetch has even started.
let _themeData = [];

const _SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbyZxKfF569T-iExBHEpAbMEc1jyoR_8Yf3g0CWUqOF75zgQKdeMtYtxgf0F-D4Bxr-7/exec?type=themes";

const _COL = {
  name: 0,
  id:   1,
  type: 2,
  scrollType: 18,
  vars: [
    "--header-bg",

    "--quote-bg",

    "--main-bg",

    "--footer-bg",

    "--aside-bg",

    "--text-color",

    "--url-color",

    "--quote-color",

    "--accent-color",

    "--search-bg",

    "--search-text",

    "--search-placeholder",

    "--icon-bg",

    "--shadow-color",

    "--trench-color",

  ],
};

const _ROOT_CSS = `:root {
  --header-bg: url("https://raw.githubusercontent.com/01110010-00110101/themeify/main/redux/Redux-headerbg.png");
  --quote-bg: url("https://raw.githubusercontent.com/01110010-00110101/themeify/main/redux/Redux-quotebg.png");
  --main-bg: url("https://raw.githubusercontent.com/01110010-00110101/themeify/main/redux/Redux-mainbg.png");
  --footer-bg: url("https://wannasmile4evr.github.io./assets/media/themes/redux/footerbg.png");
  --aside-bg: rgba(0, 0, 0, 0.95);
  --text-color: #000;
  --url-color: #fff;
  --quote-color: #fff;
  --accent-color: #ff4444;
  --search-bg: #f0f0f0;
  --search-text: #333;
  --search-placeholder: #888;
  --icon-bg: #333;
  --shadow-color: rgba(0, 0, 0, 0.3);
  --trench-color: #000;
}`;

const _BG_VAR_NAMES = new Set([
  "--main-bg", "--body-bg", "--bg", "--background",
  "--header-bg", "--footer-bg", "--sidebar-bg",
  "--quote-bg", "--aside-bg",
]);

function _isCSSColor(val) {
  const v = (val || "").trim();
  if (!v || v === "none" || v === "inherit" || v === "transparent") return false;
  return (
    /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(v) ||
    /^rgb[a]?\s*\(/.test(v) ||
    /^hsl[a]?\s*\(/.test(v) ||
    /^(aliceblue|antiquewhite|aqua|aquamarine|azure|beige|bisque|black|blanchedalmond|blue|blueviolet|brown|burlywood|cadetblue|chartreuse|chocolate|coral|cornflowerblue|cornsilk|crimson|cyan|darkblue|darkcyan|darkgoldenrod|darkgray|darkgreen|darkgrey|darkkhaki|darkmagenta|darkolivegreen|darkorange|darkorchid|darkred|darksalmon|darkseagreen|darkslateblue|darkslategray|darkslategrey|darkturquoise|darkviolet|deeppink|deepskyblue|dimgray|dimgrey|dodgerblue|firebrick|floralwhite|forestgreen|fuchsia|gainsboro|ghostwhite|gold|goldenrod|gray|green|greenyellow|grey|honeydew|hotpink|indianred|indigo|ivory|khaki|lavender|lavenderblush|lawngreen|lemonchiffon|lightblue|lightcoral|lightcyan|lightgoldenrodyellow|lightgray|lightgreen|lightgrey|lightpink|lightsalmon|lightseagreen|lightskyblue|lightslategray|lightslategrey|lightsteelblue|lightyellow|lime|limegreen|linen|magenta|maroon|mediumaquamarine|mediumblue|mediumorchid|mediumpurple|mediumseagreen|mediumslateblue|mediumspringgreen|mediumturquoise|mediumvioletred|midnightblue|mintcream|mistyrose|moccasin|navajowhite|navy|oldlace|olive|olivedrab|orange|orangered|orchid|palegoldenrod|palegreen|paleturquoise|palevioletred|papayawhip|peachpuff|peru|pink|plum|powderblue|purple|red|rosybrown|royalblue|saddlebrown|salmon|sandybrown|seagreen|seashell|sienna|silver|skyblue|slateblue|slategray|slategrey|snow|springgreen|steelblue|tan|teal|thistle|tomato|turquoise|violet|wheat|white|whitesmoke|yellow|yellowgreen)$/i.test(v)
  );
}

function _normalizeBgValue(val) {
  const v = (val || "").trim();
  if (!v) return v;
  if (/^url\s*\(\s*['"]{0,1}\s*['"]{0,1}\s*\)$/.test(v)) return "";
  if (/^url\s*\(/.test(v) || /^(linear|radial|conic)-gradient/.test(v)) return v;
  if (_isCSSColor(v)) return v;

  if (v.startsWith("data:")) return `url("${v}")`;
  if (/\.(png|jpe?g|gif|webp|svg|avif)(\?.*)?$/i.test(v)) return `url("${v}")`;
  if (/^https?:\/\//i.test(v)) return `url("${v}")`;
  return v;
}

function _applyCustomVars(vars) {
  if (!vars || typeof vars !== "object") return;
  for (const [k, v] of Object.entries(vars)) {
    const normalized = _BG_VAR_NAMES.has(k) ? _normalizeBgValue(v) : v;
    document.documentElement.style.setProperty(k, normalized);
  }
}

const _CDURL_PREFIX = "CDURL2:";

const _CDURL_MIME = [
  "data:image/png;base64,",
  "data:image/jpeg;base64,",
  "data:image/gif;base64,",
  "data:image/webp;base64,",
  "data:image/svg+xml;base64,",
  "data:image/avif;base64,",
  "data:image/bmp;base64,",
];

function _isCDURL(v) {
  if (typeof v !== "string") return false;
  if (!v.startsWith(_CDURL_PREFIX)) return false;
  const body = v.slice(_CDURL_PREFIX.length);

  if (body.length < 8) return false;

  const mimeIdx = parseInt(body[0], 16);
  if (isNaN(mimeIdx) || mimeIdx >= _CDURL_MIME.length) return false;

  if (body[1] !== "0") return false;

  if (!/^[A-Za-z0-9\-_]+$/.test(body.slice(2))) return false;
  return true;
}

function _b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function _bytesToB64(arr) {
  let s = "";
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return btoa(s);
}

async function _inflate(bytes) {
  const ds = new DecompressionStream("deflate");
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();
  const chunks = [];
  const reader = ds.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.length; }
  return out;
}

async function _decodeCDURL(token) {
  const body     = token.slice(_CDURL_PREFIX.length);
  const mimeIdx  = parseInt(body[0], 16);
  const payload  = body.slice(2);
  const mime     = _CDURL_MIME[mimeIdx];
  const compressed = _b64urlToBytes(payload);
  const raw        = await _inflate(compressed);
  return mime + _bytesToB64(raw);
}

async function _maybeDecode(val) {
  if (!val || typeof val !== "string") return val;
  const v = val.trim();

  if (
    v.startsWith("https://") ||
    v.startsWith("http://")  ||
    v.startsWith("data:")    ||
    v.startsWith("url(")     ||
    /^(linear|radial|conic)-gradient/.test(v) ||
    _isCSSColor(v)
  ) return v;

  if (v.startsWith(_CDURL_PREFIX)) {
    if (!_isCDURL(v)) {
      console.warn("[themify] CDURL2 token failed validation, skipping decode:", v.slice(0, 32) + "…");
      return v;
    }
    try {
      return await _decodeCDURL(v);
    } catch (err) {
      console.warn("[themify] CDURL2 decode failed, using raw value:", err.message);
      return v;
    }
  }

  return v;
}

function setFavicon(url) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = (url && url.startsWith("http")) ? url : (url ? `assets/system/${url}` : "");
}

(function applyGlobalCloak() {
  if (localStorage.getItem("cloakEnabled") !== "true") return;
  const savedTitle = localStorage.getItem("cloakTitle");
  const savedIcon  = localStorage.getItem("cloakIcon");
  if (savedTitle) document.title = savedTitle;
  if (savedIcon)  setFavicon(savedIcon);
})();

// Small local cache of full theme rows (keyed by id), refreshed after every
// successful fetch for whichever ids actually matter (active + shortcuts) —
// see fetchThemes(). Lets a returning user's theme paint instantly instead
// of always flashing the hardcoded redux fallback while the network fetch
// is in flight.
function _getThemeCache() {
  try {
    const v = JSON.parse(localStorage.getItem(THEME_CACHE_KEY) || "{}");
    return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
  } catch (_) { return {}; }
}

function _getCachedRow(id) {
  const key = (id || "").trim().toLowerCase();
  if (!key) return null;
  return _getThemeCache()[key] || null;
}

function _cacheThemeRows(rows, ids) {
  const wanted = new Set(ids.map(id => (id || "").trim().toLowerCase()).filter(Boolean));
  const next = {};
  for (const row of rows) {
    const id = (row[_COL.id] || "").toString().trim().toLowerCase();
    if (id && wanted.has(id)) next[id] = row;
  }
  try { localStorage.setItem(THEME_CACHE_KEY, JSON.stringify(next)); } catch (_) {}
}

// A theme id is "known" — and therefore trusted as the html[theme] attribute
// value — once it shows up in the live fetch or in the local cache from a
// prior session. Replaces the old hardcoded 10-id allowlist, which silently
// rejected every theme added to the sheet since (this was the actual cause
// of new themes looking "disabled": nothing outside that fixed list could
// ever be resolved to anything but DEFAULT_THEME).
function _knownThemeIds() {
  const ids = new Set([DEFAULT_THEME]);
  for (const row of _themeData) {
    const id = (row[_COL.id] || "").toString().trim().toLowerCase();
    if (id) ids.add(id);
  }
  for (const id of Object.keys(_getThemeCache())) ids.add(id);
  return ids;
}

function _resolveTheme(raw) {
  const t = (raw || "").trim().toLowerCase();
  return _knownThemeIds().has(t) ? t : DEFAULT_THEME;
}

(function applyGlobalTheme() {
  const raw   = localStorage.getItem("selectedTheme");
  const theme = raw ? raw.trim() : DEFAULT_THEME;

  if (!raw) localStorage.setItem("selectedTheme", DEFAULT_THEME);

  document.documentElement.setAttribute("theme", theme);

  if (theme === "custom") {
    try {
      _applyCustomVars(JSON.parse(localStorage.getItem("customTheme") || "{}"));
    } catch (_) {}
  }
})();

window.addEventListener("storage", (e) => {
  if (e.key === "cloakTitle") { if (localStorage.getItem("cloakEnabled") === "true") document.title = e.newValue || document.title; }
  if (e.key === "cloakIcon")  { if (localStorage.getItem("cloakEnabled") === "true") setFavicon(e.newValue || ""); }

  if (e.key === "selectedTheme") {
    const t = (e.newValue || "").trim() || DEFAULT_THEME;
    document.documentElement.setAttribute("theme", t);
    if (t !== "custom") document.documentElement.style.cssText = "";
  }

  if (e.key === "customTheme" && e.newValue) {
    try { _applyCustomVars(JSON.parse(e.newValue)); } catch (_) {}
  }
});

function applyTheme(id) {
  const t = (id || "").trim() || DEFAULT_THEME;
  document.documentElement.setAttribute("theme", t);
  try { localStorage.setItem("selectedTheme", t); } catch (_) {}
  if (typeof window.applyThemeGifs === "function") window.applyThemeGifs(t);
}

// Gif packs are a separate customization axis from themes (and unrelated to
// the sticker-pack system in quotes.js, which decorates quote *text* — these
// are the loading/loaded/searching/held/drop/crash/ded loader animations).
// Each pack is a local, on-disk asset set, independently selectable and
// swappable, not tied to whichever theme happens to be active.
//
// Data comes from GifPacksWS (?type=gifpacks) — deliberately minimal there:
// no `src` column, just "width|height|pixelated" per state cell, since every
// pack already lives at a predictable assets/media/gifs/${id}/${state}.gif
// path. Parsed into the same {id, name, states} shape used everywhere below.
const _GIFPACK_SHEETS_URL =
  "https://script.google.com/macros/s/AKfycbyZxKfF569T-iExBHEpAbMEc1jyoR_8Yf3g0CWUqOF75zgQKdeMtYtxgf0F-D4Bxr-7/exec?type=gifpacks";

const GIF_PACK_ACTIVE_KEY    = "ws_active_gifpack";
const GIF_PACK_CACHE_KEY     = "ws_gifpack_cache";    // { [id]: {id,name,states} }
const GIF_PACK_SELECTION_KEY = "ws_selected_gifpacks"; // set by store.html: cycle order for [ / ]
const DEFAULT_GIF_PACK       = "redux";
const GIF_STATE_KEYS         = ["loading", "loaded", "searching", "held", "drop", "crash", "ded"];

// Same instant-paint idea as the theme cache above: seeded synchronously from
// whatever was cached last session, so the loader gif renders in the correct
// pack immediately instead of always flashing redux while the live fetch is
// still in flight. Refreshed for real once _loadGifPacks() resolves below.
function _getGifPackCache() {
  try {
    const v = JSON.parse(localStorage.getItem(GIF_PACK_CACHE_KEY) || "{}");
    return (v && typeof v === "object" && !Array.isArray(v)) ? v : {};
  } catch (_) { return {}; }
}

function _cacheGifPacks(packs, ids) {
  const wanted = new Set(ids.map(id => (id || "").trim().toLowerCase()).filter(Boolean));
  const next = {};
  for (const id of Object.keys(packs)) {
    if (wanted.has(id)) next[id] = packs[id];
  }
  try { localStorage.setItem(GIF_PACK_CACHE_KEY, JSON.stringify(next)); } catch (_) {}
}

let _gifPacks = _getGifPackCache(); // { [id]: {id,name,states} } — cache until the live fetch replaces it

function _gifPacksKnown() {
  return Object.keys(_gifPacks).length > 0;
}

function _parseGifPackRow(row) {
  const id = (row.id || "").toString().trim().toLowerCase();
  if (!id) return null;

  const states = {};
  GIF_STATE_KEYS.forEach(key => {
    const cell = (row[key] || "").toString().trim();
    if (!cell) return;

    const [wRaw, hRaw, pixRaw] = cell.split("|").map(s => (s || "").trim());
    const width  = parseInt(wRaw, 10);
    const height = parseInt(hRaw, 10);
    if (!Number.isFinite(width) || !Number.isFinite(height)) return;

    states[key] = {
      src: `assets/media/gifs/${id}/${key}.gif`,
      width,
      height,
      pixelated: (pixRaw || "").toLowerCase() !== "false",
    };
  });

  return { id, name: (row.name || id).toString().trim(), states };
}

function _loadGifPacks() {
  return fetch(bustCache(_GIFPACK_SHEETS_URL), { cache: "no-store" })
    .then(r => r.json())
    .then(rows => {
      if (!Array.isArray(rows)) throw new Error("Gif pack feed did not return an array.");
      const map = {};
      rows.forEach(row => {
        const pack = _parseGifPackRow(row);
        if (pack) map[pack.id] = pack;
      });
      _gifPacks = map;

      // Keep the local cache warm for whatever's actually in play: the active
      // pack (so next load can paint it instantly, see the bootstrap IIFE
      // below and index.html's preload script) and the user's cycle set.
      const activeId = getActiveGifPack();
      let selected = [];
      try { selected = JSON.parse(localStorage.getItem(GIF_PACK_SELECTION_KEY) || "[]"); } catch (_) {}
      if (!Array.isArray(selected)) selected = [];
      _cacheGifPacks(map, [activeId, ...selected]);

      // Reconcile whatever's already on screen now that real sizes/pixelation
      // data is in — the bootstrap call below only had the cache to go on.
      if (typeof window.applyThemeGifs === "function") {
        window.applyThemeGifs(document.documentElement.getAttribute("theme"));
      }
    })
    .catch(err => {
      console.warn("[themify] Failed to load gif packs:", err.message);
      // Leave _gifPacks as whatever was cached from last session rather than
      // clobbering it with {} — a failed fetch shouldn't undo a good cache.
    });
}

function getActiveGifPack() {
  const id = (localStorage.getItem(GIF_PACK_ACTIVE_KEY) || DEFAULT_GIF_PACK).trim().toLowerCase();
  if (!_gifPacksKnown()) return id; // nothing loaded yet (cache or live) — trust it, reconciled once something is
  return _gifPacks[id] ? id : DEFAULT_GIF_PACK;
}

function setActiveGifPack(id) {
  const key = (id || "").trim().toLowerCase();
  if (_gifPacksKnown() && !_gifPacks[key]) return false;
  try { localStorage.setItem(GIF_PACK_ACTIVE_KEY, key); } catch (_) {}
  if (typeof window.applyThemeGifs === "function") {
    window.applyThemeGifs(document.documentElement.getAttribute("theme"));
  }
  return true;
}

window.GifPacks = {
  list: () => Object.values(_gifPacks || {}).map(p => ({ id: p.id, name: p.name })),
  getActive: getActiveGifPack,
  getName: (id) => (_gifPacks || {})[(id || "").trim().toLowerCase()]?.name || id,
  setActive: setActiveGifPack,
};

// `theme` is kept as a parameter purely so every existing call site (both in
// this file and in main.js/ui.js) keeps working unchanged — gifs no longer
// come from the active theme, they come from the active gif pack.
function getThemeGif(theme, key) {
  const packs  = _gifPacks || {};
  const chosen = (packs[getActiveGifPack()] || {}).states?.[key]
    || (packs[DEFAULT_GIF_PACK] || {}).states?.[key]
    || null;
  return {
    src:       chosen ? chosen.src : "",
    w:         chosen ? chosen.width  : DEFAULT_GIF_SIZE,
    h:         chosen ? chosen.height : DEFAULT_GIF_SIZE,
    pixelated: chosen ? chosen.pixelated !== false : true,
  };
}

function getThemeGifSrc(theme, key) {
  return getThemeGif(theme, key).src;
}

function applyGifToImg(img, theme, key) {
  if (!img) return;
  const { src, w, h, pixelated } = getThemeGif(theme, key);
  if (src) img.src = src;
  img.style.setProperty("--gif-w", `${w}px`);
  img.style.setProperty("--gif-h", `${h}px`);
  img.style.imageRendering = pixelated ? "pixelated" : "auto";
  img.dataset.gifState = key;
}

window.applyThemeGifs = function (theme) {
  const loaderImg = document.querySelector("#containerLoader img");
  if (loaderImg) {
    const currentState = loaderImg.dataset.gifState || "loading";
    applyGifToImg(loaderImg, theme, currentState);
  }
  const searchGif = document.getElementById("noResultsGif");
  if (searchGif) applyGifToImg(searchGif, theme, "searching");
};

window.setLoaderState = function (state) {
  const img = document.querySelector("#containerLoader img");
  applyGifToImg(img, null, state);
};

(function () {
  const img = document.querySelector("#containerLoader img");
  if (img) applyGifToImg(img, null, "loading");
  _loadGifPacks();
})();

let _styleEl   = null;

function _getStyleEl() {
  if (!_styleEl) {
    _styleEl = document.getElementById("ws-themes");
    if (!_styleEl) {
      _styleEl = document.createElement("style");
      _styleEl.id = "ws-themes";
      document.head.prepend(_styleEl);
    }
  }
  return _styleEl;
}

async function _normalizeSheetVal(raw) {
  const v = (raw || "").toString().trim();
  if (!v) return "";
  const decoded = await _maybeDecode(v);
  return _normalizeBgValue(decoded);
}

async function _buildThemeBlock(row) {
  const id = (row[_COL.id] || "").toString().trim();
  if (!id) return "";

  const declPairs = await Promise.all(
    _COL.vars.map(async (varName, i) => {
      const val = await _normalizeSheetVal(row[3 + i]);
      return val ? `  ${varName}: ${val};` : "";
    })
  );

  // scroll-type: "allow" lets the background scroll with the page; anything
  // else (including blank) leaves it fixed, which is already the sitewide
  // default in main.css, so only "allow" needs an explicit override here.
  const scrollType = (row[_COL.scrollType] || "").toString().trim().toLowerCase();
  if (scrollType === "allow") declPairs.push("  background-attachment: scroll;");

  const decls = declPairs.filter(Boolean).join("\n");
  if (!decls) return "";
  return `html[theme="${id}"] {\n${decls}\n}`;
}

async function _injectAllThemes(rows) {
  const built = await Promise.all(rows.map(_buildThemeBlock));
  const blocks = built.filter(Boolean).join("\n\n");
  _getStyleEl().textContent = _ROOT_CSS + (blocks ? "\n\n" + blocks : "");
}

async function fetchThemes(forceRefresh) {
  try {
    const res  = await fetch(bustCache(_SHEETS_URL), { cache: "no-store" });
    const json = await res.json();

    if (!Array.isArray(json)) throw new Error(json.error || "Unexpected API response");

    _themeData = json;
    await _injectAllThemes(_themeData);

    // Keep the local cache warm for whatever's actually in play: the active
    // theme (so the next load can paint it instantly, see bootSheets()) and
    // the user's chosen shortcuts (so switching among them doesn't need a
    // network round trip either). Anything no longer active/selected drops
    // out on its own since _cacheThemeRows rewrites the cache from scratch.
    const activeTheme = _resolveTheme(document.documentElement.getAttribute("theme"));
    let selected = [];
    try { selected = JSON.parse(localStorage.getItem(THEME_SHORTCUT_KEY) || "[]"); } catch (_) {}
    if (!Array.isArray(selected)) selected = [];
    _cacheThemeRows(_themeData, [activeTheme, ...selected]);

  } catch (err) {
    console.warn("[themify] Sheets fetch failed:", err.message);

  }
}

function getThemeData() { return _themeData; }

function getThemeId(index) {
  const row = _themeData[index];
  if (!row) return null;
  const id   = (row[_COL.id]   || "").toString().trim();
  const type = (row[_COL.type] || "").toString().trim().toLowerCase();
  return (id && type !== "soon") ? id : null;
}

// Best-effort display name for a theme id — checks the local row cache
// first (works even before/without a live fetch), then whatever's already
// been fetched this session. Falls back to the id itself.
function getCachedThemeName(id) {
  const key = (id || "").trim().toLowerCase();
  if (!key) return id;
  const cached = _getCachedRow(key);
  if (cached) return (cached[_COL.name] || key).toString();
  const row = _themeData.find(r => (r[_COL.id] || "").toString().trim().toLowerCase() === key);
  return row ? (row[_COL.name] || key).toString() : key;
}

window.ThemifySheets = { applyTheme, fetchThemes, getThemeData, getThemeId, getCachedThemeName };

(async function bootSheets() {
  // Paint the last-known theme immediately from the local cache, if we have
  // one, instead of always flashing the hardcoded redux fallback while the
  // network fetch below is still in flight.
  const cachedRow = _getCachedRow(_resolveTheme(localStorage.getItem("selectedTheme")));
  const cachedBlock = cachedRow ? await _buildThemeBlock(cachedRow) : "";
  _getStyleEl().textContent = _ROOT_CSS + (cachedBlock ? "\n\n" + cachedBlock : "");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => fetchThemes(false));
  } else {
    fetchThemes(false);
  }
})();