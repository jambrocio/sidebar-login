import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { backendHealthInterceptor } from './core/interceptors/backend-health.interceptor';
import { AppErrorHandler } from './core/handlers/app-error-handler';

/**
 * @fileoverview Configuración global del bootstrap de la aplicación Angular Standalone.
 * Provee la configuración de rutas, el cliente HTTP nativo con soporte Fetch, el
 * interceptor de salud del backend Spring Boot 4 y el manejador global de errores
 * de versión y lazy-loading (AppErrorHandler).
 *
 * @author Equipo de Arquitectura Frontend
 * @version 2.4.1
 */

/**
 * Proveedores de servicios y configuración a nivel de aplicación (ApplicationConfig).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch(), withInterceptors([backendHealthInterceptor])),
    { provide: ErrorHandler, useClass: AppErrorHandler }
  ]
};
