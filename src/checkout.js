import { savePurchase } from "./purchases.js"
import { getSiteContent } from "./siteContent.js"
import { applyTracking } from "./tracking.js"

const form = document.getElementById("checkout-form")
const planSelect = document.getElementById("plan")
const summaryTitle = document.getElementById("ps-title")
const summaryPrice = document.getElementById("ps-price")

/** Cards are admin-editable — always read the latest saved copy. */
function cards() {
    return getSiteContent().pricingCards
}

function cardFor(id) {
    return cards().find((card) => card.id === id) || null
}

function updateSummary() {
    const card = cardFor(planSelect ? planSelect.value : "")
    if (summaryTitle) summaryTitle.textContent = card ? card.title : "No service selected yet"
    if (summaryPrice) summaryPrice.textContent = card ? card.price : ""
}

// Deep links: checkout.html?plan=ready-made#checkout (used by "Select plan")
const preset = new URLSearchParams(window.location.search).get("plan")
if (planSelect && preset && cardFor(preset)) planSelect.value = preset

if (planSelect) planSelect.addEventListener("change", updateSummary)
document.addEventListener("site-content-updated", updateSummary)
updateSummary()

if (form) {
    form.setAttribute("novalidate", "novalidate")
    form.addEventListener("submit", async (event) => {
        event.preventDefault()

        const data = new FormData(form)
        const name = String(data.get("fullName") || "").trim()
        const phone = String(data.get("phone") || "").trim()
        const planId = String(data.get("plan") || "").trim()
        const message = String(data.get("message") || "").trim()

        if (!name || !phone) {
            if (!name) form.querySelector("#fullName")?.focus()
            else form.querySelector("#phone")?.focus()
            form.reportValidity()
            return
        }

        const card = cardFor(planId)
        if (!card) {
            planSelect?.setAttribute("aria-invalid", "true")
            planSelect?.focus()
            planSelect?.reportValidity()
            return
        }
        planSelect?.removeAttribute("aria-invalid")

        const entry = {
            id: Date.now(),
            name,
            email: "",
            phone,
            plan: card.id,
            planLabel: card.title,
            amount: card.price,
            received: new Date().toISOString().slice(0, 10),
            status: "new",
            message,
        }

        try {
            await savePurchase(entry)
        } catch {
            // storage unavailable — still confirm to the user
        }

        form.reset()
        if (planSelect && preset && cardFor(preset)) planSelect.value = preset
        updateSummary()

        let note = form.querySelector(".checkout-success")
        if (!note) {
            note = document.createElement("p")
            note.className = "checkout-success"
            note.style.cssText =
                "margin-top:1rem;color:#c6f36b;font-size:0.92rem;line-height:1.6;"
            form.appendChild(note)
        }
        note.textContent =
            "Thanks! Your inquiry is in — we'll reply with a quote and next steps within 24 hours."
    })
}

// Apply marketing tracking (GTM / GA4 / Pixel) from the admin panel.
applyTracking(getSiteContent().tracking)

