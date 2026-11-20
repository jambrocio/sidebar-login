import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BeverageCategory,
  BeverageProduct,
  BeveragePurchase,
  BeverageSale,
  CashRegisterAudit,
  CommercialCustomer,
  DiscountCoupon,
} from '../models/domain.models';

/**
 * Contrato DTO que representa un Negocio Matriz devuelto por {@code /api/v1/businesses}.
 */
export interface BackendBusinessDto {
  /** Código único identificador del negocio (ej. BIZ-001) */
  code: string;
  /** Nombre comercial o marca visible */
  commercialName: string;
  /** Razón social legal registrada ante la administración tributaria */
  legalName: string;
  /** Número de RUC o identificación fiscal */
  taxId: string;
  /** Dirección fiscal del negocio */
  fiscalAddress?: string;
  /** Teléfono de contacto */
  phone?: string;
  /** Moneda operativa (ej. PEN, USD) */
  currency?: string;
  /** Estado de activación del negocio */
  active?: boolean;
}

/**
 * Contrato DTO para el registro de un nuevo Negocio Matriz en PostgreSQL.
 */
export interface CreateBusinessRequestDto {
  /** Código único asignado al negocio (ej. BIZ-004) */
  code: string;
  /** Nombre comercial o marca */
  commercialName: string;
  /** Razón social oficial */
  legalName: string;
  /** RUC tributario de 11 dígitos */
  taxId: string;
  /** Dirección legal */
  fiscalAddress: string;
  /** Teléfono central opcional */
  phone?: string;
  /** Correo de soporte corporativo */
  supportEmail?: string;
  /** Moneda principal */
  currency?: string;
}

/**
 * Contrato DTO para registrar un nuevo Local o Sucursal en PostgreSQL.
 */
export interface CreateBranchRequestDto {
  /** Código del Negocio Matriz al que pertenece el local */
  businessCode: string;
  /** Código asignado al local (ej. LOC-05) */
  code: string;
  /** Nombre comercial de la sede o sucursal */
  name: string;
  /** Tipo de operación comercial (Mayorista, Minorista, Almacén) */
  type?: string;
  /** Dirección física del establecimiento */
  address: string;
  /** Teléfono de la sucursal */
  phone?: string;
  /** Serie de facturación electrónica asociada */
  invoiceSeries?: string;
  /** Nombre del usuario administrador o encargado */
  manager?: string;
  /** Cantidad de puntos de venta (POS) instalados */
  posTerminals?: number;
}

/**
 * Contrato DTO de Local o Sucursal devuelto por {@code /api/v1/branches}.
 */
export interface BackendBranchDto {
  /** Código del local */
  code: string;
  /** Código del Negocio Matriz */
  businessCode: string;
  /** Razón social de la empresa matriz */
  businessLegalName?: string;
  /** Nombre comercial de la empresa matriz */
  businessCommercialName?: string;
  /** RUC de la empresa matriz */
  businessTaxId?: string;
  /** Nombre del local */
  name: string;
  /** Tipo de local */
  branchType?: string;
  /** Tipo operativo */
  type?: string;
  /** Dirección */
  address?: string;
  /** Teléfono */
  phone?: string;
  /** Serie de facturación */
  invoiceSeries?: string;
  /** Nombre del encargado */
  managerName?: string;
  /** Usuario encargado */
  managerUser?: string;
  /** Terminales POS */
  posTerminals?: number;
  /** Estado operativo */
  status?: string;
  /** Indicador de vigencia activa */
  active?: boolean;
}

/**
 * Contrato DTO de Usuario devuelto por {@code /api/v1/users}.
 */
export interface BackendUserDto {
  /** Código o identificador del usuario (ej. USR-001) */
  id: string;
  /** Nombre completo */
  name: string;
  /** Nombre de usuario de acceso */
  username: string;
  /** Correo corporativo */
  email: string;
  /** Nombre del rol asignado */
  role: string;
  /** Alcance del rol */
  role_scope?: string;
  /** Código del negocio matriz asignado */
  business_id: string;
  /** Nombre del negocio matriz asignado */
  business_name: string;
  /** Nombre de la sede principal */
  assigned_branch: string;
  /** Arreglo o estructura jsonb de sedes autorizadas */
  assigned_branches?: string[] | { value?: string } | string;
  /** Clasificación del usuario */
  client_type: string;
  /** Estado de la cuenta */
  status: string;
  /** Indicador de cambio obligatorio de clave */
  must_change_password?: boolean;
  /** Fecha de vencimiento de contraseña */
  password_expires_at?: string;
}

