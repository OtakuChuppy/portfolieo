import { animateView, spring } from "motion"
import { getSiteContent } from "./siteContent.js"

/**
 * Works gallery — cards come from the admin "Works" panel (local-first,
 * Firestore mirror when configured). Images live in `public/works/`
 * (compressed WebP, ~90–240 KB each) so no runtime CDN fetch is needed.
 */

const items = getSiteContent().worksCards

const cardTransition = {
  type: spring,
  visualDuration: 0.3,
  bounce: 0.2,
}

const openCardTransition = {
  type: spring,
  visualDuration: 0.4,
  bounce: 0.3,
}

function imageMarkup(item) {
  const src = item.image || "./works/achar-ghor.webp"
  return `<div class="card-image-container">
            <div class="image-skeleton"></div>
            <img
              class="card-image"
              src="${src}"
              alt="${escapeAttr(item.title)} preview"
              loading="lazy"
              decoding="async"
              fetchpriority="low"
            >
          </div>`
}

function titleMarkup(item) {
  return `<div class="title-container">
            <span class="h6">${escapeAttr(item.category)}</span>
            <h2 class="h3">${escapeAttr(item.title)}</h2>
          </div>`
}

function escapeAttr(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

const list = document.querySelector(".card-list")
const slot = document.querySelector(".card-open-slot")
const worksFallback = document.querySelector(".works-fallback")

if (!list || !slot) {
  if (worksFallback) worksFallback.hidden = false
} else {

let openId = null
let savedScrollY = 0

function renderList() {
  list.innerHTML = ""
  for (const item of items) {
    const li = document.createElement("li")
    li.className = "card"
    li.dataset.card = item.id
    li.innerHTML = `<div class="card-content" role="button" tabindex="0"
        aria-label="Open ${escapeAttr(item.title)}">
        ${imageMarkup(item)}
      </div>`

    const content = li.querySelector(".card-content")
    const activate = () => open(item.id)

    content.addEventListener("click", activate)
    content.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        activate()
      }
    })

    list.appendChild(li)
  }
}

renderList()

function initSkeletons() {
  list.querySelectorAll(".card-image").forEach((img) => {
    const container = img.closest(".card-image-container")
    if (!container) return
    const skeleton = container.querySelector(".image-skeleton")
    if (!skeleton) return

    img.addEventListener("load", () => {
      skeleton.classList.add("is-loaded")
    })
    img.addEventListener("error", () => {
      skeleton.classList.add("is-loaded")
    })
    if (img.complete) {
      skeleton.classList.add("is-loaded")
    }
  })
}

initSkeletons()

// Keep the overlay in sync if the admin saves changes in another tab.
// (Declared here — inside the gallery scope — so `openId`/`renderList`
// are actually in scope; the old module-level copy threw a ReferenceError.)
document.addEventListener("site-content-updated", (event) => {
  const next = Array.isArray(event.detail?.worksCards) ? event.detail.worksCards : []
  if (!next.length || openId) return
  if (JSON.stringify(next.map((card) => card.id)) === JSON.stringify(items.map((card) => card.id))) return
  items.length = 0
  items.push(...next)
  renderList()
  initSkeletons()
})

function open(id) {
  if (!list || !slot) return
  if (openId) return
  const item = items.find((entry) => entry.id === id)
  if (!item) return

  const from = list.querySelector(`li[data-card="${CSS.escape(id)}"] .card-content`)
  openId = id
  savedScrollY = window.scrollY
  document.documentElement.style.overflow = "hidden"

  animateView(
    () => {
      slot.innerHTML = `
        <div class="card-image-container">
          <div class="image-skeleton"></div>
          <img
            class="card-image"
            src="${item.image || "./works/achar-ghor.webp"}"
            alt="${escapeAttr(item.title)} preview"
            loading="lazy"
            decoding="async"
            fetchpriority="low"
          >
        </div>
        <div class="overlay"></div>
        <div class="card-content-container open">
          <div class="card-content">
            ${titleMarkup(item)}
            <div class="content-container small">
              ${item.content}
            </div>
          </div>
        </div>`
      const modalImage = slot.querySelector(".card-image")
      const modalSkeleton = slot.querySelector(".image-skeleton")
      if (modalImage && modalSkeleton) {
        modalImage.addEventListener("load", () => {
          modalSkeleton.classList.add("is-loaded")
        })
        modalImage.addEventListener("error", () => {
          modalSkeleton.classList.add("is-loaded")
        })
        if (modalImage.complete) {
          modalSkeleton.classList.add("is-loaded")
        }
      }
      slot.querySelector(".overlay").addEventListener("click", close)
      list.style.display = "none"
    },
    openCardTransition
  )
    .add(from, ".card-content-container.open .card-content")
    .new({ opacity: 1 })
}

function close() {
  if (!openId || !list || !slot) return

  const from = slot.querySelector(".card-content")
  const to = list.querySelector(`li[data-card="${CSS.escape(openId)}"] .card-content`)
  openId = null

  animateView(
    () => {
      slot.innerHTML = ""
      list.style.display = ""
      document.documentElement.style.overflow = ""
      window.scrollTo({ top: savedScrollY, behavior: "instant" })
    },
    cardTransition
  )
    .add(from, to)
    .new({ opacity: 1 })
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openId) {
    close()
  }
})
} // end: works gallery initialised
