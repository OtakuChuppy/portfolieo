const container = document.querySelector(".stats-cards")

if (container) {
  const values = Array.from(container.querySelectorAll(".stat-value"))
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches

  function format(el, value) {
    const decimals = Number(el.dataset.decimals || 0)
    const suffix = el.dataset.suffix || ""
    return `${value.toFixed(decimals)}${suffix}`
  }

  function countUp(el, delay) {
    const target = Number(el.dataset.target)
    const duration = 1600
    const start = performance.now() + delay

    function tick(now) {
      const t = Math.min(Math.max((now - start) / duration, 0), 1)
      // easeOutCubic — fast at first, gentle settle
      const eased = 1 - Math.pow(1 - t, 3)
      el.textContent = format(el, target * eased)
      if (t < 1) requestAnimationFrame(tick)
      else el.textContent = format(el, target)
    }

    requestAnimationFrame(tick)
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        observer.disconnect()

        container.classList.add("is-visible")

        values.forEach((el, index) => {
          if (prefersReducedMotion) {
            el.textContent = format(el, Number(el.dataset.target))
          } else {
            countUp(el, index * 150)
          }
        })
      })
    },
    { threshold: 0.3 }
  )

  if (prefersReducedMotion) {
    container.classList.add("is-visible")
  } else {
    values.forEach((el) => {
      el.textContent = format(el, 0)
    })
    observer.observe(container)
  }
}
