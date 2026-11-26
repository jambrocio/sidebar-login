import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthApiService } from '../services/auth-api.service';

/**
 * Guardia de seguridad institucional para proteger las interfaces y rutas del Dashboard.
 *
 * Cumplimiento de políticas de sesión:
 * 1. Si el usuario cerró sesión, impide de forma estricta cualquier navegación directa
 *    mediante URL o enlaces y redirige al /login exigiendo nueva autenticación.
 * 2. Si se cerró la pestaña o el navegador, la sesión se descarta automáticamente
 *    (almacenada en sessionStorage) y el guardia bloquea el acceso redirigiendo a /login.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authApi = inject(AuthApiService);
  const router = inject(Router);

  if (authApi.isAuthenticated()) {
    return true;
  }

  // Redireccionar al login con el parámetro returnUrl y sessionExpired
  return router.createUrlTree(['/login'], {
    queryParams: {
      returnUrl: state.url,
      sessionExpired: 'true',
    },
  });
};
