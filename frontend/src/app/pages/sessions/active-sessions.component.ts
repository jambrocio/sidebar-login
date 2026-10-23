import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApiService, ActiveSessionDto } from '../../core/services/admin-api.service';

/**
 * Componente Smart para la Auditoría de Conexiones de Red,
 * Monitoreo Semaforizado de Sesiones y Cierre Remoto de Dispositivos (Kill Session).
 * <p>
 * Permite al Administrador:
 * 1. Inspeccionar en tiempo real las IPs y navegadores de todos los usuarios conectados.
 * 2. Visualizar el estado de actividad mediante semáforos (🟢 En Línea, 🟡 Ausente, 🔴 Desconectado/Revocado).
 * 3. Identificar la ubicación geográfica aproximada y consultar el mapa de conexiones.
 * 4. Revocar remotamente la sesión a cualquier dispositivo o infiltrado.
 * 5. Bloquear la cuenta del usuario en PostgreSQL y revocar todas sus conexiones activas de inmediato.
 */
@Component({
  selector: 'app-active-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './active-sessions.component.html',
  styleUrl: './active-sessions.component.scss',
})
export class ActiveSessionsComponent implements OnInit, OnDestroy {
  private readonly adminApi = inject(AdminApiService);

  /** Lista completa de sesiones recuperadas desde el backend */
  readonly sessions = signal<ActiveSessionDto[]>([]);

  /** Estado de carga */
  readonly isLoading = signal<boolean>(false);

  /** Mensaje de alerta o feedback exitoso */
  readonly alertMessage = signal<{ text: string; type: 'success' | 'danger' | 'warning' } | null>(null);

  /** Filtro de búsqueda por texto (usuario, nombre, IP o ubicación) */
  readonly searchFilter = signal<string>('');

  /** Filtro por estado semaforizado ('ALL', 'ONLINE', 'IDLE', 'DISCONNECTED', 'SUSPICIOUS') */
  readonly statusFilter = signal<'ALL' | 'ONLINE' | 'IDLE' | 'DISCONNECTED' | 'SUSPICIOUS'>('ALL');

  /** Sesión seleccionada para el modal de Cierre Remoto */
  readonly sessionToRevoke = signal<ActiveSessionDto | null>(null);

  /** Motivo de revocación remota ingresado por el administrador */
  revokeReason = '';

  /** Estado de envío de la acción de revocación */
  readonly isRevoking = signal<boolean>(false);

  /** Sesión seleccionada para visualización de mapa interactivo */
  readonly mapModalSession = signal<ActiveSessionDto | null>(null);

  /** Modal de mapa interactivo visible */
  readonly showMapModal = signal<boolean>(false);

  /** Modo de vista del mapa geográfico: 'WORLD' (Global NOC) | 'PERU' (Sedes Nacionales) */
  readonly mapViewMode = signal<'WORLD' | 'PERU'>('WORLD');

  /** Filtro de tipo de conexión exclusivo para el visor de mapa */
  readonly mapStatusFilter = signal<'ALL' | 'ONLINE' | 'IDLE' | 'DISCONNECTED' | 'SUSPICIOUS'>('ALL');

  /** Temporizador para refresco automático cada 15 segundos */
  private refreshTimer: any;

  // =========================================================================
  // PROPIEDADES COMPUTADAS (KPIs y Filtros)
  // =========================================================================

  /** Total de sesiones registradas */
  readonly totalSessionsCount = computed(() => this.sessions().length);

  /** Cantidad de usuarios en línea con latido reciente (🟢) */
  readonly onlineCount = computed(() =>
    this.sessions().filter(s => s.connectionStatus === 'ONLINE').length
  );

  /** Cantidad de usuarios ausentes o inactivos (🟡) */
  readonly idleCount = computed(() =>
    this.sessions().filter(s => s.connectionStatus === 'IDLE').length
  );

  /** Cantidad de sesiones revocadas o desconectadas (🔴) */
  readonly disconnectedCount = computed(() =>
    this.sessions().filter(s => s.connectionStatus === 'DISCONNECTED').length
  );

  /**
   * Determina si una sesión es sospechosa o proviene de un origen no reconocido/infiltrado.
   */
  isSuspiciousSession(s: ActiveSessionDto): boolean {
    if (!s) return false;
    return (
      (s.ipAddress && s.ipAddress.startsWith('45.')) ||
      (s.locationName && s.locationName.includes('NO RECONOCIDA')) ||
      s.userStatus === 'LOCKED'
    );
  }

