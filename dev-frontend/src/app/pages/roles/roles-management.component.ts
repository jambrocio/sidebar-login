import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { FeedbackNotification, RoleMenuMatrixRow, SystemRole } from '../../core/models/domain.models';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';

/** Metadatos visuales por código de menú para categorización y renderizado ágil */
const MENU_VISUAL_METADATA: Record<string, { icon: string; moduleGroup: string; isGroup: boolean }> = {
  DASH_HOME: { icon: 'bi bi-house-door-fill', moduleGroup: 'Inicio', isGroup: false },
  MOD_COMMERCIAL: { icon: 'bi bi-cart4', moduleGroup: 'Comercial y Ventas', isGroup: true },
  SALES_WHOLESALE_RETAIL: { icon: 'bi bi-receipt-cutoff', moduleGroup: 'Comercial y Ventas', isGroup: false },
  SALES_HISTORY: { icon: 'bi bi-clock-history', moduleGroup: 'Comercial y Ventas', isGroup: false },
  PURCHASES_SUPPLIERS: { icon: 'bi bi-truck', moduleGroup: 'Comercial y Ventas', isGroup: false },
  MGMT_SUPPLIERS: { icon: 'bi bi-building-gear', moduleGroup: 'Comercial y Ventas', isGroup: false },
  DISCOUNT_COUPONS: { icon: 'bi bi-ticket-perforated-fill', moduleGroup: 'Comercial y Ventas', isGroup: false },
  CASH_REGISTER_AUDIT: { icon: 'bi bi-cash-coin', moduleGroup: 'Comercial y Ventas', isGroup: false },
  MOD_CATALOG: { icon: 'bi bi-box-seam-fill', moduleGroup: 'Catálogo de Productos', isGroup: true },
  SUB_PRODUCTS_PRICES: { icon: 'bi bi-box-seam-fill', moduleGroup: 'Catálogo de Productos', isGroup: true },
  PROD_LIST: { icon: 'bi bi-list-ul', moduleGroup: 'Catálogo de Productos', isGroup: false },
  PROD_ADD: { icon: 'bi bi-plus-square-fill', moduleGroup: 'Catálogo de Productos', isGroup: false },
  SUB_CATEGORIES: { icon: 'bi bi-tags-fill', moduleGroup: 'Catálogo de Productos', isGroup: true },
  CAT_LIST: { icon: 'bi bi-card-list', moduleGroup: 'Catálogo de Productos', isGroup: false },
  CAT_ADD: { icon: 'bi bi-plus-circle-fill', moduleGroup: 'Catálogo de Productos', isGroup: false },
  MOD_ADMIN: { icon: 'bi bi-gear-wide-connected', moduleGroup: 'Administración', isGroup: true },
  MGMT_BUSINESS_BRANCHES: { icon: 'bi bi-buildings-fill', moduleGroup: 'Administración', isGroup: false },
  MGMT_USERS: { icon: 'bi bi-people-fill', moduleGroup: 'Administración', isGroup: false },
  MGMT_CUSTOMERS: { icon: 'bi bi-person-badge-fill', moduleGroup: 'Administración', isGroup: false },
  MGMT_ROLES: { icon: 'bi bi-shield-lock-fill', moduleGroup: 'Administración', isGroup: false },
  MGMT_SESSIONS: { icon: 'bi bi-shield-shaded', moduleGroup: 'Administración', isGroup: false },
  MGMT_VULNERABILITIES: { icon: 'bi bi-shield-exclamation', moduleGroup: 'Administración', isGroup: false },
  MOD_REPORTS: { icon: 'bi bi-file-earmark-bar-graph-fill', moduleGroup: 'Reportes Comerciales', isGroup: false },
  PROFILE_SETTINGS: { icon: 'bi bi-sliders', moduleGroup: 'Configuración', isGroup: false },
};

/**
 * Componente Smart/Container para el Registro y Administración de Roles y Matriz RBAC de Permisos (`/dashboard/roles`).
 *
 * @description Permite registrar nuevos roles o editar roles existentes definiendo su alcance
 * (Nivel Plataforma, Nivel Negocio Multi-Local, Nivel Local Asignado), y gobernar la matriz granular
 * de permisos de lectura, creación, edición, eliminación y exportación por opción de menú
 * con sincronización bidireccional en PostgreSQL, filtrado reactivo por módulo, búsqueda en tiempo real,
 * iconos distintivos por pantalla y control ergonómico en lote.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.2
 */
