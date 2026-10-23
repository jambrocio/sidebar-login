import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { SystemRole } from '../../core/models/domain.models';

/**
 * Componente dedicado al Registro y Administración de Roles y Matriz RBAC de Permisos (`/dashboard/roles`).
 *
 * Responsabilidades:
 * - Permitir registrar nuevos roles o editar roles existentes definiendo su alcance (`Nivel Negocio (Multi-Local)` vs `Nivel Local Asignado`).
 * - Administrar el estado de cada rol y su matriz de permisos por opción de menú del Sidebar.
 */
@Component({
  selector: 'app-roles-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './roles-management.component.html',
  styleUrl: './roles-management.component.scss',
})
export class RolesManagementComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);
  private readonly adminApi = inject(AdminApiService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly systemRoles = this.dummyData.systemRoles;
  readonly roleMenuMatrix = this.dummyData.roleMenuMatrix;

  readonly selectedRoleCode = signal<string>('ADMIN');
  readonly isEditingRole = signal<boolean>(false);
  readonly feedbackMessage = signal<string | null>(null);

  roleForm = {
    code: '',
    name: '',
    description: '',
    scope: 'Nivel Local Asignado' as 'Nivel Negocio (Multi-Local)' | 'Nivel Local Asignado',
  };

  ngOnInit(): void {
    this.loadRolesFromBackend();
    this.selectRoleForMatrix(this.selectedRoleCode());
  }

  /**
   * Carga los roles reales desde PostgreSQL via RolesController.
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
   * Registra un nuevo rol o actualiza uno existente en el catálogo de roles.
   */
  saveRole(): void {
    const cleanCode = this.roleForm.code.trim().toUpperCase().replace(/\s+/g, '_');
    const cleanName = this.roleForm.name.trim();

    if (!cleanCode || !cleanName) {
      this.feedbackMessage.set('Ingresa el código y el nombre descriptivo del rol.');
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
      this.feedbackMessage.set(`Rol "${cleanName}" (${cleanCode}) actualizado exitosamente.`);
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

    // Actualización reactiva inmediata en la UI
    this.systemRoles.update(list => [...list, newRole]);
    this.selectedRoleCode.set(cleanCode);
    this.feedbackMessage.set(
      `Rol "${cleanName}" (${cleanCode}) creado localmente. Sincronizando con PostgreSQL...`
    );

    // Persistencia transaccional en PostgreSQL via Spring Boot
    this.adminApi
      .createRole({
        code: cleanCode,
        name: cleanName,
        description: newRole.description,
        scope: newRole.scope,
      })
      .subscribe({
        next: () => {
          this.feedbackMessage.set(
            `Rol "${cleanName}" (${cleanCode}) registrado exitosamente en la base de datos PostgreSQL.`
          );
          this.loadRolesFromBackend();
        },
        error: err => {
          console.warn('Rol persistido en memoria (backend error):', err?.status);
          this.feedbackMessage.set(
            `Rol "${cleanName}" (${cleanCode}) creado. (Nota: ${err?.error?.detail || 'sesión offline o token faltante'}).`
          );
        },
      });

    this.resetRoleForm();
  }

  editRole(role: SystemRole): void {
    this.isEditingRole.set(true);
    this.roleForm = {
      code: role.code,
      name: role.name,
      description: role.description,
      scope: role.scope,
    };
  }

  toggleRoleStatus(role: SystemRole): void {
    this.systemRoles.update(list =>
      list.map(r => (r.code === role.code ? { ...r, active: !r.active } : r))
    );
  }

  resetRoleForm(): void {
    this.isEditingRole.set(false);
    this.roleForm = {
      code: '',
      name: '',
      description: '',
      scope: 'Nivel Local Asignado',
    };
  }

  selectRoleForMatrix(roleCode: string): void {
    this.selectedRoleCode.set(roleCode);
    const isAdmin = roleCode === 'ADMIN';
    const isSupervisor = roleCode === 'SUPERVISOR';
    const isAnalyst = roleCode === 'ANALYST';
    const isAuditor = roleCode === 'AUDITOR';

    // 1. Cargar las filas base (los 21 ítems de menú) con valores iniciales por defecto según el rol
    const baseRows = this.dummyData.roleMenuMatrix().map(item => {
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
        const isSales = ['DASH_HOME', 'MOD_COMMERCIAL', 'SALES_WHOLESALE_RETAIL', 'SALES_HISTORY', 'DISCOUNT_COUPONS', 'CASH_REGISTER_AUDIT'].includes(item.code);
        visible = isSales;
        view = isSales || item.code === 'PROFILE_SETTINGS';
        create = ['SALES_WHOLESALE_RETAIL', 'CASH_REGISTER_AUDIT'].includes(item.code);
        edit = item.code === 'SALES_WHOLESALE_RETAIL';
        del = false;
        exp = ['SALES_HISTORY', 'CASH_REGISTER_AUDIT'].includes(item.code);
      } else if (isAuditor) {
        const canAud = ['DASH_HOME', 'MOD_COMMERCIAL', 'SALES_HISTORY', 'CASH_REGISTER_AUDIT', 'MOD_REPORTS', 'MOD_CATALOG', 'SUB_PRODUCTS_PRICES', 'PROD_LIST', 'MOD_ADMIN', 'MGMT_SESSIONS'].includes(item.code);
        visible = canAud;
        view = canAud || item.code === 'PROFILE_SETTINGS';
        create = false;
        edit = false;
        del = false;
        exp = true;
      }

      return {
        ...item,
        visibleInSidebar: visible,
        canView: view,
        canCreate: create,
        canEdit: edit,
        canDelete: del,
        canExport: exp,
      };
    });

    this.roleMenuMatrix.set(baseRows);

    // 2. Consultar los permisos reales del rol desde PostgreSQL (/api/v1/roles/{roleCode}/permissions)
    this.adminApi.getRolePermissions(roleCode).subscribe({
      next: permissions => {
        if (permissions && permissions.length > 0) {
          this.roleMenuMatrix.update(rows =>
            rows.map(row => {
              const cleanRowLabel = row.label.replace(/^[\s↳]+/, '').trim().toLowerCase();
              const found = permissions.find(
                p => (p.code && p.code === row.code) ||
                     (p.module && p.module.trim().toLowerCase() === cleanRowLabel) ||
                     (p.label && p.label.replace(/^[\s↳]+/, '').trim().toLowerCase() === cleanRowLabel)
              );
              if (found) {
                return {
                  ...row,
                  visibleInSidebar: found.visibleInSidebar,
                  canView: found.canView,
                  canCreate: found.canCreate,
                  canEdit: found.canEdit,
                  canDelete: found.canDelete,
                  canExport: found.canExport,
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
   * Persiste la Matriz RBAC de permisos de menú modificada en la base de datos PostgreSQL.
   */
  saveRoleMatrix(): void {
    const roleCode = this.selectedRoleCode();
    const matrix = this.roleMenuMatrix();

    this.feedbackMessage.set(`Guardando matriz de permisos del rol "${roleCode}" en PostgreSQL...`);

    this.adminApi.saveRolePermissions(roleCode, matrix).subscribe({
      next: () => {
        this.feedbackMessage.set(
          `¡Matriz de permisos del rol "${roleCode}" guardada y sincronizada exitosamente en PostgreSQL!`
        );
      },
      error: err => {
        console.warn('Error al guardar matriz en backend:', err?.status);
        this.feedbackMessage.set(
          `Matriz del rol "${roleCode}" guardada localmente (${err?.error?.detail || 'Modo offline'}).`
        );
      },
    });
  }
}
