const menuBtn=document.getElementById("menuBtn");
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
