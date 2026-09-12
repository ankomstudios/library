document.addEventListener("DOMContentLoaded", () => {
  const trigger = document.getElementById("openShortCuts");
  if (!trigger) return;

  const overlay = document.createElement("div");
  overlay.className = "shortcuts-overlay";
  overlay.innerHTML = `
    <div class="shortcuts-panel">
      <div class="shortcuts-header"><h2>Shortcuts</h2></div>
      <div class="shortcut"><span class="key">ESC</span><span class="label">Panic — redirect to saved panic URL</span></div>
      <div class="shortcut"><span class="key">T</span><span class="label">Cycle incognito mode (off → about → blob)</span></div>
      <div class="shortcut"><span class="key">R</span><span class="label">Refetch assets</span></div>
      <div class="shortcut"><span class="key">0</span><span class="label">Reset to the Redux theme</span></div>
      <div class="shortcut"><span class="key">1–9</span><span class="label">Jump to a theme shortcut — which theme is on each key is up to you</span></div>
      <div class="shortcut"><span class="key">[ ]</span><span class="label">Cycle your gif packs (loading/searching/crash animations)</span></div>
      <div class="shortcut"><span class="key">+ −</span><span class="label">Cycle your widgets</span></div>
      <div class="shortcuts-note">
        <b>1–9</b>, <b>[ ]</b>, and <b>+ −</b> do nothing until you pick something for them —
        head to the <a href="assets/system/pages/store.html" target="_blank">Store</a> to
        choose your theme shortcuts, gif packs, and widgets. There's no separate Settings
        page yet — the Store is where all of that lives for now.
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  trigger.addEventListener("click", (e) => {
    e.preventDefault();
    overlay.classList.add("active");
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("active");
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay.classList.contains("active")) {
      overlay.classList.remove("active");
      e.stopImmediatePropagation();
    }
  }, true);
});