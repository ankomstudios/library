"use strict";

(function initScrollPersistence() {
  const saveScroll = debounce(() => {
    sessionStorage.setItem("scrollY", String(Math.round(window.scrollY)));
  }, 100);
  window.addEventListener("scroll", saveScroll, { passive: true });

  window._restoreScrollY = function () {
    const saved = parseInt(sessionStorage.getItem("scrollY") || "0", 10);
    if (!saved) return;
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        window.scrollTo({ top: saved, behavior: "instant" })
      )
    );
  };
})();

(() => {
  const PAGE_ACCEL     = 0.9;
  const PAGE_FRICTION  = 0.85;
  const PAGE_THRESHOLD = 1;
  const TAP_COOLDOWN   = 300;

  let velocity = 0, lastFlip = 0;
  const keys = { left: false, right: false };

  const canFlip = () =>
    typeof window.nextPage === "function" &&
    typeof window.prevPage === "function" &&
    performance.now() - lastFlip > TAP_COOLDOWN;

  const flipNext = () => { if (!canFlip()) return; lastFlip = performance.now(); window.nextPage(); };
  const flipPrev = () => { if (!canFlip()) return; lastFlip = performance.now(); window.prevPage(); };

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") { keys.right = true; if (!e.repeat) flipNext(); }
    if (e.key === "ArrowLeft")  { keys.left  = true; if (!e.repeat) flipPrev(); }
  });
  document.addEventListener("keyup", e => {
    if (e.key === "ArrowRight") keys.right = false;
    if (e.key === "ArrowLeft")  keys.left  = false;
  });

  (function loop() {
    if (keys.right) velocity += PAGE_ACCEL;
    if (keys.left)  velocity -= PAGE_ACCEL;
    velocity *= PAGE_FRICTION;
    if (velocity >  PAGE_THRESHOLD) { flipNext(); velocity = 0; }
    if (velocity < -PAGE_THRESHOLD) { flipPrev(); velocity = 0; }
    if (Math.abs(velocity) < 0.01) velocity = 0;
    requestAnimationFrame(loop);
  })();
})();

function initGifDrag(gif) {
  const SWAY_STRENGTH = 0.6;
  const RETURN_SPEED  = 0.08;
  const DROP_DURATION = 1600;

  const _getDragTheme = () =>
    document.documentElement.getAttribute("theme") || DEFAULT_THEME;

  let dragging = false, dropping = false;
  let mouseX = 0, mouseY = 0, lastMouseX = 0, rotation = 0;

  new MutationObserver(() => {
    if (gif.style.display !== "none") gif.style.pointerEvents = "auto";
  }).observe(gif, { attributes: true, attributeFilter: ["style"] });

  const _applyDragGif = (key) => {
    const theme = _getDragTheme();
    if (typeof applyGifToImg === "function") {
      applyGifToImg(gif, theme, key);
    } else {
      gif.src = getThemeGifSrc(theme, key) || getThemeGifSrc(theme, "searching");
    }
  };

  gif.addEventListener("mousedown", (e) => {
    if (dropping) return;
    dragging = true;
    _applyDragGif("held");
    gif.style.cursor = "grabbing";
    mouseX = e.clientX; mouseY = e.clientY; lastMouseX = mouseX;
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => { mouseX = e.clientX; mouseY = e.clientY; });

  document.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false; dropping = true;
    gif.style.cursor = "grab";
    _applyDragGif("drop");
    gif.style.top = (parseFloat(gif.style.top) || 0) + 6 + "px";
    setTimeout(() => { _applyDragGif("searching"); dropping = false; }, DROP_DURATION);
  });

  (function tick() {
    if (dragging) {
      rotation += (mouseX - lastMouseX) * SWAY_STRENGTH;
      rotation *= 0.9;
      gif.style.left = mouseX + "px";
      gif.style.top  = mouseY + "px";
    } else {
      rotation *= (1 - RETURN_SPEED);
    }
    gif.style.transform = `translate(-50%, 0) rotate(${rotation}deg)`;
    lastMouseX = mouseX;
    requestAnimationFrame(tick);
  })();
}

window.addEventListener("load", () => {
  if (typeof Crate !== "undefined") {
    new Crate({ server: "1451796462517096642", channel: "1451796463368667218" });
  }
});

