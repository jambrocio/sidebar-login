import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** DTO de Negocio Matriz devuelto por /api/v1/businesses */
export interface BackendBusinessDto {
  code: string;
  commercialName: string;
  legalName: string;
  taxId: string;
  fiscalAddress?: string;
  phone?: string;
  currency?: string;
  active?: boolean;
}

/** DTO para crear nuevo Negocio Matriz */
export interface CreateBusinessRequestDto {
  code: string;
  commercialName: string;
  legalName: string;
  taxId: string;
  fiscalAddress: string;
  phone: string;
  currency: string;
}

/** DTO de Local / Sucursal devuelto por /api/v1/branches */
export interface BackendBranchDto {
  code: string;
  businessCode: string;
  businessLegalName?: string;
  businessCommercialName?: string;
  businessTaxId?: string;
  name: string;
  branchType?: string;
  type?: string;
  address?: string;
  phone?: string;
  invoiceSeries?: string;
  managerName?: string;
  managerUser?: string;
  posTerminals?: number;
  status?: string;
  active?: boolean;
}

/** DTO de Usuario devuelto por /api/v1/users */
export interface BackendUserDto {
  id: string; // USR-001
  name: string;
  username: string;
  email: string;
  role: string;
  role_scope?: string;
  business_id: string; // BIZ-001
  business_name: string;
  assigned_branch: string;
  assigned_branches?: any; // array o jsonb { value: string }
  client_type: string;
  status: string;
  must_change_password?: boolean;
  password_expires_at?: string;
}

/** DTO para registrar nuevo usuario con locales y rol */
export interface CreateUserRequestDto {
  userCode: string;
  fullName: string;
  username: string;
  email: string;
  password: string;
  roleCode: string;
  businessCode: string;
  primaryBranchName: string;
  authorizedBranchNames: string[];
  clientType: string;
}

/** DTO de Rol devuelto por /api/v1/roles */
export interface BackendRoleDto {
  code: string;
  name: string;
  description: string;
  scope: 'Nivel Negocio (Multi-Local)' | 'Nivel Local Asignado';
  isSystem?: boolean;
  status?: string;
  active?: boolean;
  usersCount?: number;
}

/** DTO para registrar un nuevo Rol */
export interface CreateRoleRequestDto {
  code: string;
  name: string;
  description: string;
  scope: string;
}

/** DTO de Permiso de Menú para un Rol */
export interface BackendRolePermissionDto {
  roleCode?: string;
  code?: string;
  label?: string;
  module: string;
  routerLink?: string;
  level?: number;
  visibleInSidebar: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
}

/** DTO de Sesión Activa con Auditoría de IP, Navegador y Geolocalización */
export interface ActiveSessionDto {
  sessionId: string;
  userId: string;
  userCode: string;
  username: string;
  fullName: string;
  email: string;
  userStatus: string;
  roleCode: string;
  roleName: string;
  branchCode: string;
  branchName: string;
  businessName: string;
  ipAddress: string;
  browserName: string;
  deviceType: string;
  userAgent: string;
  locationName: string;
  latitude: number;
  longitude: number;
  loginAt: string;
  lastActivityAt: string;
  expiresAt: string;
  isRevoked: boolean;
  revokedByAdmin: boolean;
  revokedReason?: string;
  revokedAt?: string;
  connectionStatus: 'ONLINE' | 'IDLE' | 'DISCONNECTED';
  semaphoreIndicator: '🟢' | '🟡' | '🔴';
}

/**
 * Servicio de integración HTTP contra el Backend Spring Boot 4 para el grupo de Administración:
 * 1. Negocio y Locales (/api/v1/businesses, /api/v1/branches)
 * 2. Clientes y Usuarios (/api/v1/users)
 * 3. Roles y Permisos RBAC (/api/v1/roles, /api/v1/roles/{roleCode}/permissions)
 */
