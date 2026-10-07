// Simple client-side gate for the admin panel.
//
// NOTE: this only deters casual visitors. Anything shipped to the browser can
// be inspected in DevTools, so never treat it as real security — but it keeps
// the panel out of sight for everyone stumbling onto /admin.html.
const USERNAME = "chuppy_webs_good"
// SHA-256("chuppy_webs_good:chuppy_web_net") — the password itself is never stored here.
const PASSWORD_HASH = "fdaee977e7779c969ea7b97791dffb3232bf604fda36012161a2dbd23d7ac3fa"
const SESSION_KEY = "portfolio-admin-auth-v1"

export function isAuthed() {
    try {
        return sessionStorage.getItem(SESSION_KEY) === "ok"
    } catch {
        return false
    }
}

async function sha256Hex(text) {
    if (!window.crypto?.subtle) return null
    const bytes = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
    return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function tryLogin(username, password) {
    if (username.trim() !== USERNAME) return false
    const hash = await sha256Hex(`${username.trim()}:${password}`)
    if (!hash) return null
    return hash === PASSWORD_HASH
}

export function applyGate() {
    document.body.classList.toggle("locked", !isAuthed())
}

const form = document.getElementById("login-form")
const usernameField = document.getElementById("login-username")
const passwordField = document.getElementById("login-password")
const errorNote = document.getElementById("login-error")

if (form) {
    form.addEventListener("submit", async (event) => {
        event.preventDefault()
        if (errorNote) errorNote.hidden = true

        const ok = await tryLogin(usernameField.value, passwordField.value)
        if (ok === null) {
            if (errorNote) {
                errorNote.textContent = "Login needs a secure connection (https or localhost)."
                errorNote.hidden = false
            }
            return
        }
        if (!ok) {
            if (errorNote) {
                errorNote.textContent = "Wrong username or password. Try again."
                errorNote.hidden = false
            }
            passwordField.value = ""
            passwordField.focus()
            form.classList.remove("shake")
            void form.offsetWidth
            form.classList.add("shake")
            return
        }
        try {
            sessionStorage.setItem(SESSION_KEY, "ok")
        } catch {
            // private mode — the gate still opens for this page view
        }
        applyGate()
    })
}

document.getElementById("logout-button")?.addEventListener("click", () => {
    try {
        sessionStorage.removeItem(SESSION_KEY)
    } catch {}
    passwordField.value = ""
    applyGate()
    document.getElementById("login-username")?.focus()
})

applyGate()
