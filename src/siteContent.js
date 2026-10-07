// Editable site numbers shown on the homepage (hero-meta, about-facts, about-proof).
// Local-first (localStorage) with an optional Firestore mirror so the admin panel
// and the public site stay in sync across devices when Firebase is configured.
import { getDoc, setDoc, doc } from "firebase/firestore"
import { cloudDb, isCloudConfigured } from "./enquiries.js"

export const SITE_CONTENT_KEY = "portfolio-site-content-v1"
const CLOUD_PATH = ["siteContent", "numbers"]

export const defaultSiteContent = {
    heroMeta: [
        { label: "Based in", value: "Remote · Worldwide" },
        { label: "Experience", value: "3+ yrs shipping" },
        { label: "Response", value: "Within 24 hrs" },
    ],
    aboutFacts: [
        { label: "Based in", value: "Remote · Worldwide" },
        { label: "Experience", value: "3+ yrs shipping" },
        { label: "Response", value: "Within 24 hrs" },
    ],
    aboutProof: [
        { value: "25+", label: "Projects shipped" },
        { value: "15+", label: "Happy clients" },
        { value: "3+", label: "Years of craft" },
    ],
    pricingCards: [
        {
            id: "ready-made",
            number: "01",
            title: "Ready-Made Website",
            price: "৳3,000 – ৳5,000",
            description: "A polished, pre-built website you can launch in days.",
            features: ["Mobile responsive", "Fast loading", "Basic SEO setup", "Contact form included"],
        },
        {
            id: "custom",
            number: "02",
            title: "Custom Website",
            price: "Priced on request",
            description: "Built from scratch to match your brand exactly.",
            features: ["Full custom design", "Design included", "Custom functionality", "Content written"],
        },
        {
            id: "design-website",
            number: "03",
            title: "Design → Website",
            price: "Priced on request",
            description: "You bring the design or idea; we turn it into a live site.",
            features: ["You provide design / idea", "Full development", "Deployed & tested", "Handover documentation"],
        },
        {
            id: "pro",
            number: "04",
            title: "Pro Design + Website",
            price: "Priced on request",
            description: "Our designer and developer handle everything from start to finish.",
            features: ["Designer + developer together", "Full strategy included", "Ads / meta ready", "From start to finish"],
        },
    ],
    worksCards: [
        {
            id: "achar-ghor",
            image: "./works/achar-ghor.webp",
            category: "E-commerce · Food",
            title: "Achar Ghor — Homemade Pickle Shop",
            description:
                "Small-batch homemade pickles with a warm Bengali storefront — bold hero, category filters (sweet / sour / spicy), COD badge and reviews.",
        },
        {
            id: "aura-pulse",
            image: "./works/aura-pulse.webp",
            category: "E-commerce · Electronics",
            title: "Aura Pulse — Audio Store",
            description:
                "Dark, neon storefront for earbuds and headphones — 48-hour battery, -45dB ANC and 38ms low-latency stats up front.",
        },
        {
            id: "aura-lustre",
            image: "./works/aura-lustre.webp",
            category: "E-commerce · Jewellery",
            title: "Aura Lustre — Jewellery & Accessories",
            description:
                "Gold jewellery with saree and panjabi matches — category tabs, royal bridal sets, combo pricing and quick-order form.",
        },
        {
            id: "rang-punjab",
            image: "./works/rang-punjab.webp",
            category: "E-commerce · Fashion",
            title: "Rang Punjab — Tradition, Re-cut",
            description:
                "Minimal fashion edit — jutti, phulkari dupattas, waistcoats and sarees with add-to-cart and WhatsApp inquiry checkout.",
        },
        {
            id: "adwitiya-saree",
            image: "./works/adwitiya-saree.webp",
            category: "E-commerce · Boutique",
            title: "Adwitiya Saree — Saree Boutique",
            description:
                "Pink festive boutique — Royal Silk, Pink Festive, Golden Embroidered and Classic Black collections with 5K+ happy customers.",
        },
    ],
}

export const SECTION_META = {
    heroMeta: { title: "Hero meta", hint: "The three small facts under the hero headline." },
    aboutFacts: { title: "About facts", hint: "The fact list inside the About section." },
    aboutProof: { title: "About proof", hint: "The big highlighted numbers in the About section." },
}

function mergeSection(saved, fallback) {
    const list = Array.isArray(saved) ? saved : []
    return fallback.map((item, index) => ({
        label: list[index]?.label ?? item.label,
        value: list[index]?.value ?? item.value,
    }))
}

function mergeCard(item, index) {
    const fallback =
        defaultSiteContent.pricingCards.find((card) => card.id === item?.id) ||
        defaultSiteContent.pricingCards[index] ||
        defaultSiteContent.pricingCards[0]
    const features =
        Array.isArray(item?.features) && item.features.length
            ? item.features.map(String)
            : Array.isArray(fallback?.features) && fallback.features.length
              ? [...fallback.features]
              : ["Fixed quote", "24h reply"]
    return {
        id: String(item?.id || fallback?.id || `plan-${index + 1}`),
        number: String(item?.number ?? fallback?.number ?? String(index + 1).padStart(2, "0")),
        title: String(item?.title ?? fallback?.title ?? `Plan ${index + 1}`),
        price: String(item?.price ?? fallback?.price ?? "Priced on request"),
        description: String(
            item?.description ??
                fallback?.description ??
                "Tell us what you need — we'll quote it fast."
        ),
        features,
        tracking: {
            metaPixelId: "",
            gtmId: "",
            ga4Id: "",
            enabled: false,
        },
    }
}

