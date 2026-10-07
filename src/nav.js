const links = Array.from(document.querySelectorAll(".nav-link"))

function setActive(hash) {
  links.forEach((link) => {
    const isActive = link.getAttribute("href") === hash
    link.classList.toggle("is-active", isActive)
    if (isActive) {
      link.setAttribute("aria-current", "page")
    } else {
      link.removeAttribute("aria-current")
    }
  })
}

links.forEach((link) => {
  link.addEventListener("click", () => {
    setActive(link.getAttribute("href"))
  })
})

const sections = links
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean)

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActive(`#${entry.target.id}`)
      }
    })
  },
  { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
)

sections.forEach((section) => observer.observe(section))
