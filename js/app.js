const LATEST_ANNOUNCEMENTS = [

  {
    enabled: true,
    labelMy: "✦ အခန်းသစ်",
    labelEn: "✦ NEW",

    titleMy: "ပြန်လည်ဆုံတွေ့ခြင်း",
    titleEn: "",

    descriptionMy: "အခန်း ၂",
    descriptionEn: "Chapter 2",

    chapterIndex: 6
  },

{
    enabled: true,
    labelMy: "✦ အခန်းသစ်",
    labelEn: "✦ NEW",

    titleMy: "ပြန်လည်ဆုံတွေ့ခြင်း (အပိုင်း ၂)",
    titleEn: "",

    descriptionMy: "အခန်း ၂",
    descriptionEn: "Chapter 2",

    chapterIndex: 6
  },

  {
    enabled: false,
    labelMy: "✦ အထူးအပိုင်း",
    labelEn: "✦ SPECIAL",

    titleMy: "အမှောင်ထဲမှ အသံ",
    titleEn: "A Voice in the Darkness",

    descriptionMy: "အထူးအပိုင်း",
    descriptionEn: "Special Episode",

    chapterIndex: 7
  }
];

const menuBtn = document.getElementById("menuBtn");
const header=document.querySelector(".site-header");
if(menuBtn) {
  menuBtn.addEventListener("click",()=>{
    header.classList.toggle("nav-open");
    menuBtn.setAttribute("aria-label", header.classList.contains("nav-open") ? t("closeMenu") : t("openMenu"));
  });
  document.addEventListener("languagechange",()=>{
    menuBtn.setAttribute("aria-label", header.classList.contains("nav-open") ? t("closeMenu") : t("openMenu"));
  });
}

function setupContinueReading() {
  const data = (() => {
    try {
      return JSON.parse(localStorage.getItem("novelRecentReading"));
    } catch {
      return null;
    }
  })();

  if (!data || data.volume !== "volume-01") return;

  const section = document.getElementById("continueReading");
  const title = document.getElementById("continueChapterTitle");
  const subtitle = document.getElementById("continueChapterSubtitle");
  const button = document.getElementById("continueReadingBtn");

  if (!section || !title || !subtitle || !button) return;

  const isMyanmar = getLanguage() === "my";

  title.textContent = isMyanmar
    ? (data.titleMy || `အခန်း ${data.number}`)
    : (data.titleEn || `Chapter ${data.number}`);

  subtitle.textContent = isMyanmar
    ? `အတွဲ ၁ — အခန်း ${data.number}`
    : `Volume 01 — Chapter ${data.number}`;

  button.textContent = isMyanmar ? "ဆက်ဖတ်ရန် →" : "Continue →";

  button.href = `chapters/volume-01.html?chapter=${Number(data.index) + 1}`;

  section.hidden = false;
}

document.addEventListener("DOMContentLoaded", setupContinueReading);

document.addEventListener("languagechange", setupContinueReading);

function setupLatestAnnouncements() {
  const section = document.getElementById("newChapterAnnouncement");

  if (!section) return;

  const announcements = LATEST_ANNOUNCEMENTS.filter(item => item.enabled);

  if (!announcements.length) {
    section.hidden = true;
    return;
  }

  const isMyanmar = getLanguage() === "my";

  const card = section.querySelector(".new-chapter-card");

  card.innerHTML = announcements.map(item => `
    <div class="announcement-item">
      <p class="eyebrow">
        ${isMyanmar ? item.labelMy : item.labelEn}
      </p>

      <h2>
        ${isMyanmar ? item.titleMy : item.titleEn}
      </h2>

      <p class="announcement-description">
        ${isMyanmar ? item.descriptionMy : item.descriptionEn}
      </p>

      <a
        class="announcement-read"
        href="chapters/volume-01.html?chapter=${item.chapterIndex + 1}"
      >
        ${isMyanmar ? "ဖတ်ရန် →" : "Read →"}
      </a>
    </div>
  `).join("");

  section.hidden = false;
}

document.addEventListener("DOMContentLoaded", setupLatestAnnouncements);
document.addEventListener("languagechange", setupLatestAnnouncements);

