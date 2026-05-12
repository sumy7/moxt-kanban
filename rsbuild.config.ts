import { execSync } from "node:child_process"
import { defineConfig } from "@rsbuild/core"
import { pluginReact } from "@rsbuild/plugin-react"
import pkg from "./package.json"

const gitHash = execSync("git rev-parse --short HEAD").toString().trim()
const appVersion = `${pkg.version}(${gitHash})`

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  source: {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
  },
  html: {
    title: "Moxt Kanban",
  },
})
