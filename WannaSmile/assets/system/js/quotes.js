"use strict";

(function injectQuoteStyles() {
  if (document.getElementById("_qs-styles")) return;
  const style = document.createElement("style");
  style.id = "_qs-styles";
  style.textContent = `
    #quoteBox,
    #quoteBox * {
      font-family: monospace !important;
      font-weight: 600 !important;
      box-sizing: border-box;
    }
    .qs-anchor {
      cursor: pointer;
      transition: color 0.15s, opacity 0.15s;
    }
    .qs-anchor:hover { opacity: 0.8; }

    .qs-anim-shake,
    .qs-anim-wave,
    .qs-anim-jumpy,
    .qs-anim-tremble,
    .qs-anim-crawl { display: inline; }

    .qs-char {
      display: inline-block;
      white-space: pre;
    }

    @keyframes _qs-shake {
      0%,100% { transform: translateX(0); }
      20%     { transform: translateX(-3px); }
      40%     { transform: translateX(3px); }
      60%     { transform: translateX(-2px); }
      80%     { transform: translateX(2px); }
    }
    @keyframes _qs-wave {
      0%,100% { transform: translateY(0); }
      25%     { transform: translateY(-5px); }
      75%     { transform: translateY(5px); }
    }
    @keyframes _qs-jumpy {
      0%,55%,100% { transform: translateY(0); }
      35%         { transform: translateY(-10px); }
      45%         { transform: translateY(-7px); }
    }
    @keyframes _qs-tremble {
      0%   { transform: translate(0,0) rotate(0deg); }
      15%  { transform: translate(-1px, 1px) rotate(-0.5deg); }
      30%  { transform: translate(1px,-1px) rotate(0.5deg); }
      45%  { transform: translate(-1px,-1px) rotate(0deg); }
      60%  { transform: translate(1px, 1px) rotate(0.5deg); }
      75%  { transform: translate(0,-1px) rotate(-0.5deg); }
      90%  { transform: translate(-1px,0) rotate(0deg); }
      100% { transform: translate(0,0) rotate(0deg); }
    }
    @keyframes _qs-crawl {
      0%,100% { transform: translateY(0); }
      50%     { transform: translateY(-3px); }
    }

    .quote-sticker {
      display: inline-block;
      vertical-align: middle;
      max-height: 1.6em;
      width: auto;
    }

    #quoteWrapper.qs-mode-refresh {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: visible;
    }
    #quoteWrapper.qs-mode-refresh #quoteBox {
      white-space: normal;
      text-align: center;
      transform: none !important;
    }
  `;
  document.head.appendChild(style);
})();

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("quoteWrapper");
  const box     = document.getElementById("quoteBox");
  if (!wrapper || !box) return;

  const SHEETS_URL = "https://script.google.com/macros/s/AKfycbyZxKfF569T-iExBHEpAbMEc1jyoR_8Yf3g0CWUqOF75zgQKdeMtYtxgf0F-D4Bxr-7/exec?type=quotes";


  let LOCAL_QUOTES  = [];
  let seenIndices   = new Set();
  let pendingQuotes = null;
  let fetchInFlight = false;

  const QTYPES      = ["Qleft", "Qright", "Qrefresh"];
  const QTYPE_ICONS = {
    Qleft:    "assets/media/images/Qleft.png",
    Qright:   "assets/media/images/Qright.png",
    Qrefresh: "assets/media/images/Qrefresh.png",
  };
  const QTYPE_KEY = "ws_qtype";

  let currentQtype = localStorage.getItem(QTYPE_KEY) || "Qleft";
  let refreshQuote = null;

  function applyQtypeIcon() {
    const img = document.getElementById("QtypeToggle");
    if (img) img.src = QTYPE_ICONS[currentQtype];
  }

  function cycleQtype() {
    const idx    = QTYPES.indexOf(currentQtype);
    currentQtype = QTYPES[(idx + 1) % QTYPES.length];
    localStorage.setItem(QTYPE_KEY, currentQtype);

    if (currentQtype !== "Qrefresh") refreshQuote = null;
    applyQtypeIcon();
    stopAudio();
    setQuote();
  }

  window.WS_Quotes = { cycleQtype };

  document.querySelector(".Qtype")?.addEventListener("click", cycleQtype);

  applyQtypeIcon();

