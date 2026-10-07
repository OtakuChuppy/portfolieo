// Marketing tracking configured from the admin "Tracking" panel.
//
// The admin only stores plain IDs (never code). Each vendor snippet is then
// injected exactly in its officially documented shape:
//
//   GTM   : googletagmanager.com/gtm.js?id=GTM-XXXXXXX + dataLayer + noscript iframe
//   GA4   : googletagmanager.com/gtag/js?id=G-XXXXXXXXXX + gtag('config', id)
//   Pixel : connect.facebook.net/en_US/fbevents.js + fbq('init', id) + fbq('track', 'PageView')
//
// Hard rules:
//   - IDs are strictly validated (digits-only Pixel; known-prefix GTM/GA4).
//     Anything else is ignored, so a typo can never inject arbitrary code.
//   - Loaders are idempotent: calling applyTracking() again (e.g. after a
//     cross-tab settings update) only adds what is missing, never duplicates.
//   - Tracking never runs inside the admin panel itself.

import { getSiteContent } from "./siteContent.js"

const PIXEL_ID_RE = /^\d{5,20}$/
const GTM_ID_RE = /^GTM-[A-Z0-9]{4,12}$/i
const GA4_ID_RE = /^(G-[A-Z0-9]{6,20}|AW-\d{5,15})$/i

function clean(value) {
    return String(value ?? "").trim()
}

/** The one shape every loader writes to. */
function normalizedTracking(settings) {
    return {
        metaPixelId: clean(settings?.metaPixelId),
        gtmId: clean(settings?.gtmId).toUpperCase(),
        ga4Id: clean(settings?.ga4Id).toUpperCase(),
        enabled: settings?.enabled !== false,
    }
}

export function validateTracking(settings) {
    const t = normalizedTracking(settings)
    return {
        metaPixelId: PIXEL_ID_RE.test(t.metaPixelId) ? t.metaPixelId : "",
        gtmId: GTM_ID_RE.test(t.gtmId) ? t.gtmId : "",
        ga4Id: GA4_ID_RE.test(t.ga4Id) ? t.ga4Id : "",
        enabled: t.enabled,
    }
}

/* ---------------- GTM (Google Tag Manager) ---------------- */

function loadGtm(containerId) {
    const w = window
    w.dataLayer = w.dataLayer || []
    w.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" })
    if (document.querySelector(`script[data-loader="gtm"][data-id="${containerId}"]`)) return

    const script = document.createElement("script")
    script.async = true
    script.dataset.loader = "gtm"
    script.dataset.id = containerId
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`
    const first = document.getElementsByTagName("script")[0]
    if (first?.parentNode) first.parentNode.insertBefore(script, first)
    else document.head.appendChild(script)

    // Official GTM noscript fallback, right after <body> opens.
    if (!document.querySelector(`noscript[data-loader="gtm"][data-id="${containerId}"]`)) {
        const noscript = document.createElement("noscript")
        noscript.dataset.loader = "gtm"
        noscript.dataset.id = containerId
        const frame = document.createElement("iframe")
        frame.src = `https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(containerId)}`
        frame.height = "0"
        frame.width = "0"
        frame.style.display = "none"
        frame.style.visibility = "hidden"
        noscript.appendChild(frame)
        document.body.insertBefore(noscript, document.body.firstChild)
    }
}

/* ---------------- GA4 (Google Analytics 4) ---------------- */

function loadGa4(containerId) {
    const w = window
    if (w.gtag) return // already loaded by GTM (recommended) or manually
    if (document.querySelector(`script[data-loader="ga4"][data-id="${containerId}"]`)) return

    const script = document.createElement("script")
    script.async = true
    script.dataset.loader = "ga4"
    script.dataset.id = containerId
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(containerId)}`
    const first = document.getElementsByTagName("script")[0]
    if (first?.parentNode) first.parentNode.insertBefore(script, first)
    else document.head.appendChild(script)

    // Load gtag() itself, then initialise.
    window.dataLayer = window.dataLayer || []
    function gtag() { w.dataLayer.push(arguments) }
    w.gtag = gtag
    w.gtag("js", new Date())
    w.gtag("config", containerId)
}

/* ---------------- Meta Pixel ---------------- */

function loadPixel(containerId) {
    const w = window
    if (w.fbq) return // already initialised
    if (document.querySelector(`script[data-loader="pixel"][data-id="${containerId}"]`)) return

    const script = document.createElement("script")
    script.async = true
    script.dataset.loader = "pixel"
    script.dataset.id = containerId
    script.src = `https://connect.facebook.net/en_US/fbevents.js`
    const first = document.getElementsByTagName("script")[0]
    if (first?.parentNode) first.parentNode.insertBefore(script, first)
    else document.head.appendChild(script)

    window.fbq = function () { w.fbq.push(arguments) }
    w.fbq.push = w.fbq.slice.call(arguments)
    w.fbq.loaded = true
    fbq("init", containerId)
    fbq("track", "PageView")
}

/* ---------------- Public API ---------------- */

export function applyTracking(settings = {}) {
    const t = validateTracking(settings)
    if (!t.enabled) return { pixel: false, gtm: false, ga4: false }

    const applied = { pixel: false, gtm: false, ga4: false }

    if (t.gtmId) {
        loadGtm(t.gtmId)
        applied.gtm = true
    }
    if (t.ga4Id) {
        loadGa4(t.ga4Id)
        applied.ga4 = true
    }
    if (t.metaPixelId) {
        loadPixel(t.metaPixelId)
        applied.pixel = true
    }
    return applied
}

export { normalizedTracking }


