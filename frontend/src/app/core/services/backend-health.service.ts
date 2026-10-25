import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

/**
 * Estados posibles del servicio backend Spring Boot 4.
 */
export type BackendServiceStatus = 'ONLINE' | 'OFFLINE' | 'CHECKING';

/**
 * Servicio reactivo centralizado para el monitoreo de disponibilidad,
 * detección de caídas del backend (fuera de servicio), bloqueo de autenticación
 * y aviso de restablecimiento del sistema.
 */
@Injectable({
  providedIn: 'root',
})
export class BackendHealthService {
  private readonly router = inject(Router);

  /** URL base para la comprobación ultraliviana de salud */
  private readonly healthEndpoint = environment.healthEndpoint;
  private readonly actuatorEndpoint = environment.actuatorEndpoint;

  /** Estado actual de conectividad con el backend */
  readonly backendStatus = signal<BackendServiceStatus>('CHECKING');

  /** Indica si el backend se encuentra fuera de servicio (inaccesible / 0 / 503) */
  readonly isBackendOffline = computed(() => this.backendStatus() === 'OFFLINE');

  /** Dirección resuelta del backend para visualización clara y dinámica */
  readonly backendEndpointDisplay = computed(() => {
    if (typeof window !== 'undefined') {
      if (this.healthEndpoint.startsWith('http://') || this.healthEndpoint.startsWith('https://')) {
        return this.healthEndpoint;
      }
      return `${window.location.origin}${this.healthEndpoint}`;
    }
    return this.healthEndpoint;
  });

  /** Indica si el servicio estuvo caído y acaba de ser recuperado exitosamente */
  readonly wasOfflineAndRecovered = signal<boolean>(false);

  /** Marca de tiempo de la última verificación exitosa o fallida */
  readonly lastCheckedAt = signal<Date | null>(null);

  /** Contador regresivo en segundos para el siguiente reintento automático */
  readonly retryCountdown = signal<number>(5);

  /** Indica si se está ejecutando una verificación manual forzada desde el botón */
  readonly isManualChecking = signal<boolean>(false);

  /** Mensaje explicativo para el usuario */
  readonly statusMessage = signal<string | null>(null);

  /** Identificador del temporizador de reintento automático */
  private pollingTimer: ReturnType<typeof setInterval> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private recoveryDismissTimer: ReturnType<typeof setTimeout> | null = null;

  /** Bandera interna para evitar chequeos concurrentes solapados */
  private isChecking = false;

  constructor() {
    // 1. Si existen cachés residuales del Service Worker que guardaron endpoints del backend, purgarlos
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(keys => {
        keys.forEach(k => {
          if (k.startsWith('bevadmin-pwa-v1')) {
            caches.delete(k);
          }
        });
      });
    }