@Component({
  selector: 'app-roles-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent],
  templateUrl: './roles-management.component.html',
  styleUrl: './roles-management.component.scss',
})
export class RolesManagementComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);
  private readonly adminApi = inject(AdminApiService);

  /** Información del Negocio Matriz activo */
  readonly businessInfo = this.dummyData.businessInfo;

  /** Bandera que indica si el usuario autenticado es Administrador General */
  readonly isGeneralAdmin = this.dummyData.isGeneralAdmin;

  /** Catálogo reactivo de roles del sistema */
  readonly systemRoles = this.dummyData.systemRoles;

  /**
   * Matriz local reactiva e independiente de permisos por opción de menú para el rol seleccionado.
   * Se aísla del servicio singleton para evitar mutaciones indeseadas del catálogo maestro.
   */
  readonly roleMenuMatrix = signal<RoleMenuMatrixRow[]>([]);

  /** Filtro de búsqueda en tiempo real sobre la matriz */
  readonly matrixSearchQuery = signal<string>('');

  /** Pestaña de filtrado por módulo activo */
  readonly selectedModuleFilter = signal<string>('TODOS');

  /** Opciones disponibles de pestañas de filtrado */
  readonly moduleFilterTabs = [
    'TODOS',
    'Comercial y Ventas',
    'Catálogo de Productos',
    'Administración',
    'Reportes Comerciales',
    'Inicio y Configuración',
  ] as const;

  /** Código del rol actualmente seleccionado para visualización y edición en la matriz */
  readonly selectedRoleCode = signal<string>('ADMIN');

  /** Estado de edición de un rol existente */
  readonly isEditingRole = signal<boolean>(false);

  /** Mensaje de notificación / feedback contextual al usuario */
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);

  /** Bandera de validación al enviar el formulario de rol */
  readonly formSubmitted = signal<boolean>(false);

  /** Tamaño de página estándar para el catálogo de roles (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual del catálogo de roles */
  readonly currentPage = signal<number>(1);

  /** Roles paginados reactivamente a 15 registros por página */
  readonly pagedRoles = computed<SystemRole[]>(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.systemRoles().slice(start, start + this.pageSize);
  });

  /**
   * Matriz de opciones de menú filtrada reactivamente según la pestaña de módulo y la búsqueda.
   */
  readonly filteredMatrix = computed<RoleMenuMatrixRow[]>(() => {
    const query = this.matrixSearchQuery().toLowerCase().trim();
    const filter = this.selectedModuleFilter();

    return this.roleMenuMatrix().filter(row => {
      // 1. Filtrado por módulo
      let matchesModule = true;
      if (filter !== 'TODOS') {
        if (filter === 'Inicio y Configuración') {
          matchesModule = row.moduleGroup === 'Inicio' || row.moduleGroup === 'Configuración';
        } else {
          matchesModule = row.moduleGroup === filter;
        }
      }
      if (!matchesModule) return false;

      // 2. Filtrado por texto de búsqueda
      if (!query) return true;
      return (
        row.label.toLowerCase().includes(query) ||
        row.code.toLowerCase().includes(query) ||
        row.routerLink.toLowerCase().includes(query) ||
        (row.moduleGroup && row.moduleGroup.toLowerCase().includes(query))
      );
    });
  });

  /** Modelo reactivo del formulario de rol */
  roleForm = {
    code: '',
    name: '',
    description: '',
    scope: 'Nivel Local Asignado' as 'Nivel Plataforma (Superusuario)' | 'Nivel Negocio (Multi-Local)' | 'Nivel Local Asignado',
  };

  /**
   * Ciclo de vida inicial: inicializa el formulario, sincroniza roles desde backend
   * y carga la matriz de permisos para el rol inicial.
   */
  ngOnInit(): void {
    this.resetRoleForm();
    this.loadRolesFromBackend();
    this.selectRoleForMatrix(this.selectedRoleCode());
  }

  /**
   * Carga los roles reales desde PostgreSQL vía {@link AdminApiService.getRoles}.
   *
   * @returns void
   */
  loadRolesFromBackend(): void {
    this.adminApi.getRoles().subscribe({
      next: backendRoles => {
        if (backendRoles && backendRoles.length > 0) {
          const mappedRoles: SystemRole[] = backendRoles.map(r => ({
            code: r.code,
            name: r.name,
            description: r.description || 'Rol del sistema',
            scope: (r.scope as any) || 'Nivel Local Asignado',
            usersCount: r.usersCount ?? 0,
            active: r.active ?? (r.status === 'Activo'),
          }));
          this.systemRoles.set(mappedRoles);
        }
      },
      error: err => {
        console.warn('Uso de roles locales (backend no accesible o sin sesión):', err?.status);
      },
    });
  }

  /**
   * Registra un nuevo rol o actualiza uno existente en el catálogo y en la base de datos PostgreSQL.
   *
   * @returns void
   */
  saveRole(): void {
    this.formSubmitted.set(true);
    const cleanCode = this.roleForm.code.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = this.roleForm.name.trim();

    if (!cleanCode || !cleanName || !this.roleForm.scope) {
      this.feedbackMessage.set({
        text: 'Por favor, completa todos los campos obligatorios del rol marcados en rojo.',
        type: 'warning',
      });
      return;
    }

    if (this.isEditingRole()) {
      this.systemRoles.update(list =>
        list.map(r =>
          r.code === cleanCode
            ? {
                ...r,
                name: cleanName,
                description: this.roleForm.description.trim() || r.description,
                scope: this.roleForm.scope,
              }
            : r
        )
      );
      this.feedbackMessage.set({
        text: `Rol "${cleanName}" (${cleanCode}) actualizado exitosamente.`,
        type: 'success',
      });
      this.resetRoleForm();
      return;
    }

    const newRole: SystemRole = {
      code: cleanCode,
      name: cleanName,
      description:
        this.roleForm.description.trim() ||
        'Rol personalizado configurado para operaciones del negocio y sus locales.',
      scope: this.roleForm.scope,
      usersCount: 0,
      active: true,
    };

    // Actualización reactiva inmediata en la UI y activación de la matriz para el nuevo rol
    this.systemRoles.update(list => [...list, newRole]);
    this.feedbackMessage.set({
      text: `Rol "${cleanName}" (${cleanCode}) creado localmente. Sincronizando con PostgreSQL...`,
      type: 'info',
    });

    // Inmediatamente seleccionar y preparar la matriz para el rol recién registrado
    this.selectRoleForMatrix(cleanCode);

    // Persistencia transaccional en PostgreSQL vía Spring Boot
    this.adminApi
      .createRole({
        code: cleanCode,
        name: cleanName,
        description: newRole.description,
        scope: newRole.scope,
      })
      .subscribe({
        next: () => {
          this.feedbackMessage.set({
            text: `Rol "${cleanName}" (${cleanCode}) registrado exitosamente en la base de datos PostgreSQL.`,
            type: 'success',
          });
          this.loadRolesFromBackend();
        },
        error: err => {
          console.warn('Rol persistido en memoria (backend error):', err?.status);
          this.feedbackMessage.set({
            text: `Rol "${cleanName}" (${cleanCode}) creado. (Nota: ${err?.error?.detail || 'sesión offline o token faltante'}).`,
            type: 'warning',
          });
        },
      });

    this.resetRoleForm();
  }

  /**
   * Carga los datos de un rol existente en el formulario para su edición.
   *
   * @param role Entidad del rol a editar.
   * @returns void
   */
  editRole(role: SystemRole): void {
    this.isEditingRole.set(true);
    this.roleForm = {
      code: role.code,
      name: role.name,
      description: role.description,
      scope: role.scope,
    };
  }

  /**
   * Alterna el estado activo/inactivo de un rol en el catálogo local.
   *
   * @param role Entidad del rol a modificar.
   * @returns void
   */
  toggleRoleStatus(role: SystemRole): void {
    this.systemRoles.update(list =>
      list.map(r => (r.code === role.code ? { ...r, active: !r.active } : r))
    );
  }

  /**
   * Reinicia el estado del formulario de roles a sus valores predeterminados.
   *
   * @returns void
   */
  resetRoleForm(): void {
    this.formSubmitted.set(false);
    this.isEditingRole.set(false);
    this.roleForm = {
      code: '',
      name: '',
      description: '',
      scope: 'Nivel Local Asignado',
    };
  }

  /**
   * Selecciona un rol para visualizar y gobernar su matriz de permisos RBAC por menú.
   * Clona las filas base maestras para no alterar el catálogo global, enriquece con metadatos visuales
   * y consulta la base de datos PostgreSQL.
   *
   * @param roleCode Código técnico del rol a gobernar (ej. ADMIN, SUPERVISOR, ANALYST, AUDITOR).
   * @returns void
   */
  selectRoleForMatrix(roleCode: string): void {
    this.selectedRoleCode.set(roleCode);
    const isAdmin = roleCode === 'ADMIN' || roleCode === 'ADMIN_NEGOCIO';
    const isSupervisor = roleCode === 'SUPERVISOR';
    const isAnalyst = roleCode === 'ANALYST';
    const isAuditor = roleCode === 'AUDITOR';

    // 1. Clonar de forma inmutable las filas base del catálogo maestro y calcular valores por defecto
    const baseRows: RoleMenuMatrixRow[] = this.dummyData.roleMenuMatrix().map(item => {
      let visible = true;
      let view = true;
      let create = false;
      let edit = false;
      let del = false;
      let exp = true;

      if (isAdmin) {
        visible = item.code !== 'PROFILE_SETTINGS';
        view = true;
        create = true;
        edit = true;
        del = true;
        exp = true;
      } else if (isSupervisor) {
        visible = item.code !== 'MGMT_ROLES' && item.code !== 'PROFILE_SETTINGS';
        view = item.code !== 'MGMT_ROLES';
        create = item.code !== 'MGMT_ROLES' && item.code !== 'SALES_HISTORY';
        edit = item.code !== 'MGMT_ROLES' && item.code !== 'SALES_HISTORY';
        del = false;
        exp = true;
      } else if (isAnalyst) {
        const isSales = [
          'DASH_HOME',
          'MOD_COMMERCIAL',
          'SALES_WHOLESALE_RETAIL',
          'SALES_HISTORY',
          'DISCOUNT_COUPONS',
          'CASH_REGISTER_AUDIT',
        ].includes(item.code);
        const isCustomer = item.code === 'MGMT_CUSTOMERS';
        visible = isSales || isCustomer;
        view = isSales || isCustomer || item.code === 'PROFILE_SETTINGS';
        create = ['SALES_WHOLESALE_RETAIL', 'CASH_REGISTER_AUDIT', 'MGMT_CUSTOMERS'].includes(item.code);
        edit = item.code === 'SALES_WHOLESALE_RETAIL';
        del = false;
        exp = ['SALES_HISTORY', 'CASH_REGISTER_AUDIT'].includes(item.code);
      } else if (isAuditor) {
        const canAud = [
          'DASH_HOME',
          'MOD_COMMERCIAL',
          'SALES_HISTORY',
          'CASH_REGISTER_AUDIT',
          'MOD_REPORTS',
          'MOD_CATALOG',
          'SUB_PRODUCTS_PRICES',
          'PROD_LIST',
          'MOD_ADMIN',
          'MGMT_SESSIONS',
        ].includes(item.code);
        visible = canAud;
        view = canAud || item.code === 'PROFILE_SETTINGS';
        create = false;
        edit = false;
        del = false;
        exp = true;
      }

      const meta = MENU_VISUAL_METADATA[item.code] || {
        icon: 'bi bi-circle',
        moduleGroup: item.level === 1 ? 'Módulo' : 'General',
        isGroup: item.routerLink.includes('Módulo'),
      };

      return {
        code: item.code,
        label: item.label,
        level: item.level,
        routerLink: item.routerLink,
        visibleInSidebar: visible,
        canView: view,
        canCreate: create,
        canEdit: edit,
        canDelete: del,
        canExport: exp,
        icon: meta.icon,
        moduleGroup: meta.moduleGroup,
        isGroup: meta.isGroup,
      };
    });

    this.roleMenuMatrix.set(baseRows);

    // 2. Consultar los permisos reales persistidos en PostgreSQL (/api/v1/roles/{roleCode}/permissions)
    this.adminApi.getRolePermissions(roleCode).subscribe({
      next: permissions => {
        if (permissions && permissions.length > 0) {
          this.roleMenuMatrix.update(rows =>
            rows.map(row => {
              const cleanRowLabel = row.label.replace(/^[\s↳]+/, '').trim().toLowerCase();
              const found = permissions.find(
                p =>
                  (p.code && p.code === row.code) ||
                  (p.module && p.module.trim().toLowerCase() === cleanRowLabel) ||
                  (p.label && p.label.replace(/^[\s↳]+/, '').trim().toLowerCase() === cleanRowLabel)
              );
              if (found) {
                return {
                  ...row,
                  visibleInSidebar: Boolean(found.visibleInSidebar),
                  canView: Boolean(found.canView),
                  canCreate: Boolean(found.canCreate),
                  canEdit: Boolean(found.canEdit),
                  canDelete: Boolean(found.canDelete),
                  canExport: Boolean(found.canExport),
                };
              }
              return row;
            })
          );
        }
      },
      error: err => {
        console.warn(`Permisos para rol ${roleCode} calculados localmente (backend: ${err?.status})`);
      },
    });
  }

  /**
   * Retorna la etiqueta limpia del menú eliminando prefijos de flechas '↳' para un renderizado visual prolijo.
   *
   * @param item Fila de la matriz de permisos.
   * @returns string - Nombre limpio de la opción.
   */
  getCleanLabel(item: RoleMenuMatrixRow): string {
    return item.label.replace(/^[\s↳]+/, '').trim();
  }

  /**
   * Calcula la cantidad de permisos de acción activos (Ver, Crear, Editar, Eliminar, Exportar) para una fila.
   *
   * @param item Fila evaluada.
   * @returns number - Total de permisos activos entre 0 y 5.
   */
  getActivePermissionsCount(item: RoleMenuMatrixRow): number {
    return (
      (item.canView ? 1 : 0) +
      (item.canCreate ? 1 : 0) +
      (item.canEdit ? 1 : 0) +
      (item.canDelete ? 1 : 0) +
      (item.canExport ? 1 : 0)
    );
  }

  /**
   * Retorna la cantidad de opciones pertenecientes a una categoría/módulo para mostrar en las pestañas.
   *
   * @param category Nombre de la pestaña.
   * @returns number - Conteo de opciones en dicha categoría.
   */
  getCategoryCount(category: string): number {
    if (category === 'TODOS') return this.roleMenuMatrix().length;
    if (category === 'Inicio y Configuración') {
      return this.roleMenuMatrix().filter(
        r => r.moduleGroup === 'Inicio' || r.moduleGroup === 'Configuración'
      ).length;
    }
    return this.roleMenuMatrix().filter(r => r.moduleGroup === category).length;
  }

  /**
   * Retorna una clase CSS temática semántica según el módulo funcional al que pertenece el ítem.
   *
   * @param item Fila evaluada.
   * @returns string - Clase CSS identificadora.
   */
  getModuleClass(item: RoleMenuMatrixRow): string {
    const group = item.moduleGroup || '';
    if (group === 'Comercial y Ventas') return 'mod-commercial';
    if (group === 'Catálogo de Productos') return 'mod-catalog';
    if (group === 'Administración') return 'mod-admin';
    if (group === 'Reportes Comerciales') return 'mod-reports';
    if (group === 'Inicio') return 'mod-home';
    return 'mod-settings';
  }

  /**
   * Aplica reglas de coherencia e integridad de permisos RBAC ante un cambio en un checkbox:
   * - Si 'canView' se desmarca, se desmarcan automáticamente creación, edición, eliminación, exportación y visibilidad.
   * - Si se marca cualquier permiso de acción ('canCreate', 'canEdit', etc.) o 'visibleInSidebar', se asegura 'canView = true'.
   *
   * @param item Fila de la matriz de permisos afectada.
   * @param permissionType Tipo de permiso modificado.
   * @returns void
   */
  onPermissionChange(
    item: RoleMenuMatrixRow,
    permissionType: 'visible' | 'view' | 'create' | 'edit' | 'delete' | 'export'
  ): void {
    if (permissionType === 'view' && !item.canView) {
      item.canCreate = false;
      item.canEdit = false;
      item.canDelete = false;
      item.canExport = false;
      item.visibleInSidebar = false;
    } else if (permissionType !== 'view') {
      if (item.canCreate || item.canEdit || item.canDelete || item.canExport || item.visibleInSidebar) {
        item.canView = true;
      }
    }
  }

  /**
   * Concede acceso total (todas las banderas en true) a todas las opciones para el rol activo.
   *
   * @returns void
   */
  setFullAccess(): void {
    this.roleMenuMatrix.update(rows =>
      rows.map(r => ({
        ...r,
        visibleInSidebar: r.code !== 'PROFILE_SETTINGS',
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExport: true,
      }))
    );
  }

  /**
   * Configura acceso de solo lectura (visibilidad, lectura y exportación activas; creación/edición/eliminación inactivas).
   *
   * @returns void
   */
  setReadOnlyAccess(): void {
    this.roleMenuMatrix.update(rows =>
      rows.map(r => ({
        ...r,
        visibleInSidebar: r.code !== 'PROFILE_SETTINGS',
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: true,
      }))
    );
  }

  /**
   * Limpia y desmarca todos los permisos para todas las opciones de menú del rol activo.
   *
   * @returns void
   */
  clearAllPermissions(): void {
    this.roleMenuMatrix.update(rows =>
      rows.map(r => ({
        ...r,
        visibleInSidebar: false,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
      }))
    );
  }

  /**
   * Alterna todos los permisos de una columna específica para todas las filas de la matriz actualmente visibles.
   *
   * @param column Nombre de la columna a conmutar.
   * @returns void
   */
  toggleAllColumn(
    column: 'visibleInSidebar' | 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canExport'
  ): void {
    const allChecked = this.isColumnAllChecked(column);
    const newValue = !allChecked;
    const currentFilteredCodes = new Set(this.filteredMatrix().map(r => r.code));

    this.roleMenuMatrix.update(rows =>
      rows.map(r => {
        if (!currentFilteredCodes.has(r.code)) return r;

        const updated = { ...r, [column]: newValue };
        if (column === 'canView' && !newValue) {
          updated.canCreate = false;
          updated.canEdit = false;
          updated.canDelete = false;
          updated.canExport = false;
          updated.visibleInSidebar = false;
        } else if (column !== 'canView' && newValue) {
          updated.canView = true;
        }
        return updated;
      })
    );
  }

  /**
   * Verifica si todas las filas actualmente visibles tienen marcado el permiso de la columna indicada.
   *
   * @param column Nombre de la columna a evaluar.
   * @returns boolean - true si todas las filas están marcadas.
   */
  isColumnAllChecked(
    column: 'visibleInSidebar' | 'canView' | 'canCreate' | 'canEdit' | 'canDelete' | 'canExport'
  ): boolean {
    const list = this.filteredMatrix();
    if (!list || list.length === 0) return false;
    return list.every(r => Boolean(r[column]));
  }

  /**
   * Alterna todos los permisos para una fila específica (acceso completo vs sin acceso).
   *
   * @param item Fila seleccionada.
   * @returns void
   */
  toggleRow(item: RoleMenuMatrixRow): void {
    const hasAnyAction = item.canView || item.canCreate || item.canEdit || item.canDelete || item.canExport;
    const newState = !hasAnyAction;

    item.visibleInSidebar = newState && item.code !== 'PROFILE_SETTINGS';
    item.canView = newState;
    item.canCreate = newState;
    item.canEdit = newState;
    item.canDelete = newState;
    item.canExport = newState;
  }

  /**
   * Persiste la Matriz RBAC de permisos de menú modificada en la base de datos PostgreSQL vía {@link AdminApiService.saveRolePermissions}.
   *
   * @returns void
   */
  saveRoleMatrix(): void {
    const roleCode = this.selectedRoleCode();
    const matrix = this.roleMenuMatrix();

    this.feedbackMessage.set({
      text: `Guardando matriz de permisos del rol "${roleCode}" en PostgreSQL...`,
      type: 'info',
    });

    this.adminApi.saveRolePermissions(roleCode, matrix).subscribe({
      next: () => {
        this.feedbackMessage.set({
          text: `¡Matriz de permisos del rol "${roleCode}" guardada y sincronizada exitosamente en PostgreSQL!`,
          type: 'success',
        });
      },
      error: err => {
        console.warn('Error al guardar matriz en backend:', err?.status);
        this.feedbackMessage.set({
          text: `Matriz del rol "${roleCode}" guardada localmente (${err?.error?.detail || 'Modo offline'}).`,
          type: 'warning',
        });
      },
    });
  }
}
