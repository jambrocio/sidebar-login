import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnInit,
  Output,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BreadcrumbComponent } from './breadcrumbs/breadcrumb.component';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AuthApiService } from '../../core/services/auth-api.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { NotificationItem } from './notifications-sidebar.component';

/**
 * Información del perfil del usuario autenticado mostrada en el Navbar.
 */
export interface UserProfileInfo {
  /** Nombre completo del usuario */
  name: string;
  /** Iniciales para el avatar */
  initials: string;
  /** Cargo o rol dentro de la organización */
  role: string;
  /** Correo electrónico corporativo */
  email: string;
}

/**
 * Barra de navegación superior (Layout Shell).
 *
 * Muestra la jerarquía Negocio Matriz -> Local Asignado al usuario (`json/business-and-branches.json`).
 */
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, BreadcrumbComponent],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss',
})
export class NavbarComponent implements OnInit {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly dummyData = inject(DummyDataService);
  private readonly authApi = inject(AuthApiService);
  private readonly adminApi = inject(AdminApiService);

  /** Datos del Negocio Matriz cargado desde `json/business-and-branches.json` */
  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly isGeneralAdmin = this.dummyData.isGeneralAdmin;

  /**
   * Conmuta el Negocio Matriz de trabajo activo para el Administrador General (Superusuario).
   *
   * @param businessId Código identificador del negocio destino (ej. BIZ-002).
   * @returns void
   */
  onSwitchBusiness(businessId: string): void {
    this.dummyData.switchWorkingBusiness(businessId);
  }

  /** Datos del usuario activo en la sesión */
  readonly currentUser = this.dummyData.currentUserProfile;

  /** Local / Tienda asignado al usuario dentro del Negocio */
  readonly activeBranch = this.dummyData.assignedBranch;

  /** Controla la visibilidad del menú desplegable de usuario */
  readonly isDropdownOpen = signal<boolean>(false);

  /** Controla la visibilidad del menú desplegable de notificaciones (Diseño homogéneo) */
  readonly isNotificationsOpen = signal<boolean>(false);

  /** Pestaña de filtro activo para notificaciones: 'all' | 'unread' */
  readonly activeNotificationFilter = signal<'all' | 'unread'>('all');

  /** Lista de notificaciones del sistema */
  readonly notifications = this.dummyData.notifications;

  /** Cantidad de notificaciones pendientes mostradas en el badge */
  readonly unreadNotifications = computed(
    () => this.notifications().filter(item => item.unread).length
  );

  /** Lista de notificaciones filtradas según la pestaña activa */
  readonly filteredNotifications = computed(() => {
    const list = this.notifications();
    return this.activeNotificationFilter() === 'unread'
      ? list.filter(item => item.unread)
      : list;
  });

  /** Estado reactivo del tema oscuro */
  readonly isDarkMode = signal<boolean>(false);

  /** Evento para colapsar o expandir el Sidebar izquierdo */
  @Output() readonly toggleSidebar = new EventEmitter<void>();

  /**
   * Inicializa el estado del tema visual desde `localStorage`.
   */
  ngOnInit(): void {
    if (typeof localStorage !== 'undefined') {
      const storedDarkMode = localStorage.getItem('darkMode') === 'true';
      this.isDarkMode.set(storedDarkMode);
      this.applyTheme(storedDarkMode);
    }
  }

  /**
   * Cierra automáticamente los menús desplegables al hacer clic fuera del componente.
   * @param event Evento global de clic del documento.
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isDropdownOpen.set(false);
      this.isNotificationsOpen.set(false);
    }
  }

  /**
   * Emite el evento para contraer o expandir el menú lateral (Sidebar).
   *
   * @returns void
   */
  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  /**
   * Alterna la apertura y cierre del panel desplegable de notificaciones institucionales.
   *
   * @returns void
   */
  toggleNotifications(): void {
    this.isDropdownOpen.set(false);
    this.isNotificationsOpen.update(open => !open);
  }

  /**
   * Cierra el menú flotante de notificaciones.
   *
   * @returns void
   */
  closeNotifications(): void {
    this.isNotificationsOpen.set(false);
  }

  /**
   * Establece el criterio de filtrado para las alertas ('all' o 'unread').
   *
   * @param filter Filtro de notificaciones seleccionado.
   * @returns void
   */
  setNotificationFilter(filter: 'all' | 'unread'): void {
    this.activeNotificationFilter.set(filter);
  }

  /**
   * Marca una notificación específica como leída en la base de datos y en el estado local.
   *
   * @param id Identificador de la notificación.
   * @returns void
   */
  markNotificationAsRead(id: string): void {
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
   * Marca masivamente todas las notificaciones pendientes como leídas.
   *
   * @returns void
   */
  markAllNotificationsAsRead(): void {
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
   * Descarta y remueve visualmente una notificación de la bandeja.
   *
   * @param id Identificador de la notificación.
   * @param event Evento del DOM para evitar propagación de clicks.
   * @returns void
   */
  dismissNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notifications.update(list => list.filter(item => item.id !== id));
  }

  /**
   * Alterna el menú desplegable del perfil de usuario y sesión.
   *
   * @returns void
   */
  toggleDropdown(): void {
    this.isNotificationsOpen.set(false);
    this.isDropdownOpen.update(open => !open);
  }

  /**
   * Cierra el menú desplegable de perfil de usuario.
   *
   * @returns void
   */
  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  /**
   * Cierra completamente la sesión activa y redirige al login obligando a nueva autenticación.
   *
   * @returns void
   */
  onLogout(): void {
    this.closeDropdown();
    this.authApi.logout();
  }

  /**
   * Alterna entre el tema visual Claro y Oscuro guardando la preferencia en almacenamiento local.
   *
   * @returns void
   */
  toggleDarkMode(): void {
    const newMode = !this.isDarkMode();
    this.isDarkMode.set(newMode);
    this.applyTheme(newMode);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(newMode));
    }
  }

  /**
   * Aplica el atributo data-theme en el elemento body del documento HTML.
   *
   * @param isDark Indicador booleano de activación de modo oscuro.
   * @returns void
   */
  private applyTheme(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }
}