@Injectable({
  providedIn: 'root',
})
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Genera los encabezados HTTP inyectando el token JWT de la sesión activa.
   */
  private getHeaders(): HttpHeaders {
    let token = '';
    if (typeof window !== 'undefined') {
      token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken') || '';
    }
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // =========================================================================
  // 1. NEGOCIO Y LOCALES
  // =========================================================================

  /**
   * Obtiene la lista de Negocios Matriz registrados en PostgreSQL.
   */
  getBusinesses(): Observable<BackendBusinessDto[]> {
    return this.http.get<BackendBusinessDto[]>(`${this.baseUrl}/businesses`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo Negocio Matriz en PostgreSQL.
   */
  createBusiness(data: CreateBusinessRequestDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/businesses`, data, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtiene los Locales y Sucursales registrados (filtrable por negocio).
   */
  getBranches(businessCode?: string): Observable<BackendBranchDto[]> {
    let url = `${this.baseUrl}/branches`;
    if (businessCode && businessCode !== 'ALL') {
      url += `?businessCode=${encodeURIComponent(businessCode)}`;
    }
    return this.http.get<BackendBranchDto[]>(url, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 2. CLIENTES Y USUARIOS
  // =========================================================================

  /**
   * Obtiene todos los usuarios del sistema enriquecidos con su negocio y locales autorizados.
   */
  getUsers(): Observable<BackendUserDto[]> {
    return this.http.get<BackendUserDto[]>(`${this.baseUrl}/users`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo usuario transaccionalmente con su rol y locales autorizados.
   */
  createUser(data: CreateUserRequestDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users`, data, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 3. ROLES Y PERMISOS RBAC
  // =========================================================================

  /**
   * Obtiene el catálogo de Roles del sistema con conteo de usuarios.
   */
  getRoles(): Observable<BackendRoleDto[]> {
    return this.http.get<BackendRoleDto[]>(`${this.baseUrl}/roles`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo Rol en PostgreSQL.
   */
  createRole(data: CreateRoleRequestDto): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/roles`, data, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Consulta la Matriz RBAC de permisos de menú para un rol específico.
   */
  getRolePermissions(roleCode: string): Observable<BackendRolePermissionDto[]> {
    return this.http.get<BackendRolePermissionDto[]>(
      `${this.baseUrl}/roles/${encodeURIComponent(roleCode)}/permissions`,
      {
        headers: this.getHeaders(),
      }
    );
  }

  /**
   * Actualiza la Matriz RBAC de permisos de menú para un rol en PostgreSQL.
   */
  saveRolePermissions(
    roleCode: string,
    matrix: Array<{
      code: string;
      label?: string;
      visibleInSidebar: boolean;
      canView: boolean;
      canCreate: boolean;
      canEdit: boolean;
      canDelete: boolean;
      canExport: boolean;
    }>
  ): Observable<any> {
    return this.http.put(
      `${this.baseUrl}/roles/${encodeURIComponent(roleCode)}/permissions`,
      matrix,
      {
        headers: this.getHeaders(),
      }
    );
  }

  // =========================================================================
  // 4. SESIONES ACTIVAS Y AUDITORÍA DE CONEXIÓN
  // =========================================================================

  /**
   * Obtiene la lista completa de sesiones auditadas con IPs, navegadores y semáforos.
   */
  getActiveSessions(): Observable<ActiveSessionDto[]> {
    return this.http.get<ActiveSessionDto[]>(`${this.baseUrl}/admin/sessions`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Cierra remotamente la sesión activa de un usuario (Kill Session).
   */
  revokeSession(sessionId: string, reason?: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/admin/sessions/${sessionId}/revoke`,
      { reason: reason || 'Cierre forzado por el Administrador de Seguridad' },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Bloquea la cuenta de un usuario infiltrado y revoca todas sus conexiones.
   */
  lockUserAndRevokeSessions(userId: string, reason?: string): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/admin/sessions/users/${userId}/lock`,
      { reason: reason || 'Bloqueo preventivo de cuenta por actividad sospechosa' },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Envía un latido (Heartbeat) de actividad y verifica si la sesión fue revocada.
   */
  sendHeartbeat(): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/auth/heartbeat`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // =========================================================================
  // 5. CATÁLOGO DE BEBIDAS Y CATEGORÍAS
  // =========================================================================

  getProducts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/products`, {
      headers: this.getHeaders(),
    });
  }

  createProduct(product: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/products`, product, {
      headers: this.getHeaders(),
    });
  }

  getCategories(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/categories`, {
      headers: this.getHeaders(),
    });
  }

  createCategory(category: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/categories`, category, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 6. COMPRAS Y ABASTECIMIENTO
  // =========================================================================

  getPurchases(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/purchases`, {
      headers: this.getHeaders(),
    });
  }

  createPurchase(purchase: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/purchases`, purchase, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 7. CUPONES DE DESCUENTO
  // =========================================================================

  getCoupons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/coupons`, {
      headers: this.getHeaders(),
    });
  }

  createCoupon(coupon: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/coupons`, coupon, {
      headers: this.getHeaders(),
    });
  }

  toggleCoupon(code: string): Observable<any> {
    return this.http.patch<any>(
      `${this.baseUrl}/coupons/${encodeURIComponent(code)}/toggle`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // =========================================================================
  // 8. VENTAS (POS) E HISTORIAL
  // =========================================================================

  emitSale(sale: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/sales`, sale, {
      headers: this.getHeaders(),
    });
  }

  getMySalesHistory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/sales/my-history`, {
      headers: this.getHeaders(),
    });
  }

  getAllSales(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/sales`, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 9. ARQUEO Y CIERRE DE CAJA
  // =========================================================================

  getCashAudits(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cash-register/audits`, {
      headers: this.getHeaders(),
    });
  }

  closeCashAudit(audit: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cash-register/audits`, audit, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 10. MENÚ LATERAL Y NOTIFICACIONES
  // =========================================================================

  getNavigationMenu(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/menu/my-navigation`, {
      headers: this.getHeaders(),
    });
  }

  getNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/notifications`, {
      headers: this.getHeaders(),
    });
  }

  markNotificationRead(code: string): Observable<any> {
    return this.http.patch<any>(
      `${this.baseUrl}/notifications/${encodeURIComponent(code)}/read`,
      {},
      { headers: this.getHeaders() }
    );
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.patch<any>(
      `${this.baseUrl}/notifications/read-all`,
      {},
      { headers: this.getHeaders() }
    );
  }
}