/**
 * Contrato DTO para registrar un nuevo usuario con locales y rol en PostgreSQL.
 */
export interface CreateUserRequestDto {
  /** Código de usuario (ej. USR-007) */
  userCode: string;
  /** Nombre y apellidos */
  fullName: string;
  /** Nombre de usuario login */
  username: string;
  /** Correo corporativo */
  email: string;
  /** Contraseña inicial */
  password?: string;
  /** Código del rol RBAC asignado */
  roleCode: string;
  /** Código del negocio matriz */
  businessCode: string;
  /** Nombre del local principal */
  primaryBranchName: string;
  /** Lista de nombres de locales autorizados */
  authorizedBranchNames: string[];
  /** Tipo de cliente o personal */
  clientType: string;
}

/**
 * Contrato DTO de actualización de usuario en PostgreSQL.
 */
export interface UpdateUserRequestDto {
  /** Nombre completo */
  fullName: string;
  /** Nombre de usuario */
  username: string;
  /** Correo corporativo */
  email: string;
  /** Nueva contraseña opcional */
  password?: string | null;
  /** Código del rol asignado */
  roleCode: string;
  /** Código del negocio asignado */
  businessCode: string;
  /** Sede principal */
  primaryBranchName: string;
  /** Sedes autorizadas */
  authorizedBranchNames: string[];
  /** Tipo de cliente */
  clientType: string;
  /** Estado de la cuenta (ACTIVE, INACTIVE) */
  status: string;
}

/**
 * Contrato DTO de Rol devuelto por {@code /api/v1/roles}.
 */
export interface BackendRoleDto {
  /** Código mnemotécnico del rol (ADMIN, SUPERVISOR, ANALYST) */
  code: string;
  /** Nombre visible del rol */
  name: string;
  /** Descripción de funciones */
  description: string;
  /** Nivel de alcance */
  scope: 'Nivel Plataforma (Superusuario)' | 'Nivel Negocio (Multi-Local)' | 'Nivel Local Asignado';
  /** Indicador de rol de sistema protegido */
  isSystem?: boolean;
  /** Estado en texto */
  status?: string;
  /** Indicador booleano activo */
  active?: boolean;
  /** Conteo de usuarios asignados */
  usersCount?: number;
}

/**
 * Contrato DTO para registrar un nuevo Rol en PostgreSQL.
 */
export interface CreateRoleRequestDto {
  /** Código único del rol */
  code: string;
  /** Nombre visible */
  name: string;
  /** Descripción funcional */
  description: string;
  /** Alcance del rol */
  scope: string;
}

/**
 * Contrato DTO de Permiso de Menú para un Rol en la Matriz RBAC.
 */
export interface BackendRolePermissionDto {
  /** Código del rol */
  roleCode?: string;
  /** Código de la opción de menú */
  code?: string;
  /** Etiqueta descriptiva */
  label?: string;
  /** Módulo funcional */
  module: string;
  /** Enlace de enrutamiento */
  routerLink?: string;
  /** Nivel jerárquico */
  level?: number;
  /** Visibilidad en el menú lateral */
  visibleInSidebar: boolean;
  /** Permiso de lectura */
  canView: boolean;
  /** Permiso de creación */
  canCreate: boolean;
  /** Permiso de edición */
  canEdit: boolean;
  /** Permiso de eliminación */
  canDelete: boolean;
  /** Permiso de exportación */
  canExport: boolean;
}

/**
 * Contrato DTO de Sesión Activa con Auditoría de IP, Navegador y Geolocalización.
 */
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
 * Respuesta genérica devuelta por mutaciones del backend (Crear, Actualizar, Revocar).
 */
export interface GenericMutationResponse {
  /** Identificador UUID o código del recurso afectado */
  id?: string;
  userId?: string;
  userCode?: string;
  businessId?: string;
  businessCode?: string;
  branchId?: string;
  branchCode?: string;
  customerCode?: string;
  saleCode?: string;
  auditCode?: string;
  /** Estado de la transacción */
  status?: string;
  /** Mensaje informativo */
  message?: string;
  /** Diferencia de cuadre en auditorías */
  difference?: number;
  /** Indicador de sesión revocada por el administrador */
  revoked?: boolean;
  [key: string]: unknown;
}

/**
 * Estructura de notificación del sistema.
 */
export interface SystemNotificationDto {
  id: string;
  title: string;
  description: string;
  time?: string;
  icon?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: string;
  unread: boolean;
}

