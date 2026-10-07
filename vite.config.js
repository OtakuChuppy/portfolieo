import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 1100,
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        admin: fileURLToPath(new URL("./admin.html", import.meta.url)),
        checkout: fileURLToPath(new URL("./checkout.html", import.meta.url)),
      },
    },
  },
})
