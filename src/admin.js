
        import {
            fetchEnquiries,
            subscribeEnquiries,
            updateEnquiryStatus,
            deleteEnquiry,
            seedLocalIfEmpty,
            isCloudConfigured,
            STORAGE_KEY,
        } from "./enquiries.js"
        import {
            fetchPurchases,
            subscribePurchases,
            updatePurchaseStatus,
            deletePurchase,
            PURCHASES_KEY,
        } from "./purchases.js"
        import {
            getSiteContent,
            saveSiteContent,
            defaultSiteContent,
            SECTION_META,
        } from "./siteContent.js"
import { applyTracking, validateTracking } from "./tracking.js"
        const demoEnquiries = [{
            id: 1,
            name: "Maya Johnson",
            phone: "+1 415 555 0132",
            service: "Website development",
            budget: "$3,000–$5,000",
            received: "2026-10-05",
            status: "new",
            message: "I’m launching a small creative studio and need a polished website with a portfolio, service pages, and a contact form. I’d love to discuss the project and timeline."
        }, {
            id: 2,
            name: "Daniel Kim",
            email: "daniel@bloomskincare.co",
            phone: "+1 212 555 0178",
            service: "Meta Ads",
            budget: "$1,000–$2,500",
            received: "2026-10-04",
            status: "booked",
            message: "We’re looking for help improving our Meta ad performance and building a campaign for our new skincare range. We have product photos and an existing Shopify store."
        }, {
            id: 3,
            name: "Sofia Patel",
            email: "sofia@patelfitness.com",
            phone: "+1 310 555 0144",
            service: "Website + Meta Ads",
            budget: "$5,000+",
            received: "2026-10-03",
            status: "on-hold",
            message: "I need a website refresh and want to explore lead-generation ads for my coaching business. I’m still finalizing the launch date, so this project is currently on hold."
        }, {
            id: 4,
            name: "Oliver Grant",
            email: "oliver@fieldandform.com",
            phone: "+44 20 7946 0958",
            service: "Website development",
            budget: "$2,500–$5,000",
            received: "2026-10-02",
            status: "new",
            message: "I need a clean ecommerce site for a small homeware brand. I’d like customers to browse our products, learn about the brand, and get in touch."
        }, {
            id: 5,
            name: "Ava Martinez",
            email: "ava@localtable.com",
            phone: "+1 512 555 0116",
            service: "Meta Ads",
            budget: "$500–$1,000",
            received: "2026-09-30",
            status: "canceled",
            message: "I was interested in running local awareness ads for my restaurant, but our plans have changed and we won’t be moving forward right now."
        }];
        const statusLabels = {
            new: "New",
            booked: "Booked",
            "on-hold": "On-hold",
            canceled: "Canceled"
        };
        let enquiries = [];
        let purchases = [];
        let activeFilter = "all";
        let purchaseFilter = "all";
        let currentEnquiryId = null;
        let currentPurchaseId = null;
        let drawerType = "enquiry";
        let cloudMode = false;

        async function bootEnquiries() {
            seedLocalIfEmpty(demoEnquiries);
            try {
                const res = await fetchEnquiries();
                enquiries = res.items;
                cloudMode = res.cloud;
            } catch {
                enquiries = [];
                cloudMode = false;
            }
            if (isCloudConfigured) {
                subscribeEnquiries((items) => {
                    enquiries = items;
                    cloudMode = true;
                    render();
                    updateCloudBadge();
                });
            }
            render();
            updateCloudBadge();
        }

        function updateCloudBadge() {
            const badge = document.getElementById("cloud-badge");
            if (!badge) return;
            if (cloudMode) {
                badge.textContent = "Live - Firestore connected";
                badge.classList.add("live");
            } else if (isCloudConfigured) {
                badge.textContent = "Connecting to Firestore...";
                badge.classList.remove("live");
            } else {
                badge.textContent = "Local mode - add env vars to go live";
                badge.classList.remove("live");
            }
        }

        function saveEnquiries() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(enquiries));
            } catch {}
        }

        function formatDate(dateString) {
            const date = new Date(dateString + "T12:00:00");
            if (Number.isNaN(date.getTime())) return dateString;
            return new Intl.DateTimeFormat("en", {
                month: "short",
                day: "numeric",
                year: "numeric"
            }).format(date);
        }

        function initials(name) {
            return String(name || "?").split(" ").map(p => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
        }

        function escapeHTML(value) {
            return String(value ?? "").replace(/[&<>"']/g, c => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[c]);
        }

        function showToast(message) {
            const toast = document.getElementById("toast");
            toast.textContent = message;
            toast.classList.add("show");
            clearTimeout(showToast.timer);
            showToast.timer = setTimeout(() => toast.classList.remove("show"), 2200);
        }

        function renderStats() {
            const count = s => enquiries.filter(i => i.status === s).length;
            const cards = [
                ["Total enquiries", enquiries.length, "total"],
                ["New", count("new"), "new"],
                ["Booked", count("booked"), "booked"],
                ["On-hold", count("on-hold"), "on-hold"],
                ["Canceled", count("canceled"), "canceled"]
            ];
            document.getElementById("stats-grid").innerHTML = cards.map(c => `
        <article class="stat-card"><div class="stat-top"><span>${c[0]}</span><span class="stat-dot ${c[2]}"></span></div>
        <strong class="stat-number">${c[1]}</strong></article>`).join("");
        }

        function renderFilters() {
            const filters = [
                ["all", "All"],
                ["new", "New"],
                ["booked", "Booked"],
                ["on-hold", "On-hold"],
                ["canceled", "Canceled"]
            ];
            document.getElementById("filter-row").innerHTML = filters.map(f => {
                const n = f[0] === "all" ? enquiries.length : enquiries.filter(i => i.status === f[0]).length;
                return `<button class="filter-button ${activeFilter === f[0] ? "active" : ""}" data-filter="${f[0]}" type="button">${f[1]}<span class="filter-count">${n}</span></button>`;
            }).join("");
        }

        function filteredEnquiries() {
            const term = document.getElementById("search-input").value.trim().toLowerCase();
            return enquiries.filter(item => {
                const ok = activeFilter === "all" || item.status === activeFilter;
                const hay = `${item.name} ${item.email} ${item.service} ${item.message}`.toLowerCase();
                return ok && hay.includes(term);
            });
        }

        function renderTable() {
            const filtered = filteredEnquiries();
            document.getElementById("inquiries-body").innerHTML = filtered.map(item => `
        <tr>
          <td><div class="person-cell"><div class="person-avatar">${escapeHTML(initials(item.name))}</div>
          <div><span class="person-name">${escapeHTML(item.name)}</span><span class="person-phone">${escapeHTML(item.phone || "No number")}</span></div></div></td>
          <td><span class="service-tag">${escapeHTML(item.service)}</span></td>
          <td>${escapeHTML(formatDate(item.received))}</td>
          <td><span class="status-badge status-${escapeHTML(item.status)}">${escapeHTML(statusLabels[item.status] || item.status)}</span></td>
          <td><button class="view-button" type="button" data-view="${item.id}">View details</button></td>
        </tr>`).join("");
            document.getElementById("empty-state").hidden = filtered.length > 0;
            document.getElementById("table-footer").textContent = `Showing ${filtered.length} of ${enquiries.length} enquiries`;
            document.querySelector(".inquiries-table").style.display = filtered.length > 0 ? "table" : "none";
        }

        function render() {
            renderStats();
            renderFilters();
            renderTable();
        }

        function openDetails(id) {
            const item = enquiries.find(e => e.id === Number(id));
            if (!item) return;
            drawerType = "enquiry";
            currentPurchaseId = null;
            currentEnquiryId = item.id;
            document.getElementById("drawer-title").textContent = "Enquiry details";
            document.getElementById("drawer-date").textContent = `Received ${formatDate(item.received)}`;
            document.getElementById("drawer-content").innerHTML = `
        <div class="drawer-person"><div class="person-avatar">${escapeHTML(initials(item.name))}</div>
        <div><strong>${escapeHTML(item.name)}</strong><a href="tel:${escapeHTML(item.phone)}">${escapeHTML(item.phone || "Call me")}</a></div></div>
        <div class="detail-grid">
          <div class="detail-field"><small>Phone</small><span>${escapeHTML(item.phone || "Not provided")}</span></div>
          <div class="detail-field"><small>Service</small><span>${escapeHTML(item.service)}</span></div>
          <div class="detail-field"><small>Budget</small><span>${escapeHTML(item.budget || "Not provided")}</span></div>
          <div class="detail-field"><small>Enquiry ID</small><span>#${item.id}</span></div>
        </div>
        <div class="message-block"><h3>Project details</h3><p>${escapeHTML(item.message)}</p></div>
        <label class="drawer-status" for="status-select">Update status</label>
        <select class="status-select" id="status-select">${Object.entries(statusLabels).map(e => `<option value="${e[0]}" ${item.status === e[0] ? "selected" : ""}>${e[1]}</option>`).join("")}</select>
        <div class="drawer-actions">
        ${item.phone ? `<a href="tel:${escapeHTML(item.phone)}">Call client</a>` : ""}
        <button type="button" id="delete-enquiry">Delete</button></div>`;
      document.getElementById("detail-drawer").classList.add("open");
      document.getElementById("drawer-backdrop").classList.add("open");
      document.getElementById("detail-drawer").setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function openPurchaseDetails(id) {
      const item = purchases.find(p => String(p.id) === String(id));
      if (!item) return;
      drawerType = "purchase";
      currentEnquiryId = null;
      currentPurchaseId = item.id;
      document.getElementById("drawer-title").textContent = "Purchase details";
      document.getElementById("drawer-date").textContent = `Received ${formatDate(item.received)}`;
      document.getElementById("drawer-content").innerHTML = `
        <div class="drawer-person"><div class="person-avatar">${escapeHTML(initials(item.name))}</div>
        <div><strong>${escapeHTML(item.name)}</strong>${item.phone ? `<a href="tel:${escapeHTML(item.phone)}">${escapeHTML(item.phone)}</a>` : ""}</div></div>
        <div class="detail-grid">
          <div class="detail-field"><small>Number</small><span>${escapeHTML(item.phone || "Not provided")}</span></div>
          <div class="detail-field"><small>Service type</small><span>${escapeHTML(item.planLabel || item.plan || "Not selected")}</span></div>
          <div class="detail-field"><small>Amount</small><span>${escapeHTML(item.amount || "Not provided")}</span></div>
          <div class="detail-field"><small>Order ID</small><span>#${escapeHTML(item.id)}</span></div>
          <div class="detail-field"><small>Source</small><span>Checkout page</span></div>
        </div>
        <div class="message-block"><h3>Customer message</h3><p>${escapeHTML(item.message || "No message provided.")}</p></div>
        <label class="drawer-status" for="status-select">Update status</label>
        <select class="status-select" id="status-select">${Object.entries(statusLabels).map(e => `<option value="${e[0]}" ${item.status === e[0] ? "selected" : ""}>${e[1]}</option>`).join("")}</select>
        <div class="drawer-actions">
        ${item.phone ? `<a href="tel:${escapeHTML(item.phone)}">Call client</a>` : ""}
        <button type="button" id="delete-enquiry">Delete</button></div>`;
      document.getElementById("detail-drawer").classList.add("open");
      document.getElementById("drawer-backdrop").classList.add("open");
      document.getElementById("detail-drawer").setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeDetails() {
      document.getElementById("detail-drawer").classList.remove("open");
      document.getElementById("drawer-backdrop").classList.remove("open");
      document.getElementById("detail-drawer").setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      currentEnquiryId = null;
      currentPurchaseId = null;
    }

    document.getElementById("filter-row").addEventListener("click", e => {
      const b = e.target.closest("[data-filter]");
      if (!b) return;
      activeFilter = b.dataset.filter;
      render();
    });
    document.getElementById("inquiries-body").addEventListener("click", e => {
      const b = e.target.closest("[data-view]");
      if (b) openDetails(b.dataset.view);
    });
    document.getElementById("search-input").addEventListener("input", renderTable);
    document.getElementById("close-drawer").addEventListener("click", closeDetails);
    document.getElementById("drawer-backdrop").addEventListener("click", closeDetails);
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeDetails(); });
    document.getElementById("drawer-content").addEventListener("change", async e => {
      if (e.target.id !== "status-select") return;
      if (drawerType === "purchase") {
        if (currentPurchaseId === null) return;
        const item = purchases.find(x => String(x.id) === String(currentPurchaseId));
        if (!item) return;
        item.status = e.target.value;
        await updatePurchaseStatus(currentPurchaseId, e.target.value);
        savePurchases();
        renderPurchases();
        openPurchaseDetails(currentPurchaseId);
        showToast(`Purchase status updated to ${statusLabels[item.status]}`);
        return;
      }
      if (currentEnquiryId === null) return;
      const item = enquiries.find(x => x.id === currentEnquiryId);
      if (!item) return;
      item.status = e.target.value;
      updateEnquiryStatus(currentEnquiryId, e.target.value);
      saveEnquiries();
      render();
      openDetails(currentEnquiryId);
      showToast(`Status updated to ${statusLabels[item.status]}`);
    });
    document.getElementById("drawer-content").addEventListener("click", async e => {
      if (e.target.id !== "delete-enquiry") return;
      if (drawerType === "purchase") {
        if (currentPurchaseId === null) return;
        await deletePurchase(currentPurchaseId);
        purchases = purchases.filter(x => String(x.id) !== String(currentPurchaseId));
        savePurchases();
        closeDetails();
        renderPurchases();
        showToast("Purchase deleted");
        return;
      }
      if (currentEnquiryId === null) return;
      deleteEnquiry(currentEnquiryId);
      enquiries = enquiries.filter(x => x.id !== currentEnquiryId);
      saveEnquiries();
      closeDetails();
      render();
      showToast("Enquiry deleted");
    });
    document.getElementById("export-button").addEventListener("click", () => {
      const headers = ["Name","Phone","Service","Budget","Received","Status","Message"];
      const rows = filteredEnquiries().map(i => [i.name, i.phone, i.service, i.budget, i.received, statusLabels[i.status] || i.status, i.message]);
      const csv = [headers, ...rows].map(r => r.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
      const link = document.createElement("a");
      link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      link.download = "enquiries.csv";
      link.click();
      URL.revokeObjectURL(link.href);
      showToast(`Exported ${rows.length} enquiries`);
    });
    /* ---------------- Purchases (checkout enquiries) ---------------- */
    function savePurchases() {
        try {
            localStorage.setItem(PURCHASES_KEY, JSON.stringify(purchases));
        } catch {}
    }

    function renderPurchaseFilters() {
        const filters = [
            ["all", "All"],
            ["new", "New"],
            ["booked", "Booked"],
            ["on-hold", "On-hold"],
            ["canceled", "Canceled"]
        ];
        document.getElementById("purchases-filter-row").innerHTML = filters.map(f => {
            const n = f[0] === "all" ? purchases.length : purchases.filter(i => i.status === f[0]).length;
            return `<button class="filter-button ${purchaseFilter === f[0] ? "active" : ""}" data-pfilter="${f[0]}" type="button">${f[1]}<span class="filter-count">${n}</span></button>`;
        }).join("");
    }

    function filteredPurchases() {
        const term = document.getElementById("purchases-search").value.trim().toLowerCase();
        return purchases.filter(item => {
            const ok = purchaseFilter === "all" || item.status === purchaseFilter;
            const hay = `${item.name} ${item.email} ${item.phone} ${item.planLabel} ${item.message}`.toLowerCase();
            return ok && hay.includes(term);
        });
    }

    function renderPurchaseTable() {
        const filtered = filteredPurchases();
        const body = document.getElementById("purchases-body");
        body.innerHTML = filtered.map(item => `
        <tr>
          <td><div class="person-cell"><div class="person-avatar">${escapeHTML(initials(item.name))}</div>
          <div><span class="person-name">${escapeHTML(item.name)}</span><span class="person-phone">${escapeHTML(item.phone || "No number")}</span></div></div></td>
          <td><span class="service-tag">${escapeHTML(item.planLabel || item.plan || "—")}</span></td>
          <td>${escapeHTML(item.amount || "—")}</td>
          <td>${escapeHTML(formatDate(item.received))}</td>
          <td><span class="status-badge status-${escapeHTML(item.status)}">${escapeHTML(statusLabels[item.status] || item.status)}</span></td>
          <td><button class="view-button" type="button" data-pview="${escapeHTML(item.id)}">View details</button></td>
        </tr>`).join("");
        document.getElementById("purchases-empty-state").hidden = filtered.length > 0;
        document.getElementById("purchases-table-footer").textContent = `Showing ${filtered.length} of ${purchases.length} purchases`;
        const table = body.closest("table");
        if (table) table.style.display = filtered.length > 0 ? "table" : "none";
    }

    function renderPurchaseStats() {
        const count = s => purchases.filter(i => i.status === s).length;
        const cards = [
            ["Total purchases", purchases.length, "total"],
            ["New", count("new"), "new"],
            ["Booked", count("booked"), "booked"],
            ["On-hold", count("on-hold"), "on-hold"],
            ["Canceled", count("canceled"), "canceled"]
        ];
        document.getElementById("purchases-stats").innerHTML = cards.map(c => `
        <article class="stat-card"><div class="stat-top"><span>${c[0]}</span><span class="stat-dot ${c[2]}"></span></div>
        <strong class="stat-number">${c[1]}</strong></article>`).join("");
    }

    function renderPurchases() {
        renderPurchaseStats();
        renderPurchaseFilters();
        renderPurchaseTable();
    }

    async function bootPurchases() {
        try {
            const res = await fetchPurchases();
            purchases = res.items;
        } catch {
            purchases = [];
        }
        renderPurchases();
        if (isCloudConfigured) {
            subscribePurchases(items => {
                purchases = items;
                renderPurchases();
            });
        }
    }

    document.getElementById("purchases-filter-row").addEventListener("click", e => {
        const b = e.target.closest("[data-pfilter]");
        if (!b) return;
        purchaseFilter = b.dataset.pfilter;
        renderPurchases();
    });
    document.getElementById("purchases-body").addEventListener("click", e => {
        const b = e.target.closest("[data-pview]");
        if (b) openPurchaseDetails(b.dataset.pview);
    });
    document.getElementById("purchases-search").addEventListener("input", renderPurchaseTable);

    /* ---------------- Editable site numbers ---------------- */
    const CONTENT_SECTIONS = ["heroMeta", "aboutFacts", "aboutProof"];

    function renderContentForm() {
        const content = getSiteContent();
        document.getElementById("content-grid").innerHTML = CONTENT_SECTIONS.map(key => {
            const meta = SECTION_META[key] || { title: key, hint: "" };
            const rows = content[key].map((item, index) => `
                <div class="content-row">
                    <label class="content-cell"><span>Label ${index + 1}</span>
                        <input type="text" name="${key}-${index}-label" value="${escapeHTML(item.label)}" /></label>
                    <label class="content-cell"><span>Value ${index + 1}</span>
                        <input type="text" name="${key}-${index}-value" value="${escapeHTML(item.value)}" /></label>
                </div>`).join("");
            return `<div class="content-group">
                <h3>${escapeHTML(meta.title)}</h3>
                <p>${escapeHTML(meta.hint)}</p>
                ${rows}
            </div>`;
        }).join("");
    }

    document.getElementById("content-form").addEventListener("submit", async e => {
        e.preventDefault();
        const data = new FormData(e.target);
        const next = {};
        for (const key of CONTENT_SECTIONS) {
            next[key] = (defaultSiteContent[key] || []).map((fallback, index) => ({
                label: String(data.get(`${key}-${index}-label`) ?? fallback.label).trim() || fallback.label,
                value: String(data.get(`${key}-${index}-value`) ?? fallback.value).trim() || fallback.value,
            }));
        }
        await saveSiteContent({ ...getSiteContent(), ...next });
        renderContentForm();
        showToast("Site numbers saved");
    });

    document.getElementById("reset-content").addEventListener("click", async () => {
        const defaults = defaultSiteContent;
        await saveSiteContent({
            ...getSiteContent(),
            heroMeta: JSON.parse(JSON.stringify(defaults.heroMeta)),
            aboutFacts: JSON.parse(JSON.stringify(defaults.aboutFacts)),
            aboutProof: JSON.parse(JSON.stringify(defaults.aboutProof)),
        });
        renderContentForm();
        showToast("Site numbers reset to defaults");
    });

    /* ---------------- Editable pricing cards ---------------- */
    function renderPricingForm() {
        const cards = getSiteContent().pricingCards;
        document.getElementById("pricing-grid").innerHTML = cards.map((card, index) => `
            <div class="content-group">
                <div class="content-group-top">
                    <h3>Card ${String(index + 1).padStart(2, "0")}</h3>
                    ${cards.length > 1 ? `<button type="button" class="remove-card" data-remove-card="${index}">Remove</button>` : ""}
                </div>
                <p>Service type: <strong>${escapeHTML(card.id)}</strong></p>
                <input type="hidden" name="pc-${index}-id" value="${escapeHTML(card.id)}" />
                <div class="content-row">
                    <label class="content-cell"><span>Number</span>
                        <input type="text" name="pc-${index}-number" value="${escapeHTML(card.number)}" /></label>
                    <label class="content-cell"><span>Name</span>
                        <input type="text" name="pc-${index}-title" value="${escapeHTML(card.title)}" /></label>
                </div>
                <div class="content-row">
                    <label class="content-cell full"><span>Price</span>
                        <input type="text" name="pc-${index}-price" value="${escapeHTML(card.price)}" /></label>
                </div>
                <div class="content-row">
                    <label class="content-cell full"><span>Description</span>
                        <textarea name="pc-${index}-description">${escapeHTML(card.description)}</textarea></label>
                </div>
                <div class="content-row">
                    <label class="content-cell full"><span>Features (one per line)</span>
                        <textarea name="pc-${index}-features">${escapeHTML(card.features.join("\n"))}</textarea></label>
                </div>
            </div>`).join("");
    }

    function readPricingForm() {
        const data = new FormData(document.getElementById("pricing-form"));
        const ids = data.getAll("pc-id");
        return ids.map((id, index) => ({
            id,
            number: String(data.get(`pc-${index}-number`) ?? "").trim() || String(index + 1).padStart(2, "0"),
            title: String(data.get(`pc-${index}-title`) ?? "").trim() || `Plan ${index + 1}`,
            price: String(data.get(`pc-${index}-price`) ?? "").trim() || "Priced on request",
            description: String(data.get(`pc-${index}-description`) ?? "").trim() || "Tell us what you need — we'll quote it fast.",
            features: String(data.get(`pc-${index}-features`) ?? "")
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean),
        }));
    }

    async function savePricingCards(cards) {
        await saveSiteContent({ ...getSiteContent(), pricingCards: cards });
        renderPricingForm();
    }

    document.getElementById("pricing-form").addEventListener("submit", async e => {
        e.preventDefault();
        await savePricingCards(readPricingForm());
        showToast("Pricing cards saved");
    });

    document.getElementById("add-pricing").addEventListener("click", async () => {
        const cards = readPricingForm();
        cards.push({
            id: `plan-${Date.now().toString(36)}`,
            number: String(cards.length + 1).padStart(2, "0"),
            title: "New plan",
            price: "Priced on request",
            description: "Tell us what you need — we'll quote it fast.",
            features: ["Custom scope", "Fixed quote", "24h reply"],
        });
        await savePricingCards(cards);
        showToast("New card added — edit it, then hit Save pricing");
        document.querySelector("#pricing-grid .content-group:last-child input:not([type=hidden])")?.focus();
    });

    document.getElementById("pricing-grid").addEventListener("click", async e => {
        const btn = e.target.closest("[data-remove-card]");
        if (!btn) return;
        const cards = readPricingForm();
        if (cards.length <= 1) {
            showToast("Keep at least one card");
            return;
        }
        cards.splice(Number(btn.dataset.removeCard), 1);
        await savePricingCards(cards);
        showToast("Card removed");
    });

    document.getElementById("reset-pricing").addEventListener("click", async () => {
        await savePricingCards(JSON.parse(JSON.stringify(defaultSiteContent.pricingCards)));
        showToast("Pricing cards reset to defaults");
    });

    /* ---------------- Editable works cards ---------------- */
    function renderWorksForm() {
        const cards = getSiteContent().worksCards;
        document.getElementById("works-grid").innerHTML = cards.map((card, index) => `
            <div class="content-group">
                <div class="content-group-top">
                    <h3>Card ${String(index + 1).padStart(2, "0")}</h3>
                    ${cards.length > 1 ? `<button type="button" class="remove-card" data-remove-work="${index}">Remove</button>` : ""}
                </div>
                <p>Card ID: <strong>${escapeHTML(card.id)}</strong></p>
                <input type="hidden" name="work-${index}-id" value="${escapeHTML(card.id)}" />
                <div class="content-row">
                    <label class="content-cell"><span>Title</span>
                        <input type="text" name="work-${index}-title" value="${escapeHTML(card.title)}" /></label>
                    <label class="content-cell"><span>Category</span>
                        <input type="text" name="work-${index}-category" value="${escapeHTML(card.category)}" /></label>
                </div>
                <div class="content-row">
                    <label class="content-cell full"><span>Image path</span>
                        <input type="text" name="work-${index}-image" value="${escapeHTML(card.image)}" placeholder="./works/my-project.webp" /></label>
                </div>
                <div class="content-row">
                    <label class="content-cell full"><span>Details (one paragraph per line)</span>
                        <textarea name="work-${index}-paragraphs">${escapeHTML(workParagraphs(card).join("\n"))}</textarea></label>
                </div>
            </div>`).join("");
    }

    function workParagraphs(card) {
        if (Array.isArray(card.paragraphs) && card.paragraphs.length) return card.paragraphs.map(String);
        const html = String(card.content || "");
        const withoutTags = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|h\d)[^>]*>/gi, "\n");
        return withoutTags
            .replace(/<[^>]*>/g, "")
            .split(/\n+/)
            .map(line => line.replace(/\s+/g, " ").trim())
            .filter(Boolean);
    }

    function readWorksForm() {
        const data = new FormData(document.getElementById("works-form"));
        const ids = data.getAll("work-id");
        return ids.map((id, index) => ({
            id,
            title: String(data.get(`work-${index}-title`) ?? "").trim() || `Project ${index + 1}`,
            category: String(data.get(`work-${index}-category`) ?? "").trim() || "Project",
            image: String(data.get(`work-${index}-image`) ?? "").trim(),
            paragraphs: String(data.get(`work-${index}-paragraphs`) ?? "")
                .split("\n")
                .map(line => line.trim())
                .filter(Boolean),
        }));
    }

    async function saveWorksCards(cards) {
        await saveSiteContent({ ...getSiteContent(), worksCards: cards });
        renderWorksForm();
    }

    document.getElementById("works-form").addEventListener("submit", async e => {
        e.preventDefault();
        await saveWorksCards(readWorksForm());
        showToast("Works cards saved");
    });

    document.getElementById("add-work").addEventListener("click", async () => {
        const cards = readWorksForm();
        cards.push({
            id: `work-${Date.now().toString(36)}`,
            title: "New project",
            category: "Project",
            image: "./works/achar-ghor.webp",
            paragraphs: ["Describe this project here — one paragraph per line."],
        });
        await saveWorksCards(cards);
        showToast("New card added — edit it, then hit Save works");
        document.querySelector("#works-grid .content-group:last-child input:not([type=hidden])")?.focus();
    });

    document.getElementById("works-grid").addEventListener("click", async e => {
        const btn = e.target.closest("[data-remove-work]");
        if (!btn) return;
        const cards = readWorksForm();
        if (cards.length <= 1) {
            showToast("Keep at least one card");
            return;
        }
        cards.splice(Number(btn.dataset.removeWork), 1);
        await saveWorksCards(cards);
        showToast("Card removed");
    });

    document.getElementById("reset-works").addEventListener("click", async () => {
        await saveWorksCards(JSON.parse(JSON.stringify(defaultSiteContent.worksCards)));
        showToast("Works cards reset to defaults");
    });

    /* ---------------- Marketing tracking settings ---------------- */
    const TRACKING_DEFAULTS = {
        metaPixelId: "",
        gtmId: "",
        ga4Id: "",
        enabled: false,
    };

    function renderTrackingForm() {
        const t = getSiteContent().tracking;
        document.getElementById("tracking-meta-pixel").value = t.metaPixelId || "";
        document.getElementById("tracking-gtm").value = t.gtmId || "";
        document.getElementById("tracking-ga4").value = t.ga4Id || "";
        document.getElementById("tracking-enabled").checked = t.enabled !== false;
    }

    document.getElementById("tracking-form").addEventListener("submit", async e => {
        e.preventDefault();
        const settings = {
            metaPixelId: document.getElementById("tracking-meta-pixel").value.trim(),
            gtmId: document.getElementById("tracking-gtm").value.trim().toUpperCase(),
            ga4Id: document.getElementById("tracking-ga4").value.trim().toUpperCase(),
            enabled: document.getElementById("tracking-enabled").checked,
        };
        const validated = validateTracking(settings);
        await saveSiteContent({ ...getSiteContent(), tracking: validated });
        renderTrackingForm();
        showToast("Tracking settings saved");
    });

    document.getElementById("save-tracking").addEventListener("click", () => {
        document.getElementById("tracking-form").requestSubmit();
    });

    renderTrackingForm();

    /* ---------------- Sidebar active state ---------------- */
    document.querySelectorAll(".sidebar-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
            link.classList.add("active");
        });
    });

    bootPurchases();
    renderContentForm();
    renderPricingForm();
    renderWorksForm();
    bootEnquiries();
    