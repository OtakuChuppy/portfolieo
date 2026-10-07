import { saveEnquiry } from "./enquiries.js"

const SERVICE_LABELS = {
    "web-development": "Website development",
    "meta-ads": "Meta Ads",
    both: "Website + Meta Ads",
    other: "Something else",
};

const form = document.querySelector(".contact-form");

if (form) {
    form.setAttribute("novalidate", "novalidate");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const data = new FormData(form);
        const name = String(data.get("name") || "").trim();
        const phone = String(data.get("phone") || "").trim();
        const serviceValue = String(data.get("service") || "").trim();
        const message = String(data.get("message") || "").trim();

        if (!name || !phone || !serviceValue || !message) {
            if (!phone) {
                const phoneField = form.querySelector("#contact-phone");
                if (phoneField) {
                    phoneField.setAttribute("aria-invalid", "true");
                    phoneField.focus();
                }
            }
            form.reportValidity();
            return;
        }

        const phoneField = form.querySelector("#contact-phone");
        if (phoneField) phoneField.removeAttribute("aria-invalid");


        const entry = {
            id: Date.now(),
            name,
            email: "",
            phone,
            service: SERVICE_LABELS[serviceValue] || serviceValue,
            budget: "Not provided",
            received: new Date().toISOString().slice(0, 10),
            status: "new",
            message,
        };

        try {
            await saveEnquiry(entry);
        } catch {
            // storage unavailable — still confirm to the user
        }

        form.reset();

        let note = form.querySelector(".contact-success");
        if (!note) {
            note = document.createElement("p");
            note.className = "contact-success";
            note.style.cssText =
                "margin-top:0.8rem;color:#c6f36b;font-size:0.9rem;line-height:1.6;";
            form.appendChild(note);
        }
        note.textContent =
            "Thanks — your enquiry was received. I'll get back to you soon.";
    });
}