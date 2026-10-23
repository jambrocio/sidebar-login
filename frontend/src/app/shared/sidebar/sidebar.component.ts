import { Component, EventEmitter, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AuthApiService } from '../../core/services/auth-api.service';

/**
 * Representa un nodo dentro del árbol de navegación del Sidebar (`json/sidebar-menu.json`).
 * Soporta anidamiento recursivo multinivel.
 */
export interface NavItem {
  /** Código de menú para trazabilidad RBAC y Backend */
  code?: string;
  /** Etiqueta visible del elemento de menú */
  label: string;
  /** Clase de ícono Bootstrap Icons (ej. 'bi bi-cup-straw') */
  icon: string;
  /** Ruta de navegación; omitir si el nodo es un contenedor de submenú */
  routerLink?: string;
  /** Lista de sub-elementos anidados */
  children?: NavItem[];
  /** Estado de expansión del submenú */
  expanded?: boolean;
}

/** Clave de almacenamiento local para persistir el estado colapsado */
const SIDEBAR_STORAGE_KEY = 'sidebarCollapsed';

/**
 * Componente de barra lateral de navegación (Layout Shell).
 * Carga su árbol de opciones de menú desde el archivo exclusivo `json/sidebar-menu.json`
 * y muestra los datos del Negocio Matriz (`json/business-and-branches.json`).
 */
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);
  private readonly authApi = inject(AuthApiService);

  /**
   * Cierra completamente la sesión y redirige al login.
   */
  onLogout(): void {
    this.authApi.logout();
  }

  /** Estado reactivo que indica si el sidebar se encuentra en modo compacto (78px) */
  readonly isCollapsed = signal<boolean>(this.getInitialCollapsedState());

  /** Evento emitido al contenedor padre (`DashboardComponent`) cuando cambia el colapso */
  @Output() readonly collapsed = new EventEmitter<boolean>();

  /** Datos del Negocio Matriz y sus Locales */
  readonly businessInfo = this.dummyData.businessInfo;
  readonly branches = this.dummyData.branches;

  /** Árbol reactivo de navegación cargado desde `json/sidebar-menu.json` */
  readonly navItems = this.dummyData.sidebarNavigation;

  ngOnInit(): void {
    this.collapsed.emit(this.isCollapsed());
  }

  /**
   * Alterna el estado colapsado/expandido del sidebar y lo persiste en `localStorage`.
   */
  toggleCollapse(): void {
    const newState = !this.isCollapsed();
    this.isCollapsed.set(newState);
    this.collapsed.emit(newState);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify(newState));
    }
  }

  /**
   * Determina si un elemento del menú cuenta con submódulos o subopciones hijas reales.
   */
  hasSubMenu(item: NavItem): boolean {
    return Boolean(item.children && item.children.length > 0);
  }

  /**
   * Gestiona el clic sobre un elemento del menú:
   * Si tiene submenú, previene la navegación y conmuta su visibilidad.
   * Si es una opción terminal (sin hijos), permite la navegación limpia.
   */
  onItemClick(item: NavItem, event: Event): void {
    if (this.hasSubMenu(item)) {
      event.preventDefault();
      this.toggleSubMenu(item);
    }
  }

  /**
   * Alterna la expansión de un submenú y colapsa automáticamente sus hermanos del mismo nivel.
   * @param item Nodo del menú seleccionado por el usuario.
   */
  toggleSubMenu(item: NavItem): void {
    if (!this.hasSubMenu(item)) {
      return;
    }

    if (this.isCollapsed()) {
      this.toggleCollapse();
    }

    this.navItems.update(items => {
      const toggleRecursively = (menu: NavItem[]): NavItem[] => {
        if (menu.includes(item)) {
          return menu.map(currentItem => {
            if (currentItem === item) {
              return { ...currentItem, expanded: !currentItem.expanded };
            }
            return { ...currentItem, expanded: false };
          });
        }

        return menu.map(currentItem => {
          if (currentItem.children && currentItem.children.length > 0) {
            return {
              ...currentItem,
              children: toggleRecursively(currentItem.children),
            };
          }
          return currentItem;
        });
      };

      return toggleRecursively(items);
    });
  }

  private getInitialCollapsedState(): boolean {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    }
    return true;
  }
}