    // 2. Iniciar el monitoreo global automático continuo (cada 3 segundos)
    this.startHealthPolling(3000);
  }

  /**
   * Ejecuta una comprobación de disponibilidad activa contra el backend.
   * Utiliza un timeout de 1.5 segundos con `AbortController` y solicitud CORS simple (sin preflight OPTIONS).
   *
   * @param force Si es true (ej. clic en "Verificar Ahora"), fuerza la ejecución inmediata cancelando esperas previas.
   * @returns `true` si el backend responde con HTTP 200 y JSON con status 'UP', `false` si está fuera de servicio.
   */
  async checkHealthNow(force = false): Promise<boolean> {
    if (this.isChecking && !force) {
      return this.backendStatus() === 'ONLINE';
    }

    if (force) {
      this.isChecking = false;
      this.isManualChecking.set(true);
      this.retryCountdown.set(3);
    }

    this.isChecking = true;
    const previousStatus = this.backendStatus();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const cacheBust = Date.now();
      let response: Response | null = null;

      try {
        // Petición CORS Simple: SOLO cabecera Accept para que el navegador no envíe preflight OPTIONS
        response = await fetch(`${this.healthEndpoint}?_t=${cacheBust}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
      } catch {
        // Fallback rápido al endpoint de Spring Boot Actuator
        try {
          response = await fetch(`${this.actuatorEndpoint}?_t=${cacheBust}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal,
          });
        } catch (networkErr) {
          throw networkErr;
        }
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response || !response.ok) {
        throw new Error(`HTTP Error ${response?.status || 'No Response'}`);
      }

      // Validar estrictamente que sea JSON y que contenga status 'UP'
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Respuesta del backend no válida: se recibió contenido no JSON');
      }

      const body = await response.json();
      const isUp =
        body &&
        (body.status === 'UP' ||
          body.status === 'up' ||
          (typeof body === 'object' && body.status === 'UP'));

      if (!isUp) {
        throw new Error(`Servicio reportó estado no saludable: ${body?.status}`);
      }

      this.lastCheckedAt.set(new Date());

      // Si anteriormente estuvo fuera de servicio, activamos la bandera de recuperación temporal
      if (previousStatus === 'OFFLINE') {
        this.wasOfflineAndRecovered.set(true);
        this.statusMessage.set(
          '¡Servicio restablecido! El sistema se encuentra disponible. Ya puede iniciar sesión.'
        );

        // Auto-descartar el banner de servicio restablecido después de 5 segundos
        if (this.recoveryDismissTimer) {
          clearTimeout(this.recoveryDismissTimer);
        }
        this.recoveryDismissTimer = setTimeout(() => {
          this.dismissRecoveryAlert();
        }, 5000);
      } else {
        this.statusMessage.set(null);
      }

      this.backendStatus.set('ONLINE');
      this.clearServiceUnavailableParam();
      return true;
    } catch {
      this.lastCheckedAt.set(new Date());
      this.backendStatus.set('OFFLINE');
      this.wasOfflineAndRecovered.set(false);
      this.statusMessage.set(
        'El servicio Backend se encuentra fuera de servicio. No es posible iniciar sesión en este momento.'
      );

      // Si el usuario se encuentra navegando dentro del Dashboard, se le expulsa de inmediato al Login
      this.redirectDashboardIfOffline();
      return false;
    } finally {
      this.isChecking = false;
      this.isManualChecking.set(false);
    }
  }

  /**
   * Notifica de forma inmediata que una petición HTTP general falló por falta de conexión
   * (Network Error, ERR_CONNECTION_REFUSED, HTTP 502, HTTP 503, HTTP 504).
   *
   * @param originUrl URL que originó el fallo
   */
  markBackendOffline(originUrl?: string): void {
    const prev = this.backendStatus();
    this.backendStatus.set('OFFLINE');
    this.wasOfflineAndRecovered.set(false);
    const target = this.backendEndpointDisplay();
    this.statusMessage.set(
      `El servicio Backend (${target}) se encuentra fuera de servicio. Conexión interrumpida${originUrl ? ` al consultar ${originUrl}` : ''}.`
    );

    this.redirectDashboardIfOffline();

    // Si no hay sondeo activo, lo iniciamos inmediatamente para detectar cuando vuelva a estar en línea
    if (!this.pollingTimer) {
      this.startHealthPolling(4000);
    }
  }

  /**
   * Inicia el ciclo periódico de comprobación de salud para detectar cuándo se restablece el backend.
   *
   * @param intervalMs Intervalo en milisegundos entre cada sondeo (por defecto 4000ms)
   */
  startHealthPolling(intervalMs = 3000): void {
    if (this.pollingTimer) {
      return;
    }

    // Ejecuta chequeo inicial inmediato
    this.checkHealthNow();

    const seconds = Math.max(1, Math.floor(intervalMs / 1000));
    this.retryCountdown.set(seconds);
    this.countdownTimer = setInterval(() => {
      this.retryCountdown.update(c => (c > 1 ? c - 1 : seconds));
    }, 1000);

    // Sondeo periódico continuo de red
    this.pollingTimer = setInterval(() => {
      this.checkHealthNow();
    }, intervalMs);
  }

  /**
   * Detiene el ciclo periódico de sondeo de salud.
   */
  stopHealthPolling(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
  }

  /**
   * Descarta el banner de aviso de "Servicio restablecido" una vez que el usuario lo visualizó o intentó ingresar.
   */
  dismissRecoveryAlert(): void {
    if (this.recoveryDismissTimer) {
      clearTimeout(this.recoveryDismissTimer);
      this.recoveryDismissTimer = null;
    }
    this.wasOfflineAndRecovered.set(false);
    this.statusMessage.set(null);
  }

  /**
   * Limpia silenciosamente el queryParam ?serviceUnavailable=true de la URL si el backend ya está disponible.
   */
  clearServiceUnavailableParam(): void {
    if (typeof window !== 'undefined' && this.router.url.includes('serviceUnavailable')) {
      this.router.navigate([], {
        queryParams: { serviceUnavailable: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  /**
   * Redirige al login con la bandera `serviceUnavailable=true` si el usuario está actualmente en el Dashboard.
   */
  private redirectDashboardIfOffline(): void {
    if (typeof window !== 'undefined') {
      const currentUrl = this.router.url;
      if (currentUrl.includes('/dashboard')) {
        // Limpiamos token si el servidor se cayó para evitar estados inconsistentes
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('currentUserProfile');
        localStorage.removeItem('accessToken');
        this.router.navigate(['/login'], { queryParams: { serviceUnavailable: 'true' } });
      }
    }
  }
}
