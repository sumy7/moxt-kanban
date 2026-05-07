import { mount } from 'svelte';
import App from './App.svelte';
import './index.css';
import { initializeDatabase } from './lib/db/database';

await initializeDatabase();

const app = mount(App, {
  target: document.body,
});

export default app;
