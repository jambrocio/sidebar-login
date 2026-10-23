import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { BackendHealthService } from '../services/backend-health.service';

/**
 * Interceptor HTTP global que detecta caídas del servidor backend Spring Boot 4
 * (status 0, 502, 503, 504 o fallos de red) y notifica al servicio reactivo
 * `BackendHealthService` para bloquear la autenticación y activar el aviso en el Login.
 */
export const backendHealthInterceptor: HttpInterceptorFn = (req, next) => {
  const healthService = inject(BackendHealthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Ignorar llamadas directas de la sonda de salud para evitar recursividad
      const isHealthProbe = req.url.includes('/health');

      if (!isHealthProbe) {
        const isOfflineError =
          error.status === 0 || // Connection Refused / Network Error / Offline
          error.status === 502 || // Bad Gateway
          error.status === 503 || // Service Unavailable
          error.status === 504; // Gateway Timeout

        if (isOfflineError) {
          healthService.markBackendOffline(req.url);
        }
      }

      return throwError(() => error);
    })
  );
};
