import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, throwError } from 'rxjs';
import { SystemUser, PasswordExpirationStatus } from '../models/domain.models';
import { environment } from '../../../environments/environment';

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
  private readonly baseUrl = environment.authUrl;

  /**
   * Determina si existe una sesión de usuario válida activa en la pestaña/ventana actual.
   * Al almacenarse en sessionStorage, se garantiza que al cerrar la pestaña o el navegador
   * la sesión se destruye automáticamente, obligando a una nueva autenticación.
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') {
      return false;
    }
    const token = sessionStorage.getItem('accessToken');
    return !!token && token.trim().length > 0;
  }

  /**
   * Obtiene el token JWT activo de la sesión actual en memoria de pestaña (sessionStorage).
   */
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return sessionStorage.getItem('accessToken');
  }

  /**
   * Persiste la sesión activa en sessionStorage para aislarla al ciclo de vida de la pestaña o navegador.
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
   * Cierra completamente la sesión activa del usuario, destruye los tokens
   * y redirige al /login impidiendo cualquier navegación posterior.
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
   * Envía las credenciales al backend Spring Boot 4 para iniciar sesión.
   *
   * @param username Correo o username institucional
   * @param password Contraseña en texto plano
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
   * Envía la solicitud de cambio o renovación de contraseña por expiración.
   *
   * @param username Nombre de usuario o correo corporativo
   * @param currentPassword Contraseña actual o vencida
   * @param newPassword Nueva contraseña (mínimo 8 caracteres)
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
   * Mapea el objeto principal devuelto por el backend a la estructura `SystemUser`
   * utilizada por el Navbar, Sidebar y Dashboard de Angular.
   */
  mapToSystemUser(response: LoginApiResponse): SystemUser {
    const { user, passwordStatus, daysUntilExpiration, passwordExpiresAt, mustChangePassword } = response;
    const roleName = user.roles && user.roles.length > 0 ? user.roles[0] : 'ANALYST';

    return {
      id: user.userCode || 'USR-001',
      name: user.fullName || user.username,
      username: user.username,
      email: `${user.username}@empresa.com`,
      role: roleName === 'ADMIN' ? 'Administrador General' : 'Cajero / Vendedor (Mayor/Menor)',
      businessId: user.businessCode || 'BIZ-001',
      businessName: 'Distribuidora de Licores y Bebidas El Roble S.A.C.',
      assignedBranch: user.assignedBranchName || 'Sede Central (Mayorista)',
      assignedBranches: [user.assignedBranchName || 'Sede Central (Mayorista)'],
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
   * Extrae la estructura de error ProblemDetail del backend de forma tipada y segura.
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
