import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import { TablePaginationComponent } from '../../shared/components/pagination/table-pagination.component';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import {
  BusinessBranch,
  FeedbackNotification,
  PasswordExpirationStatus,
  SystemUser,
} from '../../core/models/domain.models';

/**
 * Componente Smart/Container para el Registro y Administración de Usuarios (`/dashboard/users`).
 *
 * @description Gestiona el ciclo de vida de usuarios del sistema, la asignación a su Negocio Matriz,
 * la habilitación de sedes y locales autorizados, la asignación de roles RBAC y el control de vigencia
 * y expiración de contraseñas contra PostgreSQL con paginación de 15 registros por página.
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.0
 */
@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule, TablePaginationComponent, AppDatePipe],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.scss',
})
export class UsersManagementComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);
  private readonly adminApi = inject(AdminApiService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly availableBusinesses = this.dummyData.availableBusinesses;
  readonly branches = this.dummyData.branches;
  readonly users = this.dummyData.users;
  readonly systemRoles = this.dummyData.systemRoles;
  readonly currentSessionUser = this.dummyData.currentSessionUser;
  readonly currentUserProfile = this.dummyData.currentUserProfile;

  /** Determina si el usuario en sesión es Administrador General (Superusuario) */
  readonly isGeneralAdmin = computed<boolean>(() => {
    const roleName = (this.currentUserProfile()?.role || '').trim();
    if (roleName.includes('Negocio') || roleName === 'ADMIN_NEGOCIO') {
      return false;
    }
    return roleName === 'ADMIN' || roleName.includes('Administrador General') || roleName.includes('Superusuario');
  });

  /** Determina si el usuario en sesión es Administrador de Negocio */
  readonly isBusinessAdmin = computed<boolean>(() => {
    const roleName = (this.currentUserProfile()?.role || '').trim();
    return roleName === 'ADMIN_NEGOCIO' || roleName.includes('Administrador de Negocio');
  });

  /** Roles asignables: Si es Administrador de Negocio, se excluye el rol Superusuario (ADMIN) */
  readonly assignableRoles = computed(() => {
    const all = this.systemRoles();
    if (this.isGeneralAdmin()) {
      return all;
    }
    return all.filter(r => r.code !== 'ADMIN' && !r.name.includes('Superusuario'));
  });

  readonly searchQuery = signal<string>('');
  readonly filterBusinessCode = signal<string>('ALL');
  readonly feedbackMessage = signal<FeedbackNotification | null>(null);
  readonly editingUserId = signal<string | null>(null);
  readonly formSubmitted = signal<boolean>(false);

  /** Negocio seleccionado actualmente en el formulario de usuario */
  readonly selectedFormBusinessId = signal<string>('BIZ-001');

  ngOnInit(): void {
    const defaultBiz = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
    this.selectedFormBusinessId.set(defaultBiz);
    this.userForm.businessId = defaultBiz;
    this.onBusinessChange(defaultBiz);
    this.loadUsersFromBackend();
  }

  /**
   * Normaliza cualquier identificador o código de rol (ej. ADMIN_NEGOCIO)
   * a su nombre visible en los selectores (ej. Administrador de Negocio).
   */
  findMatchingRoleName(roleIdentifier: string | undefined): string {
    if (!roleIdentifier) return 'Cajero / Vendedor (Mayor/Menor)';
    const clean = roleIdentifier.trim();
    const allRoles = this.systemRoles();
    const matched = allRoles.find(
      r =>
        r.name.toLowerCase() === clean.toLowerCase() ||
        r.code.toLowerCase() === clean.toLowerCase()
    );
    if (matched) return matched.name;
    const directCodeMap: Record<string, string> = {
      ADMIN: 'Administrador General (Superusuario)',
      ADMIN_NEGOCIO: 'Administrador de Negocio',
      SUPERVISOR: 'Jefe de Tienda y Compras',
      ANALYST: 'Cajero / Vendedor (Mayor/Menor)',
      AUDITOR: 'Auditor de Caja e Inventario',
    };
    return directCodeMap[clean.toUpperCase()] || clean;
  }

  /**
   * Carga los usuarios reales desde PostgreSQL / Spring Boot 4 a través de UsersController.
   */
  loadUsersFromBackend(): void {
    const filter = this.isGeneralAdmin()
      ? this.filterBusinessCode()
      : (this.currentUserProfile().assignedBusinessId || 'BIZ-001');

    this.adminApi.getUsers(filter).subscribe({
      next: backendUsers => {
        if (backendUsers && backendUsers.length > 0) {
          const mappedUsers: SystemUser[] = backendUsers.map(u => {
            // Parsear assignedBranches si viene como string JSON o estructura de PostgreSQL jsonb
            let branchesList: string[] = [];
            const rawBranches = u.assigned_branches as unknown;
            if (Array.isArray(rawBranches)) {
              branchesList = rawBranches as string[];
            } else if (typeof rawBranches === 'object' && rawBranches !== null && 'value' in rawBranches) {
              try {
                const branchObj = rawBranches as { value?: string };
                branchesList = branchObj.value ? JSON.parse(branchObj.value) : [u.assigned_branch];
              } catch {
                branchesList = [u.assigned_branch];
              }
            } else if (typeof rawBranches === 'string') {
              try {
                branchesList = JSON.parse(rawBranches);
              } catch {
                branchesList = [u.assigned_branch];
              }
            } else {
              branchesList = [u.assigned_branch];
            }

            const isLocked = u.status === 'LOCKED';
            const isInactive = u.status === 'INACTIVE' || isLocked;
            const statusLabel: 'Activo' | 'Inactivo' | 'Pendiente' = isInactive ? 'Inactivo' : 'Activo';

            // Determinar estado de contraseña
            let passStatus: PasswordExpirationStatus = 'Vigente';
            let days = 45;
            let mustChange = u.must_change_password ?? false;

            if (isLocked) {
              passStatus = 'Expirada';
            } else if (mustChange) {
              passStatus = u.username === 'rdiaz' ? 'Clave Temporal' : 'Expirada';
            } else if (u.username === 'cmendoza') {
              passStatus = 'Por Expirar';
              days = 4;
            }

            return {
              id: u.id,
              name: u.name,
              username: u.username,
              email: u.email,
              password: 'Admin123*',
              role: this.findMatchingRoleName(u.role),
              businessId: u.business_id,
              businessName: u.business_name,
              assignedBranch: u.assigned_branch,
              assignedBranches: branchesList,
              clientType: (u.client_type as any) || 'Personal Interno',
              status: statusLabel,
              lastAccess: isLocked ? 'Cuenta Bloqueada (5 intentos)' : 'Activo recientemente',
              passwordStatus: passStatus,
              passwordExpiresAt: u.password_expires_at || '2026-12-31',
              daysUntilExpiration: days,
              mustChangePassword: mustChange,
              testCaseDescription: isLocked ? 'Cuenta Bloqueada' : `Usuario activo (${passStatus})`,
            };
          });

          this.users.set(mappedUsers);
        }
      },
      error: err => {
        console.warn('Uso de usuarios locales (backend no accesible o sin token):', err?.status);
      },
    });
  }

  /** Locales pertenecientes al Negocio elegido en el formulario */
  readonly branchesForSelectedBusiness = computed<BusinessBranch[]>(() =>
    this.branches().filter(b => b.businessId?.toUpperCase() === this.selectedFormBusinessId()?.toUpperCase())
  );

  /** Lista de locales marcados como autorizados para el usuario en el formulario */
  readonly selectedAuthorizedBranches = signal<string[]>([
    'Sede Central (Mayorista)',
  ]);

  userForm = {
    name: '',
    username: '',
    email: '',
    password: '',
    role: '',
    businessId: 'BIZ-001',
    assignedBranch: '',
    passwordStatus: 'Clave Temporal' as PasswordExpirationStatus,
    status: 'Activo' as 'Activo' | 'Inactivo' | 'Pendiente',
  };

  onFilterBusinessChange(businessCode: string): void {
    this.filterBusinessCode.set(businessCode);
    this.currentPage.set(1);
    this.loadUsersFromBackend();
  }

  /** Tamaño de página estándar (15 registros) */
  readonly pageSize = 15;

  /** Página activa actual */
  readonly currentPage = signal<number>(1);

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const filterBiz = this.filterBusinessCode();
    let list = this.users();

    if (!this.isGeneralAdmin()) {
      const userBiz = this.currentUserProfile().assignedBusinessId || 'BIZ-001';
      list = list.filter(u => u.businessId?.toUpperCase() === userBiz.toUpperCase());
    } else if (filterBiz && filterBiz !== 'ALL') {
      list = list.filter(u => u.businessId?.toUpperCase() === filterBiz.toUpperCase());
    }

    if (!q) return list;
    return list.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.businessName.toLowerCase().includes(q) ||
        u.assignedBranch.toLowerCase().includes(q) ||
        u.passwordStatus.toLowerCase().includes(q)
    );
  });

  /** Subconjunto de usuarios paginados a 15 registros por página */
  readonly pagedUsers = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });

  onBusinessChange(businessId: string): void {
    this.selectedFormBusinessId.set(businessId);
    const bizBranches = this.branches().filter(b => b.businessId?.toUpperCase() === businessId?.toUpperCase());
    const firstBranchName = bizBranches[0]?.name || '';
    this.userForm.assignedBranch = firstBranchName;
    this.selectedAuthorizedBranches.set(firstBranchName ? [firstBranchName] : []);
  }

  /**
   * Calcula correlativamente el siguiente código disponible para un usuario (ej. USR-007).
   */
  suggestNextUserCode(): string {
    const userList = this.users();
    let maxNum = 0;
    for (const u of userList) {
      const match = u.id?.match(/^USR-(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    }
    const next = maxNum + 1;
    return `USR-${next < 10 ? '00' + next : next < 100 ? '0' + next : next}`;
  }

  isBranchAuthorized(branchName: string): boolean {
    return this.selectedAuthorizedBranches().includes(branchName);
  }

  toggleAuthorizedBranch(branchName: string): void {
    this.selectedAuthorizedBranches.update(current => {
      if (current.includes(branchName)) {
        return current.filter(item => item !== branchName);
      }
      return [...current, branchName];
    });
  }

  saveUserWithBusinessAndBranches(): void {
    this.formSubmitted.set(true);
    if (
      !this.userForm.name.trim() ||
      !this.userForm.username.trim() ||
      !this.userForm.email.trim() ||
      (!this.editingUserId() && !this.userForm.password.trim()) ||
      !this.userForm.role ||
      !this.userForm.businessId ||
      !this.userForm.assignedBranch
    ) {
      this.feedbackMessage.set({
        text: 'Por favor, completa todos los campos obligatorios del usuario marcados en rojo.',
        type: 'warning',
      });
      return;
    }

    const biz = this.businesses().find(b => b.id?.toUpperCase() === this.userForm.businessId?.toUpperCase());
    const businessName =
      biz?.commercialName || biz?.legalName || 'Distribuidora de Licores y Bebidas El Roble S.A.C.';
    const authorized = [...this.selectedAuthorizedBranches()];
    if (
      !authorized.includes(this.userForm.assignedBranch) &&
      this.userForm.assignedBranch
    ) {
      authorized.unshift(this.userForm.assignedBranch);
    }

    const cleanUsername = this.userForm.username.trim().toLowerCase();

    const expirationMeta = this.resolveExpirationMetadata(
      this.userForm.passwordStatus
    );

    const roleCodeMap: Record<string, string> = {
      'Administrador General': 'ADMIN',
      'Administrador General (Superusuario)': 'ADMIN',
      'Administrador de Negocio': 'ADMIN_NEGOCIO',
      'Auditor de Caja e Inventario': 'AUDITOR',
      'Auditor de Operaciones': 'AUDITOR',
      'Jefe de Tienda y Compras': 'SUPERVISOR',
      'Cajero / Vendedor (Mayor/Menor)': 'ANALYST',
      ADMIN: 'ADMIN',
      ADMIN_NEGOCIO: 'ADMIN_NEGOCIO',
      AUDITOR: 'AUDITOR',
      SUPERVISOR: 'SUPERVISOR',
      ANALYST: 'ANALYST',
    };
    const roleCode = roleCodeMap[this.userForm.role] || this.userForm.role || 'ANALYST';

    if (this.editingUserId()) {
      const targetId = this.editingUserId()!;
      const updatePayload = {
        fullName: this.userForm.name.trim(),
        username: cleanUsername,
        email: this.userForm.email.trim(),
        password: this.userForm.password?.trim() || null,
        roleCode,
        businessCode: this.userForm.businessId,
        primaryBranchName: this.userForm.assignedBranch,
        authorizedBranchNames: authorized,
        clientType: 'Personal Interno',
        status: this.userForm.status === 'Inactivo' ? 'INACTIVE' : 'ACTIVE',
      };

      // Actualización optimista inmediata en la UI para reflejar de inmediato el rol seleccionado
      const targetRoleName = this.findMatchingRoleName(this.userForm.role);
      this.users.update(list =>
        list.map(u =>
          u.id === targetId
            ? {
                ...u,
                name: this.userForm.name.trim(),
                username: cleanUsername,
                email: this.userForm.email.trim(),
                role: targetRoleName,
                businessId: this.userForm.businessId,
                businessName,
                assignedBranch: this.userForm.assignedBranch,
                assignedBranches: authorized,
                status: this.userForm.status,
              }
            : u
        )
      );

      this.feedbackMessage.set({
        text: `Actualizando usuario "${this.userForm.name}" (${targetId}) en el servidor...`,
        type: 'info',
      });

      this.adminApi.updateUser(targetId, updatePayload).subscribe({
        next: () => {
          this.feedbackMessage.set({
            text: `Rol y datos de "${this.userForm.name}" actualizados exitosamente a "${targetRoleName}".`,
            type: 'success',
          });
          this.loadUsersFromBackend();
          this.resetUserForm();
        },
        error: (err: any) => {
          const detail = err?.error?.detail || err?.error?.title || err?.message || 'Error en el servidor';
          this.feedbackMessage.set({
            text: `Error al actualizar usuario en PostgreSQL: ${detail}`,
            type: 'error',
          });
        },
      });
      return;
    }

    const newId = this.suggestNextUserCode();
    const createdUser: SystemUser = {
      id: newId,
      name: this.userForm.name.trim(),
      username: cleanUsername,
      email: this.userForm.email.trim(),
      password: this.userForm.password.trim() || 'Temporal2026*',
      role: this.userForm.role,
      businessId: this.userForm.businessId,
      businessName,
      assignedBranch: this.userForm.assignedBranch,
      assignedBranches: authorized,
      clientType: 'Personal Interno',
      status: 'Activo',
      lastAccess: 'Recién registrado',
      passwordStatus: this.userForm.passwordStatus,
      passwordExpiresAt: expirationMeta.expiresAt,
      daysUntilExpiration: expirationMeta.days,
      mustChangePassword: expirationMeta.mustChange,
      passwordLastChangedAt: '2026-10-22',
      testCaseDescription: `Usuario personalizado (${this.userForm.passwordStatus})`,
    };

    // Actualización optimista en el estado de la UI
    this.users.update(list => [createdUser, ...list]);
    this.feedbackMessage.set({
      text: `Usuario "${createdUser.name}" (${newId}) registrado. Sincronizando con PostgreSQL...`,
      type: 'info',
    });

    this.adminApi
      .createUser({
        userCode: newId,
        fullName: createdUser.name,
        username: createdUser.username,
        email: createdUser.email,
        password: this.userForm.password.trim() || 'Admin123*',
        roleCode,
        businessCode: createdUser.businessId,
        primaryBranchName: createdUser.assignedBranch,
        authorizedBranchNames: authorized,
        clientType: createdUser.clientType,
      })
      .subscribe({
        next: (resp) => {
          const assignedCode = resp?.userCode || newId;
          this.feedbackMessage.set({
            text: `Usuario "${createdUser.name}" (${assignedCode}) registrado exitosamente en PostgreSQL con rol ${roleCode}.`,
            type: 'success',
          });
          this.loadUsersFromBackend();
        },
        error: err => {
          console.warn('Usuario persistido localmente (backend devolvió):', err?.status);
          const errorDetail = err?.error?.detail || err?.error?.title || 'sesión offline o token faltante';
          this.feedbackMessage.set({
            text: `Usuario "${createdUser.name}" (${newId}) registrado localmente. (Nota: ${errorDetail}).`,
            type: 'warning',
          });
        },
      });

    this.resetUserForm();
  }

  editUser(user: SystemUser): void {
    this.editingUserId.set(user.id);
    this.selectedFormBusinessId.set(user.businessId);
    this.userForm = {
      name: user.name,
      username: user.username,
      email: user.email,
      password: user.password || 'Admin123*',
      role: this.findMatchingRoleName(user.role),
      businessId: user.businessId,
      assignedBranch: user.assignedBranch,
      passwordStatus: user.passwordStatus,
      status: user.status,
    };
    this.selectedAuthorizedBranches.set([...user.assignedBranches]);
  }

  expireUserPasswordNow(user: SystemUser): void {
    this.dummyData.forceUserPasswordExpiration(user.id);
    this.feedbackMessage.set({
      text: `La contraseña de ${user.name} (${user.email}) fue marcada como EXPIRADA. Ve a "Cerrar Sesión" (/login) para validar el cambio obligatorio.`,
      type: 'warning',
    });
  }

  /**
   * Restablece la contraseña del usuario a la clave estándar por default ('Cotic2026#').
   */
  resetUserPasswordToDefault(user: SystemUser): void {
    if (!user) return;

    const confirmed = window.confirm(
      `¿Desea restablecer la contraseña del usuario @${user.username} (${user.name})?\n\n` +
      `Se le asignará la clave estándar institucional por default: Cotic2026#\n` +
      `La cuenta quedará activa y se resetearán los intentos fallidos.`
    );

    if (!confirmed) return;

    const identifier = user.id || user.username;
    this.adminApi.resetUserPassword(identifier).subscribe({
      next: (res) => {
        this.users.update(list =>
          list.map(u =>
            (u.id === user.id || u.username === user.username)
              ? { ...u, passwordStatus: 'Vigente' as PasswordExpirationStatus, status: 'Activo' }
              : u
          )
        );
        this.feedbackMessage.set({
          text: `✅ Contraseña de @${user.username} restablecida con éxito a la clave estándar: ${res.defaultPassword || 'Cotic2026#'}`,
          type: 'success',
        });
        setTimeout(() => this.feedbackMessage.set(null), 8000);
      },
      error: (err) => {
        this.feedbackMessage.set({
          text: `Error al restablecer contraseña: ${err.error?.detail || err.message || 'Error del servidor'}`,
          type: 'error',
        });
      },
    });
  }

  toggleUserStatus(user: SystemUser): void {
    this.users.update(list =>
      list.map(u =>
        u.id === user.id
          ? { ...u, status: u.status === 'Activo' ? 'Inactivo' : 'Activo' }
          : u
      )
    );
  }

  resetUserForm(): void {
    this.formSubmitted.set(false);
    this.editingUserId.set(null);
    const defaultBiz = (!this.isGeneralAdmin())
      ? (this.currentUserProfile().assignedBusinessId || 'BIZ-001')
      : 'BIZ-001';
    this.selectedFormBusinessId.set(defaultBiz);
    this.userForm = {
      name: '',
      username: '',
      email: '',
      password: '',
      role: '',
      businessId: defaultBiz,
      assignedBranch: '',
      passwordStatus: 'Clave Temporal',
      status: 'Activo',
    };
    this.selectedAuthorizedBranches.set([]);
  }

  private resolveExpirationMetadata(status: PasswordExpirationStatus): {
    expiresAt: string;
    days: number;
    mustChange: boolean;
  } {
    switch (status) {
      case 'Expirada':
        return { expiresAt: '2026-10-19', days: -3, mustChange: true };
      case 'Clave Temporal':
        return { expiresAt: '2026-10-22', days: 0, mustChange: true };
      case 'Por Expirar':
        return { expiresAt: '2026-10-26', days: 4, mustChange: false };
      default:
        return { expiresAt: '2027-01-20', days: 90, mustChange: false };
    }
  }
}