function parseQuotes(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const keys = Object.keys(data);
  if (keys.length !== 1) {
    return null;
  }

  const values = data[keys[0]];

  if (!Array.isArray(values)) {
    return null;
  }

  const result = values
    .filter(value => value !== null && value !== undefined && String(value).trim() !== "")
    .map(value => String(value));

  return result.length > 0 ? result : null;
}

  function backgroundRefetch() {
    if (fetchInFlight) return;
    fetchInFlight = true;
    fetch(bustCache(SHEETS_URL), { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${r.statusText}`);
        return r.json();
      })
      .then(data => { const fresh = parseQuotes(data); if (fresh) pendingQuotes = fresh; })
      .catch((err) => { console.error("[Quotes] Background refetch failed:", err); })
      .finally(() => { fetchInFlight = false; });
  }

  window.stickerManifest  = window.stickerManifest  || {};
  window.stickerBasePath  = window.stickerBasePath  || "assets/media/stickers/";

  function buildStickerImg(path, ext) {
    if (path.includes("..")) return `:${path}:`;

    let rel = null;

    if (path.includes("/")) {
      // explicit "pack/name" reference given directly in the quote text
      rel = ext ? `${path}.${ext}` : path;
    } else {
      const known = window.stickerManifest[path.toLowerCase()];
      if (known) {
        rel = known;
      } else if (ext) {
        rel = `${path}.${ext}`;
      }
    }

    if (!rel) return `:${path}:`;

    const src = window.stickerBasePath + rel;
    return `<img src="${src}" class="quote-sticker" alt="${path}" loading="lazy" onerror="this.replaceWith(document.createTextNode(':${path}:'))">`;
  }

  function parseStyleProps(raw) {
    const props = {};
    (raw || "").split(";").forEach(part => {
      const eq = part.indexOf(":");
      if (eq < 1) return;
      const k = part.slice(0, eq).trim();
      const v = part.slice(eq + 1).trim();
      if (k) props[k] = v;
    });
    return props;
  }

  let _audCtx      = null;
  let _audSource   = null;
  let _audGain     = null;
  let _audPanner   = null;
  let _audBuffer   = null;
  let _audSrc      = null;
  let _audVol      = 1.0;
  let _audPanAnim  = null;
  let _audLoopStart = 0;
  let _audLoopEnd   = 0;
  let _audStartedAt = 0;
  let _audLoopTimer = null;
  let _audReadyPromise = null;
  let _audFetchCtrl    = null;

  let _audioUnlocked = false;

  function unlockAudio() {
    if (_audioUnlocked) return;
    _audioUnlocked = true;
    if (!_audCtx) _audCtx = new AudioContext();
    _audCtx.resume();
  }

  document.addEventListener("click", unlockAudio, { once: true });
  document.addEventListener("keydown", unlockAudio, { once: true });

  function _clearLoopTimer() {
    if (_audLoopTimer !== null) { clearTimeout(_audLoopTimer); _audLoopTimer = null; }
  }

  function stopAudio() {
    _clearLoopTimer();
    if (_audFetchCtrl) { _audFetchCtrl.abort(); _audFetchCtrl = null; }
    if (_audSource)    { try { _audSource.stop(); } catch (_) {} _audSource = null; }
    if (_audPanAnim)   { cancelAnimationFrame(_audPanAnim); _audPanAnim = null; }
    _audBuffer = null;
    _audSrc    = null;
  }

  function _spawnSource() {
    if (!_audCtx || !_audBuffer || !_audPanner || !_audGain) return;
    _clearLoopTimer();
    if (_audSource) { try { _audSource.stop(); } catch (_) {} }

    _audSource        = _audCtx.createBufferSource();
    _audSource.buffer = _audBuffer;
    _audSource.loop   = false;
    _audSource.connect(_audPanner).connect(_audGain).connect(_audCtx.destination);
    _audSource.start(0, _audLoopStart);
    _audStartedAt = _audCtx.currentTime;

    const clipLen = _audLoopEnd - _audLoopStart;
    _audLoopTimer = setTimeout(_spawnSource, clipLen * 1000);
  }

  function prepareAudio(src, vol, startSec, endSec) {
    if (!src) return Promise.resolve();
    if (!_audioUnlocked) return Promise.resolve();
    _audSrc = src;
    _audVol = vol;

    return new Promise(async (resolve) => {
      try {
        if (!_audCtx) _audCtx = new AudioContext();
        if (_audCtx.state === "suspended") await _audCtx.resume();

        if (_audFetchCtrl) { _audFetchCtrl.abort(); _audFetchCtrl = null; }
        const ctrl = new AbortController();
        _audFetchCtrl = ctrl;

        const response = await fetch(src, { signal: ctrl.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuf = await response.arrayBuffer();

        if (_audFetchCtrl !== ctrl) { resolve(); return; }
        _audFetchCtrl = null;

        _audBuffer = await _audCtx.decodeAudioData(arrayBuf);

        const dur     = _audBuffer.duration;
        _audLoopStart = Math.min(Math.max(startSec || 0, 0), dur);
        _audLoopEnd   = endSec ? Math.min(Math.max(endSec, _audLoopStart + 0.1), dur) : dur;

        _audPanner          = _audCtx.createStereoPanner();
        _audGain            = _audCtx.createGain();
        _audGain.gain.value = 0;

        _spawnSource();
        startPanVolumeAnimation();
        resolve();
      } catch (e) {
        if (e?.name !== "AbortError") console.warn("[audbox] Failed to load/play audio:", e);
        _audFetchCtrl = null;
        resolve();
      }
    });
  }

  function startAudio(src, vol, startSec, endSec) {
    if (!src || !_audioUnlocked) return;
    _audReadyPromise = prepareAudio(src, vol, startSec, endSec);
  }

  const _panWrapper = wrapper;
  const _panBox     = box;

  function startPanVolumeAnimation() {
    if (_audPanAnim) cancelAnimationFrame(_audPanAnim);

    const animatePanVol = () => {
      if (!_audPanner || !_audGain || !_audSource) return;

      const ww = _panWrapper.offsetWidth || window.innerWidth;
      const bx = parseFloat(_panBox.style.transform?.match(/translateX\(([^)]+)px\)/)?.[1] ?? 0);
      const bw = _panBox.offsetWidth || 0;
      const cx = bx + bw / 2;

      _audPanner.pan.value = Math.max(-1, Math.min(1, (cx / ww) * 2 - 1));

      const fadeZone      = Math.max(ww * 0.18, 80);
      const entryProgress = Math.min(1, Math.max(0, (ww - bx) / fadeZone));
      const exitProgress  = Math.min(1, Math.max(0, (bx + bw) / fadeZone));
      const targetVol = window._quotesMuted
        ? 0
        : _audVol * Math.min(entryProgress, exitProgress);
      _audGain.gain.value = targetVol;

      _audPanAnim = requestAnimationFrame(animatePanVol);
    };

    _audPanAnim = requestAnimationFrame(animatePanVol);
  }

  const _TEXT_ANIMATION_TYPES = new Set(["shake", "wave", "jumpy", "tremble", "crawl"]);

  function parseQuoteWithImages(text) {
    let out = text;

    out = out.replace(
      /\[\{([^}]*)\}\]([\s\S]*?)\[\/\]/g,
      (_, rawProps, inner) => {
        const props = parseStyleProps(rawProps);
        const css   = [];
        const data  = {};
        if (props.c)  css.push(`color:${props.c}`);
        if (props.u === "true") css.push("text-decoration:underline");
        if (props.type && _TEXT_ANIMATION_TYPES.has(props.type)) data.anim = props.type;
        if (props.sp)  data.sp = props.sp;

        const styleAttr = css.length ? ` style="${css.join(";")}"` : "";
        const dataAttrs = Object.entries(data)
          .map(([k, v]) => `data-qs-${k}="${String(v).replace(/"/g, "&quot;")}"`)
          .join(" ");
        const animClass = data.anim ? ` qs-anim-${data.anim}` : "";
        return `<span class="qs-styled${animClass}"${styleAttr}${dataAttrs ? " " + dataAttrs : ""}>${inner}</span>`;
      }
    );

    out = out.replace(
      /\[a\{([^}]*)\}\]([\s\S]*?)\[\/a\]/g,
      (_, rawProps, inner) => {
        const props = parseStyleProps(rawProps);
        const css   = [];
        if (props.u === "true") css.push("text-decoration:underline");
        const accentAttr = props.ac  ? ` data-qs-ac="${props.ac}"`   : "";
        const srcAttr    = props.src ? ` data-qs-src="${props.src}"` : "";
        const styleAttr  = css.length ? ` style="${css.join(";")}"` : "";
        return `<span class="qs-anchor"${styleAttr}${accentAttr}${srcAttr}>${inner}</span>`;
      }
    );
    out = out.replace(
      /\[a\]([\s\S]*?)\[\/a\]/g,
      (_, inner) => `<span class="qs-anchor">${inner}</span>`
    );

    out = out.replace(
      /\[audbox\{([^}]*)\}\]([\s\S]*?)\[\/audbox\]/g,
      (_, rawProps, inner) => {
        const props    = parseStyleProps(rawProps);
        const src      = props.src || "";
        const vol      = parseFloat(props.vol || "100%") / 100;
        const startSec = props.start ? parseFloat(props.start) : 0;
        const endSec   = props.end   ? parseFloat(props.end)   : 0;
        if (src && !_audSrc) startAudio(src, isNaN(vol) ? 1 : clamp(vol, 0, 1), startSec, endSec || undefined);
        return `<span class="qs-audbox" data-qs-src="${src}" data-qs-vol="${props.vol || "100%"}">${inner}</span>`;
      }
    );

    out = out.replace(
      /:([a-zA-Z0-9_\-\/]+(?:\.(png|gif|webp|jpg|jpeg))?):/gi,
      (match, path, ext) => path.includes("..") ? match : buildStickerImg(path, ext || null)
    );

    return out;
  }

  const _ANIM_CONFIG = {
    shake:   { kf: "_qs-shake",   dur: "0.4s",  ease: "ease-in-out", step: 40  },
    wave:    { kf: "_qs-wave",    dur: "1.2s",  ease: "ease-in-out", step: 80  },
    jumpy:   { kf: "_qs-jumpy",   dur: "0.8s",  ease: "ease-in-out", step: 60  },
    tremble: { kf: "_qs-tremble", dur: "0.25s", ease: "linear",      step: 20  },
    crawl:   { kf: "_qs-crawl",   dur: "2.5s",  ease: "ease-in-out", step: 120 },
  };

  function splitAnimatedSpans(containerEl) {
    containerEl.querySelectorAll("[data-qs-anim]").forEach(spanEl => {
      const cfg = _ANIM_CONFIG[spanEl.dataset.qsAnim];
      if (!cfg) return;

      const animDecl   = `${cfg.kf} ${cfg.dur} ${cfg.ease} infinite`;
      let   charIndex  = 0;
      const newChildren = [];

      spanEl.childNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          for (const ch of node.textContent) {
            const charSpan = document.createElement("span");
            charSpan.className          = "qs-char";
            charSpan.textContent        = ch;
            charSpan.style.animation    = animDecl;
            charSpan.style.animationDelay = `${charIndex * cfg.step}ms`;
            newChildren.push(charSpan);
            charIndex++;
          }
        } else {
          newChildren.push(node.cloneNode(true));
          charIndex++;
        }
      });

      spanEl.innerHTML = "";
      newChildren.forEach(child => spanEl.appendChild(child));
    });
  }

  box.addEventListener("click", (e) => {
    const anchor = e.target.closest(".qs-anchor");
    if (!anchor) return;
    const src = anchor.dataset.qsSrc;
    if (src) window.open(src, "_blank", "noopener,noreferrer");
  });

  box.addEventListener("mouseover", (e) => {
    const anchor = e.target.closest(".qs-anchor");
    const ac = anchor?.dataset.qsAc;
    if (ac) anchor.style.color = ac;
  });
  box.addEventListener("mouseout", (e) => {
    const anchor = e.target.closest(".qs-anchor");
    if (anchor) anchor.style.color = "";
  });

  const SPEED_BASE   = 120;
  const SPEED_SLOW   = 70;
  const SPEED_SLOWER = 30;

  let _customSpeeds  = null;
  let pos            = 0;
  let lastTime       = null;
  let currentSpeed   = SPEED_BASE;
  let isHoveringBox  = false;
  let isHoveringText = false;
  let isMouseDown    = false;

  function readCustomSpeeds(boxEl) {
    const span = boxEl.querySelector("[data-qs-sp]");
    if (!span) { _customSpeeds = null; return; }
    const parts = span.dataset.qsSp.split(",").map(s => parseFloat(s.trim()));
    _customSpeeds = (parts.length >= 3 && parts.every(n => !isNaN(n))) ? parts : null;
  }

  const updateSpeed = () => {
    const s = _customSpeeds
      ? { base: _customSpeeds[0], slow: _customSpeeds[1], slower: _customSpeeds[2] }
      : { base: SPEED_BASE, slow: SPEED_SLOW, slower: SPEED_SLOWER };
    if (isMouseDown)         currentSpeed = 0;
    else if (isHoveringText) currentSpeed = s.slower;
    else if (isHoveringBox)  currentSpeed = s.slow;
    else                     currentSpeed = s.base;
  };

  let lastIdx = -1;

  function waitForQuoteReady(containerEl, imgTimeoutMs = 5000, audTimeoutMs = 12000) {
    const imgs = [...containerEl.querySelectorAll("img")];
    const imgPromise = imgs.length
      ? new Promise((resolve) => {
          let remaining = imgs.length;
          const done = () => { if (--remaining === 0) resolve(); };
          setTimeout(resolve, imgTimeoutMs);
          imgs.forEach(img => {
            if (img.complete) { done(); return; }
            img.addEventListener("load",  done, { once: true });
            img.addEventListener("error", done, { once: true });
          });
        })
      : Promise.resolve();

    const audPromise = _audReadyPromise
      ? Promise.race([_audReadyPromise, new Promise(r => setTimeout(r, audTimeoutMs))])
      : Promise.resolve();

    _audReadyPromise = null;
    return Promise.all([imgPromise, audPromise]);
  }

  let _quoteReady = true;

  const setQuote = () => {
    stopAudio();

    if (pendingQuotes) {
      LOCAL_QUOTES = pendingQuotes;
      pendingQuotes = null;
      seenIndices.clear();
      lastIdx = -1;
    }

    let quoteText;

    if (LOCAL_QUOTES.length === 0) {
      quoteText = "Loading quotes…";
    } else if (currentQtype === "Qrefresh") {

      if (refreshQuote === null) {
        const idx = LOCAL_QUOTES.length === 1
          ? 0
          : Math.floor(Math.random() * LOCAL_QUOTES.length);
        refreshQuote = LOCAL_QUOTES[idx];
      }
      quoteText = refreshQuote;
    } else {
      let idx;
      if (LOCAL_QUOTES.length === 1) {
        idx = 0;
      } else {
        do { idx = Math.floor(Math.random() * LOCAL_QUOTES.length); } while (idx === lastIdx);
      }
      lastIdx = idx;
      seenIndices.add(idx);
      quoteText = LOCAL_QUOTES[idx];

      if (seenIndices.size >= LOCAL_QUOTES.length) {
        seenIndices.clear();
        backgroundRefetch();
      }
    }

    box.innerHTML = parseQuoteWithImages(quoteText);
    splitAnimatedSpans(box);
    readCustomSpeeds(box);
    updateSpeed();

    if (currentQtype === "Qrefresh") {
      wrapper.classList.add("qs-mode-refresh");
      box.style.transform = "translateX(0)";
      _quoteReady = true;
      lastTime    = null;
    } else {
      wrapper.classList.remove("qs-mode-refresh");
      if (currentQtype === "Qright") {

        pos = -(box.scrollWidth || box.offsetWidth || 600);
      } else {

        pos = wrapper.offsetWidth;
      }
      box.style.transform = `translateX(${pos}px)`;
      _quoteReady = false;
      waitForQuoteReady(box).then(() => { _quoteReady = true; lastTime = null; });
    }
  };

  const animate = (time) => {
    if (currentQtype !== "Qrefresh" && _quoteReady && lastTime !== null) {
      if (currentQtype === "Qright") {

        pos += currentSpeed * ((time - lastTime) / 1000);
        box.style.transform = `translateX(${pos}px)`;
        if (pos > wrapper.offsetWidth) { stopAudio(); setQuote(); }
      } else {

        pos -= currentSpeed * ((time - lastTime) / 1000);
        box.style.transform = `translateX(${pos}px)`;
        if (pos + box.offsetWidth < 0) { stopAudio(); setQuote(); }
      }
    }
    lastTime = (_quoteReady && currentQtype !== "Qrefresh") ? time : null;
    requestAnimationFrame(animate);
  };

  wrapper.addEventListener("mouseenter",  () => { isHoveringBox  = true;  updateSpeed(); });
  wrapper.addEventListener("mouseleave",  () => { isHoveringBox  = false; isHoveringText = false; updateSpeed(); });
  box.addEventListener("mouseenter",      () => { isHoveringText = true;  updateSpeed(); });
  box.addEventListener("mouseleave",      () => { isHoveringText = false; updateSpeed(); });
  wrapper.addEventListener("mousedown",   () => { isMouseDown    = true;  updateSpeed(); });
  document.addEventListener("mouseup",    () => { if (!isMouseDown) return; isMouseDown = false; updateSpeed(); });

  (async () => {
    let data = null;

    try {
      const res = await fetch(bustCache(SHEETS_URL), { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }
      data = await res.json();
    } catch (err) {
      console.error("[Quotes] Failed to fetch or parse the quotes sheet response:", err);
      data = null;
    }

    const initial = parseQuotes(data);
    if (!initial) {
      console.error("[Quotes] Sheet responded, but no usable quotes came out of parseQuotes(). Raw response was:", data);
    }
    LOCAL_QUOTES  = initial || ["404 quotes not found."];
    setQuote();
    requestAnimationFrame(animate);
  })();
});