import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

// Global Error Boundary for startup crashes
window.addEventListener('error', (event) => {
    console.error("Global error caught:", event.error);
    if (rootElement && rootElement.innerHTML === '') {
        rootElement.innerHTML = `
            <div style="padding: 2rem; font-family: sans-serif; color: #ef4444; text-align: center;">
                <h1 style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">Something went wrong.</h1>
                <p>Please refresh the page. If the issue persists, check the console.</p>
                <pre style="background: #f3f4f6; padding: 1rem; margin-top: 1rem; border-radius: 0.5rem; text-align: left; overflow: auto;">${event.error?.message || 'Unknown Error'}</pre>
            </div>
        `;
    }
});

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);