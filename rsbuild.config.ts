import { defineConfig } from '@rsbuild/core';
import { pluginSvelte } from '@rsbuild/plugin-svelte';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginSvelte()],
  html: {
    title: 'Moxt Kanban',
    inject: 'body',
  },
  output: {
    inlineScripts: true,
    inlineStyles: true,
  },
});
