// End-to-end backend test: submits the real contact form in a headless
// browser, then verifies the document actually landed in Cloud Firestore
// (via the Firestore REST API), and optionally cleans it up.
//
// Usage:
//   node scripts/backend-e2e.mjs [baseUrl] [--cleanup]
//   e.g. node scripts/backend-e2e.mjs http://localhost:4173 --cleanup
import puppeteer from "puppeteer-core"

const baseUrl = process.argv[2] || "http://localhost:4173"
const cleanup = process.argv.includes("--cleanup")
const PROJECT = "chuppi-protfolieo-firebase"
const API_KEY = "AIzaSyBa9yIMvoFTwmKkmXsdylqD-sc1Vo_ZSYM"
const REST = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"

const marker = `E2E-TEST-${Date.now()}`

// 1. Submit the contact form in a real browser.
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
})
const page = await browser.newPage()
const pageErrors = []
page.on("pageerror", (err) => pageErrors.push(String(err)))

await page.goto(baseUrl, { waitUntil: "networkidle2", timeout: 60000 })
await page.type("#contact-name", marker)
await page.type("#contact-phone", "+880 10-0000-0000")
await page.select("#contact-service", "web-development")
await page.type("#contact-message", "Automated backend verification message.")
await page.click(".contact-form button[type=submit]")

const success = await page
  .waitForSelector(".contact-success", { timeout: 15000 })
  .then(() => true)
  .catch(() => false)
await browser.close()

console.log(`form submit shown: ${success}`)
if (pageErrors.length) console.log("page errors:", pageErrors)

// 2. Verify it exists in Firestore (poll a few times).
let found = null
for (let attempt = 0; attempt < 10 && !found; attempt++) {
  await new Promise((r) => setTimeout(r, 1500))
  try {
    const res = await fetch(`${REST}/enquiries?key=${API_KEY}`)
    const body = await res.json()
    const docs = body.documents || []
    found = docs.find((d) => d.fields?.name?.stringValue === marker) || null
  } catch {
    // retry
  }
}

if (!found) {
  console.log("FAIL: document not found in Firestore")
  process.exit(1)
}

const docId = found.name.split("/").pop()
console.log(`PASS: found in Firestore as enquiries/${docId}`)

// 3. Optional cleanup of the test row.
if (cleanup) {
  const del = await fetch(`${REST}/enquiries/${docId}?key=${API_KEY}`, {
    method: "DELETE",
  })
  console.log(`cleanup: ${del.status}`)
}
