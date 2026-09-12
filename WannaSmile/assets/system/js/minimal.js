"use strict";

// Minimal view: shows just link + title (+ status filtering) per item,
// one page at a time — from whichever endpoint is CURRENTLY ACTIVE
// (window._activeFetchUrl, i.e. respects the DevBuild toggle) rather than
// always fetching both AssetBuilderWS and DevBuildWS. No extra wrapper
// divs — one row per item, straight into the existing #container — and
// paging reuses the same prev/next arrows and page indicator already on
// the page instead of building a separate pagination system.
//
// Search also overrides paging exactly like it does in the normal card
// view (see filterAssets in main.js): typing a query shows every match
// across all pages at once instead of just the current page, hides the
// prev/next arrows, and sets the indicator to "Searching all pages…";
// clearing the query goes back to normal per-page display.
document.addEventListener("DOMContentLoaded", () => {
  const btn           = document.getElementById("minimal-btn");
  const container     = document.getElementById("container");
  const pageIndicator = document.querySelector(".page-indicator");
  const searchInput   = document.getElementById("searchInputHeader");
  const searchIdToggle = document.getElementById("searchIdToggle");
  if (!btn || !container) return;

  const KEY = "ws_minimalView";
  let active    = localStorage.getItem(KEY) === "true";
  let savedHTML = null;
  let items     = [];   // [{link, title, page, status}]
  let pages     = [];   // sorted unique page numbers
  let pageIdx   = 0;

  let _origPrev = null;
  let _origNext = null;

  function withParam(url, key, val) {
    if (!url) return url;
    return `${url}${url.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(val)}`;
  }

  async function fetchMinimal() {
    const url = window._activeFetchUrl || window.config?.sheetUrl;
    if (!url) return [];
    try {
      const res = await fetch(bustCache(withParam(url, "action", "links")), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      console.error("[minimal view] fetch failed:", err);
      return [];
    }
  }

  function makeRow(it) {
    const row = document.createElement("a");
    row.className   = "minimal-row";
    row.href        = normalizeExternalLink(it.link);
    row.target      = "_blank";
    row.rel         = "noopener";
    row.textContent = safeStr(it.title).trim() || "untitled";
    return row;
  }

  function renderList(list) {
    container.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (const it of list) frag.appendChild(makeRow(it));
    container.appendChild(frag);
  }

  function setPagesAnchorVisible(visible) {
    const pagesAnchor = document.querySelector(".pages-anchor");
    if (pagesAnchor) pagesAnchor.style.visibility = visible ? "" : "hidden";
  }

  function renderCurrentPage() {
    const pageNum = pages[pageIdx];
    renderList(items.filter(it => (Number(it.page) || 1) === pageNum));
    setPagesAnchorVisible(true);
    if (pageIndicator) pageIndicator.textContent = `Page ${pageIdx + 1}/${pages.length || 1}`;
  }

  // Mirrors filterAssets()'s search-overrides-paging behavior: a non-empty
  // query matches across the WHOLE loaded set regardless of page, and
  // "id" mode (the shared # toggle) matches against the link instead of
  // the title — same distinction the normal search makes.
  function filterMinimal(query) {
    const q = safeStr(query).toLowerCase().trim();
    if (!q) { renderCurrentPage(); return; }

    const useLink = searchIdToggle?.classList.contains("active");
    const words = q.split(/\s+/);
    const matches = items.filter(it => {
      const haystack = (useLink ? safeStr(it.link) : safeStr(it.title)).toLowerCase();
      return haystack.includes(q) || words.some(w => haystack.includes(w));
    });

    renderList(matches);
    setPagesAnchorVisible(false);
    if (pageIndicator) pageIndicator.textContent = "Searching all pages…";
  }

  function minimalPrev() {
    if (!pages.length) return;
    pageIdx = pageIdx <= 0 ? pages.length - 1 : pageIdx - 1;
    renderCurrentPage();
  }

  function minimalNext() {
    if (!pages.length) return;
    pageIdx = pageIdx >= pages.length - 1 ? 0 : pageIdx + 1;
    renderCurrentPage();
  }

  async function showMinimal() {
    if (savedHTML === null) savedHTML = container.innerHTML;
    _origPrev = window.prevPage;
    _origNext = window.nextPage;
    window.prevPage = minimalPrev;
    window.nextPage = minimalNext;

    document.body.classList.add("ws-loading");
    const raw = await fetchMinimal();
    document.body.classList.remove("ws-loading");
    document.getElementById("containerLoader")?.remove();

    items = raw.filter(it => {
      const s = safeStr(it.status).toLowerCase();
      if (s === "hide" || s === "hidden") return false;
      if (s.split("|").map(x => x.trim()).includes("ignore")) return false;
      return true;
    });
    pages = [...new Set(items.map(it => Number(it.page) || 1))].sort((a, b) => a - b);
    pageIdx = 0;
    const saved = +sessionStorage.getItem("currentPage");
    if (saved) {
      const i = pages.indexOf(saved);
      if (i !== -1) pageIdx = i;
    }

    filterMinimal(searchInput ? searchInput.value : "");
  }

  function restoreNormal() {
    if (_origPrev) window.prevPage = _origPrev;
    if (_origNext) window.nextPage = _origNext;
    if (savedHTML !== null) {
      container.innerHTML = savedHTML;
      savedHTML = null;
    }
    setPagesAnchorVisible(true);
    if (typeof window.renderPage === "function") window.renderPage();
  }

  function updateUI() {
    btn.classList.toggle("active", active);
    btn.title = active
      ? "Showing minimal link view — click to restore normal view"
      : "Toggle minimal view (link + title, current source only)";
  }

  btn.addEventListener("click", async () => {
    active = !active;
    localStorage.setItem(KEY, String(active));
    updateUI();
    if (active) await showMinimal();
    else restoreNormal();
  });

  searchInput?.addEventListener("input", debounce(() => {
    if (active) filterMinimal(searchInput.value);
  }, 200));

  // The shared # toggle changes what "id mode" search matches against —
  // re-run the current query so switching it mid-search re-filters
  // immediately, same as the normal view does.
  searchIdToggle?.addEventListener("click", () => {
    if (active && searchInput) filterMinimal(searchInput.value);
  });

  updateUI();
  if (active) showMinimal();
});
