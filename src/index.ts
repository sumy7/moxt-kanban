import { createElement, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import App from "./App"
import { initializeDatabase } from "./lib/db/database"

import "./index.css"

async function main() {
  await initializeDatabase()

  const target = document.querySelector("#root") ?? document.body
  const root = createRoot(target)

  root.render(createElement(StrictMode, null, createElement(App)))
}

main()