  /** Conteo de posibles intrusiones o conexiones desde IPs externas/desconocidas */
  readonly suspiciousCount = computed(() =>
    this.sessions().filter(s => this.isSuspiciousSession(s)).length
  );

  /** Lista filtrada según los criterios de búsqueda y semáforo */
  readonly filteredSessions = computed(() => {
    const query = this.searchFilter().toLowerCase().trim();
    const status = this.statusFilter();

    return this.sessions().filter(session => {
      const matchesStatus =
        status === 'ALL'
          ? true
          : status === 'SUSPICIOUS'
          ? this.isSuspiciousSession(session)
          : session.connectionStatus === status;

      const matchesQuery =
        !query ||
        session.fullName.toLowerCase().includes(query) ||
        session.username.toLowerCase().includes(query) ||
        session.email.toLowerCase().includes(query) ||
        session.ipAddress.toLowerCase().includes(query) ||
        session.locationName.toLowerCase().includes(query) ||
        session.browserName.toLowerCase().includes(query) ||
        session.deviceType.toLowerCase().includes(query) ||
        session.roleName.toLowerCase().includes(query) ||
        session.branchName.toLowerCase().includes(query);

      return matchesStatus && matchesQuery;
    });
  });

  /** Sesiones disponibles para el visor de mapa según el filtro de tipo de conexión elegido en el modal */
  readonly mapFilteredSessions = computed(() => {
    const status = this.mapStatusFilter();
    return this.sessions().filter(session => {
      if (status === 'ALL') return true;
      if (status === 'SUSPICIOUS') return this.isSuspiciousSession(session);
      return session.connectionStatus === status;
    });
  });

  /** Puntos geográficos consolidados para el mapa interactivo */
  readonly mapPoints = computed(() => {
    const sessions = this.mapFilteredSessions();
    const viewMode = this.mapViewMode();
    const pointMap = new Map<string, {
      primarySession: ActiveSessionDto;
      sessions: ActiveSessionDto[];
      count: number;
      isSuspicious: boolean;
      hasOnline: boolean;
      hasIdle: boolean;
      hasDisconnected: boolean;
      left: string;
      top: string;
    }>();

    for (const s of sessions) {
      const key = `${s.latitude ? s.latitude.toFixed(2) : '0'}_${s.longitude ? s.longitude.toFixed(2) : '0'}`;
      const isSusp = this.isSuspiciousSession(s);
      if (!pointMap.has(key)) {
        pointMap.set(key, {
          primarySession: s,
          sessions: [s],
          count: 1,
          isSuspicious: isSusp,
          hasOnline: s.connectionStatus === 'ONLINE',
          hasIdle: s.connectionStatus === 'IDLE',
          hasDisconnected: s.connectionStatus === 'DISCONNECTED',
          left: this.calculatePinLeft(s, viewMode),
          top: this.calculatePinTop(s, viewMode),
        });
      } else {
        const entry = pointMap.get(key)!;
        entry.sessions.push(s);
        entry.count++;
        if (isSusp) entry.isSuspicious = true;
        if (s.connectionStatus === 'ONLINE') entry.hasOnline = true;
        if (s.connectionStatus === 'IDLE') entry.hasIdle = true;
        if (s.connectionStatus === 'DISCONNECTED') entry.hasDisconnected = true;
        if (isSusp || (s.connectionStatus === 'ONLINE' && entry.primarySession.connectionStatus !== 'ONLINE')) {
          entry.primarySession = s;
        }
      }
    }

    return Array.from(pointMap.values());
  });

  /**
   * Calcula la posición horizontal (left %) del pin según la proyección cartográfica.
   */
  calculatePinLeft(s: ActiveSessionDto, viewMode = this.mapViewMode()): string {
    if (viewMode === 'PERU') {
      if (this.isSuspiciousSession(s) || (s.longitude != null && (s.longitude > -68 || s.longitude < -82 || s.latitude > 0 || s.latitude < -19))) {
        return '88%';
      }
      // Rango de longitud Perú: -81.4° a -68.5°
      const lon = s.longitude ?? -77.042793;
      const pct = ((lon - (-81.4)) / (-68.5 - (-81.4))) * 100;
      return `${Math.max(12, Math.min(88, pct)).toFixed(2)}%`;
    }
    // Proyección Equirrectangular Mundial (-180° a +180°)
    const lon = s.longitude ?? -77.042793;
    const pct = ((lon + 180) / 360) * 100;
    return `${Math.max(2, Math.min(98, pct)).toFixed(2)}%`;
  }