/**
 * Servicio de integración HTTP para el ecosistema de administración contra el Backend Spring Boot 4.
 *
 * @description Conecta y gestiona de manera tipada y segura los recursos REST de:
 * 1. Negocios y Locales (/api/v1/businesses, /api/v1/branches)
 * 2. Usuarios y Clientes Comerciales (/api/v1/users, /api/v1/customers)
 * 3. Roles y Matriz RBAC (/api/v1/roles)
 * 4. Auditoría de Sesiones NOC (/api/v1/admin/sessions)
 * 5. Catálogo, Compras, Cupones, POS y Arqueos (/api/v1/*)
 *
 * @author Equipo de Arquitectura Frontend Senior
 * @version 2.0
 */
@Injectable({
  providedIn: 'root',
})
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  /**
   * Genera los encabezados HTTP inyectando de forma segura el token Bearer JWT de la sesión activa.
   *
   * @returns Instancia de {@link HttpHeaders} con cabeceras de autorización y contenido JSON.
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
   * Obtiene la lista consolidada de Negocios Matrices registrados en PostgreSQL.
   *
   * @returns Observable con la lista de negocios {@link BackendBusinessDto}.
   */
  getBusinesses(): Observable<BackendBusinessDto[]> {
    return this.http.get<BackendBusinessDto[]>(`${this.baseUrl}/businesses`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo Negocio Matriz en la base de datos PostgreSQL.
   *
   * @param data DTO con la información fiscal y comercial del negocio.
   * @returns Observable con la confirmación del registro.
   */
  createBusiness(data: CreateBusinessRequestDto): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/businesses`, data, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo Local o Sucursal vinculado a un Negocio Matriz en PostgreSQL.
   *
   * @param data DTO con los datos del local, dirección y serie fiscal.
   * @returns Observable con la confirmación del alta.
   */
  createBranch(data: CreateBranchRequestDto): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/branches`, data, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtiene la lista de Locales y Sucursales registrados, permitiendo filtrar por negocio.
   *
   * @param businessCode Código opcional del negocio para filtrar o 'ALL' para ver todos.
   * @returns Observable con la lista de sedes {@link BackendBranchDto}.
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
   *
   * @param businessCode Código del negocio matriz para filtrar o 'ALL'.
   * @returns Observable con el listado de usuarios {@link BackendUserDto}.
   */
  getUsers(businessCode?: string): Observable<BackendUserDto[]> {
    let url = `${this.baseUrl}/users`;
    if (businessCode && businessCode !== 'ALL') {
      url += `?businessCode=${encodeURIComponent(businessCode)}`;
    }
    return this.http.get<BackendUserDto[]>(url, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo usuario de forma transaccional con su rol y locales autorizados.
   *
   * @param data DTO con los datos del usuario, contraseñas, rol y asignaciones de sede.
   * @returns Observable con el resumen del usuario creado.
   */
  createUser(data: CreateUserRequestDto): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/users`, data, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Actualiza los datos, rol RBAC y locales autorizados de un usuario existente.
   *
   * @param userId Identificador UUID, código de usuario (ej. USR-431) o username (ej. rambrocio).
   * @param data DTO con los datos actualizados a persistir.
   * @returns Observable con el resultado de la actualización.
   */
  updateUser(userId: string, data: UpdateUserRequestDto | Record<string, unknown>): Observable<GenericMutationResponse> {
    return this.http.put<GenericMutationResponse>(`${this.baseUrl}/users/${encodeURIComponent(userId)}`, data, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 2B. CLIENTES COMERCIALES (Multi-Tenant por Negocio)
  // =========================================================================

  /**
   * Obtiene la lista de clientes comerciales del negocio o todos si el usuario es Superadmin.
   *
   * @param businessCode Código de negocio matriz opcional.
   * @returns Observable con la lista de clientes {@link CommercialCustomer}.
   */
  getCustomers(businessCode?: string): Observable<CommercialCustomer[]> {
    let params = new HttpParams();
    if (businessCode && businessCode !== 'ALL') {
      params = params.set('businessCode', businessCode);
    }
    return this.http.get<CommercialCustomer[]>(`${this.baseUrl}/customers`, {
      headers: this.getHeaders(),
      params,
    });
  }

  /**
   * Registra un nuevo cliente comercial en PostgreSQL validando unicidad de RUC/DNI por negocio.
   *
   * @param data Datos del cliente comercial a registrar.
   * @returns Observable con el cliente comercial generado.
   */
  createCustomer(data: Partial<CommercialCustomer>): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/customers`, data, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 3. ROLES Y PERMISOS RBAC
  // =========================================================================

  /**
   * Obtiene el catálogo consolidado de Roles del sistema con conteo de usuarios asignados.
   *
   * @returns Observable con la lista de roles {@link BackendRoleDto}.
   */
  getRoles(): Observable<BackendRoleDto[]> {
    return this.http.get<BackendRoleDto[]>(`${this.baseUrl}/roles`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo Rol personalizado en la matriz RBAC de PostgreSQL.
   *
   * @param data DTO con el código, nombre y alcance del rol.
   * @returns Observable con la respuesta de creación.
   */
  createRole(data: CreateRoleRequestDto): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/roles`, data, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Consulta la Matriz RBAC de permisos de menú para un rol específico.
   *
   * @param roleCode Código mnemotécnico del rol (ej. ADMIN_NEGOCIO).
   * @returns Observable con los permisos de menú por cada opción.
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
   *
   * @param roleCode Código del rol a configurar.
   * @param matrix Arreglo de opciones de menú con sus permisos CRUD asignados.
   * @returns Observable con el estado de actualización.
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
  ): Observable<GenericMutationResponse> {
    return this.http.put<GenericMutationResponse>(
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
   * Obtiene la lista completa de sesiones auditadas en tiempo real con IPs, navegadores y semáforos.
   *
   * @returns Observable con el directorio de sesiones activas {@link ActiveSessionDto}.
   */
  getActiveSessions(): Observable<ActiveSessionDto[]> {
    return this.http.get<ActiveSessionDto[]>(`${this.baseUrl}/admin/sessions`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Cierra remotamente la sesión activa de un usuario (Kill Session) forzando el rechazo de su token.
   *
   * @param sessionId Identificador UUID de la sesión a revocar.
   * @param reason Motivo de seguridad de la revocación.
   * @returns Observable con la confirmación de la revocación.
   */
  revokeSession(sessionId: string, reason?: string): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(
      `${this.baseUrl}/admin/sessions/${sessionId}/revoke`,
      { reason: reason || 'Cierre forzado por el Administrador de Seguridad' },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Bloquea la cuenta de un usuario infiltrado y revoca de inmediato todas sus sesiones activas.
   *
   * @param userId Identificador del usuario a bloquear.
   * @param reason Justificación de seguridad del bloqueo.
   * @returns Observable con la respuesta de la operación.
   */
  lockUserAndRevokeSessions(userId: string, reason?: string): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(
      `${this.baseUrl}/admin/sessions/users/${userId}/lock`,
      { reason: reason || 'Bloqueo preventivo de cuenta por actividad sospechosa' },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Envía un latido (Heartbeat) de actividad y verifica si la sesión fue revocada remotamente.
   *
   * @returns Observable con el estado de vigencia de la sesión.
   */
  sendHeartbeat(): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(
      `${this.baseUrl}/auth/heartbeat`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // =========================================================================
  // 5. CATÁLOGO DE BEBIDAS Y CATEGORÍAS
  // =========================================================================

  /**
   * Obtiene el catálogo completo de productos de bebidas disponibles en el sistema.
   *
   * @returns Observable con la lista de productos {@link BeverageProduct}.
   */
  getProducts(): Observable<BeverageProduct[]> {
    return this.http.get<BeverageProduct[]>(`${this.baseUrl}/products`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo producto de bebida con precios mayorista y minorista.
   *
   * @param product Datos del producto a crear.
   * @returns Observable con la confirmación de guardado.
   */
  createProduct(product: Partial<BeverageProduct>): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/products`, product, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtiene las categorías de bebidas registradas.
   *
   * @returns Observable con la lista de categorías {@link BeverageCategory}.
   */
  getCategories(): Observable<BeverageCategory[]> {
    return this.http.get<BeverageCategory[]>(`${this.baseUrl}/categories`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra una nueva categoría de bebidas en el catálogo.
   *
   * @param category Datos de la categoría a registrar.
   * @returns Observable con la confirmación del registro.
   */
  createCategory(category: Partial<BeverageCategory>): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/categories`, category, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 6. COMPRAS Y ABASTECIMIENTO
  // =========================================================================

  /**
   * Obtiene el registro histórico de órdenes de compra a proveedores.
   *
   * @returns Observable con la lista de compras {@link BeveragePurchase}.
   */
  getPurchases(): Observable<BeveragePurchase[]> {
    return this.http.get<BeveragePurchase[]>(`${this.baseUrl}/purchases`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra una nueva orden de abastecimiento o compra de mercadería.
   *
   * @param purchase Datos de la orden de compra.
   * @returns Observable con la confirmación de guardado.
   */
  createPurchase(purchase: Partial<BeveragePurchase>): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/purchases`, purchase, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 7. CUPONES DE DESCUENTO
  // =========================================================================

  /**
   * Obtiene la lista de cupones de descuento configurados.
   *
   * @returns Observable con la lista de cupones {@link DiscountCoupon}.
   */
  getCoupons(): Observable<DiscountCoupon[]> {
    return this.http.get<DiscountCoupon[]>(`${this.baseUrl}/coupons`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Registra un nuevo cupón de descuento promocional.
   *
   * @param coupon Datos del cupón de descuento.
   * @returns Observable con la respuesta de creación.
   */
  createCoupon(coupon: Partial<DiscountCoupon>): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/coupons`, coupon, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Conmuta el estado de activación (Activo/Inactivo) de un cupón de descuento.
   *
   * @param code Código único del cupón.
   * @returns Observable con el estado actualizado.
   */
  toggleCoupon(code: string): Observable<GenericMutationResponse> {
    return this.http.patch<GenericMutationResponse>(
      `${this.baseUrl}/coupons/${encodeURIComponent(code)}/toggle`,
      {},
      { headers: this.getHeaders() }
    );
  }

  // =========================================================================
  // 8. VENTAS (POS) E HISTORIAL
  // =========================================================================

  /**
   * Emite y registra una nueva venta mayorista o minorista en el módulo POS.
   *
   * @param sale Datos de la venta, ítems y forma de pago.
   * @returns Observable con el comprobante electrónico generado.
   */
  emitSale(sale: Partial<BeverageSale>): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/sales`, sale, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Consulta el historial de ventas emitidas por el usuario en sesión actual.
   *
   * @returns Observable con el listado de ventas propias {@link BeverageSale}.
   */
  getMySalesHistory(): Observable<BeverageSale[]> {
    return this.http.get<BeverageSale[]>(`${this.baseUrl}/sales/my-history`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Consulta el consolidado total de ventas emitidas en la plataforma.
   *
   * @returns Observable con el directorio global de ventas {@link BeverageSale}.
   */
  getAllSales(): Observable<BeverageSale[]> {
    return this.http.get<BeverageSale[]>(`${this.baseUrl}/sales`, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 9. ARQUEO Y CIERRE DE CAJA
  // =========================================================================

  /**
   * Obtiene los arqueos y cierres de turno de caja registrados.
   *
   * @returns Observable con la lista de arqueos {@link CashRegisterAudit}.
   */
  getCashAudits(): Observable<CashRegisterAudit[]> {
    return this.http.get<CashRegisterAudit[]>(`${this.baseUrl}/cash-register/audits`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Cierra formalmente el turno laboral de caja registrando el conteo físico de efectivo.
   *
   * @param audit Datos de balance inicial, efectivo contado y notas de cierre.
   * @returns Observable con el resultado del balance y cuadre.
   */
  closeCashAudit(audit: Partial<CashRegisterAudit>): Observable<GenericMutationResponse> {
    return this.http.post<GenericMutationResponse>(`${this.baseUrl}/cash-register/audits`, audit, {
      headers: this.getHeaders(),
    });
  }

  // =========================================================================
  // 10. MENÚ LATERAL Y NOTIFICACIONES
  // =========================================================================

  /**
   * Consulta la estructura dinámica del menú de navegación calculada para el usuario en sesión.
   *
   * @returns Observable con la lista jerárquica de opciones del menú.
   */
  getNavigationMenu(): Observable<BackendRolePermissionDto[]> {
    return this.http.get<BackendRolePermissionDto[]>(`${this.baseUrl}/menu/my-navigation`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Obtiene la lista de notificaciones institucionales dirigidas al usuario.
   *
   * @returns Observable con las alertas del sistema {@link SystemNotificationDto}.
   */
  getNotifications(): Observable<SystemNotificationDto[]> {
    return this.http.get<SystemNotificationDto[]>(`${this.baseUrl}/notifications`, {
      headers: this.getHeaders(),
    });
  }

  /**
   * Marca una notificación como leída en la base de datos.
   *
   * @param code Identificador de la notificación.
   * @returns Observable con la confirmación.
   */
  markNotificationRead(code: string): Observable<GenericMutationResponse> {
    return this.http.patch<GenericMutationResponse>(
      `${this.baseUrl}/notifications/${encodeURIComponent(code)}/read`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Marca todas las notificaciones pendientes como leídas.
   *
   * @returns Observable con la confirmación de la actualización masiva.
   */
  markAllNotificationsRead(): Observable<GenericMutationResponse> {
    return this.http.patch<GenericMutationResponse>(
      `${this.baseUrl}/notifications/read-all`,
      {},
      { headers: this.getHeaders() }
    );
  }
}

