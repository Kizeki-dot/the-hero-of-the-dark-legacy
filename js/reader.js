const audio = document.getElementById("sceneAudio");
const player = document.getElementById("audioPlayer");
const volume = document.getElementById("volume");
const muteBtn = document.getElementById("muteBtn");
const pauseBtn = document.getElementById("pauseBtn");
const status = document.getElementById("audioStatus");
const audioTitle = document.getElementById("audioTitle");
const chapterSelect = document.getElementById("chapterSelect");
const chapterControls = document.getElementById("chapterControls");
const prevChapter = document.getElementById("prevChapter");
const nextChapter = document.getElementById("nextChapter");
const prevChapterBottom = document.getElementById("prevChapterBottom");
const nextChapterBottom = document.getElementById("nextChapterBottom");
const chapterContainer = document.getElementById("chapterContainer");
const loading = document.getElementById("readerLoading");
const errorBox = document.getElementById("readerError");
const footer = document.getElementById("readerFooter");

const VOLUME_FOLDER = "../content/volume-01/";
const VOLUME_MANIFEST = `${VOLUME_FOLDER}volume.json`;
const AUDIO_ROOT = "../audio/volume-01/";

let chapters = [];
let currentIndex = -1;
let currentScene = null;
let lastSrc = "";
let muted = false;
let manualPausedScene = null;

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[char]));
}

function formatChapterNumber(number) {
  if (getLanguage() === "my") {
    return String(number).replace(/\d/g, digit => "၀၁၂၃၄၅၆၇၈၉"[digit]);
  }

  return String(number).padStart(2, "0");
}

function parseMetaLine(line) {
  const parts = line.split("|").map(part => part.trim());
  const first = parts.shift() || "";
  const meta = { first };
  for (const part of parts) {
    const index = part.indexOf("=");
    if (index > -1) meta[part.slice(0, index).trim().toLowerCase()] = part.slice(index + 1).trim();
  }
  return meta;
}

function parseMusicMarker(line) {
  const inner = line.match(/^\[\[music:\s*(.*?)\s*\]\]$/i);
  if (!inner) return null;
  const meta = parseMetaLine(inner[1]);
  return {
    audio: meta.first,
    volume: Number.isFinite(Number(meta.volume)) ? Math.max(0, Math.min(1, Number(meta.volume))) : 0.55,
    title: meta.title || t("sceneMusic")
  };
}

function parseChapterText(text) {
  const lines = text.replace(/^\uFEFF/, "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let textLines = [];
  let activeMusic = null;
  let musicLines = [];

  const flushText = () => {
    if (!textLines.length) return;
    // Keep the TXT file's line breaks exactly as written.
    const value = textLines.join("\n");
    if (value.trim()) blocks.push({ type: "text", text: value });
    textLines = [];
  };

  const flushMusic = () => {
    if (!activeMusic) return;
    // Keep every line inside the music passage exactly as written.
    const value = musicLines.join("\n");
    if (value.trim()) blocks.push({ type: "music", text: value, music: activeMusic });
    activeMusic = null;
    musicLines = [];
  };

  for (const rawLine of lines) {
    const markerLine = rawLine.trim();
    const music = parseMusicMarker(markerLine);

    if (!activeMusic && music) {
      flushText();
      activeMusic = music;
      continue;
    }

    if (activeMusic && /^\[\[\/music\]\]$/i.test(markerLine)) {
      flushMusic();
      continue;
    }

    if (activeMusic) {
      musicLines.push(rawLine);
    } else {
      textLines.push(rawLine);
    }
  }

  if (activeMusic) flushMusic();
  flushText();
  return blocks;
}

function renderBlock(block, chapter) {
  const text = escapeHtml(block.text);
  if (block.type !== "music") return `<div class="text-block">${text}</div>`;

  const music = block.music;
  const audioPath = encodeURI(`${AUDIO_ROOT}chapter-${String(chapter.number).padStart(3, "0")}/${music.audio}`);
  return `<div class="music-scene" data-audio="${escapeHtml(audioPath)}" data-volume="${music.volume}" data-title="${escapeHtml(music.title)}"><div class="text-block">${text}</div></div>`;
}

function updateUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("chapter", String(currentIndex + 1));
  history.replaceState(null, "", url);
}

function requestedChapterIndex() {
  const raw = Number(new URLSearchParams(window.location.search).get("chapter"));
  if (!Number.isInteger(raw)) return 0;
  return Math.min(Math.max(raw - 1, 0), chapters.length - 1);
}