function mergeWorks(saved) {
    // The saved list is the source of truth (admins can add / remove cards).
    const list = Array.isArray(saved) && saved.length ? saved : defaultSiteContent.worksCards
    return list.map((item, index) => {
        const fallback =
            defaultSiteContent.worksCards.find((card) => card.id === item?.id) ||
            defaultSiteContent.worksCards[index] ||
            defaultSiteContent.worksCards[0]
        const paragraphs =
            Array.isArray(item?.paragraphs) && item.paragraphs.length
                ? item.paragraphs.map(String).filter((line) => line.trim())
                : []
        return {
            id: String(item?.id || fallback?.id || `work-${index + 1}`),
            image: String(item?.image ?? fallback?.image ?? ""),
            category: String(item?.category ?? fallback?.category ?? "Project"),
            title: String(item?.title ?? fallback?.title ?? `Project ${index + 1}`),
            content:
                paragraphs.length > 0
                    ? paragraphs.map((line) => `<p class="big">${line.trim()}</p>`).join("")
                    : rawHTML(item, fallback),
        }
    })
}

function rawHTML(item, fallback) {
    if (typeof item?.content === "string" && item.content.includes("<")) return item.content
    if (typeof fallback?.content === "string") return fallback.content
    const desc = String(item?.description ?? fallback?.description ?? "")
    return `<p class="big">${desc}</p>`
}

/** Strip rendered HTML back to plain paragraphs before persisting. */
function sanitizeWorks(saved) {
    // The saved list is the source of truth (admins can add / remove cards).
    const list = Array.isArray(saved) && saved.length ? saved : defaultSiteContent.worksCards
    return list.map((item, index) => {
        const paragraphs =
            Array.isArray(item?.paragraphs) && item.paragraphs.length
                ? item.paragraphs
                : htmlToParagraphs(item?.content)
        return {
            id: String(item?.id || defaultSiteContent.worksCards[index]?.id || `work-${index + 1}`),
            image: String(item?.image ?? ""),
            category: String(item?.category ?? "Project"),
            title: String(item?.title ?? `Project ${index + 1}`),
            paragraphs: paragraphs.map(String).map((line) => line.trim()).filter(Boolean),
        }
    })
}

function htmlToParagraphs(html) {
    if (typeof html !== "string" || !html) return []
    const withoutTags = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)[^>]*>/gi, "\n")
    const stripped = withoutTags.replace(/<[^>]*>/g, "")
    return stripped
        .split(/\n+/)
        .map((line) => line.replace(/\s+/g, " ").trim())
        .filter(Boolean)
}

function mergeCards(saved) {
    // The saved list is the source of truth (admins can add / remove cards).
    const list = Array.isArray(saved) && saved.length ? saved : defaultSiteContent.pricingCards
    return list.map(mergeCard)
}

function mergeTracking(saved) {
    return { ...defaultSiteContent.tracking, ...saved }
}

/** Read the saved numbers (falling back to the shipped defaults). */
export function getSiteContent() {
    let saved = {}
    try {
        saved = JSON.parse(localStorage.getItem(SITE_CONTENT_KEY) || "{}") || {}
    } catch {
        saved = {}
    }
    return {
        heroMeta: mergeSection(saved.heroMeta, defaultSiteContent.heroMeta),
        aboutFacts: mergeSection(saved.aboutFacts, defaultSiteContent.aboutFacts),
        aboutProof: mergeSection(saved.aboutProof, defaultSiteContent.aboutProof),
        pricingCards: mergeCards(saved.pricingCards),
        worksCards: mergeWorks(saved.worksCards),
        tracking: mergeTracking(saved.tracking),
    }
}

/** Persist locally (always) and mirror to Firestore when configured. */
export async function saveSiteContent(content) {
    const payload = {
        heroMeta: mergeSection(content.heroMeta, defaultSiteContent.heroMeta),
        aboutFacts: mergeSection(content.aboutFacts, defaultSiteContent.aboutFacts),
        aboutProof: mergeSection(content.aboutProof, defaultSiteContent.aboutProof),
        pricingCards: mergeCards(content.pricingCards),
        worksCards: sanitizeWorks(content.worksCards),
        tracking: content.tracking,
        updatedAt: new Date().toISOString(),
    }
    try {
        localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(payload))
    } catch {
        // private mode etc. — ignore
    }
    if (!cloudDb) return { cloud: false }
    try {
        await setDoc(doc(cloudDb, ...CLOUD_PATH), payload, { merge: true })
        return { cloud: true }
    } catch {
        return { cloud: false }
    }
}

