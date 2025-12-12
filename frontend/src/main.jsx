import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Defensive check: Ensure root element exists
const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('[ERROR] main.jsx: Root element (#root) not found in DOM');
  document.body.innerHTML = '<div style="padding: 20px; font-family: monospace; color: red;"><h1>Critical Error</h1><p>Root element (#root) not found. Check index.html.</p></div>';
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);

    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('[ERROR] main.jsx: Failed to render App', error);
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: monospace;">
        <h1 style="color: red;">React Initialization Error</h1>
        <p><strong>Error:</strong> ${error.message}</p>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${error.stack}</pre>
        <button onclick="window.location.reload()" style="margin-top: 10px; padding: 10px 20px; background: #2563eb; color: white; border: none; cursor: pointer;">Reload Page</button>
      </div>
    `;
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('[GLOBAL ERROR]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[UNHANDLED PROMISE REJECTION]', event.reason);
});