function chapterFileForLanguage(chapter) {
  // Burmese uses the existing `file` field. English can be added later with
  // `fileEn` in volume.json. If fileEn is omitted, we also try the convenient
  // filename convention: chapter-001.txt -> chapter-001.en.txt
  if (getLanguage() === "en") {
    if (chapter.fileEn) return chapter.fileEn;
    if (chapter.file) return chapter.file.replace(/\.txt$/i, ".en.txt");
    return null;
  }
  return chapter.fileMy || chapter.file || null;
}

function chapterSelectTitle(chapter) {
  if (getLanguage() === "my" && chapter.selectTitleMy) {
    return chapter.selectTitleMy;
  }

  if (getLanguage() === "en" && chapter.selectTitle) {
    return chapter.selectTitle;
  }

  return chapterDisplayTitle(chapter);
}

function chapterReaderTitle(chapter) {
  if (getLanguage() === "my" && chapter.readerTitleMy) {
    return chapter.readerTitleMy;
  }

  if (getLanguage() === "en" && chapter.readerTitle) {
    return chapter.readerTitle;
  }

  return chapterDisplayTitle(chapter);
}

function chapterDisplayTitle(chapter) {
  if (getLanguage() === "my" && chapter.titleMy) return chapter.titleMy;
  if (getLanguage() === "en" && chapter.titleEn) return chapter.titleEn;
  return chapter.title || "";
}

async function loadChapter(index, scroll = true) {
  if (!chapters[index]) return;
  resetAudioForChapter();
  errorBox.hidden = true;
  currentIndex = index;
  const chapter = chapters[index];
  chapterSelect.value = String(index);
  const file = chapterFileForLanguage(chapter);
  const displayTitle = chapterReaderTitle(chapter);
  chapterContainer.innerHTML = `<p class="chapter-label">${escapeHtml(t("chapter").toUpperCase())} ${formatChapterNumber(chapter.number)}</p><h2>${escapeHtml(displayTitle)}</h2><div class="chapter-loading">${escapeHtml(t("loadingChapter"))}</div>`;

  try {
    if (!file) throw new Error(t("versionComingSoon"));
    const response = await fetch(`${VOLUME_FOLDER}${file}`, { cache: "no-cache" });
    if (!response.ok) {
      if (getLanguage() === "en") throw new Error(t("englishComingSoon"));
      throw new Error(`Could not load ${file} (${response.status})`);
    }
    const text = await response.text();
    const blocks = parseChapterText(text);
    chapterContainer.innerHTML = `<p class="chapter-label">${escapeHtml(t("chapter").toUpperCase())} ${formatChapterNumber(chapter.number)}</p><h2>${escapeHtml(displayTitle)}</h2>${blocks.map(block => renderBlock(block, chapter)).join("")}`;
    prevChapter.disabled = index === 0;
    nextChapter.disabled = index === chapters.length - 1;
    prevChapterBottom.disabled = index === 0;
    nextChapterBottom.disabled = index === chapters.length - 1;
    updateUrl();
    footer.hidden = false;
    if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() => {
      updateScene();
      updateMusicNoticeForChapter();
      checkMusicAfterBrowserPositionRestore();
    });
  } catch (error) {
    if (getLanguage() === "en" && error.message === t("englishComingSoon")) {
      chapterContainer.innerHTML = `<p class="chapter-label">${escapeHtml(t("chapter").toUpperCase())} ${formatChapterNumber(chapter.number)}</p><h2>${escapeHtml(displayTitle)}</h2><div class="chapter-loading">${escapeHtml(t("englishComingSoon"))}</div>`;
      prevChapter.disabled = index === 0;
      nextChapter.disabled = index === chapters.length - 1;
      prevChapterBottom.disabled = index === 0;
      nextChapterBottom.disabled = index === chapters.length - 1;
      footer.hidden = false;
      hideMusicNotice();
      updateUrl();
      return;
    }
    chapterContainer.innerHTML = "";
    errorBox.hidden = false;
    errorBox.innerHTML = `<strong>${escapeHtml(t("chapterCouldNot"))}</strong><br>${escapeHtml(error.message)}`;
  }
}

function formatChapterNumber(number) {
  if (getLanguage() === "my") {
    return String(number)
      .replace(/\d/g, digit => "၀၁၂၃၄၅၆၇၈၉"[digit]);
  }

  return String(number).padStart(2, "0");
}

