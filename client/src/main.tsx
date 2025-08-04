import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import offlineStorage from './services/offline';
import operationQueue from './services/operationQueue';
import { encryptionService } from './services/encryption';

// Initialize services
Promise.all([
  offlineStorage.init(),
  operationQueue.init(),
  encryptionService.initialize()
]).catch(console.error);

// Register PWA service worker (only in production)
if ('serviceWorker' in navigator) {
  if (import.meta.env.PROD) {
    // Production: Register service worker
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('PWA service worker registered:', registration);
        })
        .catch((error) => {
          console.log('PWA service worker registration failed:', error);
        });
    });
  } else {
    // Development: Unregister any existing service worker to avoid caching issues
    window.addEventListener('load', async () => {
      try {
        // Unregister all service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        for(let registration of registrations) {
          const success = await registration.unregister();
          if (success) {
            console.log('Development: Unregistered service worker');
          }
        }
        
        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              console.log('Development: Clearing cache:', cacheName);
              return caches.delete(cacheName);
            })
          );
        }
      } catch (error) {
        console.log('Development: Error clearing service worker/caches:', error);
      }
    });
  }
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