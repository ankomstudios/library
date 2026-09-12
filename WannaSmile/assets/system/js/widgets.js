"use strict";

(() => {
  const SHEETS_URL    = "https://script.google.com/macros/s/AKfycbyZxKfF569T-iExBHEpAbMEc1jyoR_8Yf3g0CWUqOF75zgQKdeMtYtxgf0F-D4Bxr-7/exec?type=widgets";
  const SELECTION_KEY = "ws_selected_widgets"; // set by store.html: array of widget ids, in pick order
  const ACTIVE_KEY    = "ws_active_widget";    // which of those ids is currently "loaded" into the bubble

  const ICON_CLOSE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><line x1='18' y1='6' x2='6' y2='18' stroke='white' stroke-width='2.5' stroke-linecap='round'/><line x1='6' y1='6' x2='18' y2='18' stroke='white' stroke-width='2.5' stroke-linecap='round'/></svg>";

  const GAP = 12;

  const bubble       = document.getElementById("wsWidgetBubble");
  const panel        = document.getElementById("wsWidgetPanel");
  const frameWrap    = document.getElementById("wsWidgetFrameWrap");
  const closeBtn     = document.getElementById("wsWidgetCloseBtn");
  const minBtn       = document.getElementById("wsWidgetMinBtn");
  const fsBtn        = document.getElementById("wsWidgetFsBtn");
  const resizeHandle = document.getElementById("wsWidgetResizeHandle");
  const icon         = document.getElementById("wsWidgetIcon");

  if (!bubble || !panel) return;

  // Hidden staging area for widgets' iframes that aren't currently shown —
  // this is what makes "minimize, not close" mean something across a swap:
  // the previous widget's iframe keeps running off-screen instead of being
  // torn down, so flipping back to it resumes instantly instead of reloading.
  const keepAlive = document.createElement("div");
  keepAlive.style.cssText = "position:fixed;width:0;height:0;overflow:hidden;pointer-events:none;";
  document.body.appendChild(keepAlive);

  let carousel     = [];      // ordered configs for the user's selected widgets
  let currentIndex = -1;      // which one is currently loaded into the bubble/panel
  let state         = "closed"; // closed | open | minimized
  let isFullscreen  = false;
  let savedStyle    = {};

  const iframeCache = new Map(); // widgetId -> persistent iframe element

  let dragging = false, moved = false, dOffX = 0, dOffY = 0;
  let resizing = false, resizeOnLeft = false;
  let rStartX = 0, rStartY = 0, rStartW = 0, rStartH = 0, rStartPanelLeft = 0, rStartPanelTop = 0;

  function currentCfg() {
    return currentIndex >= 0 ? carousel[currentIndex] : null;
  }

  function shadow2From(sh) {
    const m = sh.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/i);
    return m ? `rgba(${m[1]},${m[2]},${m[3]},0.3)` : sh;
  }

  function applyCurrentWidgetVisuals() {
    const cfg = currentCfg();
    if (!cfg) return;
    const root = document.documentElement;
    const bg = cfg["background-color"] || "#ff5a00";
    const sh = cfg["shadow-color"]     || "rgba(255,90,0,0.65)";
    root.style.setProperty("--ws-widget-bg",      bg);
    root.style.setProperty("--ws-widget-shadow1", sh);
    root.style.setProperty("--ws-widget-shadow2", shadow2From(sh));
    bubble.setAttribute("aria-label", "Open " + (cfg["widget-name"] || cfg.id));
    if (state !== "open") icon.src = cfg["widget-icon"] || "";
  }

  function getOrCreateIframe(cfg) {
    let el = iframeCache.get(cfg.id);
    if (!el) {
      el = document.createElement("iframe");
      el.className = "ws-widget-iframe";
      el.src       = cfg["widget-url"] || "";
      el.loading   = "eager";
      el.allow     = "fullscreen; autoplay";
      iframeCache.set(cfg.id, el);
    }
    return el;
  }

  function attachIframeForCurrent() {
    const cfg = currentCfg();
    if (!cfg) return;
    // Park whatever's currently shown (if anything, and if it isn't already
    // this widget) in the keep-alive area instead of destroying it.
    const showing = frameWrap.firstElementChild;
    if (showing && showing !== iframeCache.get(cfg.id)) {
      keepAlive.appendChild(showing);
    }
    const el = getOrCreateIframe(cfg);
    if (el.parentElement !== frameWrap) frameWrap.appendChild(el);
  }

  function evictCurrentIframe() {
    const cfg = currentCfg();
    if (!cfg) return;
    const el = iframeCache.get(cfg.id);
    if (el) {
      el.src = "about:blank";
      try { el.remove(); } catch (_) {}
      iframeCache.delete(cfg.id);
    }
  }

  function iframePointers(on) {
    const el = frameWrap.firstElementChild;
    if (el) el.style.pointerEvents = on ? "auto" : "none";
  }

  function applyState() {
    if (state === "closed") {
      panel.style.display = "none";
      applyCurrentWidgetVisuals();
    } else if (state === "open") {
      panel.style.display = "flex";
      icon.src = ICON_CLOSE;
      requestAnimationFrame(() => requestAnimationFrame(positionPanel));
    } else {
      panel.style.display = "none";
      applyCurrentWidgetVisuals();
    }
  }

  function openPanel() {
    if (!currentCfg()) return;
    attachIframeForCurrent();
    state = "open";
    applyState();
  }
  function minimizePanel() {
    if (isFullscreen) exitFullscreen(false);
    state = "minimized";
    applyState();
  }
  function closePanel() {
    if (isFullscreen) exitFullscreen(false);
    state = "closed";
    applyState();
    evictCurrentIframe();
  }

  function positionPanel() {
    if (state !== "open" || isFullscreen) return;
    const wRect = bubble.getBoundingClientRect();
    const wCentreX = wRect.left + wRect.width / 2;
    const onLeft   = wCentreX < window.innerWidth / 2;
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const wCentreY = wRect.top + wRect.height / 2;
    let top = wCentreY - ph / 2;
    top = Math.max(8, Math.min(top, vh - ph - 8));
    let left;
    if (onLeft) { left = wRect.right + GAP; left = Math.min(left, vw - pw - 8); }
    else        { left = wRect.left - pw - GAP; left = Math.max(8, left); }
    panel.style.left   = left + "px";
    panel.style.top    = top  + "px";
    panel.style.right  = "auto";
    panel.style.bottom = "auto";
    resizeHandle.dataset.side = onLeft ? "right" : "left";
  }

  // ---- fullscreen mirror controls (see previous note: guarantees the
  // buttons stay reachable even if the widget's own iframe content tries
  // to draw over the in-panel ones while fullscreened) ----
  const btnsOverlay = document.createElement("div");
  Object.assign(btnsOverlay.style, {
    position: "fixed", top: "10px", right: "10px",
    display: "none", gap: "5px", zIndex: "2147483647",
    pointerEvents: "all", transition: "opacity .25s,transform .25s",
    opacity: "0", transform: "translateY(-6px)", flexDirection: "row",
  });
  [fsBtn, minBtn, closeBtn].forEach((orig) => {
    const clone = orig.cloneNode(true);
    clone.dataset.mirrorOf = orig.id;
    clone.addEventListener("click", (e) => { e.stopPropagation(); orig.click(); });
    btnsOverlay.appendChild(clone);
  });
  document.body.appendChild(btnsOverlay);

  function syncOverlay() {
    btnsOverlay.querySelectorAll("[data-mirror-of]").forEach((clone) => {
      const orig = document.getElementById(clone.dataset.mirrorOf);
      clone.textContent = orig.textContent;
      clone.title = orig.title;
    });
  }
  function showOverlay() {
    btnsOverlay.style.display       = "flex";
    btnsOverlay.style.opacity       = "1";
    btnsOverlay.style.transform     = "translateY(0)";
    btnsOverlay.style.pointerEvents = "all";
  }
  function hideOverlay() {
    btnsOverlay.style.opacity       = "0";
    btnsOverlay.style.transform     = "translateY(-6px)";
    btnsOverlay.style.pointerEvents = "none";
    setTimeout(() => { if (btnsOverlay.style.opacity === "0") btnsOverlay.style.display = "none"; }, 260);
  }

  function enterFullscreen() {
    savedStyle = {
      width:  panel.style.width  || "",
      height: panel.style.height || "",
      top:    panel.style.top    || "",
      left:   panel.style.left   || "",
      right:  panel.style.right  || "",
      bottom: panel.style.bottom || "",
    };
    panel.classList.add("ss-fullscreen");
    isFullscreen = true;
    fsBtn.textContent = "⊠"; fsBtn.title = "Exit Fullscreen";
    syncOverlay(); showOverlay();
    document.body.style.overflow = "hidden";
  }
  function exitFullscreen(reapply) {
    panel.classList.remove("ss-fullscreen");
    Object.assign(panel.style, savedStyle);
    isFullscreen = false;
    fsBtn.textContent = "⛶"; fsBtn.title = "Fullscreen";
    syncOverlay(); hideOverlay();
    document.body.style.overflow = "";
    if (reapply !== false) applyState();
  }

  document.addEventListener("mousemove", (e) => {
    if (!isFullscreen) return;
    if (e.clientY < 60) showOverlay(); else hideOverlay();
  });

  fsBtn.addEventListener("click",    (e) => { e.stopPropagation(); if (state === "open") { isFullscreen ? exitFullscreen() : enterFullscreen(); } });
  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); closePanel(); });
  minBtn.addEventListener("click",   (e) => { e.stopPropagation(); minimizePanel(); });

  bubble.addEventListener("click", () => {
    if (moved) { moved = false; return; }
    if      (state === "closed")    openPanel();
    else if (state === "open")      minimizePanel();
    else                             { state = "open"; applyState(); }
  });

  bubble.addEventListener("mousedown", (e) => {
    dragging = true; moved = false;
    const rect = bubble.getBoundingClientRect();
    dOffX = e.clientX - rect.left;
    dOffY = e.clientY - rect.top;
    bubble.style.right  = "auto";
    bubble.style.bottom = "auto";
    bubble.style.left   = rect.left + "px";
    bubble.style.top    = rect.top  + "px";
    iframePointers(false);
    e.preventDefault();
  });

  bubble.addEventListener("touchstart", (e) => {
    dragging = true; moved = false;
    const t = e.touches[0];
    const rect = bubble.getBoundingClientRect();
    dOffX = t.clientX - rect.left;
    dOffY = t.clientY - rect.top;
    bubble.style.right  = "auto";
    bubble.style.bottom = "auto";
    bubble.style.left   = rect.left + "px";
    bubble.style.top    = rect.top  + "px";
    iframePointers(false);
  }, { passive: true });

  resizeHandle?.addEventListener("mousedown", (e) => {
    if (isFullscreen) return;
    e.preventDefault();
    e.stopPropagation();
    resizing     = true;
    resizeOnLeft = (resizeHandle.dataset.side === "left");
    rStartX      = e.clientX;
    rStartY      = e.clientY;
    rStartW      = panel.offsetWidth;
    rStartH      = panel.offsetHeight;
    const pRect     = panel.getBoundingClientRect();
    rStartPanelLeft = pRect.left;
    rStartPanelTop  = pRect.top;
    iframePointers(false);
  });

  document.addEventListener("mousemove", (e) => {
    if (dragging) {
      moved = true;
      const x = Math.max(0, Math.min(e.clientX - dOffX, window.innerWidth  - bubble.offsetWidth));
      const y = Math.max(0, Math.min(e.clientY - dOffY, window.innerHeight - bubble.offsetHeight));
      bubble.style.left = x + "px";
      bubble.style.top  = y + "px";
      positionPanel();
    }
    if (resizing) {
      const dx = e.clientX - rStartX;
      const dy = e.clientY - rStartY;
      const newH = Math.max(320, Math.min(rStartH + dy, window.innerHeight * 0.85));
      panel.style.height = newH + "px";
      if (resizeOnLeft) {
        const newW    = Math.max(260, Math.min(rStartW - dx, window.innerWidth * 0.9));
        const newLeft = rStartPanelLeft + rStartW - newW;
        panel.style.width = newW    + "px";
        panel.style.left  = Math.max(8, newLeft) + "px";
      } else {
        const newW = Math.max(260, Math.min(rStartW + dx, window.innerWidth * 0.9));
        panel.style.width = newW + "px";
      }
    }
  });

  document.addEventListener("touchmove", (e) => {
    if (!dragging) return;
    moved = true;
    const t = e.touches[0];
    const x = Math.max(0, Math.min(t.clientX - dOffX, window.innerWidth  - bubble.offsetWidth));
    const y = Math.max(0, Math.min(t.clientY - dOffY, window.innerHeight - bubble.offsetHeight));
    bubble.style.left = x + "px";
    bubble.style.top  = y + "px";
    positionPanel();
  }, { passive: true });

  document.addEventListener("mouseup", () => {
    if (dragging || resizing) iframePointers(true);
    if (dragging) { dragging = false; setTimeout(() => { moved = false; }, 0); }
    if (resizing) resizing = false;
  });

  document.addEventListener("touchend", () => {
    if (dragging) iframePointers(true);
    dragging = false;
    setTimeout(() => { moved = false; }, 0);
  });

  panel.addEventListener("wheel", (e) => { e.stopPropagation(); }, { passive: true });
  window.addEventListener("resize", () => positionPanel());

  // ---- the +/- carousel: swaps which widget's DATA is loaded into this
  // one bubble/panel, rather than opening a separate window per widget ----

  function showCarouselHint() {
    const cfg = currentCfg();
    if (!cfg) return;
    let hint = document.getElementById("wsCarouselHint");
    if (!hint) {
      hint = document.createElement("div");
      hint.id = "wsCarouselHint";
      hint.className = "ws-widget-carousel-hint";
      document.body.appendChild(hint);
    }
    hint.textContent = `${cfg["widget-name"] || cfg.id}  (${currentIndex + 1}/${carousel.length})`;
    hint.classList.add("show");
    clearTimeout(hint._t);
    hint._t = setTimeout(() => hint.classList.remove("show"), 1400);
  }

  function cycle(direction) {
    if (isFullscreen) return;
    if (!carousel.length) return;

    currentIndex = currentIndex === -1
      ? (direction > 0 ? 0 : carousel.length - 1)
      : (currentIndex + direction + carousel.length) % carousel.length;

    try { localStorage.setItem(ACTIVE_KEY, carousel[currentIndex].id); } catch {  }

    applyCurrentWidgetVisuals();
    if (state === "open") attachIframeForCurrent(); // live swap, stays open — "auto opens back up"
    showCarouselHint();
  }

  document.addEventListener("keydown", (e) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if (!carousel.length) return;

    if (e.key === "+" || e.key === "=") { e.preventDefault(); cycle(1); }
    else if (e.key === "-")             { e.preventDefault(); cycle(-1); }
  });

  async function init() {
    let widgets = [];
    try {
      const res = await fetch(bustCache(SHEETS_URL), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      widgets = await res.json();
      if (!Array.isArray(widgets)) throw new Error("Widget feed did not return an array.");
    } catch (err) {
      console.error("[Widgets] Failed to load widget list:", err);
      widgets = [];
    }

    window._availableWidgets = widgets;

    let selected;
    try { selected = JSON.parse(localStorage.getItem(SELECTION_KEY) || "[]"); }
    catch { selected = []; }
    if (!Array.isArray(selected)) selected = [];

    carousel = selected.map(id => widgets.find(w => w.id === id)).filter(Boolean);

    if (!carousel.length) {
      bubble.classList.remove("visible");
      return;
    }

    bubble.classList.add("visible");

    const savedActiveId = localStorage.getItem(ACTIVE_KEY);
    const savedIdx = carousel.findIndex(w => w.id === savedActiveId);
    currentIndex = savedIdx !== -1 ? savedIdx : 0;

    applyCurrentWidgetVisuals();
  }

  init();
})();
