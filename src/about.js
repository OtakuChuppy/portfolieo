const portrait = document.querySelector(".portrait-frame img")
const portraitSkeleton = document.getElementById("about-portrait-skeleton")

if (portraitSkeleton && portrait) {
  portrait.addEventListener("load", () => {
    portraitSkeleton.classList.add("is-loaded")
  })

  portrait.addEventListener("error", () => {
    portraitSkeleton.classList.add("is-loaded")
  })
}

if (portrait) {
  if (portrait.complete) {
    portraitSkeleton.classList.add("is-loaded")
  }

  if (!portrait.getAttribute("src"))
    portrait.src = `${import.meta.env.BASE_URL}insta-pp.webp`
  portrait.addEventListener("error", () => {
    portrait.style.display = "none"
  }, { once: true })
}
