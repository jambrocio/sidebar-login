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
  imports: [CommonModule, RouterLink, RouterLinkActive, BreadcrumbComponent],
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

  onToggleSidebar(): void {
    this.toggleSidebar.emit();
  }

  /**
   * Alterna la apertura del menú desplegable de notificaciones.
   */
  toggleNotifications(): void {
    this.isDropdownOpen.set(false);
    this.isNotificationsOpen.update(open => !open);
  }

  closeNotifications(): void {
    this.isNotificationsOpen.set(false);
  }

  setNotificationFilter(filter: 'all' | 'unread'): void {
    this.activeNotificationFilter.set(filter);
  }

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

  dismissNotification(id: string, event: Event): void {
    event.stopPropagation();
    this.notifications.update(list => list.filter(item => item.id !== id));
  }

  toggleDropdown(): void {
    this.isNotificationsOpen.set(false);
    this.isDropdownOpen.update(open => !open);
  }

  closeDropdown(): void {
    this.isDropdownOpen.set(false);
  }

  /**
   * Cierra completamente la sesión y redirige al login obligando a nueva autenticación.
   */
  onLogout(): void {
    this.closeDropdown();
    this.authApi.logout();
  }

  toggleDarkMode(): void {
    const newMode = !this.isDarkMode();
    this.isDarkMode.set(newMode);
    this.applyTheme(newMode);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('darkMode', JSON.stringify(newMode));
    }
  }

  private applyTheme(isDark: boolean): void {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
  }
}
