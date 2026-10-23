import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DummyDataService } from '../../core/services/dummy-data.service';
import { AdminApiService } from '../../core/services/admin-api.service';
import {
  BusinessBranch,
  PasswordExpirationStatus,
  SystemUser,
} from '../../core/models/domain.models';

/**
 * Componente dedicado al Registro y Administración de Usuarios (`/dashboard/users`)
 * con asignación de Negocio Matriz, Locales autorizados y control de Expiración de Contraseña.
 */
@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.scss',
})
export class UsersManagementComponent implements OnInit {
  private readonly dummyData = inject(DummyDataService);
  private readonly adminApi = inject(AdminApiService);

  readonly businessInfo = this.dummyData.businessInfo;
  readonly businesses = this.dummyData.businesses;
  readonly branches = this.dummyData.branches;
  readonly users = this.dummyData.users;
  readonly systemRoles = this.dummyData.systemRoles;
  readonly currentSessionUser = this.dummyData.currentSessionUser;

  readonly searchQuery = signal<string>('');
  readonly feedbackMessage = signal<string | null>(null);
  readonly editingUserId = signal<string | null>(null);

  /** Negocio seleccionado actualmente en el formulario de usuario */
  readonly selectedFormBusinessId = signal<string>('BIZ-001');

  ngOnInit(): void {
    this.loadUsersFromBackend();
  }

