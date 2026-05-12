/// <reference types="@rsbuild/core/types" />

declare const __APP_VERSION__: string

interface Window {
  __APP_VERSION__: string
}