function setupChapterSelector() {
  chapterSelect.innerHTML = chapters.map((chapter, index) =>
    `<option value="${index}">${escapeHtml(t("chapter"))} ${formatChapterNumber(chapter.number)} — ${escapeHtml(chapterDisplayTitle(chapter))}</option>`
  ).join("");

  chapterControls.hidden = chapters.length === 0;
  chapterSelect.addEventListener("change", () => loadChapter(Number(chapterSelect.value)));
  prevChapter.addEventListener("click", () => loadChapter(currentIndex - 1));
  nextChapter.addEventListener("click", () => loadChapter(currentIndex + 1));
  prevChapterBottom.addEventListener("click", () => loadChapter(currentIndex - 1));
  nextChapterBottom.addEventListener("click", () => loadChapter(currentIndex + 1));
}

function showPlayer() { player.classList.add("visible"); }
function hidePlayer() { player.classList.remove("visible"); }

function playScene(scene) {
  const src = scene.dataset.audio;
  if (!src) return;
  const v = parseFloat(scene.dataset.volume || "0.55");

  if (src !== lastSrc) {
    audio.src = src;
    lastSrc = src;
    audio.currentTime = 0;
    manualPausedScene = null;
  }

  audio.volume = v;
  volume.value = v;
  audio.muted = muted;
  audioTitle.textContent = scene.dataset.title || t("sceneMusic");
  audio.play().then(() => {
    showPlayer();
    pauseBtn.textContent = "⏸";
    pauseBtn.setAttribute("aria-label", t("pauseMusic"));
    status.textContent = t("playingMusic");
  }).catch(() => {
    showPlayer();
    pauseBtn.textContent = "▶";
    pauseBtn.setAttribute("aria-label", t("playMusic"));
    status.textContent = t("tapPlay");
  });
}

// Leaving a music passage pauses it but does NOT rewind it.
// If the reader comes back, the same audio continues from its previous position.
function pauseCurrentScene() {
  audio.pause();
  if (currentScene) {
    status.textContent = t("musicPaused");
    pauseBtn.textContent = "▶";
    pauseBtn.setAttribute("aria-label", t("playMusic"));
  }
}

function resetAudioForChapter() {
  audio.pause();
  audio.currentTime = 0;
  currentScene = null;
  manualPausedScene = null;
  lastSrc = "";
  audio.removeAttribute("src");
  audio.load();
  status.textContent = t("noMusic");
  pauseBtn.textContent = "▶";
  pauseBtn.setAttribute("aria-label", t("playMusic"));
  hidePlayer();
}

function updateScene() {
  const scenes = [...document.querySelectorAll(".music-scene")];
  if (!scenes.length) {
    if (currentScene) pauseCurrentScene();
    currentScene = null;
    manualPausedScene = null;
    hidePlayer();
    return;
  }

  // MUSIC DETECTION RANGE
  // Start when the top of the music block reaches 72% down the viewport.
  // Stop after the bottom of the music block passes 25% down the viewport.
  // Change these two values if you want to tune the range.
  const startY = window.innerHeight * 0.72;
  const stopY = window.innerHeight * 0.25;

  let found = null;
  for (const scene of scenes) {
    const rect = scene.getBoundingClientRect();

    // The scene is active only while it overlaps our reading zone.
    if (rect.top <= startY && rect.bottom >= stopY) {
      found = scene;
    }

    // Scenes are in document order.
    if (rect.top > startY) break;
  }

  if (found !== currentScene) {
    if (currentScene) pauseCurrentScene();

    currentScene = found;

    if (!found) {
      manualPausedScene = null;
      hidePlayer();
      return;
    }

    // A scene changed, so a previous manual pause does not carry over.
    manualPausedScene = null;
    playScene(found);
    return;
  }

  // Same scene: never force-play it again after the reader manually paused it.
  if (
    found &&
    audio.paused &&
    manualPausedScene !== found &&
    audio.currentSrc === new URL(found.dataset.audio, window.location.href).href
  ) {
    playScene(found);
  }
}

let ticking = false;
/* Refresh music check after browser scroll restoration */
window.addEventListener("pageshow", () => {
  requestAnimationFrame(() => {
    updateScene();
    setTimeout(() => updateScene(), 120);
  });
});

/* Desktop refresh / mouse-wheel music-position check */
function checkMusicAfterBrowserPositionRestore() {
  requestAnimationFrame(() => {
    updateScene();
    requestAnimationFrame(() => updateScene());
    setTimeout(() => updateScene(), 150);
  });
}