  /**
   * Calcula la posición vertical (top %) del pin según la proyección cartográfica.
   */
  calculatePinTop(s: ActiveSessionDto, viewMode = this.mapViewMode()): string {
    if (viewMode === 'PERU') {
      if (this.isSuspiciousSession(s) || (s.latitude != null && (s.latitude > 0 || s.latitude < -19 || s.longitude > -68 || s.longitude < -82))) {
        return '20%';
      }
      // Rango de latitud Perú: 0.0° (Norte) a -18.5° (Sur)
      const lat = s.latitude ?? -12.046374;
      const pct = ((0.0 - lat) / (0.0 - (-18.5))) * 100;
      return `${Math.max(12, Math.min(88, pct)).toFixed(2)}%`;
    }
    // Proyección Equirrectangular Mundial (+90° a -90°)
    const lat = s.latitude ?? -12.046374;
    const pct = ((90 - lat) / 180) * 100;
    return `${Math.max(2, Math.min(98, pct)).toFixed(2)}%`;
  }

  ngOnInit(): void {
    this.loadSessions();
    // Refresco periódico para actualizar semáforos de latidos en vivo
    this.refreshTimer = setInterval(() => {
      this.loadSessions(false);
    }, 15000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  /**
   * Carga las sesiones activas y auditadas desde el backend Spring Boot.
   * @param showSpinner determina si se muestra el spinner de carga general.
   */
  loadSessions(showSpinner = true): void {
    if (showSpinner) {
      this.isLoading.set(true);
    }

    this.adminApi.getActiveSessions().subscribe({
      next: (data) => {
        this.sessions.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error cargando sesiones activas:', err);
        this.isLoading.set(false);
        // Si el backend no está disponible momentáneamente, mantener datos existentes
      }
    });
  }

  /**
   * Abre el modal de confirmación para cerrar remotamente una sesión.
   */
  openRevokeModal(session: ActiveSessionDto): void {
    this.sessionToRevoke.set(session);
    this.revokeReason = session.ipAddress.startsWith('45.')
      ? 'Intrusión detectada desde IP sospechosa no autorizada'
      : 'Cierre preventivo de seguridad ordenado por el Administrador';
  }

  /**
   * Cierra el modal de confirmación.
   */
  closeRevokeModal(): void {
    this.sessionToRevoke.set(null);
    this.revokeReason = '';
  }

  /**
   * Ejecuta el cierre remoto de sesión (Kill Session).
   */
  confirmRevokeSession(): void {
    const session = this.sessionToRevoke();
    if (!session) return;

    this.isRevoking.set(true);
    this.adminApi.revokeSession(session.sessionId, this.revokeReason).subscribe({
      next: (res) => {
        this.isRevoking.set(false);
        this.closeRevokeModal();
        this.alertMessage.set({
          type: 'success',
          text: `Sesión de ${session.fullName} cerrada remotamente con éxito. El usuario ha sido expulsado del sistema.`
        });
        this.loadSessions(false);

        setTimeout(() => this.alertMessage.set(null), 6000);
      },
      error: (err) => {
        this.isRevoking.set(false);
        this.alertMessage.set({
          type: 'danger',
          text: 'Error al revocar la sesión: ' + (err.error?.message || err.message)
        });
      }
    });
  }

  /**
   * Bloquea la cuenta del usuario en PostgreSQL y revoca todas sus conexiones activas.
   */
  lockUserInfiltrator(session: ActiveSessionDto): void {
    const confirmLock = confirm(
      `¿Está completamente seguro de BLOQUEAR la cuenta de "${session.fullName}" (@${session.username})?\n\n` +
      `Se revocará inmediatamente su acceso y quedará impedido de iniciar sesión hasta que un administrador lo desbloquee.`
    );

    if (!confirmLock) return;

    this.isLoading.set(true);
    this.adminApi.lockUserAndRevokeSessions(session.userId, 'Bloqueo forzado por actividad sospechosa').subscribe({
      next: () => {
        this.isLoading.set(false);
        this.alertMessage.set({
          type: 'warning',
          text: `¡Cuenta de ${session.fullName} BLOQUEADA con éxito! Se han revocado todas sus sesiones activas.`
        });
        this.loadSessions(false);
        setTimeout(() => this.alertMessage.set(null), 7000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.alertMessage.set({
          type: 'danger',
          text: 'Error al bloquear cuenta de usuario: ' + (err.error?.message || err.message)
        });
      }
    });
  }

  /**
   * Abre el visor interactivo de mapa para una sesión o para todas las conexiones.
   */
  openLocationMap(session?: ActiveSessionDto): void {
    if (session) {
      this.mapModalSession.set(session);
      if (this.isSuspiciousSession(session) || (session.longitude && (session.longitude > -68 || session.longitude < -82))) {
        this.mapViewMode.set('WORLD');
      }
    } else {
      // Al abrir el mapa general, NO forzar selección de ningún usuario ni de sospechosos
      this.mapModalSession.set(null);
      this.mapStatusFilter.set('ALL');
    }
    this.showMapModal.set(true);
  }

  /**
   * Actualiza el filtro de tipo de conexión exclusivo del modal de mapa.
   */
  setMapStatusFilter(status: 'ALL' | 'ONLINE' | 'IDLE' | 'DISCONNECTED' | 'SUSPICIOUS'): void {
    this.mapStatusFilter.set(status);
    const current = this.mapModalSession();
    if (current) {
      const isSusp = this.isSuspiciousSession(current);
      if (status === 'SUSPICIOUS' && !isSusp) {
        this.mapModalSession.set(null);
      } else if (status !== 'ALL' && status !== 'SUSPICIOUS' && current.connectionStatus !== status) {
        this.mapModalSession.set(null);
      }
    }
  }

  /**
   * Selecciona un usuario específico desde el menú desplegable del visor de mapa.
   */
  onSelectMapUser(sessionId: string): void {
    if (!sessionId) {
      this.mapModalSession.set(null);
      return;
    }
    const found = this.sessions().find(s => s.sessionId === sessionId);
    if (found) {
      this.mapModalSession.set(found);
      if (this.isSuspiciousSession(found) || (found.longitude && (found.longitude > -68 || found.longitude < -82))) {
        this.mapViewMode.set('WORLD');
      }
    }
  }

  /**
   * Cierra el visor de mapa.
   */
  closeLocationMap(): void {
    this.showMapModal.set(false);
    this.mapModalSession.set(null);
  }

  /**
   * Devuelve la clase del ícono correspondiente al navegador web detectado.
   */
  getBrowserIcon(browser: string): string {
    const b = (browser || '').toLowerCase();
    if (b.includes('chrome')) return 'bi bi-browser-chrome text-primary';
    if (b.includes('firefox')) return 'bi bi-browser-firefox text-warning';
    if (b.includes('edge')) return 'bi bi-browser-edge text-info';
    if (b.includes('safari')) return 'bi bi-browser-safari text-danger';
    if (b.includes('tor') || b.includes('headless')) return 'bi bi-incognito text-danger';
    return 'bi bi-globe2 text-secondary';
  }

  /**
   * Devuelve la clase del ícono correspondiente al dispositivo / sistema operativo.
   */
  getDeviceIcon(device: string): string {
    const d = (device || '').toLowerCase();
    if (d.includes('windows')) return 'bi bi-windows text-info';
    if (d.includes('mac') || d.includes('apple') || d.includes('ios')) return 'bi bi-apple text-light';
    if (d.includes('android')) return 'bi bi-phone text-success';
    if (d.includes('linux')) return 'bi bi-terminal text-warning';
    return 'bi bi-laptop text-secondary';
  }

  /**
   * Devuelve la clase semafórica según el estado de la conexión.
   */
  getSemaphoreClass(status: string): string {
    switch (status) {
      case 'ONLINE': return 'semaphore-online';
      case 'IDLE': return 'semaphore-idle';
      default: return 'semaphore-disconnected';
    }
  }

  /**
   * Devuelve el texto descriptivo del semáforo.
   */
  getSemaphoreLabel(status: string): string {
    switch (status) {
      case 'ONLINE': return 'En Línea';
      case 'IDLE': return 'Ausente';
      default: return 'Desconectado';
    }
  }
}
