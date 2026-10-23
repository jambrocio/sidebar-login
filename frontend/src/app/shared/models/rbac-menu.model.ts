/**
 * Contratos de dominio TypeScript sincronizados con el Modelo de Base de Datos
 * de Autenticación, Roles (RBAC) y Menú Multinivel Dinámico.
 */

/** Estados posibles del ciclo de vida de una cuenta de usuario */
export type UserAccountStatus = 'ACTIVE' | 'INACTIVE' | 'LOCKED' | 'PENDING';

/** Tipo de excepción de permiso asignada directamente a un usuario */
export type UserPermissionGrantType = 'ALLOW' | 'DENY';

/**
 * Preferencias visuales de interfaz almacenadas en `users.ui_preferences` (JSONB).
 */
export interface UserUiPreferences {
  /** Tema visual preferido */
  darkMode: boolean;
  /** Estado inicial del menú lateral */
  sidebarCollapsed: boolean;
}

/**
 * Entidad de Usuario (`users`).
 */
export interface UserAccount {
  id: string;
  username: string;
  email: string;
  fullName: string;
  avatarInitials: string;
  department?: string;
  status: UserAccountStatus;
  twoFactorEnabled: boolean;
  uiPreferences: UserUiPreferences;
  lastLoginAt?: string;
  roles: RoleSummary[];
}

/**
 * Entidad de Rol del Sistema (`roles`).
 */
export interface RoleSummary {
  id: string;
  code: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
}

/**
 * Permisos granulares de acción sobre una opción de menú o módulo.
 */
export interface MenuActionPermissions {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

/**
 * Entidad de Opción de Menú Jerárquica (`menu_items`) con permisos resueltos.
 */
export interface MenuItemPermissionNode {
  id: string;
  parentId: string | null;
  code: string;
  label: string;
  icon: string;
  routerLink?: string;
  breadcrumbLabel?: string;
  sortOrder: number;
  /** `true` si actúa solo como nodo contenedor de submenús */
  isGroup: boolean;
  /** `false` para rutas válidas ocultas en el Sidebar (ej. Configuración en perfil) */
  isVisible: boolean;
  isActive: boolean;
  /** Permisos efectivos calculados (Rol + Excepción de Usuario) */
  permissions: MenuActionPermissions;
  /** Hijos anidados (Niveles 2, 3, 4...) */
  children?: MenuItemPermissionNode[];
}

/**
 * Asignación de permisos de menú a un Rol (`role_menu_permissions`).
 */
export interface RoleMenuPermission extends MenuActionPermissions {
  id: string;
  roleId: string;
  menuItemId: string;
}

/**
 * Excepción de permiso asignada directamente a un Usuario (`user_menu_permissions`).
 */
export interface UserMenuPermissionOverride extends MenuActionPermissions {
  id: string;
  userId: string;
  menuItemId: string;
  /** 'ALLOW' otorga acceso extra; 'DENY' revoca acceso heredado del rol */
  permissionType: UserPermissionGrantType;
  expiresAt?: string;
}
