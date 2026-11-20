import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { backendHealthInterceptor } from './core/interceptors/backend-health.interceptor';

/**
 * @fileoverview Configuración global del bootstrap de la aplicación Angular Standalone.
 * Provee la configuración de rutas, el cliente HTTP nativo con soporte Fetch y el
 * interceptor de salud del backend Spring Boot 4.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 1.0.0
 */

/**
 * Proveedores de servicios y configuración a nivel de aplicación (ApplicationConfig).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([backendHealthInterceptor]))
  ]
};