  /**
   * Carga los usuarios reales desde PostgreSQL / Spring Boot 4 a través de UsersController.
   */
  loadUsersFromBackend(): void {
    this.adminApi.getUsers().subscribe({
      next: backendUsers => {
        if (backendUsers && backendUsers.length > 0) {
          const mappedUsers: SystemUser[] = backendUsers.map(u => {
            // Parsear assignedBranches si viene como string JSON o estructura de PostgreSQL jsonb
            let branchesList: string[] = [];
            if (Array.isArray(u.assigned_branches)) {
              branchesList = u.assigned_branches;
            } else if (u.assigned_branches?.value) {
              try {
                branchesList = JSON.parse(u.assigned_branches.value);
              } catch {
                branchesList = [u.assigned_branch];
              }
            } else if (typeof u.assigned_branches === 'string') {
              try {
                branchesList = JSON.parse(u.assigned_branches);
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
              role: u.role || 'Cajero / Vendedor (Mayor/Menor)',
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
    this.branches().filter(b => b.businessId === this.selectedFormBusinessId())
  );

  /** Lista de locales marcados como autorizados para el usuario en el formulario */
  readonly selectedAuthorizedBranches = signal<string[]>([
    'Sede Central (Mayorista)',
  ]);

  userForm = {
    name: '',
    username: '',
    email: '',
    password: 'Temporal2026*',
    role: 'Cajero / Vendedor (Mayor/Menor)',
    businessId: 'BIZ-001',
    assignedBranch: 'Sede Central (Mayorista)',
    passwordStatus: 'Clave Temporal' as PasswordExpirationStatus,
    status: 'Activo' as 'Activo' | 'Inactivo' | 'Pendiente',
  };

  readonly filteredUsers = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.users();
    return this.users().filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.businessName.toLowerCase().includes(q) ||
        u.assignedBranch.toLowerCase().includes(q) ||
        u.passwordStatus.toLowerCase().includes(q)
    );
  });

  onBusinessChange(businessId: string): void {
    this.selectedFormBusinessId.set(businessId);
    const bizBranches = this.branches().filter(b => b.businessId === businessId);
    const firstBranchName = bizBranches[0]?.name || '';
    this.userForm.assignedBranch = firstBranchName;
    this.selectedAuthorizedBranches.set(firstBranchName ? [firstBranchName] : []);
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
    if (!this.userForm.name.trim() || !this.userForm.email.trim()) {
      this.feedbackMessage.set(
        'Por favor, completa el nombre completo y el correo electrónico del usuario.'
      );
      return;
    }

    const biz = this.businesses().find(b => b.id === this.userForm.businessId);
    const businessName =
      biz?.legalName || 'Distribuidora de Licores y Bebidas El Roble S.A.C.';
    const authorized = [...this.selectedAuthorizedBranches()];
    if (
      !authorized.includes(this.userForm.assignedBranch) &&
      this.userForm.assignedBranch
    ) {
      authorized.unshift(this.userForm.assignedBranch);
    }

    const cleanUsername =
      this.userForm.username.trim().toLowerCase() ||
      this.userForm.name.trim().toLowerCase().split(' ').slice(0, 2).join('.');

    const expirationMeta = this.resolveExpirationMetadata(
      this.userForm.passwordStatus
    );

    if (this.editingUserId()) {
      const targetId = this.editingUserId()!;
      this.users.update(list =>
        list.map(u =>
          u.id === targetId
            ? {
                ...u,
                name: this.userForm.name.trim(),
                username: cleanUsername,
                email: this.userForm.email.trim(),
                password: this.userForm.password.trim() || u.password || 'Temporal2026*',
                role: this.userForm.role,
                businessId: this.userForm.businessId,
                businessName,
                assignedBranch: this.userForm.assignedBranch,
                assignedBranches: authorized,
                passwordStatus: this.userForm.passwordStatus,
                passwordExpiresAt: expirationMeta.expiresAt,
                daysUntilExpiration: expirationMeta.days,
                mustChangePassword: expirationMeta.mustChange,
              }
            : u
        )
      );
      this.feedbackMessage.set(
        `Usuario ${this.userForm.name} (${targetId}) actualizado con estado de clave "${this.userForm.passwordStatus}".`
      );
      this.resetUserForm();
      return;
    }

    const newId = `USR-00${this.users().length + 1}`;
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
    this.feedbackMessage.set(
      `Usuario "${createdUser.name}" (${newId}) registrado. Sincronizando con PostgreSQL...`
    );

    // Mapeo del código de rol para PostgreSQL (roles: ADMIN, SUPERVISOR, ANALYST, AUDITOR)
    const roleCodeMap: Record<string, string> = {
      'Administrador General': 'ADMIN',
      'Auditor de Caja e Inventario': 'AUDITOR',
      'Auditor de Operaciones': 'AUDITOR',
      'Jefe de Tienda y Compras': 'SUPERVISOR',
      'Cajero / Vendedor (Mayor/Menor)': 'ANALYST',
      ADMIN: 'ADMIN',
      AUDITOR: 'AUDITOR',
      SUPERVISOR: 'SUPERVISOR',
      ANALYST: 'ANALYST',
    };
    const roleCode = roleCodeMap[this.userForm.role] || 'ANALYST';

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
        next: () => {
          this.feedbackMessage.set(
            `Usuario "${createdUser.name}" (${newId}) registrado exitosamente en PostgreSQL con rol ${roleCode}.`
          );
          this.loadUsersFromBackend();
        },
        error: err => {
          console.warn('Usuario persistido localmente (backend devolvió):', err?.status);
          this.feedbackMessage.set(
            `Usuario "${createdUser.name}" (${newId}) registrado localmente. (Nota: ${err?.error?.detail || 'sesión offline o token faltante'}).`
          );
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
      role: user.role,
      businessId: user.businessId,
      assignedBranch: user.assignedBranch,
      passwordStatus: user.passwordStatus,
      status: user.status,
    };
    this.selectedAuthorizedBranches.set([...user.assignedBranches]);
  }

  expireUserPasswordNow(user: SystemUser): void {
    this.dummyData.forceUserPasswordExpiration(user.id);
    this.feedbackMessage.set(
      `La contraseña de ${user.name} (${user.email}) fue marcada como EXPIRADA. Ve a "Cerrar Sesión" (/login) para validar el cambio obligatorio.`
    );
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
    this.editingUserId.set(null);
    this.selectedFormBusinessId.set('BIZ-001');
    this.userForm = {
      name: '',
      username: '',
      email: '',
      password: 'Temporal2026*',
      role: 'Cajero / Vendedor (Mayor/Menor)',
      businessId: 'BIZ-001',
      assignedBranch: 'Sede Central (Mayorista)',
      passwordStatus: 'Clave Temporal',
      status: 'Activo',
    };
    this.selectedAuthorizedBranches.set(['Sede Central (Mayorista)']);
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
