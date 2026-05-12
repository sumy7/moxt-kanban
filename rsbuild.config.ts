import { execSync } from "node:child_process"
import { defineConfig } from "@rsbuild/core"
import { pluginReact } from "@rsbuild/plugin-react"
import pkg from "./package.json"

const gitHash = execSync("git rev-parse --short HEAD").toString().trim()
const appVersion = `${pkg.version}(${gitHash})`

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  server: {
    base: "/moxt-kanban",
  },
  html: {
    title: "Moxt Kanban",
    tags: [
      {
        tag: "script",
        children: `window.__APP_VERSION__ = ${JSON.stringify(appVersion)};`,
      },
      {
        tag: "link",
        attrs: {
          href: "https://cdn.jsdelivr.net/npm/@fontsource-variable/jetbrains-mono@5.2.8/index.css",
          rel: "stylesheet",
        },
      },
    ],
  },
})
