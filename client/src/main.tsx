import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import offlineStorage from './services/offline';
import operationQueue from './services/operationQueue';

// Initialize offline storage and operation queue
Promise.all([
  offlineStorage.init(),
  operationQueue.init()
]).catch(console.error);

// Register PWA service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA service worker registered:', registration);
      })
      .catch((error) => {
        console.log('PWA service worker registration failed:', error);
      });
  });
}

// Debug PWA installation capability
window.addEventListener('load', () => {
  console.log('PWA Debug Info:');
  console.log('- Service Worker supported:', 'serviceWorker' in navigator);
  console.log('- Manifest link exists:', !!document.querySelector('link[rel="manifest"]'));
  console.log('- HTTPS:', location.protocol === 'https:');
  console.log('- Standalone mode:', window.matchMedia('(display-mode: standalone)').matches);
  
  // Check if app is already installed
  if (window.matchMedia('(display-mode: standalone)').matches) {
    console.log('App is running in standalone mode (installed)');
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);