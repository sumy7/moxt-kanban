import { createElement, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initializeDatabase } from './lib/db/database';

await initializeDatabase();

const target = document.querySelector('#root') ?? document.body;
const root = createRoot(target);

root.render(
  createElement(StrictMode, null, createElement(App)),
);
