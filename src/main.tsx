import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './lib/authContext.tsx';
import './index.css';

// Intercept and suppress benign Vite WebSocket network connection errors that trigger false-alarm popups
if (typeof window !== 'undefined') {
  const isWebsocketError = (err: any) => {
    const msg = String(err?.message || err || '').toLowerCase();
    return msg.includes('websocket') || msg.includes('web socket') || msg.includes('failed to connect to');
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (isWebsocketError(event.reason)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  window.addEventListener('error', (event) => {
    if (isWebsocketError(event.error) || isWebsocketError(event.message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