(() => {

  function initElements() {
    const $ = (sel) => {
      try {
        if (!sel) return null;
        return /^[A-Za-z0-9\-_]+$/.test(sel)
          ? document.getElementById(sel)
          : document.querySelector(sel) || null;
      } catch { return null; }
    };

    const favContainer  = document.getElementById("favorites-container");
    const devContainer  = document.getElementById("dev-build-container");
    const mainContainer = document.getElementById("container");

    let resolvedContainer, containerMode;
    if (favContainer) {
      resolvedContainer = favContainer;
      containerMode     = "favorites";
    } else if (devContainer) {
      resolvedContainer = devContainer;
      containerMode     = "dev";
    } else {
      resolvedContainer = mainContainer;
      containerMode     = "default";
    }

    window._containerMode = containerMode;

    window.dom = {
      container:          resolvedContainer,
      pageIndicator:      $(".page-indicator") || $("#page-indicator"),
      searchInput:        $("#searchInputHeader"),
      searchBtn:          $("#searchBtnHeader"),
      searchIdToggle:     $("#searchIdToggle"),
      updatePopup:        $("#updatePopup"),
      updatePopupContent: $(".update-popup-content"),
      viewUpdateBtn:      $("#viewUpdateBtn"),
      viewUpdateInfoBtn:  $("#viewUpdateInfoBtn"),
      closeUpdateBtn:     $("#closeUpdateBtn"),
      dontShowBtn:        $("#dontShowBtn"),
      updateVideo:        $("#updateVideo"),
    };

    window.config = {
      fallbackImage:    "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/404_blank.png",
      fallbackLink:     "https://wnasmile.github.io./source/dino/",
      sheetUrl:         "https://script.google.com/macros/s/AKfycbyZxKfF569T-iExBHEpAbMEc1jyoR_8Yf3g0CWUqOF75zgQKdeMtYtxgf0F-D4Bxr-7/exec",
      devBuildUrl:      "https://script.google.com/macros/s/AKfycbzsAzJ69x4UisB54qWIXzJEG6Y6Xt8BniYUDl8PdLUPytjP8lkrmwzNVRHj6FZMK9w5/exec?type=devbuild",
    };

    window.stickerManifest = {
      "airluv": "MeltGui-pack/airluv.webp",
      "angel": "MeltGui-pack/angel.webp",
      "angry": "MeltGui-pack/angry.gif",
      "bahh": "MeltGui-pack/bahh.gif",
      "bleh": "MeltGui-pack/bleh.webp",
      "call": "MeltGui-pack/call.webp",
      "cheer": "MeltGui-pack/cheer.webp",
      "collapse": "MeltGui-pack/collapse.webp",
      "confusion": "MeltGui-pack/confusion.webp",
      "cryin": "MeltGui-pack/cryin.webp",
      "doc": "MeltGui-pack/doc.webp",
      "exhausted": "MeltGui-pack/exhausted.webp",
      "furypunch": "MeltGui-pack/furypunch.webp",
      "ghoul": "MeltGui-pack/ghoul.webp",
      "grossedout": "MeltGui-pack/grossedout.webp",
      "laughing": "MeltGui-pack/laughing.gif",
      "lucky": "MeltGui-pack/lucky.webp",
      "luv": "MeltGui-pack/luv.webp",
      "melon": "MeltGui-pack/melon.webp",
      "noodle": "MeltGui-pack/noodle.webp",
      "palleta": "MeltGui-pack/palleta.webp",
      "shambala": "MeltGui-pack/shambala.webp",
      "singing": "MeltGui-pack/singing.webp",
      "tea": "MeltGui-pack/tea.webp",
      "tease": "MeltGui-pack/tease.webp",
      "tired": "MeltGui-pack/tired.webp",
      "tsundere": "MeltGui-pack/tsundere.webp",
      "vamphour": "MeltGui-pack/vamphour.webp",
      "vibingout": "MeltGui-pack/vibingout.webp",
      "walkin": "MeltGui-pack/walkin.webp",
      "bochiwork": "bocci-pack/bochiwork.jpg",
      "chikatworl": "chika-pack/chikaTworl.gif",
      "chikagree": "chika-pack/chikagree.gif",
      "chikflush": "chika-pack/chikflush.gif",
      "pinkdance": "chika-pack/pinkDance.gif",
      "akairodance": "deFlockaWeen-pack/akairoDance.gif",
      "boomstickcat": "deFlockaWeen-pack/boomstickcat.gif",
      "ghomp": "deFlockaWeen-pack/ghomp.gif",
      "ghooost": "deFlockaWeen-pack/ghooost.gif",
      "hankmy": "deFlockaWeen-pack/hankmy.gif",
      "pumpkat": "deFlockaWeen-pack/pumpkat.jpg",
      "sneekkawlshie": "deFlockaWeen-pack/sneekKawlshie.gif",
      "succarage": "deFlockaWeen-pack/succaRage.gif",
      "luckypen": "luckyStar-pack/luckypen.jpg",
      "nomesmile": "nome-pack/nomesmile.gif",
      "nomestare": "nome-pack/nomestare.jpg",
      "nomework": "nome-pack/nomework.gif",
      "satanichiarage": "satanichia-pack/SatanichiaRage.jpg",
      "satanichiagree": "satanichia-pack/Satanichiagree.jpg",
      "scarletcryin": "scarlet-pack/scarletCryin.jpg",
      "scarleteat": "scarlet-pack/scarletEat.jpg",
      "scarletstare": "scarlet-pack/scarletStare.jpg",
    };
    window.stickerBasePath = "assets/media/stickers/";

    if (!window._activeFetchUrl) {
      window._activeFetchUrl = (containerMode === "dev" || window._devBuildArmedAtLoad)
        ? window.config.devBuildUrl
        : window.config.sheetUrl;
    }
  }

  function initFavorites() {
    try {
      const stored = JSON.parse(localStorage.getItem("favorites") || "[]");
      window.favorites = new Set(stored.map(s => safeStr(s).toLowerCase()));
    } catch {
      window.favorites = new Set();
    }

    window.saveFavorites = () =>
      localStorage.setItem("favorites", JSON.stringify([...window.favorites]));

    window.refreshCards = () => {
      if (!window.assetsData || typeof createAssetCards !== "function") return [];
      const savedY    = window.scrollY;
      const promises  = createAssetCards(window.assetsData);
      if (typeof renderPage === "function") renderPage();
      if (typeof window.startPlaceholderCycle === "function") window.startPlaceholderCycle();
      Promise.all(promises.map(p => p.promise ?? p).filter(Boolean))
        .finally(() => window.scrollTo({ top: savedY, behavior: "instant" }));
      return promises;
    };
  }

  const _gifDurationCache = new Map();

  const _getLoadedGifUrl = () => getThemeGifSrc(_getTheme(), "loaded");

  function parseGifDuration(buf) {
    const b = new Uint8Array(buf);
    let ms = 0, i = 13;
    if (b[10] & 0x80) i += 3 * (1 << ((b[10] & 0x07) + 1));
    while (i < b.length) {
      const block = b[i];
      if (block === 0x3B) break;
      if (block === 0x2C) {
        i += 10;
        if (b[i - 1] & 0x80) i += 3 * (1 << ((b[i - 1] & 0x07) + 1));
        i++;
        while (i < b.length) { const len = b[i++]; if (!len) break; i += len; }
      } else if (block === 0x21) {
        if (b[i + 1] === 0xF9) ms += (b[i + 4] | (b[i + 5] << 8)) * 10;
        i += 2;
        while (i < b.length) { const len = b[i++]; if (!len) break; i += len; }
      } else { i++; }
    }
    return ms > 0 ? ms : 2000;
  }

  function getLoadedGifDuration() {
    const url = _getLoadedGifUrl();
    if (_gifDurationCache.has(url)) return Promise.resolve(_gifDurationCache.get(url));
    return fetch(url)
      .then(r => { if (!r.ok) throw new Error("fetch failed"); return r.arrayBuffer(); })
      .then(buf => {
        const ms = parseGifDuration(buf);
        _gifDurationCache.set(url, ms);
        return ms;
      });
  }

  function getGifDuration(url) {
    if (_gifDurationCache.has(url)) return Promise.resolve(_gifDurationCache.get(url));
    return fetch(url)
      .then(r => { if (!r.ok) throw new Error("fetch failed"); return r.arrayBuffer(); })
      .then(buf => {
        const ms = parseGifDuration(buf);
        _gifDurationCache.set(url, ms);
        return ms;
      });
  }

  window._loaderSequenceRunning = false;

  function _getTheme() {
    return document.documentElement.getAttribute("theme") || DEFAULT_THEME;
  }

  function runLoaderSequence() {
    if (window._loaderSequenceRunning) return;
    const loader = document.getElementById("containerLoader");
    if (!loader) return;
    window._loaderSequenceRunning = true;

    const img = loader.querySelector("img");
    if (!img) { loader.remove(); return; }

    const finish = () => { loader.remove(); document.body.classList.remove("ws-loading"); };

    getLoadedGifDuration()
      .then(ms => {

        applyGifToImg(img, _getTheme(), "loaded");
        setTimeout(finish, ms);
      })
      .catch(() => {
        applyGifToImg(img, _getTheme(), "loaded");
        setTimeout(finish, 2000);
      });
  }

  function runCrashSequence() {
    if (window._loaderSequenceRunning) return;
    const loader = document.getElementById("containerLoader");
    if (!loader) return;
    window._loaderSequenceRunning = true;

    const img = loader.querySelector("img");
    if (!img) return;

    document.body.classList.remove("ws-loading");

    const crashSrc = getThemeGifSrc(_getTheme(), "crash");
    getGifDuration(crashSrc)
      .catch(() => 2000)
      .then(ms => {
        applyGifToImg(img, _getTheme(), "crash");
        setTimeout(() => { applyGifToImg(img, _getTheme(), "ded"); }, ms);
      });
  }

  function _dismissPageLoader(pageNum) {
    if (+window.currentPage !== pageNum) return;

    runLoaderSequence();
  }

  function buildEmbedShell(embedSrc, title, fav) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <link rel="icon" href="${fav}" crossorigin="anonymous" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    embed { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; border: none; display: block; }
    #refreshBtn {
      position: fixed; top: 8px; right: 8px; z-index: 9999;
      background: rgba(0,0,0,0.6); color: #fff; border: none;
      border-radius: 6px; padding: 4px 10px; font-family: monospace;
      font-size: 13px; cursor: pointer; opacity: 0.4; transition: opacity 0.2s;
    }
    #refreshBtn:hover { opacity: 1; }
  </style>
</head>
<body>
  <embed id="frame" src="${embedSrc}" />
  <button id="refreshBtn" title="Refresh"
    onclick="document.getElementById('frame').src=document.getElementById('frame').src">↺</button>
</body>
</html>`;
  }

  async function fetchAndOpenHTML(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const raw     = await res.text();
    const pageURL = URL.createObjectURL(
      new Blob([sanitizeHTML(raw)], { type: "text/html;charset=utf-8" })
    );
    window.open(pageURL, "_blank");
  }

  (function injectIgnoreGuardCSS() {
    if (document.getElementById("__ws_ignore_guard__")) return;
    const s = document.createElement("style");
    s.id = "__ws_ignore_guard__";
    s.textContent = [
      `.asset-card[data-ignore="true"]{display:none!important;opacity:0!important;width:0!important;height:0!important;margin:0!important;padding:0!important;pointer-events:none!important;overflow:hidden!important;}`,
    ].join("");
    document.head.appendChild(s);
  })();

  (function injectContainerAliasCSS() {
    if (document.getElementById("__ws_container_alias__")) return;
    const s = document.createElement("style");
    s.id = "__ws_container_alias__";
    s.textContent = `
      /* Grid layout — mirrors #container in main.css */
      #favorites-container,
      #dev-build-container {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        justify-items: center;
        gap: 15px;
        padding: 20px;
        background: transparent;
        flex-grow: 1;
        min-height: 0;
        align-content: start;
      }
      @media (max-width: 800px) {
        #favorites-container,
        #dev-build-container {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      /* Card div — mirrors #container div */
      #favorites-container div,
      #dev-build-container div {
        width: 100%;
        max-width: 220px;
        padding: 15px 10px;
        background: none;
        text-align: center;
        border-radius: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s ease;
      }
      #favorites-container div:hover,
      #dev-build-container div:hover {
        transform: scale(1.03);
      }

      /* Card images — mirrors #container div img */
      #favorites-container div img,
      #dev-build-container div img {
        width: 120px;
        height: 120px;
        display: block;
        border-radius: 14px;
        object-fit: contain;
        transition: transform 0.3s ease;
      }
      #favorites-container div img:hover,
      #dev-build-container div img:hover {
        transform: scale(1.05);
      }

      /* Card text — mirrors #container div h3 / p */
      #favorites-container div h3,
      #favorites-container div p,
      #dev-build-container div h3,
      #dev-build-container div p {
        color: var(--url-color);
        font-family: monospace;
        font-size: 0.9rem;
        transition: color 0.3s, text-decoration 0.3s;
      }
      #favorites-container div h3:hover,
      #favorites-container div p:hover,
      #dev-build-container div h3:hover,
      #dev-build-container div p:hover {
        color: var(--accent-color);
        text-decoration: underline;
      }
    `;
    document.head.appendChild(s);
  })();

  (function injectAssetActionStyles() {
    if (document.getElementById("__ws_asset_actions__")) return;

    if (!document.querySelector("link[href*='font-awesome']")) {
      const fa = document.createElement("link");
      fa.rel  = "stylesheet";
      fa.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css";
      document.head.appendChild(fa);
    }

    const s = document.createElement("style");
    s.id = "__ws_asset_actions__";
    s.textContent = `
      .card-actions {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 2px;
        margin-top: 4px;
        padding: 0 2px;
        line-height: 1;
        width: 100%;
      }
      .favorite-star {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px 3px;
        font-size: 16px;
        line-height: 1;
        color: inherit;
        flex-shrink: 0;
        transition: transform 0.15s ease;
      }
      .asset-download-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px 3px;
        font-size: 14px;
        line-height: 1;
        color: inherit;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        transition: transform 0.15s ease;
      }
      .asset-download-btn .fa { pointer-events: none; }
      .asset-action-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 2px 3px;
        font-size: 14px;
        line-height: 1;
        color: var(--trench-color, #000) !important;
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
        transition: transform 0.15s ease;
      }
      .asset-action-btn i { pointer-events: none; }

      /* Each button grows on its own hover — the card itself no longer
         scales while the cursor is anywhere over this row (see main.css). */
      .card-actions .favorite-star:hover,
      .card-actions .asset-download-btn:hover,
      .card-actions .asset-action-btn:hover {
        transform: scale(1.3);
      }

      .description-panel {
        position: fixed;
        left: -340px;
        top: 85%;
        transform: translateY(-50%);
        width: 300px;
        transition: left .35s ease;
        z-index: 999999;
        pointer-events: none;
        background: rgba(0,0,0,0.3);
        border-left: 6px solid red;
        border-radius: 10px;
        backdrop-filter: blur(6px);
        -webkit-backdrop-filter: blur(6px);
        box-shadow: none;
        padding: 12px 16px;
      }
      .description-panel.desc-visible {
        left: 20px;
        pointer-events: all;
      }
      .description-panel .alert-text {
        color: white;
        font-family: monospace;
        text-align: left;
        white-space: normal;
        word-wrap: break-word;
        line-height: 1.5;
        font-size: 13px;
      }
    `;
    document.head.appendChild(s);
  })();

  (function injectAltContainerCSS() {
    if (document.getElementById("__ws_alt_containers__")) return;
    const s = document.createElement("style");
    s.id = "__ws_alt_containers__";
    s.textContent = `
      /* ── Grid layout (mirrors #container) ── */
      #favorites-container,
      #dev-build-container {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        justify-items: center;
        gap: 15px;
        padding: 20px;
        background: transparent;
        flex-grow: 1;
        min-height: 0;
        align-content: start;
      }

      @media (max-width: 800px) {
        #favorites-container,
        #dev-build-container {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      /* ── Card box (mirrors #container div) ── */
      #favorites-container div,
      #dev-build-container div {
        width: 100%;
        max-width: 220px;
        padding: 15px 10px;
        background: none;
        text-align: center;
        border-radius: 20px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s ease;
      }

      #favorites-container div:hover,
      #dev-build-container div:hover {
        transform: scale(1.03);
      }

      /* ── Card images ── */
      #favorites-container div img,
      #dev-build-container div img {
        width: 120px;
        height: 120px;
        display: block;
        border-radius: 14px;
        object-fit: contain;
        transition: transform 0.3s ease;
      }

      #favorites-container div img:hover,
      #dev-build-container div img:hover {
        transform: scale(1.05);
      }

      /* ── Card text ── */
      #favorites-container div h3,
      #favorites-container div p,
      #dev-build-container div h3,
      #dev-build-container div p {
        color: var(--url-color);
        font-family: monospace;
        font-size: 0.9rem;
        transition: color 0.3s, text-decoration 0.3s;
      }

      #favorites-container div h3:hover,
      #favorites-container div p:hover,
      #dev-build-container div h3:hover,
      #dev-build-container div p:hover {
        color: var(--accent-color);
        text-decoration: underline;
      }

      /* ── version-pending pointer block ── */
      #favorites-container.version-pending,
      #dev-build-container.version-pending {
        pointer-events: none;
      }

      /* ── Hide container while the loader GIF is active ── */
      body.ws-loading #favorites-container,
      body.ws-loading #dev-build-container {
        visibility: hidden;
        height: 0;
        min-height: 0;
        overflow: hidden;
        padding: 0;
        gap: 0;
      }
    `;
    document.head.appendChild(s);
  })();

  function createAssetCards(data) {
    const { container } = dom || {};
    if (!container) return [];

    container.innerHTML = "";
    const imagePromises = [];
    const frag          = document.createDocumentFragment();
    const sortMode      = getSortMode();
    const isFav         = (t) => window.favorites.has(safeStr(t).toLowerCase());
    const activePage    = +window.currentPage || +sessionStorage.getItem("currentPage") || 1;

    const isFavPage = window._containerMode === "favorites";
    const isDevPage = window._containerMode === "dev";
    const FAV_PAGE_SIZE = 75;
    const pageBuckets = new Map();

    const _favPageMap = new Map();
    let favPageCounter = 0;

    let orderedData = Array.isArray(data) ? data.slice() : [];
    if (isFavPage) {
      const favOrder = [...window.favorites];
      const byKey    = new Map(orderedData.map(a => [safeStr(a.title).toLowerCase(), a]));
      const favItems = favOrder.map(k => byKey.get(k)).filter(Boolean);
      orderedData = favItems;
    } else if (sortMode === "alphabetical") {
      orderedData.sort((a, b) => fastCompare(safeStr(a.title), safeStr(b.title)));
    }

    for (const asset of orderedData) {
      const statusRaw = safeStr(asset.status).toLowerCase();
      const typeRaw   = safeStr(asset.type).toLowerCase();

      if (statusRaw === "hide" || statusRaw === "hidden") continue;
      if (statusRaw.split("|").map(s => s.trim()).includes("ignore")) continue;
      if (typeRaw.split("|").map(s => s.trim()).includes("ignore")) continue;

      let p;
      if (isFavPage) {

        p = Math.floor(favPageCounter / FAV_PAGE_SIZE) + 1;
        _favPageMap.set(asset, p);
        favPageCounter++;
      } else {
        p = Number(asset.page) || 1;
      }
      if (!pageBuckets.has(p)) pageBuckets.set(p, []);
      pageBuckets.get(p).push(asset);
    }

    const domOrdered = [];
    for (const p of [...pageBuckets.keys()].sort((a, b) => a - b)) {
      domOrdered.push(...pageBuckets.get(p));
    }

    const badgeMap = {
      featured: "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/featured-cover.png",
      new:      "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/new-cover.png",
      fixed:    "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/fixed-cover.png",
      fix:      "https://raw.githubusercontent.com/01110010-00110101/01110010-00110101.github.io/main/system/images/fixing.png",
    };

    const addOverlay = (wrapper, src, alt, cls, fullCover = false) => {
      const o = document.createElement("img");
      o.src = src; o.alt = alt; o.className = `status-overlay ${cls}`;
      Object.assign(o.style, {
        position: "absolute", top: "0", left: "0",
        width: "100%", height: "100%", objectFit: "cover",
        pointerEvents: "none", zIndex: fullCover ? "10" : "5",
      });
      wrapper.appendChild(o);
    };

    for (const asset of domOrdered) {
      const title      = safeStr(asset.title).trim();
      const author     = safeStr(asset.author).trim();
      const imageSrc   = safeStr(asset.image) || config.fallbackImage;
      const link       = safeStr(asset.link)  || config.fallbackLink;

      const pageNum    = isFavPage
        ? (_favPageMap.get(asset) || 1)
        : (Number(asset.page) || 1);
      const isActivePage = pageNum === activePage;

      const parseStack = (raw) => new Set(
        safeStr(raw).toLowerCase().split("|").map(s => s.trim()).filter(Boolean)
      );
      const statusSet = parseStack(asset.status);
      const typeSet   = parseStack(asset.type);

      if (statusSet.has("ignore")) continue;

      for (const t of ["shiny","disco","animated","grail"]) {
        if (statusSet.has(t)) { typeSet.add(t); statusSet.delete(t); }
      }

      if (typeSet.has("cooked")) { statusSet.add("cooked"); typeSet.delete("cooked"); }

      const card = document.createElement("div");
      card.className = "asset-card" + (isFav(title) ? " ws-favorited" : "");

      card.style.display = "none";
      Object.assign(card.dataset, {
        link:        safeStr(link).toLowerCase(),
        title:       title.toLowerCase(),
        author:      author.toLowerCase(),
        page:        String(pageNum),
        filtered:    "true",
        category:    getFieldCI(asset, "category", "categories", "cat").toLowerCase().trim(),
        subcategory: getFieldCI(asset, "sub-category", "subcategory", "sub category", "subcat").toLowerCase().trim(),
      });

      const a   = document.createElement("a");
      a.href    = link;
      a.className = "asset-link";
      a.title   = `Click to open "${title || "this asset"}" in a new tab!`;

      a.addEventListener("click", async (e) => {
        e.preventDefault();

        const incognitoMode = localStorage.getItem("incognitoMode") || "off";
        const matched       = window.assetsData?.find(row => safeStr(row.link).trim() === link);
        const resolvedLink  = matched ? safeStr(matched.link).trim()  : link;
        const renderTitle   = matched ? safeStr(matched.title).trim() || "Embed" : "Embed";
        const renderFav     = matched ? safeStr(matched.image).trim() || "" : "";

        if (
          /^https:\/\/cdn\.jsdelivr\.net\/.+\.html$/i.test(resolvedLink) ||
          /\.html\.txt$|\.txt$/.test(resolvedLink)
        ) {
          try { await fetchAndOpenHTML(resolvedLink); }
          catch (err) { console.error("[html/txt loader] fetch failed:", err); }
          return;
        }

        if (incognitoMode === "blob" && matched) {
          window.open(
            URL.createObjectURL(
              new Blob([buildEmbedShell(resolvedLink, renderTitle, renderFav)], { type: "text/html;charset=utf-8" })
            ), "_blank"
          );
        } else if (incognitoMode === "about" && matched) {
          const tab = window.open("about:blank", "_blank");
          if (tab) { tab.document.open("text/html", "replace"); tab.document.write(buildEmbedShell(resolvedLink, renderTitle, renderFav)); tab.document.close(); }
        } else {
          window.open(resolvedLink, "_blank");
        }
      });

      const wrapper = document.createElement("div");
      wrapper.className = "asset-img-wrapper";
      Object.assign(wrapper.style, { position: "relative", display: "inline-block", borderRadius: "14px" });

      const img = document.createElement("img");
      img.alt           = title;
      img.className     = "asset-img";
      img.fetchPriority = isActivePage ? "high" : "auto";

      const imgPromise = new Promise((resolve) => {
        const hasRealImage  = !!safeStr(asset.image).trim();
        const localFallback = localIconFallback(asset.link);
        const onLoad         = () => resolve();

        // Any tier past the primary asset.image counts as "fallback active" —
        // flag it visually (image only, per the red-glow ask) so it's obvious
        // at a glance which cards still need a real hosted icon.png.
        const markFallback = () => img.classList.add("img-fallback");

        const tryFinal = () => {
          markFallback();
          img.onload  = onLoad;
          img.onerror = resolve;
          img.src = config.fallbackImage;
        };

        const tryLocal = () => {
          markFallback();
          if (localFallback) {
            img.onload  = onLoad;
            img.onerror = tryFinal;
            img.src = localFallback;
          } else {
            tryFinal();
          }
        };

        if (!hasRealImage) {
          tryLocal();
        } else {
          img.onload  = onLoad;
          img.onerror = tryLocal;
          img.src = imageSrc;
        }
      });
      imagePromises.push({ promise: imgPromise, page: pageNum, card });
      wrapper.appendChild(img);

      if (typeSet.has("featured")) addOverlay(wrapper, badgeMap.featured, "featured badge", "overlay-featured");
      if (typeSet.has("new"))      addOverlay(wrapper, badgeMap.new,      "new badge",      "overlay-new");
      if (typeSet.has("fixed"))    addOverlay(wrapper, badgeMap.fixed,    "fixed badge",    "overlay-fixed");

      if (typeSet.has("grail")) {
        const grailEl = document.createElement("img");
        grailEl.src = "assets/media/images/grail.png";
        grailEl.alt = "";
        grailEl.className = "grail-bg";
        wrapper.insertBefore(grailEl, wrapper.firstChild);
        wrapper.classList.add("has-grail");
      }

      if (typeSet.has("disco"))     img.classList.add("img-disco");
      if (typeSet.has("shiny"))     wrapper.classList.add("img-shiny");
      if (typeSet.has("pixelated")) img.style.imageRendering = "pixelated";
      if (typeSet.has("cover")) {

        Object.assign(wrapper.style, {
          overflow: "hidden",
          maxHeight: "250px",
          height:    "250px",
          width:     "100%",
          display:   "block",
        });
        Object.assign(img.style, {
          width:      "100%",
          height:     "var(--asset-img-size, 120px)",
          objectFit:  "cover",

          objectPosition: "center top",
          display:    "block",
        });
      }

      if (statusSet.has("fix"))  { addOverlay(wrapper, badgeMap.fix, "fixing overlay", "overlay-fix", true); card.classList.add("fix"); }
      if (statusSet.has("soon"))   card.classList.add("soon");
      if (statusSet.has("cooked")) {
        const isDmca    = typeSet.has("dmca") || statusSet.has("dmca");
        const isBlocked = typeSet.has("blocked") || statusSet.has("blocked");
        if (isDmca || isBlocked) {
          img.src = "assets/media/images/cooked.png";
          img.style.imageRendering = "pixelated";
        }
        card.classList.add("cooked");
      }

      const animatedSrc = safeStr(asset.animated || "").trim();
      const animatedSwapAllowed = typeof window.WS_Grid?.animatedSwapEnabled === "function"
        ? window.WS_Grid.animatedSwapEnabled()
        : true;
      if (typeSet.has("animated") && animatedSrc && animatedSwapAllowed) {
        const isVideo = /\.(mp4|webm|ogg)([?]|$)/i.test(animatedSrc);
        let animEl = null, animTimeout = null, isAnimating = false;

        const scheduleNext = () => {
          animTimeout = setTimeout(playAnim, (3 + Math.random() * 57) * 1000);
        };
        const playAnim = () => {
          if (isAnimating) return;
          isAnimating = true;
          animEl = document.createElement(isVideo ? "video" : "img");
          animEl.src = animatedSrc;
          if (isVideo) Object.assign(animEl, { autoplay: true, muted: true, loop: false, playsInline: true });
          animEl.className = "animated-swap";
          wrapper.insertBefore(animEl, wrapper.firstChild);
          setTimeout(() => { animEl?.remove(); animEl = null; isAnimating = false; scheduleNext(); },
            (3 + Math.random() * 5) * 1000);
        };

        if (img.complete && img.naturalWidth) scheduleNext();
        else img.addEventListener("load", scheduleNext, { once: true });

        const obs = new MutationObserver(() => {
          if (!document.contains(card)) { clearTimeout(animTimeout); animEl?.remove(); obs.disconnect(); }
        });
        obs.observe(document.body, { childList: true, subtree: true });
      }

      a.appendChild(wrapper);
      const titleEl  = document.createElement("h3"); titleEl.textContent  = title  || "Untitled";
      const authorEl = document.createElement("p");  authorEl.textContent = author || "";

      if (statusSet.has("cooked")) {
        const isDmca    = typeSet.has("dmca") || statusSet.has("dmca");
        const isBlocked = typeSet.has("blocked") || statusSet.has("blocked");
        if (isDmca || isBlocked) {
          a.title              = isDmca ? "DMCA Takedown — unavailable" : "Blocked — unavailable";
          authorEl.textContent = isDmca ? "DMCA TAKEDOWN" : "BLOCKED D:";
        }
      }

      const star = document.createElement("button");
      star.className = "favorite-star";
      star.innerHTML = isFav(title)
        ? `<i class="fa-solid fa-star" aria-hidden="true"></i>`
        : `<i class="fa-regular fa-star" aria-hidden="true"></i>`;
      star.title     = "Favourite";
      star.style.cssText = "background:transparent!important;border:none!important;cursor:pointer!important;padding:2px 3px!important;font-size:16px!important;line-height:1!important;color:var(--trench-color,#000)!important;display:inline-flex!important;align-items:center!important;";
      star.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const key = title.toLowerCase();
        if (window.favorites.has(key)) window.favorites.delete(key);
        else window.favorites.add(key);
        saveFavorites();
        star.innerHTML = window.favorites.has(key)
          ? `<i class="fa-solid fa-star" aria-hidden="true"></i>`
          : `<i class="fa-regular fa-star" aria-hidden="true"></i>`;

        if (window.favorites.has(key)) {
          card.classList.add("ws-favorited");
        } else {
          card.classList.remove("ws-favorited");

          if (window._containerMode === "favorites") {
            card.style.transition = "opacity 0.22s";
            card.style.opacity    = "0";
            setTimeout(() => {
              card.style.display = "none";
              if (typeof window.renderPage === "function") window.renderPage();
            }, 230);
          }
        }
      });

      const dlBtn = document.createElement("button");
      dlBtn.className = "asset-download-btn";
      dlBtn.title     = `Download "${title || "asset"}" as HTML`;
      dlBtn.innerHTML = `<i class="fa-solid fa-download" aria-hidden="true"></i>`;
      dlBtn.style.cssText = "background:transparent!important;border:none!important;cursor:pointer!important;padding:2px 3px!important;font-size:14px!important;line-height:1!important;color:var(--trench-color,#000)!important;display:inline-flex!important;align-items:center!important;";
      dlBtn.addEventListener("click", async (e) => {
        e.preventDefault(); e.stopPropagation();
        try {
          const assetTitle = title    || "Untitled";
          const assetUrl   = link     || "";
          const assetFav   = imageSrc || "";

          let favIconBase64 = "";
          try {
            const imgRes  = await fetch(assetFav, { mode: "cors" });
            const imgBlob = await imgRes.blob();
            favIconBase64 = await new Promise((res) => {
              const reader  = new FileReader();
              reader.onload = () => res(reader.result);
              reader.readAsDataURL(imgBlob);
            });
          } catch (_) {  }

          const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${assetTitle}</title>
  <link rel="icon" type="image/png" href="${favIconBase64}" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #000; }
    embed {
      position: absolute;
      top: 0; left: 0;
      width: 100vw;
      height: 100vh;
      border: none;
      display: block;
    }
  </style>
</head>
<body>
  <embed id="frame" src="${assetUrl}" />
</body>
</html>`;

          const safeFilename = assetTitle.replace(/[^a-z0-9_\-\. ]/gi, "_").trim() || "asset";
          const blob   = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
          const blobUrl = URL.createObjectURL(blob);
          const anchor = document.createElement("a");
          anchor.href     = blobUrl;
          anchor.download = `${safeFilename}.html`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (err) {
          console.error("[asset-download] failed:", err);
        }
      });

      const descText = safeStr(asset.description || "").trim();
      const descMsg  = descText || `No description available for "${title || "this asset"}".`;

      const descBtn = document.createElement("button");
      descBtn.className = "asset-action-btn asset-desc-btn";
      descBtn.innerHTML = `<i class="fa-solid fa-circle-question" aria-hidden="true"></i>`;
      descBtn.style.cssText = "background:transparent!important;border:none!important;cursor:pointer!important;padding:2px 3px!important;font-size:14px!important;line-height:1!important;color:var(--trench-color,#000)!important;display:inline-flex!important;align-items:center!important;";
      descBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); });

      const descPanel = document.createElement("div");
      descPanel.className = "description-panel";

      const descAlertText = document.createElement("div");
      descAlertText.className = "alert-text";
      descAlertText.textContent = descMsg;

      descPanel.appendChild(descAlertText);
      document.body.appendChild(descPanel);

      descBtn.addEventListener("mouseenter", () => descPanel.classList.add("desc-visible"));
      descBtn.addEventListener("mouseleave", () => {
        setTimeout(() => {
          if (!descPanel.matches(":hover")) descPanel.classList.remove("desc-visible");
        }, 80);
      });
      descPanel.addEventListener("mouseleave", () => descPanel.classList.remove("desc-visible"));

      const bugBtn = document.createElement("button");
      bugBtn.className = "asset-action-btn asset-bug-btn";
      bugBtn.title     = `Report a bug for "${title || "asset"}"`;
      bugBtn.innerHTML = `<i class="fa-solid fa-biohazard" aria-hidden="true"></i>`;
      bugBtn.style.cssText = "background:transparent!important;border:none!important;cursor:pointer!important;padding:2px 3px!important;font-size:14px!important;line-height:1!important;color:var(--trench-color,#000)!important;display:inline-flex!important;align-items:center!important;";
      bugBtn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        const padletUrl = "https://padlet.com/rhap5ody/wannasmile-suggestion-report-page-t8t6pg32hl71ri9m";
        window.open(padletUrl, "_blank");
      });

      const actionsRow = document.createElement("div");
      actionsRow.className = "card-actions";
      actionsRow.style.cssText = "display:flex!important;flex-direction:row!important;align-items:center!important;justify-content:center!important;gap:2px!important;width:100%!important;";
      actionsRow.appendChild(star);
      actionsRow.appendChild(dlBtn);
      actionsRow.appendChild(descBtn);
      actionsRow.appendChild(bugBtn);

      card.append(a, titleEl, authorEl, actionsRow);
      frag.appendChild(card);

      if (!window._cardIndex.has(pageNum)) window._cardIndex.set(pageNum, []);
      window._cardIndex.get(pageNum).push(card);
      window._allCards.push(card);
    }

    container.appendChild(frag);
    if (window.WS_Grid) window.WS_Grid.refresh();

    if (!window._pageLoadState) window._pageLoadState = new Map();

    const pagePromiseMap = new Map();
    for (const { promise, page, card } of imagePromises) {
      if (!pagePromiseMap.has(page)) pagePromiseMap.set(page, { promises: [], cards: [] });
      pagePromiseMap.get(page).promises.push(promise);
      pagePromiseMap.get(page).cards.push(card);
    }

    for (const [pageNum, { promises, cards }] of pagePromiseMap) {
      const isActive = pageNum === activePage;

      let settled = 0;
      const total = cards.length;
      cards.forEach((card, i) => {
        promises[i].finally(() => {
          setTimeout(() => {
            card.classList.add("ready");
            settled++;
            if (settled === total && typeof window.renderPage === "function") {
              window.renderPage();
            }
          }, isActive ? i * 30 : i * 60);
        });
      });

      const pageSettled = Promise.allSettled(promises).then(() => {
        window._pageLoadState.set(pageNum, "loaded");

        if (+window.currentPage === pageNum) {
          if (isActive) {
            runLoaderSequence();
          } else {

            _dismissPageLoader(pageNum);
          }
        }
      });

      if (!window._pageLoadState.has(pageNum)) {
        window._pageLoadState.set(pageNum, pageSettled);
      }

      if (isActive) {
        pageSettled.then(() => {});

      }
    }

    if (!pagePromiseMap.has(activePage)) {
      window._pageLoadState.set(activePage, "loaded");
      runLoaderSequence();
      if (typeof window.renderPage === "function") window.renderPage();
    }

    return imagePromises;
  }

  function initPaging() {
    const { container, pageIndicator, searchInput, searchBtn, searchIdToggle } = dom || {};
    if (!container) return;

    let activeCategories = new Set();

    // "ID" search matches against the full link/URL instead of title+author —
    // e.g. typing "168" hits .../library/untitled/168/index.html — so
    // blank-titled untitled/ entries (unsearchable by name) can still be
    // found by the number in their URL.
    const ID_SEARCH_KEY = "ws_searchById";
    let searchById = localStorage.getItem(ID_SEARCH_KEY) === "true";
    const applySearchModeUI = () => {
      if (!searchIdToggle) return;
      searchIdToggle.classList.toggle("active", searchById);
      if (searchInput) searchInput.placeholder = searchById ? "Search by URL/id..." : "Search...";
    };
    applySearchModeUI();

    window._cardIndex = new Map();
    window._allCards  = [];

    const getFilteredCards = () => window._allCards.filter(c => c.dataset.filtered === "true");
    const getPages         = () => [...window._cardIndex.keys()].sort((a, b) => a - b);

    let errorGif = document.getElementById("noResultsGif");
    if (!errorGif) {
      errorGif = document.createElement("img");
      errorGif.id        = "noResultsGif";

      if (typeof applyGifToImg === "function") {
        applyGifToImg(errorGif, _getTheme(), "searching");
      } else {
        errorGif.src = getThemeGifSrc(_getTheme(), "searching");
        errorGif.dataset.gifState = "searching";
      }
      errorGif.draggable = false;
      Object.assign(errorGif.style, {
        display: "none", position: "absolute",
        top: "50%", left: "50%", transform: "translate(-50%, 0)",
        transformOrigin: "50% 0%", width: "128px", height: "128px",
        opacity: "0", transition: "opacity 0.25s ease",
        pointerEvents: "auto", cursor: "grab", zIndex: "1000",
        imageRendering: "pixelated",
      });
      container.parentElement.appendChild(errorGif);
      initGifDrag(errorGif);
    }

    const updateVisibility = () => {
      const visible = getFilteredCards().length;
      if (visible === 0) {
        errorGif.style.display = "block";
        requestAnimationFrame(() => (errorGif.style.opacity = "1"));
      } else {
        errorGif.style.opacity = "0";
        setTimeout(() => { if (parseFloat(errorGif.style.opacity) === 0) errorGif.style.display = "none"; }, 250);
      }
    };

    const _isFavPage = window._containerMode === "favorites";

    window.renderPage = () => {
      const pages = getPages();

      if (!pages.length) {

        if (Array.isArray(window.assetsData)) {
          if (pageIndicator) pageIndicator.textContent = "Page 1/1";
          sessionStorage.setItem("currentPage", 1);
        }
        return;
      }

      if (!window._pageRestored) {
        const saved = +sessionStorage.getItem("currentPage") || pages[0];
        window.currentPage = pages.includes(saved) ? saved : pages[0];
        window._pageRestored = true;
      }

      const cur = +window.currentPage;
      const pageState = window._pageLoadState?.get(cur);
      const pageFullyLoaded = pageState === "loaded";

      for (const [pageNum, cards] of window._cardIndex) {
        const onThisPage = pageNum === cur;
        for (const c of cards) {
          const isReady   = c.classList.contains("ready");

          const isFavOK   = !_isFavPage || c.classList.contains("ws-favorited");

          const want = onThisPage && isReady && pageFullyLoaded && c.dataset.filtered === "true" && isFavOK ? "flex" : "none";
          if (c.style.display !== want) c.style.display = want;
        }
      }

      if (pageIndicator) {
        const idx = pages.indexOf(cur);
        pageIndicator.textContent = `Page ${idx + 1}/${pages.length}`;
      }

      sessionStorage.setItem("currentPage", cur);
      updateVisibility();
    };

    window.filterAssets = (q) => {
      const query      = safeStr(q).toLowerCase().trim();
      const words      = query.length ? query.split(/\s+/) : null;
      const isSearching = query.length > 0;
      const hasTags      = activeCategories.size > 0;

      for (const c of window._allCards) {
        const tagOk = !hasTags
          || activeCategories.has(c.dataset.category)
          || activeCategories.has(c.dataset.subcategory);

        if (!tagOk) { c.dataset.filtered = "false"; continue; }
        if (!words) { c.dataset.filtered = "true"; continue; }
        const haystack = searchById
          ? safeStr(c.dataset.link)
          : c.dataset.title + " " + c.dataset.author;
        let hit = haystack.includes(query);
        if (!hit) for (const w of words) if (haystack.includes(w)) { hit = true; break; }
        c.dataset.filtered = hit ? "true" : "false";
      }

      if (isSearching) {
        // Text search ignores page boundaries and searches the full (optionally
        // category-filtered) asset set at once.
        for (const c of window._allCards) {
          c.classList.remove("tag-excluded");
          const show = c.classList.contains("ready") && c.dataset.filtered === "true";
          c.style.display = show ? "flex" : "none";
        }
        if (pageIndicator) {
          pageIndicator.textContent = hasTags ? "Searching within tags…" : "Searching all pages…";
        }
        const pagesAnchor = document.querySelector(".pages-anchor");
        if (pagesAnchor) pagesAnchor.style.visibility = "hidden";
      } else {
        // Category filtering (with no active text search) keeps normal per-page
        // paging: non-matching cards on the current page hide, matches stay
        // visible and selectable, and paging still steps through the same pages.
        for (const c of window._allCards) c.classList.remove("tag-excluded");
        const pagesAnchor = document.querySelector(".pages-anchor");
        if (pagesAnchor) pagesAnchor.style.visibility = "";
        renderPage();
      }

      updateVisibility();
    };

    window.prevPage = () => {
      if (window._reloading) return;
      const pages = getPages();
      const i     = pages.indexOf(+window.currentPage);
      window.currentPage = i <= 0 ? pages[pages.length - 1] : pages[i - 1];
      _handlePageNavigation(+window.currentPage);
      renderPage();
    };

    window.nextPage = () => {
      if (window._reloading) return;
      const pages = getPages();
      const i     = pages.indexOf(+window.currentPage);
      window.currentPage = i === -1 || i === pages.length - 1 ? pages[0] : pages[i + 1];
      _handlePageNavigation(+window.currentPage);
      renderPage();
    };

    function _handlePageNavigation(pageNum) {
      const pageState = window._pageLoadState?.get(pageNum);
      if (pageState === "loaded" || pageState === undefined) {

        return;
      }

      const loader = document.getElementById("containerLoader");
      if (!loader) {

        const newLoader = document.createElement("div");
        newLoader.id = "containerLoader";
        const loaderImg = document.createElement("img");
        loaderImg.alt = "";
        applyGifToImg(loaderImg, _getTheme(), "loading");
        newLoader.appendChild(loaderImg);
        document.body.appendChild(newLoader);
        window._loaderSequenceRunning = false;
        document.body.classList.add("ws-loading");
      } else {

        const img = loader.querySelector("img");
        if (img) applyGifToImg(img, _getTheme(), "loading");
        window._loaderSequenceRunning = false;
        document.body.classList.add("ws-loading");
        loader.style.display = "";
      }

      Promise.resolve(pageState).then(() => {
        _dismissPageLoader(pageNum);
      });
    }

    searchInput?.addEventListener("input", debounce(() => filterAssets(searchInput.value), 200));
    searchInput?.addEventListener("input", () => fitInputText(searchInput, searchInput.value));

    searchIdToggle?.addEventListener("click", () => {
      searchById = !searchById;
      localStorage.setItem(ID_SEARCH_KEY, String(searchById));
      applySearchModeUI();
      if (searchInput) filterAssets(searchInput.value);
    });
    window.addEventListener("resize", debounce(() => {
      if (searchInput) fitInputText(searchInput, searchInput.value || searchInput.placeholder);
    }, 150));

    const favPrev = document.getElementById("favPrevBtn");
    const favNext = document.getElementById("favNextBtn");
    const devPrev = document.getElementById("devPrevBtn");
    const devNext = document.getElementById("devNextBtn");
    if (favPrev) favPrev.addEventListener("click", () => window.prevPage?.());
    if (favNext) favNext.addEventListener("click", () => window.nextPage?.());
    if (devPrev) devPrev.addEventListener("click", () => window.prevPage?.());
    if (devNext) devNext.addEventListener("click", () => window.nextPage?.());

    window.currentPage = +sessionStorage.getItem("currentPage") || 1;
    renderPage();

    (function initSubHeaderFilter() {

      const subBtns = document.querySelectorAll(".sub-header button");
      const dropdownBtns = [];

      function toggleCategory(cat) {
        if (!cat) return;
        if (activeCategories.has(cat)) activeCategories.delete(cat);
        else activeCategories.add(cat);

        const allBtns = [...subBtns, ...dropdownBtns];
        allBtns.forEach(b => b.classList.toggle("active", activeCategories.has(b.dataset.category)));

        window.filterAssets(searchInput ? searchInput.value : "");
      }

      subBtns.forEach(btn => {
        const cat = (btn.dataset.category || btn.textContent).trim().toLowerCase();
        btn.dataset.category = cat;
        btn.addEventListener("click", () => toggleCategory(cat));
      });

      // ---- Dynamic category/sub-category dropdown, built from the same fetched asset data ----
      const menu    = document.getElementById("searchCategoryMenu");
      const catList = document.getElementById("searchCategoryList");
      const subList = document.getElementById("searchSubcategoryList");

      function refreshCategoryDropdown() {
        if (!catList || !subList) return;

        dropdownBtns.length = 0;
        catList.innerHTML = "";
        subList.innerHTML = "";

        // Read from the same single-fetch session cache loadAssets() already writes
        // to (ASSETS_CACHE_KEY), rather than the live window.assetsData variable —
        // this way the dropdown always has a reliable source for the rest of the
        // session regardless of exactly when/how it's opened, without ever
        // triggering a second network fetch of its own.
        let sourceRows = window.assetsData;
        try {
          const cached = JSON.parse(sessionStorage.getItem(ASSETS_CACHE_KEY) || "null");
          if (Array.isArray(cached) && cached.length) sourceRows = cached;
        } catch {  }
        sourceRows = sourceRows || [];

        const cats = new Set();
        const subs = new Set();
        for (const a of sourceRows) {
          const c = getFieldCI(a, "category", "categories", "cat").trim();
          const s = getFieldCI(a, "sub-category", "subcategory", "sub category", "subcat").trim();
          if (c) cats.add(c);
          if (s) subs.add(s);
        }

        if (!cats.size && !subs.size && sourceRows.length) {
          console.error(
            "[CategoryDropdown] No category/sub-category fields matched on any asset row. " +
            "Looked for keys like 'category'/'categories'/'cat' and 'sub-category'/'subcategory'/'subcat'. " +
            "Actual keys on the first asset row were:",
            Object.keys(sourceRows[0])
          );
        }

        const buildItem = (label, list) => {
          const el = document.createElement("button");
          el.type = "button";
          el.textContent = label;
          el.dataset.category = label.toLowerCase();
          if (activeCategories.has(el.dataset.category)) el.classList.add("active");
          el.addEventListener("click", () => toggleCategory(el.dataset.category));
          dropdownBtns.push(el);
          list.appendChild(el);
        };

        if (cats.size) {
          [...cats].sort(fastCompare).forEach(c => buildItem(c, catList));
        } else {
          const p = document.createElement("p");
          p.textContent = "No categories yet";
          catList.appendChild(p);
        }

        if (subs.size) {
          [...subs].sort(fastCompare).forEach(s => buildItem(s, subList));
        } else {
          const p = document.createElement("p");
          p.textContent = "No sub-categories yet";
          subList.appendChild(p);
        }
      }

      let toggleMenu = () => {};

      if (menu && searchBtn) {
        menu.style.display    = "none";
        menu.style.opacity    = "0";
        menu.style.transition = "opacity 0.3s ease, transform 0.3s ease";

        toggleMenu = (force) => {
          const isVisible = menu.style.display === "block";
          const show = force !== undefined ? force : !isVisible;
          if (!show) {
            menu.style.opacity = "0";
            searchBtn.setAttribute("aria-expanded", "false");
            menu.setAttribute("aria-hidden", "true");
            setTimeout(() => (menu.style.display = "none"), 300);
          } else {
            refreshCategoryDropdown();
            menu.style.display = "block";
            searchBtn.setAttribute("aria-expanded", "true");
            menu.setAttribute("aria-hidden", "false");
            setTimeout(() => (menu.style.opacity = "1"), 10);
          }
        };

        searchBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleMenu();
        });
        document.addEventListener("click", (e) => {
          if (
            menu.style.display === "block" &&
            !menu.contains(e.target) &&
            e.target !== searchBtn
          ) toggleMenu(false);
        });
      }

      window._refreshCategoryDropdown = refreshCategoryDropdown;
    })();
  }

  let _searchQuotes     = null;
  let _searchQuotesIdx  = 0;

  // Served by the same QuoteSystemWS sheet as the main quote box (column A) —
  // column B is the dedicated search-placeholder list, B1 header / B2:B... data.
  async function _loadSearchQuotes() {
    if (_searchQuotes !== null) return _searchQuotes;
    try {
      const url = `${window.config.sheetUrl}?type=searchQuotes`;
      const res = await fetch(bustCache(url), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const values = data && typeof data === "object" && !Array.isArray(data)
        ? Object.values(data)[0]
        : null;
      _searchQuotes = Array.isArray(values)
        ? values.filter(q => typeof q === "string" && q.trim())
        : [];
    } catch {
      _searchQuotes = [];
    }
    return _searchQuotes;
  }

  function _nextSearchQuote() {
    if (!_searchQuotes || !_searchQuotes.length) return "Search assets...";
    const q = _searchQuotes[_searchQuotesIdx % _searchQuotes.length];
    _searchQuotesIdx++;
    return q;
  }

  function initPlaceholders() {
    const { searchInput } = dom || {};
    if (!searchInput) return;

    const FADE = 450, HOLD = 4000;

    const fadePlaceholder = (input, text, cb) => {
      input.classList.remove("fade-in");

      void input.offsetWidth;
      input.classList.add("fade-out");
      setTimeout(() => {
        const shown = truncateText(text, 26);
        input.placeholder = shown;
        input.title = text;
        fitInputText(input, shown);
        input.classList.remove("fade-out");
        void input.offsetWidth;
        input.classList.add("fade-in");
        setTimeout(() => { input.classList.remove("fade-in"); cb?.(); }, FADE);
      }, FADE);
    };

    window.startPlaceholderCycle = () => {
      if (window._placeholderRunning) return;
      window._placeholderRunning = true;

      _loadSearchQuotes();

      const loop = async () => {

        await new Promise(r => fadePlaceholder(searchInput, _nextSearchQuote(), r));
        await delay(HOLD);

        const curPageCards = window._cardIndex?.get(+window.currentPage) || [];
        const visible = curPageCards.filter(c => c.dataset.filtered === "true").length;
        await new Promise(r => fadePlaceholder(searchInput, `${visible} assets on this page`, r));
        await delay(HOLD);

        if (window._placeholderRunning) loop();
      };
      loop();
    };
  }

  let _resolveSheetData;
  window._sheetDataReady = new Promise(res => { _resolveSheetData = res; });

  const ASSETS_CACHE_KEY = "__ws_assetsCache__";

  function _isValidAssetsShape(data) {
    return Array.isArray(data);
  }

  async function loadAssets() {
    const fetchUrl = window._activeFetchUrl || config.sheetUrl;
    let raw;

    const readCache = () => {
      try { return JSON.parse(sessionStorage.getItem(ASSETS_CACHE_KEY) || "null"); }
      catch { return null; }
    };

    try {
      const res = await fetch(bustCache(fetchUrl), { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      raw = await res.json();
      if (!_isValidAssetsShape(raw)) {
        console.error("[loadAssets] Network response is not a valid array:", raw);
        throw new Error("Invalid data from network");
      }
      try { sessionStorage.setItem(ASSETS_CACHE_KEY, JSON.stringify(raw)); } catch {  }
    } catch (err) {
      const cached = readCache();
      if (cached !== null && _isValidAssetsShape(cached)) {
        console.warn("[loadAssets] Live fetch failed — falling back to last cached data.", err);
        raw = cached;
      } else {
        console.error("[loadAssets] fetch failed and no valid cache to fall back to:", err);
        _resolveSheetData();
        runCrashSequence();
        throw err;
      }
    }

    _resolveSheetData(raw);

    const data = raw
      .filter(i => i && (safeStr(i.title).trim() || safeStr(i.link).trim()))
      .map(i => (i.link ? Object.assign({}, i, { link: normalizeExternalLink(i.link) }) : i));
    window.assetsData = data;

    const savedPage = +sessionStorage.getItem("currentPage") || 1;
    window.currentPage   = savedPage;
    window._pageRestored = true;

    const earlyIndicator = window.dom?.pageIndicator;
    if (earlyIndicator) earlyIndicator.textContent = `Page ${savedPage}`;

    getLoadedGifDuration().catch(() => {});

    if (window._minimalViewArmedAtLoad) {
      // Minimal view is about to replace #container with its own
      // link-only fetch/render right after this — building the full
      // image-laden card grid here just to immediately throw it away
      // would be the same wasted double-work the DevBuild armed-at-load
      // check above already exists to avoid.
      return true;
    }

    const promises = createAssetCards(data);

    const activePromises = promises.filter(p => p.page === savedPage).map(p => p.promise);
    const settle         = activePromises.length ? Promise.all(activePromises) : Promise.resolve();
    settle.finally(() => {
      if (typeof window._restoreScrollY === "function") window._restoreScrollY();
    });

    return true;
  }

  window._reloading           = false;
  window._reloadCooldownUntil = 0;
  const RELOAD_COOLDOWN_MS    = 15000;

  window.reloadAssets = async function () {
    if (window._reloading) return;
    window._reloading          = true;
    window._pageRestored       = false;
    window._placeholderRunning = false;

    sessionStorage.removeItem(ASSETS_CACHE_KEY);
    sessionStorage.removeItem("scrollY");

    window._cardIndex = new Map();
    window._allCards  = [];
    window._pageLoadState = new Map();

    document.body.classList.add("ws-loading");

    document.getElementById("containerLoader")?.remove();
    const loader = document.createElement("div");
    loader.id = "containerLoader";

    const loaderImg = document.createElement("img");
    loaderImg.alt = "";
    applyGifToImg(loaderImg, _getTheme(), "loading");
    loader.appendChild(loaderImg);
    document.body.appendChild(loader);
    window._loaderSequenceRunning = false;

    window._sheetDataReady = Promise.resolve();
    _resolveSheetData = () => {};

    try {
      await loadAssets();
      window._reloadCooldownUntil = Date.now() + RELOAD_COOLDOWN_MS;
      if (typeof window.startPlaceholderCycle === "function") window.startPlaceholderCycle();
      return true;
    } catch {
      throw new Error("reload failed");
    } finally {
      window._reloading = false;
    }
  };

  function initMuteButton() {
    const MUTE_KEY = "ws_muted";

    window._quotesMuted = localStorage.getItem(MUTE_KEY) === "true";

    function _applyAudioMute(muted) {
      document.querySelectorAll("audio, video").forEach(a => { a.muted = muted; });
    }

    _applyAudioMute(window._quotesMuted);

    const _audioObserver = new MutationObserver(() => {
      _applyAudioMute(window._quotesMuted);
    });
    _audioObserver.observe(document.body, { childList: true, subtree: true });

    window.WS_Audio = {
      setMuted: function (value) {
        window._quotesMuted = !!value;
        _applyAudioMute(window._quotesMuted);
      },
      isMuted: function () {
        return window._quotesMuted;
      }
    };
  }

  document.addEventListener("DOMContentLoaded", async () => {
    initElements();
    initFavorites();
    initPaging();
    initPlaceholders();
    initMuteButton();

    window.applyThemeGifs?.(_getTheme());

    await loadAssets().catch(() => {});
    window._refreshCategoryDropdown?.();

    if (typeof window.startPlaceholderCycle === "function") window.startPlaceholderCycle();
  });
})();