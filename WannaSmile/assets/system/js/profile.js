"use strict";

const PROFILE_IMAGES = [
  "bleh", "catcher", "clown", "clowninabox", "dream", "eye", "eyes",
  "glitched", "me", "purpleu", "sleeppy", "smile", "starry", "starwalk", "yum",
].map(n =>
  `https://cdn.jsdelivr.net/gh/mcmattyobriore/yogurtyooo.github.io@main/system/images/profile/${n}.${n === "smile" ? "png" : "jpeg"}`
);

const DEFAULT_PIC = "https://raw.githubusercontent.com/bguhm/bguhm.github.io/main/system/images/profile.png";

const PIXEL_BLOCKS = 32;
const PIXEL_OUTPUT  = 300;

let _pixelCache = { src: null, blocks: null, data: null };

function pixelateImageData(srcUrl, blocks = PIXEL_BLOCKS, outSize = PIXEL_OUTPUT) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!srcUrl.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const small = document.createElement("canvas");
        small.width = blocks; small.height = blocks;
        const sctx = small.getContext("2d");
        sctx.imageSmoothingEnabled = true;
        sctx.drawImage(img, 0, 0, blocks, blocks);

        const big = document.createElement("canvas");
        big.width = outSize; big.height = outSize;
        const bctx = big.getContext("2d");
        bctx.imageSmoothingEnabled = false;
        bctx.drawImage(small, 0, 0, blocks, blocks, 0, 0, outSize, outSize);

        resolve(big.toDataURL("image/png"));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = srcUrl;
  });
}

function getPixelatedSrc(srcUrl) {
  if (_pixelCache.src === srcUrl && _pixelCache.blocks === PIXEL_BLOCKS) {
    return Promise.resolve(_pixelCache.data);
  }
  return pixelateImageData(srcUrl).then((data) => {
    _pixelCache = { src: srcUrl, blocks: PIXEL_BLOCKS, data };
    return data;
  });
}

function loadProfile() {
  const savedPic  = localStorage.getItem("profilePic")   || DEFAULT_PIC;
  const savedName = localStorage.getItem("nickname")     || "Nickname";
  const pixelated = localStorage.getItem("pfpPixelated") === "true";

  const pfpEl           = document.getElementById("pfp");
  const profilePreview  = document.getElementById("profilePreview");
  const dashNick        = document.getElementById("dashNickname");
  const usernameDisplay = document.getElementById("profileOverlayUsername");
  const usernameInput   = document.getElementById("usernameInput");
  const pixelBtn        = document.getElementById("pixelToggleBtn");

  if (dashNick) dashNick.textContent = savedName;
  if (usernameDisplay) usernameDisplay.textContent = savedName;
  if (usernameInput)   usernameInput.value          = savedName;
  if (pixelBtn)        pixelBtn.textContent          = pixelated ? "🔲 Un-Pixelate" : "🟦 Pixelate";

  if (pfpEl) { pfpEl.src = savedPic; pfpEl.style.imageRendering = ""; }
  if (profilePreview) { profilePreview.src = savedPic; profilePreview.style.imageRendering = ""; }

  if (pixelated) {
    getPixelatedSrc(savedPic).then((dataUrl) => {

      if (profilePreview) {
        profilePreview.src = dataUrl;
        profilePreview.style.imageRendering = "pixelated";
      }

      if (pfpEl) {
        pfpEl.src = dataUrl;
        pfpEl.style.imageRendering = "";
      }
    }).catch(() => {

    });
  }
}

function saveProfile({ pic, name, pixelated } = {}) {
  if (pic      !== undefined) localStorage.setItem("profilePic",    pic);
  if (name     !== undefined) localStorage.setItem("nickname",      name);
  if (pixelated !== undefined) localStorage.setItem("pfpPixelated", pixelated ? "true" : "false");
  loadProfile();
}

function openProfileOverlay() {
  loadProfile();
  const overlay = document.getElementById("profileOverlay");
  if (overlay) overlay.classList.add("visible");
}

function closeProfileOverlay() {
  const overlay = document.getElementById("profileOverlay");
  if (overlay) overlay.classList.remove("visible");
}

window.addEventListener("DOMContentLoaded", () => {
  loadProfile();

  const pfpEl = document.getElementById("pfp");
  if (pfpEl) {
    pfpEl.style.cursor = "pointer";
    pfpEl.addEventListener("click", (e) => {
      e.preventDefault();
      openProfileOverlay();
    });

    const parent = pfpEl.parentElement;
    if (parent && parent.tagName === "A") {
      parent.removeAttribute("href");
      parent.style.cursor = "default";
      parent.style.pointerEvents = "none";
      pfpEl.style.pointerEvents = "auto";
    }
  }

  const closeBtn = document.getElementById("profileOverlayClose");
  if (closeBtn) closeBtn.addEventListener("click", closeProfileOverlay);

  const overlay = document.getElementById("profileOverlay");
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeProfileOverlay();
    });
  }

  let cropper          = null;
  let croppedImageData = null;

  const profilePreview = document.getElementById("profilePreview");
  const fileInput      = document.getElementById("profilePicInput");
  const cropContainer  = document.getElementById("cropContainer");
  const cropPreviewImg = document.getElementById("cropPreview");
  const cropConfirmBtn = document.getElementById("cropConfirm");
  const cropCancelBtn  = document.getElementById("cropCancel");
  const removeBtn      = document.getElementById("removePicBtn");
  const saveBtn        = document.getElementById("profileSaveBtn");
  const usernameInput  = document.getElementById("usernameInput");
  const pixelToggleBtn = document.getElementById("pixelToggleBtn");

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (cropContainer)  cropContainer.style.display  = "block";
        if (cropPreviewImg) cropPreviewImg.src            = ev.target.result;
        if (cropper) cropper.destroy();
        if (cropPreviewImg && typeof Cropper !== "undefined") {
          cropper = new Cropper(cropPreviewImg, {
            aspectRatio: 1,
            viewMode: 1,
            background: false,
            dragMode: "move",
          });
        }
      };
      reader.readAsDataURL(file);
    });
  }

  if (cropConfirmBtn) {
    cropConfirmBtn.addEventListener("click", () => {
      if (!cropper) return;
      const canvas = cropper.getCroppedCanvas({ width: 300, height: 300 });
      croppedImageData = canvas.toDataURL("image/png");
      if (profilePreview) profilePreview.src = croppedImageData;
      if (cropContainer)  cropContainer.style.display = "none";
      cropper.destroy();
      cropper = null;
    });
  }

  if (cropCancelBtn) {
    cropCancelBtn.addEventListener("click", () => {
      if (cropContainer) cropContainer.style.display = "none";
      if (cropper) { cropper.destroy(); cropper = null; }
      if (fileInput) fileInput.value = "";
    });
  }

  if (removeBtn) {
    removeBtn.addEventListener("click", () => {
      croppedImageData = null;
      if (profilePreview) profilePreview.src = DEFAULT_PIC;
      saveProfile({ pic: DEFAULT_PIC });
    });
  }

  if (pixelToggleBtn) {
    pixelToggleBtn.addEventListener("click", () => {
      const cur = localStorage.getItem("pfpPixelated") === "true";
      saveProfile({ pixelated: !cur });
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const name    = usernameInput ? usernameInput.value.trim() : null;
      const finalPic = croppedImageData
        || (profilePreview ? profilePreview.src : null)
        || DEFAULT_PIC;
      saveProfile({
        pic:  finalPic,
        name: name || undefined,
      });
      croppedImageData = null;
      closeProfileOverlay();
    });
  }
});