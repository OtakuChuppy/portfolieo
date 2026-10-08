// Headless smoke test for the production build.
// Usage: node scripts/smoke-test.mjs [url]   (default http://localhost:4173)
// Verifies: no page/module errors, hero canvas initialised (WebGPU or
// graceful fallback), and JS-driven sections rendered.
import puppeteer from "puppeteer-core"

const url = process.argv[2] || "http://localhost:4173"
const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--enable-unsafe-webgpu",
    "--enable-features=Vulkan",
    "--use-angle=swiftshader",
  ],
})

const page = await browser.newPage()
const consoleErrors = []
const pageErrors = []

page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text())
})
page.on("pageerror", (err) => pageErrors.push(String(err)))
page.on("requestfailed", (req) =>
  pageErrors.push(`request failed: ${req.url()} (${req.failure()?.errorText})`)
)

await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 })
await new Promise((resolve) => setTimeout(resolve, 6000))

const report = await page.evaluate(() => {
  const canvas = document.querySelector(".stage canvas")
  const stage = document.querySelector(".stage")
  return {
    canvasReady: canvas?.dataset.ready ?? "(missing canvas)",
    stageIsFallback: stage?.classList.contains("is-fallback"),
    hint: stage?.querySelector(".stage-hint")?.textContent.trim(),
    worksRendered: document.querySelectorAll(".card-list > li").length,
    worksFallback: document.querySelector(".works-fallback")?.hidden === false,
    proofRendered: document.querySelectorAll(".about-proof-card").length,
    navWorks: document.querySelectorAll(".nav-link").length,
  }
})

console.log(JSON.stringify({ url, report, pageErrors, consoleErrors }, null, 2))

const ok =
  pageErrors.length === 0 &&
  (report.canvasReady === "true" || report.canvasReady === "fallback")

await browser.close()
process.exit(ok ? 0 : 1)
