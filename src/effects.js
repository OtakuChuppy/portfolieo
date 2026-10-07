import { animate, hover } from "motion"

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches

if (!reduceMotion) {
  for (const element of document.querySelectorAll(".btn-primary")) {
    hover(element, (target) => {
      animate(target, { scale: 1.06 })

      return () => animate(target, { scale: 1 })
    })
  }
}
