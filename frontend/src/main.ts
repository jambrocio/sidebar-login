import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .then(() => {
    // Registro del Service Worker para soporte PWA e instalación en escritorio/móvil
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
          reg.update();
        }).catch(() => {
          // En entorno de desarrollo local puede omitirse silenciosamente
        });
      });
    }
  })
  .catch(err => console.error(err));
