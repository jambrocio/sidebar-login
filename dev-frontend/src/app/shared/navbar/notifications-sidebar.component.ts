import { Component, EventEmitter, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService } from '../../core/services/admin-api.service';

/** Nivel semántico de la notificación para determinar su color e ícono */
export type NotificationType = 'success' | 'info' | 'warning' | 'danger';

/** Filtro activo en la bandeja de notificaciones */
export type NotificationFilter = 'all' | 'unread';

/**
 * Representa una notificación individual dentro del panel lateral de alertas.
 */
export interface NotificationItem {
  /** Identificador único de la notificación */
  id: string;
  /** Título principal del evento */
  title: string;
  /** Detalle descriptivo de la alerta */
  description: string;
  /** Marca de tiempo relativa */
  time: string;
  /** Módulo o categoría de origen */
  category: string;
  /** Clase de ícono Bootstrap Icons */
  icon: string;
  /** Clasificación visual (success, info, warning, danger) */
  type: NotificationType;
  /** Indica si la notificación aún no ha sido leída */
  unread: boolean;
}

/**
 * Panel lateral deslizante (Drawer) para la gestión de notificaciones del sistema.
 *
 * Carga sus datos iniciales desde `json/notifications.json` a través de `DummyDataService`.
 */
@Component({
  selector: 'app-notifications-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-sidebar.component.html',
  styleUrl: './notifications-sidebar.component.scss',
})
export class NotificationsSidebarComponent {
  private readonly dummyData = inject(DummyDataService);
  private readonly adminApi = inject(AdminApiService);

  /** Evento emitido para cerrar el panel lateral */
  @Output() readonly close = new EventEmitter<void>();

  /** Lista reactiva de notificaciones cargada desde el Backend */
  readonly notifications = this.dummyData.notifications;

  /** Pestaña de filtro seleccionada actualmente */
  readonly activeFilter = signal<NotificationFilter>('all');

  /** Cantidad total de notificaciones sin leer */
  readonly unreadCount = computed(
    () => this.notifications().filter(item => item.unread).length
  );

  /** Lista filtrada según la pestaña activa ('all' | 'unread') */
  readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    return this.activeFilter() === 'unread'
      ? list.filter(item => item.unread)
      : list;
  });

  /**
   * Cambia el filtro activo de visualización.
   * @param filter Filtro a aplicar ('all' o 'unread').
   */
  setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  /**
   * Marca una notificación específica como leída al hacer clic sobre ella en la base de datos.
   * @param id Identificador de la notificación.
   */
  markAsRead(id: string): void {
    this.adminApi.markNotificationRead(id).subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(item => (item.id === id ? { ...item, unread: false } : item))
        );
      },
      error: () => {
        this.notifications.update(list =>
          list.map(item => (item.id === id ? { ...item, unread: false } : item))
        );
      },
    });
  }

  /**
   * Marca todas las notificaciones actuales como leídas en la base de datos.
   */
  markAllAsRead(): void {
    this.adminApi.markAllNotificationsRead().subscribe({
      next: () => {
        this.notifications.update(list =>
          list.map(item => ({ ...item, unread: false }))
        );
      },
      error: () => {
        this.notifications.update(list =>
          list.map(item => ({ ...item, unread: false }))
        );
      },
    });
  }

  /**
   * Elimina una notificación individual de la bandeja.
   * @param id Identificador de la notificación a descartar.
   * @param event Evento de clic para detener la propagación.
   */
  removeNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notifications.update(list => list.filter(item => item.id !== id));
  }

  /**
   * Sincroniza y recarga las notificaciones reales directamente desde el Backend.
   */
  refreshNotifications(): void {
    this.dummyData.resetNotificationsFromJson();
    this.activeFilter.set('all');
  }

  /** Alias de compatibilidad */
  restoreDummyNotifications(): void {
    this.refreshNotifications();
  }

  /**
   * Emite el evento de cierre hacia el componente padre (`DashboardComponent`).
   */
  onClose(): void {
    this.close.emit();
  }
}