window.addEventListener("wheel", checkMusicAfterBrowserPositionRestore, { passive: true });

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(() => { updateScene(); ticking = false; });
    ticking = true;
  }
}, { passive: true });

volume.addEventListener("input", event => {
  audio.volume = Number(event.target.value);
  if (audio.volume > 0) { muted = false; audio.muted = false; muteBtn.textContent = "🔊"; }
});

muteBtn.addEventListener("click", () => {
  muted = !muted;
  audio.muted = muted;
  muteBtn.textContent = muted ? "🔇" : "🔊";
  muteBtn.setAttribute("aria-label", t(muted ? "unmuteMusic" : "muteMusic"));
});

pauseBtn.addEventListener("click", () => {
  if (audio.paused) {
    if (currentScene && manualPausedScene === currentScene) {
      manualPausedScene = null;
      playScene(currentScene);
    }
  } else {
    manualPausedScene = currentScene;
    pauseCurrentScene();
  }
});
document.getElementById("backToTop").addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

const notice = document.getElementById("musicNotice");
const dismiss = document.getElementById("dismissNotice");

function hideMusicNotice() {
  notice.hidden = true;
  notice.style.display = "none";
}

function showMusicNotice() {
  notice.hidden = false;
  notice.style.display = "";
}

async function audioFileExists(url) {
  try {
    // A small GET is more reliable than HEAD on simple/local web servers.
    const response = await fetch(url, {
      method: "GET",
      headers: { "Range": "bytes=0-0" },
      cache: "no-cache"
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function updateMusicNoticeForChapter() {
  hideMusicNotice();

  const scenes = [...document.querySelectorAll(".music-scene")];
  if (!scenes.length) return;

  const urls = [...new Set(
    scenes.map(scene => scene.dataset.audio).filter(Boolean)
  )];

  const available = await Promise.all(urls.map(audioFileExists));
  if (available.some(Boolean)) showMusicNotice();
}

dismiss.addEventListener("click", () => {
  // Only dismiss for this current chapter view.
  // It is intentionally NOT saved in localStorage.
  hideMusicNotice();
});

document.addEventListener("visibilitychange", () => { if (document.hidden) pauseCurrentScene(); });
window.addEventListener("pagehide", () => { audio.pause(); });

async function loadStory() {
  try {
    const response = await fetch(VOLUME_MANIFEST, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Could not load ${VOLUME_MANIFEST} (${response.status})`);
    const data = await response.json();
    chapters = Array.isArray(data.chapters) ? data.chapters : [];
    document.getElementById("volumeTitle").textContent = data.title || "Volume One";
    document.getElementById("volumeSubtitle").textContent = data.subtitle || "";
    setupChapterSelector();
    loading.hidden = true;
    if (!chapters.length) {
      errorBox.hidden = false;
      errorBox.textContent = t("noChapters");
      return;
    }
    await loadChapter(requestedChapterIndex(), false);
  } catch (error) {
    loading.hidden = true;
    errorBox.hidden = false;
    errorBox.innerHTML = `<strong>${escapeHtml(t("storyCouldNot"))}</strong><br>${escapeHtml(error.message)}<br><br>${escapeHtml(t("localServer"))}`;
  }
}

document.addEventListener("languagechange", async () => {
  if (chapterControls.hidden === false && chapters.length) setupChapterSelectorLabelsOnly();
  if (chapters.length && currentIndex >= 0) await loadChapter(currentIndex, false);
  if (!currentScene) {
    status.textContent = t("noMusic");
    audioTitle.textContent = t("sceneMusic");
  } else if (audio.paused) {
    status.textContent = t("musicPaused");
  } else {
    status.textContent = t("playingMusic");
  }
  muteBtn.setAttribute("aria-label", t(muted ? "unmuteMusic" : "muteMusic"));
  pauseBtn.setAttribute("aria-label", audio.paused ? t("playMusic") : t("pauseMusic"));
});

function setupChapterSelectorLabelsOnly() {
  chapterSelect.innerHTML = chapters.map((chapter, index) =>
    `<option value="${index}">${escapeHtml(t("chapter"))} ${formatChapterNumber(chapter.number)} — ${escapeHtml(chapterDisplayTitle(chapter))}</option>`
  ).join("");

  chapterSelect.value = String(currentIndex);
}

loadStory();
