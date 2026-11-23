import { Injectable, inject, signal } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface VersionInfo {
  version: string;
  buildDate?: string;
  buildTime?: string;
  release?: string;
  app?: string;
  environment?: string;
}

/**
 * Servicio de detección automática de versión y soporte técnico de usuario.
 *
 * @description Monitorea en segundo plano el archivo `/version.json` servido por el frontend.
 * Si detecta un despliegue con nueva versión, activa la recarga automática transparente
 * eliminando la necesidad de que el usuario deba presionar `Ctrl + F5`.
 *
 * Además expone datos formateados de diagnóstico para agilizar el soporte técnico.
 */
@Injectable({
  providedIn: 'root'
})
export class AppVersionService {
  private readonly router = inject(Router);

  /** Versión del frontend embebida en la compilación */
  readonly appVersion = signal<string>(environment.version || '2.4.1');
  readonly buildDate = signal<string>(environment.buildDate || '2026-11-23');

  /** Estado de actualización reactiva */
  readonly updateAvailable = signal<boolean>(false);
  readonly newVersion = signal<string>('');
  readonly isChecking = signal<boolean>(false);
  readonly lastChecked = signal<Date | null>(null);

  private pollIntervalId?: any;

  constructor() {
    this.initAutoCheck();
  }

  /**
   * Inicializa la comprobación de versión automática:
   * 1. Al cargar la aplicación
   * 2. Ante cada cambio de ruta (`NavigationEnd`)
   * 3. De forma periódica cada 45 segundos en segundo plano
   */
  private initAutoCheck(): void {
    // 1. Chequeo inicial diferido 2 segundos para no bloquear bootstrap
    setTimeout(() => this.checkForUpdates(), 2000);

    // 2. Chequeo en cada transición de ruta
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkForUpdates();
      });

    // 3. Polling en segundo plano cada 45 segundos
    this.pollIntervalId = setInterval(() => {
      this.checkForUpdates();
    }, 45000);
  }

  /**
   * Consulta el archivo `version.json` del servidor con bypass estricto de caché.
   */
  async checkForUpdates(): Promise<boolean> {
    if (this.isChecking()) {
      return false;
    }

    this.isChecking.set(true);

    try {
      const timestamp = Date.now();
      const response = await fetch(`/version.json?_t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache'
        }
      });

      if (!response.ok) {
        return false;
      }

      const remoteInfo: VersionInfo = await response.json();
      this.lastChecked.set(new Date());

      if (remoteInfo && remoteInfo.version) {
        const local = this.appVersion().trim();
        const remote = remoteInfo.version.trim();

        // Si la versión del servidor difiere de la local, se activó una nueva entrega
        if (remote !== local) {
          console.log(`[VersionService] Nueva versión detectada: local=${local}, remota=${remote}`);
          this.newVersion.set(remote);
          this.updateAvailable.set(true);
          return true;
        }
      }
      return false;
    } catch (err) {
      // Error silencioso en caso de estar offline o en red inestable
      return false;
    } finally {
      this.isChecking.set(false);
    }
  }

  /**
   * Aplica la actualización de forma suave recargando la aplicación.
   */
  applyUpdate(): void {
    try {
      // Limpiar caches de sessionStorage no esenciales pero preservar credenciales
      const token = sessionStorage.getItem('accessToken');
      const user = sessionStorage.getItem('currentUser');
      const profile = sessionStorage.getItem('currentUserProfile');

      sessionStorage.clear();

      if (token) sessionStorage.setItem('accessToken', token);
      if (user) sessionStorage.setItem('currentUser', user);
      if (profile) sessionStorage.setItem('currentUserProfile', profile);
    } catch (_) {}

    const reloadApp = () => {
      window.location.reload();
    };

    // Limpiar Caché Storage de Service Worker si está soportado
    if (typeof caches !== 'undefined' && caches.keys) {
      caches.keys()
        .then(keys => Promise.all(keys.map(k => caches.delete(k))))
        .catch(() => {})
        .finally(() => reloadApp());
      return;
    }

    reloadApp();
  }

  /** Control global del modal de soporte técnico */
  readonly showSupportModal = signal<boolean>(false);
  readonly copyFeedback = signal<boolean>(false);

  /** Abre el modal de diagnóstico y soporte */
  openSupportModal(): void {
    this.showSupportModal.set(true);
  }

  /** Cierra el modal de diagnóstico y soporte */
  closeSupportModal(): void {
    this.showSupportModal.set(false);
  }

  /** Copia la información de diagnóstico y activa feedback */
  async copySupportInfo(): Promise<void> {
    const ok = await this.copyDiagnosticToClipboard();
    if (ok) {
      this.copyFeedback.set(true);
      setTimeout(() => this.copyFeedback.set(false), 2500);
    }
  }

  /** Consulta al servidor si existe una versión más reciente */
  async checkUpdatesNow(): Promise<void> {
    const updated = await this.checkForUpdates();
    if (!updated) {
      this.copyFeedback.set(true);
      setTimeout(() => this.copyFeedback.set(false), 2000);
    }
  }

  /**
   * Genera el bloque estructurado de texto para diagnóstico y soporte técnico.
   */
  getDiagnosticInfo(): string {
    let currentUserStr = 'No autenticado';
    let currentBusiness = 'COTIC S.A.C. (BIZ-003)';

    try {
      const userJson = sessionStorage.getItem('currentUser');
      if (userJson) {
        const u = JSON.parse(userJson);
        currentUserStr = `${u.fullName || u.username} (${u.username || 'USR'}) - Rol: ${u.role || 'N/A'}`;
      }
    } catch (_) {}

    return [
      '========================================================',
      '📦 COTIC: SISTEMA POS & GESTIÓN DE PRODUCTOS',
      '   DIAGNÓSTICO TÉCNICO DE SOPORTE AL CLIENTE',
      '========================================================',
      `• Versión Frontend:     v${this.appVersion()}`,
      `• Fecha Compilación:    ${this.buildDate()}`,
      `• Entorno:              ${environment.environmentName.toUpperCase()}`,
      `• Usuario en Sesión:    ${currentUserStr}`,
      `• Negocio Asignado:     ${currentBusiness}`,
      `• Navegador Cliente:    ${navigator.userAgent}`,
      `• Resolución Pantalla:  ${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio})`,
      `• Ruta Actual:          ${window.location.pathname}`,
      `• Fecha/Hora Local:     ${new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' })}`,
      '========================================================'
    ].join('\n');
  }

  /**
   * Copia la información de diagnóstico directamente al portapapeles.
   */
  async copyDiagnosticToClipboard(): Promise<boolean> {
    const text = this.getDiagnosticInfo();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      } else {
        // Fallback clásico con textarea invisible
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const success = document.execCommand('copy');
        document.body.removeChild(ta);
        return success;
      }
    } catch (e) {
      console.warn('No se pudo copiar diagnóstico:', e);
      return false;
    }
  }
}