/** Pull the cloud copy (if any) and merge it over the local one. */
export async function fetchSiteContent() {
    const local = getSiteContent()
    if (!cloudDb) return { content: local, cloud: false }
    try {
        const snap = await getDoc(doc(cloudDb, ...CLOUD_PATH))
        if (!snap.exists()) return { content: local, cloud: false }
        const saved = snap.data() || {}
        const content = {
            heroMeta: mergeSection(saved.heroMeta, defaultSiteContent.heroMeta),
            aboutFacts: mergeSection(saved.aboutFacts, defaultSiteContent.aboutFacts),
            aboutProof: mergeSection(saved.aboutProof, defaultSiteContent.aboutProof),
            pricingCards: mergeCards(saved.pricingCards),
            worksCards: mergeWorks(saved.worksCards),
        }
        try {
            localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(saved))
        } catch { /* ignore */ }
        return { content, cloud: true }
    } catch {
        return { content: local, cloud: false }
    }
}

function paintPair(row, item) {
    if (!row || !item) return
    const dt = row.querySelector("dt")
    const dd = row.querySelector("dd")
    if (dt && item.label != null) dt.textContent = item.label
    if (dd && item.value != null) dd.textContent = item.value
}

function escapeOption(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

function escapeHTML(value) {
    return escapeOption(value).replace(/"/g, "&quot;")
}

/** Rebuild the works gallery on the main page from the admin-edited cards. */
export function applyWorksCards(content = getSiteContent()) {
    if (typeof document === "undefined") return
    const cards = content.worksCards || defaultSiteContent.worksCards
    const grid = document.querySelector(".card-list")
    if (grid) {
        grid.innerHTML = cards
            .map(
                (card) => `
                    <li class="card" data-card="${escapeHTML(card.id)}">
                        <div class="card-content" role="button" tabindex="0" aria-label="Open ${escapeHTML(card.title)}">
                            <div class="card-image-container">
                                <img class="card-image" src="${escapeHTML(card.image)}" alt="${escapeHTML(card.title)} preview" loading="lazy" decoding="async" fetchpriority="low" />
                            </div>
                        </div>
                    </li>`
            )
            .join("")
    }
}

/** Rebuild the checkout pricing grid + plan select from the admin-edited cards. */
export function applyPricingCards(content = getSiteContent()) {
    if (typeof document === "undefined") return
    const cards = content.pricingCards || defaultSiteContent.pricingCards

    const grid = document.querySelector(".pricing-grid")
    if (grid) {
        grid.innerHTML = cards
            .map(
                (card, index) => `
                    <article class="pricing-card${index === 0 ? " is-featured" : ""}" data-plan="${escapeHTML(card.id)}">
                        ${index === 0 ? `<span class="ribbon">Most popular</span>` : ""}
                        <span class="card-number">${escapeHTML(card.number)}</span>
                        <h2 class="card-title">${escapeHTML(card.title)}</h2>
                        <p class="card-desc">${escapeHTML(card.description)}</p>
                        <div class="card-price">${escapeHTML(card.price)}</div>
                        <ul>
                            ${card.features
                                .map(
                                    (feature) =>
                                        `<li><i class="fa-solid fa-check" aria-hidden="true"></i> ${escapeHTML(feature)}</li>`
                                )
                                .join("")}
                        </ul>
                        <a class="learn-more" href="?plan=${encodeURIComponent(card.id)}#checkout">Select plan <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>
                    </article>`
            )
            .join("")
    }

    const select = document.getElementById("plan")
    if (select) {
        const previous = select.value
        select.innerHTML =
            `<option value="">Select a service…</option>` +
            cards
                .map(
                    (card) =>
                        `<option value="${escapeHTML(card.id)}">${escapeOption(card.title)} (${escapeOption(card.price)})</option>`
                )
                .join("")
        if (previous && cards.some((card) => card.id === previous)) select.value = previous
    }
}

/** Paint saved numbers into the homepage markup. */
export function applySiteContent(content = getSiteContent()) {
    if (typeof document === "undefined") return
    document.querySelectorAll(".hero-meta > div").forEach((row, i) => paintPair(row, content.heroMeta[i]))
    document.querySelectorAll(".about-facts > div").forEach((row, i) => paintPair(row, content.aboutFacts[i]))
    document.querySelectorAll(".about-proof > .about-proof-card").forEach((card, i) => {
        const item = content.aboutProof[i]
        if (!card || !item) return
        const strong = card.querySelector("strong")
        const span = card.querySelector("span")
        if (strong && item.value != null) strong.textContent = item.value
        if (span && item.label != null) span.textContent = item.label
    })
    applyPricingCards(content)
    applyWorksCards(content)
    if (typeof document !== "undefined") {
        document.dispatchEvent(new CustomEvent("site-content-updated", { detail: content }))
    }
}

// Auto-apply on the public site, then refresh from the cloud when available.
if (
    typeof document !== "undefined" &&
    document.querySelector(".hero-meta, .about-facts, .about-proof, .pricing-card, .card-list")
) {
    applySiteContent()
    if (isCloudConfigured) {
        fetchSiteContent()
            .then(({ content }) => applySiteContent(content))
            .catch(() => {})
    }
}
