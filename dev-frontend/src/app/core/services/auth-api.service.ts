import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { SystemUser, PasswordExpirationStatus } from '../models/domain.models';
import { environment } from '../../../environments/environment';
import { AppDialogService } from './app-dialog.service';

/**
 * Contrato de usuario organizacional devuelto por el Backend Spring Boot 4.
 */
export interface BackendUserPrincipal {
  userId: string;
  userCode: string;
  username: string;
  fullName: string;
  businessId: string;
  businessCode: string;
  businessName?: string;
  assignedBranchId: string;
  assignedBranchName: string;
  authorizedBranchIds: string[];
  roles: string[];
  roleScope: string;
  businessWideScope?: boolean;
}

/**
 * Contrato DTO de respuesta para login exitoso devuelto por el Backend (/api/v1/auth/login).
 */
export interface LoginApiResponse {
  accessToken: string;
  user: BackendUserPrincipal;
  passwordStatus: PasswordExpirationStatus;
  daysUntilExpiration: number;
  passwordExpiresAt: string;
  mustChangePassword: boolean;
}

/**
 * Estructura de error estandarizada RFC 9457 (ProblemDetail) emitida por GlobalExceptionHandler.
 */
export interface ProblemDetailError {
  title?: string;
  status?: number;
  detail?: string;
  passwordStatus?: PasswordExpirationStatus;
  mustChangePassword?: boolean;
  actionRequired?: string;
  accountStatus?: string;
  isLocked?: boolean;
}

/**
 * Servicio de integración HTTP para el módulo de Autenticación contra el Backend Spring Boot 4.
 * Conecta los endpoints:
 * - POST http://localhost:8080/api/v1/auth/login
 * - POST http://localhost:8080/api/v1/auth/change-password
 * - GET  http://localhost:8080/api/v1/auth/me
 */
