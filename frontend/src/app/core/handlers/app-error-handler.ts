import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Manejador global de excepciones para prevenir errores de lazy-loading ante despliegues continuos.
 *
 * @description Cuando se publica una nueva versión con nuevos chunks empaquetados (`chunk-XYZ.js`),
 * los clientes que ya tenían la página abierta pueden intentar importar un chunk viejo que ya no existe.
 * Este handler intercepta ese error específico y recarga automáticamente la aplicación sin requerir `Ctrl + F5`.
 */
@Injectable()
export class AppErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    const errorMsg = String(error?.message || error?.stack || error || '');

    // Patrones estándar de error de mismatch de chunks lazy-load en Angular / Webpack / Vite / ESBuild
    const isChunkMismatch =
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('dynamically imported module') ||
      errorMsg.includes('missing: chunk-') ||
      errorMsg.includes('ChunkLoadError');

    if (isChunkMismatch) {
      console.warn('[AppErrorHandler] Se detectó un chunk desactualizado por nueva versión. Recargando automáticamente...');
      
      // Prevenir bucles infinitos de recarga si el error persiste
      const lastReload = Number(sessionStorage.getItem('last_auto_chunk_reload') || '0');
      const now = Date.now();
      if (now - lastReload > 10000) {
        sessionStorage.setItem('last_auto_chunk_reload', String(now));
        window.location.reload();
        return;
      }
    }

    // Registrar en consola el error original para depuración
    console.error('[AppErrorHandler] Uncaught error:', error);
  }
}
