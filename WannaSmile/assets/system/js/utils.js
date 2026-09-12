"use strict";

const clamp    = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
const delay    = (ms) => new Promise((r) => setTimeout(r, ms));
const safeStr  = (v) => (v == null ? "" : String(v));
const rafAsync = () => new Promise((r) => requestAnimationFrame(r));

// Asset-sheet "link" cells are meant to always be an external game URL,
// but a bare domain like "ankomstudios.github.io./library/x/index.html"
// (no scheme) is indistinguishable from a relative path to a browser —
// window.open()/a.href would resolve it against the current page instead
// of treating it as external. Sheet data entry will keep making this
// mistake, so fix it here once rather than trusting every row to have
// typed "https://" — anything that already has a scheme (or is
// blob:/data:) passes through untouched.
function normalizeExternalLink(link) {
  const s = safeStr(link).trim();
  if (!s || /^[a-z][a-z0-9+.-]*:/i.test(s)) return s;
  return `https://${s}`;
}

// Derives the local library/<name>/icon.png path a same-repo dev server
// would be able to serve for a given asset "link"
// (.../library/<name>/index.html), so the image loader has something to
// try before giving up to the generic placeholder — useful while icons
// are still being imported port-by-port and most don't have a hosted
// icon.png yet. Returns "" if the link doesn't match the expected shape.
//
// This page (WannaSmile/index.html) lives one directory below the repo
// root (theonethousandth-main), with library/ as WannaSmile's *sibling*,
// not its child — so the path has to climb out with "../" first, or a
// browser resolving it relative to this page's own URL would go looking
// for a library/ folder inside WannaSmile itself and never find it.
function localIconFallback(link) {
  const m = safeStr(link).match(/\/library\/(.+\/)?index\.html?(?:[?#].*)?$/i);
  return m ? `../library/${m[1] || ""}icon.png` : "";
}

function truncateText(text, max = 26) {
  text = safeStr(text);
  return text.length > max ? text.slice(0, max) + "..." : text;
}

// Google's edge in front of Apps Script /exec deployments can serve a cached response
// regardless of the client's Cache-Control header, so `{cache:"no-store"}` alone isn't
// reliable for live-editable sheet endpoints. Appending a unique query string per request
// guarantees a cache miss everywhere (browser, proxy, and Google's own edge), since caches
// key on the full URL including the query string.
function bustCache(url) {
  return `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`;
}

// Reads a field off a sheet-derived row object case/format-insensitively,
// so header text like "Category", "categories", or "Sub-Category" all match
// regardless of exact spelling used in the spreadsheet.
function getFieldCI(row, ...names) {
  if (!row || typeof row !== "object") return "";
  const normalize = (s) => s.toLowerCase().replace(/[\s_-]/g, "");
  const wanted = names.map(normalize);
  for (const key of Object.keys(row)) {
    if (wanted.includes(normalize(key))) {
      const v = row[key];
      if (v != null && String(v).trim()) return String(v);
    }
  }
  return "";
}

function fitInputText(el, text, { max = 14, min = 10, step = 0.5 } = {}) {
  if (!el) return;
  text = safeStr(text);

  if (!text) { el.style.fontSize = max + "px"; return; }

  const canvas = fitInputText._canvas || (fitInputText._canvas = document.createElement("canvas"));
  const ctx    = canvas.getContext("2d");
  const cs     = getComputedStyle(el);
  const available = el.clientWidth
    - (parseFloat(cs.paddingLeft)  || 0)
    - (parseFloat(cs.paddingRight) || 0);

  if (available <= 0) return;

  let size = max;
  while (size > min) {
    ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    if (ctx.measureText(text).width <= available) break;
    size -= step;
  }
  el.style.fontSize = size + "px";
}

function debounce(fn, ms = 150) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const _collator   = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const fastCompare = (a, b) => _collator.compare(a, b);

const getSortMode = () => localStorage.getItem("sortMode") || "sheet";

window.showToast = function showToast(message, timeout = 2200) {
  let t = document.getElementById("__ws_toast__");
  if (!t) {
    t = document.createElement("div");
    t.id = "__ws_toast__";
    Object.assign(t.style, {
      position:      "fixed",
      bottom:        "28px",
      left:          "50%",
      transform:     "translateX(-50%)",
      background:    "rgba(0,0,0,0.8)",
      color:         "#fff",
      padding:       "10px 14px",
      borderRadius:  "8px",
      fontFamily:    "monospace",
      zIndex:        "99999",
      opacity:       "0",
      transition:    "opacity 220ms ease",
      pointerEvents: "none",
    });
    document.body.appendChild(t);
  }
  clearTimeout(t.__timer);
  t.textContent   = message;
  t.style.opacity = "1";
  t.__timer = setTimeout(() => {
    t.style.opacity = "0";
    setTimeout(() => t.remove(), 300);
  }, timeout);
};

const showToast = window.showToast;