@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly dialogService = inject(AppDialogService);
  private readonly baseUrl = environment.authUrl;

  /**
   * Solicita confirmación al usuario antes de destruir la sesión utilizando el sistema centralizado de alertas.
   */
  async requestLogout(): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: '¿Cerrar Sesión Activa?',
      subtitle: 'COTIC: SISTEMA POS & GESTIÓN DE PRODUCTOS',
      message: '¿Estás seguro de que deseas salir del sistema?',
      warningText: 'Si tienes operaciones de caja, compras o ventas sin confirmar, asegúrate de haberlas guardado antes de continuar.',
      icon: 'bi-box-arrow-right',
      type: 'danger',
      confirmText: 'Sí, Cerrar Sesión',
      cancelText: 'Permanecer en el Sistema',
      cancelIcon: 'bi-shield-check'
    });

    if (confirmed) {
      this.logout();
    }
  }

  /**
   * Determina si existe una sesión de usuario válida y activa en la pestaña actual.
   *
   * @description Al persistirse en {@code sessionStorage}, se asegura que al cerrar la ventana o
   * pestaña la sesión se descarte automáticamente, exigiendo nueva autenticación.
   *
   * @returns {@code true} si existe un token Bearer en almacenamiento de sesión; {@code false} de lo contrario.
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const token = sessionStorage.getItem('accessToken');
    return !!token && token.trim().length > 0;
  }

  /**
   * Recupera el token JWT activo de la sesión actual en memoria de pestaña.
   *
   * @returns Cadena con el token Bearer o {@code null} si no hay sesión iniciada.
   */
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem('accessToken');
  }

  /**
   * Persiste la sesión activa en {@code sessionStorage} vinculándola al ciclo de vida del navegador.
   *
   * @param response DTO {@link LoginApiResponse} devuelto por el endpoint de autenticación.
   * @returns void
   */
  setSession(response: LoginApiResponse): void {
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('accessToken', response.accessToken);
      sessionStorage.setItem('currentUser', JSON.stringify(this.mapToSystemUser(response)));
      // Garantizar que no persistan tokens residuales en el disco
      localStorage.removeItem('accessToken');
    }
  }

  /**
   * Termina de forma definitiva la sesión activa del usuario, destruye las credenciales
   * temporales en memoria y redirige a la vista de login.
   *
   * @returns void
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUserProfile');
      localStorage.removeItem('accessToken');
    }
    this.router.navigate(['/login']);
  }

  /**
   * Envía las credenciales corporativas al backend Spring Boot 4 para iniciar sesión.
   *
   * @param username Correo corporativo o nombre de usuario institucional.
   * @param password Contraseña en texto plano para verificación criptográfica BCrypt.
   * @returns Observable con el contrato {@link LoginApiResponse} que incluye token y contexto organizacional.
   * @throws ProblemDetailError Estructura normalizada de error RFC 7807 ante fallos de credenciales o cuenta bloqueada.
   */
  login(username: string, password: string): Observable<LoginApiResponse> {
    return this.http
      .post<LoginApiResponse>(`${this.baseUrl}/login`, {
        username: username.trim(),
        password,
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => this.parseBackendError(error));
        })
      );
  }

  /**
   * Envía la solicitud de cambio obligatorio o renovación de contraseña por expiración.
   *
   * @param username Nombre de usuario o correo corporativo.
   * @param currentPassword Contraseña actual o expirada.
   * @param newPassword Nueva contraseña institucional cumpliendo políticas de robustez.
   * @returns Observable con la respuesta {@link LoginApiResponse} renovada con nuevo token de acceso.
   * @throws ProblemDetailError Estructura RFC 7807 si la contraseña actual es errónea o la nueva incumple políticas.
   */
  changePassword(
    username: string,
    currentPassword: string,
    newPassword: string
  ): Observable<LoginApiResponse> {
    return this.http
      .post<LoginApiResponse>(`${this.baseUrl}/change-password`, {
        username: username.trim(),
        currentPassword,
        newPassword,
      })
      .pipe(
        catchError((error: HttpErrorResponse) => {
          return throwError(() => this.parseBackendError(error));
        })
      );
  }

  /**
   * Mapea el objeto principal devuelto por el backend a la estructura tipada {@link SystemUser}
   * consumida por el Navbar, Sidebar y las interfaces operativas de Angular.
   *
   * @param response DTO {@link LoginApiResponse} emitido tras un login exitoso.
   * @returns Instancia de {@link SystemUser} con las propiedades reactivas inicializadas.
   */
  mapToSystemUser(response: LoginApiResponse): SystemUser {
    const { user, passwordStatus, daysUntilExpiration, passwordExpiresAt, mustChangePassword } = response;
    const roleName = user.roles && user.roles.length > 0 ? user.roles[0] : 'ANALYST';

    let userRole = 'Cajero / Vendedor (Mayor/Menor)';
    if (roleName === 'ADMIN' || roleName === 'ROLE_ADMIN') {
      userRole = 'Administrador General';
    } else if (roleName === 'ADMIN_NEGOCIO' || roleName === 'ROLE_ADMIN_NEGOCIO') {
      userRole = 'Administrador de Negocio';
    } else if (roleName === 'SUPERVISOR' || roleName === 'ROLE_SUPERVISOR') {
      userRole = 'Jefe de Tienda y Compras';
    } else if (roleName === 'AUDITOR' || roleName === 'ROLE_AUDITOR') {
      userRole = 'Auditor de Caja e Inventario';
    }

    let defaultBizName = 'Distribuidora de Licores y Bebidas El Roble S.A.C.';
    if (user.businessCode === 'BIZ-003') {
      defaultBizName = 'COTIC S.A.C.';
    } else if (user.businessCode === 'BIZ-002') {
      defaultBizName = 'Corporación Licorera Andina del Sur S.A.C.';
    }

    return {
      id: user.userCode || 'USR-001',
      name: user.fullName || user.username,
      username: user.username,
      email: `${user.username}@empresa.com`,
      role: userRole,
      businessId: user.businessCode || 'BIZ-001',
      businessName: user.businessName || defaultBizName,
      assignedBranch: user.assignedBranchName || 'Sede Central',
      assignedBranches: [user.assignedBranchName || 'Sede Central'],
      clientType: 'Personal Interno',
      status: 'Activo',
      lastAccess: 'En línea ahora',
      passwordStatus: passwordStatus || 'Vigente',
      daysUntilExpiration: daysUntilExpiration ?? 90,
      passwordExpiresAt: passwordExpiresAt || new Date().toISOString().split('T')[0],
      mustChangePassword: mustChangePassword ?? false,
      testCaseDescription: `Sesión iniciada vía Backend Spring Boot 4 (${passwordStatus})`,
    };
  }

  /**
   * Extrae y normaliza la estructura de error RFC 7807 (ProblemDetail) emitida por el backend
   * para su presentación legible en los formularios de autenticación.
   *
   * @param error Respuesta errónea HTTP {@link HttpErrorResponse}.
   * @returns Estructura tipada {@link ProblemDetailError} con el detalle del fallo.
   */
  private parseBackendError(error: HttpErrorResponse): ProblemDetailError {
    if (error.error && typeof error.error === 'object') {
      const err = error.error as ProblemDetailError;
      return {
        title: err.title || 'Error de Autenticación',
        status: error.status,
        detail: err.detail || 'Ocurrió un error al procesar la solicitud.',
        passwordStatus: err.passwordStatus,
        mustChangePassword: err.mustChangePassword,
        actionRequired: err.actionRequired,
        accountStatus: err.accountStatus,
        isLocked: err.isLocked,
      };
    }

    if (error.status === 0) {
      const endpoint = typeof window !== 'undefined' ? `${window.location.origin}${this.baseUrl}` : this.baseUrl;
      return {
        title: 'Servidor Backend No Disponible',
        status: 0,
        detail: `No fue posible conectar con el servidor Spring Boot en ${endpoint}.`,
      };
    }

    return {
      title: 'Error de Conexión',
      status: error.status,
      detail: error.message || 'Error inesperado de comunicación con el backend.',
    };
  }
}
