
(function () {
  "use strict";

  const DATA_KEYS = [
    "favorites",
    "cloakEnabled", "cloakTitle", "cloakIcon",
    "incognitoMode",
    "panicURL",
    "accessPassword",
    "theme",
    "profileNickname", "profilePfp",
    "welcomeNeverShow",
    "searchEngine",
    "_realTitle", "_realFavicon",
    "ws_selected_widgets", "ws_active_widget",
    "ws_selected_themes",
    "ws_selected_gifpacks", "ws_active_gifpack",
  ];

  function exportData() {
    const out = {};
    DATA_KEYS.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) out[k] = v;
    });

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = "wannasmile-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (typeof showToast === "function") showToast("✅ Data exported!");
  }

  function importData() {
    const input = document.createElement("input");
    input.type  = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (typeof data !== "object" || Array.isArray(data)) throw new Error("bad format");
          let count = 0;
          DATA_KEYS.forEach(k => {
            if (k in data) {
              localStorage.setItem(k, data[k]);
              count++;
            }
          });
          if (typeof showToast === "function") showToast(`✅ Imported ${count} setting(s). Reload to apply.`);
        } catch {
          if (typeof showToast === "function") showToast("❌ Invalid data file.");
        }
      };
      reader.readAsText(file);
    });
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  function transferData() {
    const out = {};
    DATA_KEYS.forEach(k => {
      const v = localStorage.getItem(k);
      if (v !== null) out[k] = v;
    });

    try {
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(out))));
      const url     = location.origin + location.pathname + "#data=" + encoded;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          if (typeof showToast === "function") showToast("✅ Transfer link copied to clipboard!");
        });
      } else {

        window.prompt("Copy this transfer link:", url);
      }
    } catch {
      if (typeof showToast === "function") showToast("❌ Transfer failed.");
    }
  }

  function checkTransferLink() {
    const hash = location.hash;
    if (!hash.startsWith("#data=")) return;
    try {
      const encoded = hash.slice(6);
      const data    = JSON.parse(decodeURIComponent(escape(atob(encoded))));
      if (typeof data !== "object" || Array.isArray(data)) return;
      let count = 0;
      DATA_KEYS.forEach(k => {
        if (k in data) {
          localStorage.setItem(k, data[k]);
          count++;
        }
      });
      history.replaceState(null, "", location.pathname);
      if (typeof showToast === "function") {
        setTimeout(() => showToast(`✅ Transfer received — ${count} setting(s) applied. Reload to see changes.`), 500);
      }
    } catch {  }
  }

  const CLEARABLE_KEYS = [
    "favorites",
    "cloakEnabled", "cloakTitle", "cloakIcon",
    "incognitoMode",
    "panicURL",
    "accessPassword",
    "selectedTheme",
    "profileNickname", "profilePfp",
    "welcomeNeverShow",
    "searchEngine",
    "dismissedUpdateVersion",
    "_realTitle", "_realFavicon",
    "ws_selected_widgets", "ws_active_widget",
    "ws_selected_themes", "ws_theme_cache",
    "ws_selected_gifpacks", "ws_active_gifpack",
  ];

  function clearData() {
    const confirmed = window.confirm(
      "Clear all your saved data?\n\nThis will reset:\n• Favourites\n• Cloak settings\n• Theme\n• Widgets\n• Gif pack\n• Profile\n• Panic URL\n• Access password\n• Other preferences\n\nThis cannot be undone."
    );
    if (!confirmed) return;

    CLEARABLE_KEYS.forEach(k => localStorage.removeItem(k));

    try { sessionStorage.removeItem("__ws_assetsCache__"); } catch {}

    try {
      const htmlTitle = document.querySelector("title");
      if (htmlTitle) document.title = htmlTitle.textContent || document.title;

      const favLink = document.querySelector("link[rel~='icon']");
      if (favLink) favLink.href = favLink.dataset.realHref || "/favicon.ico";

      const cloakImg = document.querySelector("#cloak-btn img");
      if (cloakImg) cloakImg.src = "assets/media/images/vis.png";

      document.documentElement.setAttribute("theme", "redux");
    } catch {}

    if (typeof showToast === "function") showToast("🗑️ Data cleared. Reloading…");
    setTimeout(() => location.reload(), 1200);
  }

  document.addEventListener("DOMContentLoaded", () => {
    checkTransferLink();

    const exportBtn = document.getElementById("exportData");
    const importBtn = document.getElementById("importData");
    const transBtn  = document.getElementById("transData");
    const clearBtn  = document.getElementById("clearData");

    exportBtn?.addEventListener("click", (e) => { e.preventDefault(); exportData(); });
    importBtn?.addEventListener("click", (e) => { e.preventDefault(); importData(); });
    transBtn?.addEventListener("click",  (e) => { e.preventDefault(); transferData(); });
    clearBtn?.addEventListener("click",  (e) => { e.preventDefault(); clearData(); });
  });

  window.wsData = { export: exportData, import: importData, transfer: transferData, clear: clearData };
})();