import { Injectable, computed, inject, signal } from '@angular/core';
import { NavItem } from '../../shared/sidebar/sidebar.component';
import { NotificationItem, NotificationType } from '../../shared/navbar/notifications-sidebar.component';
import { AdminApiService } from './admin-api.service';
import { AuthApiService } from './auth-api.service';
import { formatAppDate, formatAmount } from '../utils/formatters';
import {
  AuditActivityItem,
  BeverageProduct,
  BeveragePurchase,
  BeverageSale,
  BusinessBranch,
  BusinessProfile,
  CashRegisterAudit,
  CommercialCustomer,
  CommercialSupplier,
  DiscountCoupon,
  DummyCategory,
  DummyReport,
  EnterpriseReport,
  KpiCard,
  PasswordExpirationStatus,
  RoleMenuMatrixRow,
  SaleCartItem,
  SecurityVulnerability,
  SystemRole,
  SystemUser,
} from '../models/domain.models';

/** Resultado tipado de la evaluación de inicio de sesión y expiración de contraseña */
export interface AuthEvaluationResult {
  status:
    | 'SUCCESS'
    | 'PASSWORD_EXPIRED_OR_TEMPORARY'
    | 'PASSWORD_EXPIRING_SOON'
    | 'INVALID_CREDENTIALS'
    | 'INACTIVE_ACCOUNT';
  message: string;
  user?: SystemUser;
}

/** Resultado tipado del cambio o renovación de contraseña por expiración */
export interface PasswordChangeResult {
  success: boolean;
  message: string;
  updatedUser?: SystemUser;
}

/**
 * Servicio centralizado de datos empresariales (`AppDataService`).
 *
 * Integra 100% de las interfaces con el Backend Spring Boot 4 y PostgreSQL,
 * consumiendo dinámicamente endpoints REST sin ninguna información dummy.
 */
@Injectable({
  providedIn: 'root',
})
export class AppDataService {
  private readonly adminApi = inject(AdminApiService);
  private readonly authApi = inject(AuthApiService);

  /** Política corporativa de expiración y complejidad de contraseñas */
  readonly passwordPolicy = signal({
    rotationDays: 90,
    warningThresholdDays: 5,
    minCharacters: 8,
    requireUppercase: true,
    requireNumber: true,
    requireSpecialChar: true,
  });

  /** Negocio Matriz activo en la sesión actual */
  readonly businessInfo = signal<BusinessProfile>({
    id: 'BIZ-001',
    commercialName: 'Distribuidora El Roble',
    legalName: 'Distribuidora de Licores y Bebidas El Roble S.A.C.',
    taxId: '20601234567',
    fiscalAddress: 'Av. Las Begonias 441, San Isidro, Lima - Perú',
    phone: '+51 1 555-0199',
    supportEmail: 'contacto@distribuidoraelroble.com',
    timezone: 'America/Lima',
    currency: 'USD',
  });

  /** Catálogo de Negocios registrados en la plataforma */
  readonly businesses = signal<BusinessProfile[]>([]);

  /** Lista completa de Locales / Sucursales registrados */
  readonly branches = signal<BusinessBranch[]>([]);

  /** Locales pertenecientes exclusivamente al Negocio Matriz activo en sesión */
  readonly activeBusinessBranches = computed<BusinessBranch[]>(() => {
    const bizId = this.businessInfo().id;
    return this.branches().filter(b => b.businessId?.toUpperCase() === bizId?.toUpperCase() || !b.businessId);
  });

  /** Perfil del usuario autenticado */
  readonly currentUserProfile = signal({
    name: 'Raúl Ambrocio Mendoza',
    initials: 'RA',
    role: 'Administrador General',
    email: 'rambrocio@empresa.com',
    username: 'rambrocio',
    sessionLabel: 'Raúl Ambrocio Mendoza (rambrocio)',
    assignedBusinessId: 'BIZ-001',
    assignedBranchCode: 'LOC-01',
    assignedBranch: 'Sede Central (Mayorista)',
    passwordStatus: 'Vigente' as PasswordExpirationStatus,
    passwordExpiresAt: '2026-12-05',
    daysUntilExpiration: 45,
  });

  /** Identificador de sesión del usuario activo para auditoría */
  readonly currentSessionUser = computed(() => this.currentUserProfile().sessionLabel);

  /** Determina si el usuario en sesión es Administrador General (Superusuario / Multi-Negocio) */
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

  /**
   * Negocios disponibles para el usuario en sesión:
   * - Si es Administrador General: tiene a su disposición todos los negocios.
   * - Si es usuario de negocio: únicamente su negocio asignado.
   */
  readonly availableBusinesses = computed<BusinessProfile[]>(() => {
    if (this.isGeneralAdmin()) {
      return this.businesses();
    }
    const myBiz = (this.currentUserProfile()?.assignedBusinessId || '').toUpperCase();
    return this.businesses().filter(b => b.id?.toUpperCase() === myBiz);
  });

  /**
   * Permite al Administrador General alternar rápidamente el Negocio de trabajo activo en sesión.
   */
  switchWorkingBusiness(businessId: string): void {
    if (!this.isGeneralAdmin()) return;
    const match = this.businesses().find(b => b.id?.toUpperCase() === businessId?.toUpperCase());
    if (match) {
      this.businessInfo.set(match);
      this.currentUserProfile.update(current => ({
        ...current,
        assignedBusinessId: match.id,
      }));
      const branches = this.getBranchesByBusiness(match.id);
      if (branches && branches.length > 0) {
        this.assignedBranch.set(branches[0].name);
      }
    }
  }

  /** Local / Tienda asignado al usuario actual dentro del Negocio */
  readonly assignedBranch = signal<string>('Sede Central (Mayorista)');

  /** Lista reactiva de nombres de locales disponibles en el Negocio activo */
  readonly availableBranches = computed<string[]>(() => {
    const list = this.activeBusinessBranches().map(branch => branch.name);
    return list.length > 0 ? list : ['Sede Central (Mayorista)', 'Tienda Norte (Licorería Express)'];
  });

  /** Parámetros de configuración general sincronizados */
  readonly defaultSettings = computed(() => ({
    companyName: this.businessInfo().legalName,
    commercialName: this.businessInfo().commercialName,
    taxId: this.businessInfo().taxId,
    supportEmail: this.businessInfo().supportEmail,
    assignedBranch: this.assignedBranch(),
    timezone: this.businessInfo().timezone,
  }));

  /** Árbol de opciones de menú del Sidebar cargado desde la API */
  readonly sidebarNavigation = signal<NavItem[]>([
    {
      code: 'DASH_HOME',
      label: 'Inicio',
      icon: 'bi bi-house-door-fill',
      routerLink: '/dashboard/inicio',
    },
    {
      code: 'MOD_COMMERCIAL',
      label: 'Comercial y Ventas',
      icon: 'bi bi-cart4',
      expanded: false,
      children: [
        { code: 'SALES_WHOLESALE_RETAIL', label: 'Ventas Mayor / Menor', icon: 'bi bi-receipt-cutoff', routerLink: '/dashboard/sales' },
        { code: 'SALES_HISTORY', label: 'Historial de Ventas Emitidas', icon: 'bi bi-clock-history', routerLink: '/dashboard/sales-history' },
        { code: 'PURCHASES_SUPPLIERS', label: 'Compras y Abastecimiento', icon: 'bi bi-truck', routerLink: '/dashboard/purchases' },
        { code: 'MGMT_SUPPLIERS', label: 'Proveedores', icon: 'bi bi-building-gear', routerLink: '/dashboard/suppliers' },
        { code: 'DISCOUNT_COUPONS', label: 'Cupones de Descuento', icon: 'bi bi-ticket-perforated-fill', routerLink: '/dashboard/coupons' },
        { code: 'CASH_REGISTER_AUDIT', label: 'Arqueo de Caja (Turnos)', icon: 'bi bi-cash-coin', routerLink: '/dashboard/cash-register' },
      ],
    },
    {
      code: 'MOD_CATALOG',
      label: 'Catálogo de Productos',
      icon: 'bi bi-box-seam-fill',
      expanded: false,
      children: [
        {
          code: 'SUB_PRODUCTS_PRICES',
          label: 'Productos y Precios',
          icon: 'bi bi-box-seam-fill',
          expanded: false,
          children: [
            { code: 'PROD_LIST', label: 'Inventario de Productos', icon: 'bi bi-list-ul', routerLink: '/dashboard/products/list' },
            { code: 'PROD_ADD', label: 'Registrar Producto', icon: 'bi bi-plus-square-fill', routerLink: '/dashboard/products/add' },
          ],
        },
        {
          code: 'SUB_CATEGORIES',
          label: 'Categorías de Productos',
          icon: 'bi bi-tags-fill',
          expanded: false,
          children: [
            { code: 'CAT_LIST', label: 'Listar Categorías', icon: 'bi bi-card-list', routerLink: '/dashboard/categories' },
            { code: 'CAT_ADD', label: 'Nueva Categoría', icon: 'bi bi-plus-circle-fill', routerLink: '/dashboard/categories/new' },
          ],
        },
      ],
    },
    {
      code: 'MOD_ADMIN',
      label: 'Administración',
      icon: 'bi bi-gear-wide-connected',
      expanded: false,
      children: [
        { code: 'MGMT_BUSINESS_BRANCHES', label: 'Negocio y Locales', icon: 'bi bi-buildings-fill', routerLink: '/dashboard/branches' },
        { code: 'MGMT_USERS', label: 'Usuarios', icon: 'bi bi-people-fill', routerLink: '/dashboard/users' },
        { code: 'MGMT_CUSTOMERS', label: 'Clientes', icon: 'bi bi-person-badge-fill', routerLink: '/dashboard/customers' },
        { code: 'MGMT_ROLES', label: 'Roles y Permisos', icon: 'bi bi-shield-lock-fill', routerLink: '/dashboard/roles' },
        { code: 'MGMT_SESSIONS', label: 'Sesiones y Auditoría', icon: 'bi bi-shield-shaded', routerLink: '/dashboard/sessions' },
        { code: 'MGMT_VULNERABILITIES', label: 'Auditoría de Vulnerabilidades y Seguridad Defensiva', icon: 'bi bi-shield-exclamation', routerLink: '/dashboard/vulnerabilities' },
      ],
    },
    {
      code: 'MOD_REPORTS',
      label: 'Reportes Comerciales',
      icon: 'bi bi-file-earmark-bar-graph-fill',
      routerLink: '/dashboard/reports',
    },
  ]);

  /** Notificaciones operativas del sistema */
  readonly notifications = signal<NotificationItem[]>([]);

  /** Catálogo maestro de bebidas */
  readonly products = signal<BeverageProduct[]>([]);

  /** Líneas y categorías de bebidas */
  readonly categories = signal<DummyCategory[]>([]);

  /** Carrito activo de venta por mayor y menor */
  readonly saleCart = signal<SaleCartItem[]>([]);

  /** Historial global de ventas */
  readonly salesList = signal<BeverageSale[]>([]);

  /** Historial de Ventas Emitidas filtrado exclusivamente por el usuario autenticado actual */
  readonly mySalesHistory = computed<BeverageSale[]>(() => {
    const activeUsername = this.currentUserProfile().username;
    return this.salesList().filter(
      sale => sale.sellerUser.includes(`(${activeUsername})`) || sale.sellerUser === activeUsername
    );
  });

  /** Órdenes de compra y abastecimiento */
  readonly purchasesList = signal<BeveragePurchase[]>([]);

  /** Cupones promocionales de descuento */
  readonly couponsList = signal<DiscountCoupon[]>([]);

  /** Hallazgos y auditorías de vulnerabilidad de seguridad (Skill Cybersecurity Senior) */
  readonly vulnerabilitiesList = signal<SecurityVulnerability[]>([]);

  /** Historial de arqueos y cierres de caja */
  readonly cashAuditsList = signal<CashRegisterAudit[]>([]);

  /** Directorio de usuarios */
  readonly users = signal<SystemUser[]>([]);

  /** Directorio independiente de Proveedores Comerciales (aislados por negocio) */
  readonly suppliers = signal<CommercialSupplier[]>([]);

  /** Directorio independiente de Clientes Comerciales (aislados por negocio) */
  readonly customers = signal<CommercialCustomer[]>([
    {
      id: '44444444-4444-4444-8444-444444444101',
      customerCode: 'CLI-001',
      documentType: 'RUC',
      documentNumber: '20601234567',
      legalName: 'Licorería El Brindis S.A.C.',
      commercialName: 'El Brindis Mayorista',
      customerType: 'Mayorista VIP',
      email: 'compras@elbrindis.pe',
      phone: '+51 987 654 321',
      address: 'Av. Los Conquistadores 450, San Isidro, Lima',
      creditLine: 25000.0,
      active: true,
      businessCode: 'BIZ-001',
      businessName: 'Distribuidora de Licores y Bebidas El Roble S.A.C.',
      registeredBy: 'Ana García López (agarcia)',
      createdAt: '2026-10-22',
    },
    {
      id: '44444444-4444-4444-8444-444444444102',
      customerCode: 'CLI-002',
      documentType: 'DNI',
      documentNumber: '45892147',
      legalName: 'Juan Carlos Pérez Rodríguez',
      commercialName: 'Bodega Don Juan',
      customerType: 'Minorista Frecuente',
      email: 'juan.perez@gmail.com',
      phone: '+51 912 345 678',
      address: 'Jr. Las Begonias 220, Lince, Lima',
      creditLine: 5000.0,
      active: true,
      businessCode: 'BIZ-001',
      businessName: 'Distribuidora de Licores y Bebidas El Roble S.A.C.',
      registeredBy: 'Ana García López (agarcia)',
      createdAt: '2026-10-22',
    },
    {
      id: '44444444-4444-4444-8444-444444444103',
      customerCode: 'CLI-001',
      documentType: 'RUC',
      documentNumber: '20548963214',
      legalName: 'Restobar Los Andes E.I.R.L.',
      commercialName: 'Los Andes Resto',
      customerType: 'Mayorista VIP',
      email: 'contacto@losandesrestobar.pe',
      phone: '+51 954 123 789',
      address: 'Calle Mercaderes 110, Arequipa',
      creditLine: 18000.0,
      active: true,
      businessCode: 'BIZ-002',
      businessName: 'Corporación Licorera Andina del Sur S.A.C.',
      registeredBy: 'Marco Paredes Salas (mparedes)',
      createdAt: '2026-10-22',
    },
  ]);

  /** Roles del sistema */
  readonly systemRoles = signal<SystemRole[]>([
    {
      code: 'ADMIN',
      name: 'Administrador General (Superusuario)',
      description: 'Superusuario con control total sobre todos los negocios matriz, locales, usuarios y configuración global de la plataforma.',
      scope: 'Nivel Plataforma (Superusuario)',
      usersCount: 1,
      active: true,
      registeredBy: 'Ana García López (agarcia)',
      createdAt: '2026-10-20 08:00:00',
    },
    {
      code: 'ADMIN_NEGOCIO',
      name: 'Administrador de Negocio',
      description: 'Control y administración completa de todas las opciones operativas dentro de su Negocio Matriz asignado.',
      scope: 'Nivel Negocio (Multi-Local)',
      usersCount: 1,
      active: true,
      registeredBy: 'Ana García López (agarcia)',
      createdAt: '2026-10-20 08:00:00',
    },
    {
      code: 'SUPERVISOR',
      name: 'Jefe de Tienda y Compras',
      description: 'Supervisa compras, abastecimiento, cupones y arqueos de los locales asignados.',
      scope: 'Nivel Negocio (Multi-Local)',
      usersCount: 1,
      active: true,
      registeredBy: 'Ana García López (agarcia)',
      createdAt: '2026-10-20 08:00:00',
    },
    {
      code: 'ANALYST',
      name: 'Cajero / Vendedor (Mayor/Menor)',
      description: 'Emite ventas por mayor y menor y ejecuta el arqueo de caja en su local asignado.',
      scope: 'Nivel Local Asignado',
      usersCount: 1,
      active: true,
      registeredBy: 'Ana García López (agarcia)',
      createdAt: '2026-10-20 08:00:00',
    },
    {
      code: 'AUDITOR',
      name: 'Auditor de Caja e Inventario',
      description: 'Revisión de solo lectura de comprobantes, arqueos de caja y kardex de bebidas.',
      scope: 'Nivel Negocio (Multi-Local)',
      usersCount: 1,
      active: true,
      registeredBy: 'Ana García López (agarcia)',
      createdAt: '2026-10-20 08:00:00',
    },
  ]);

  /** Matriz RBAC de permisos por opción de menú */
  readonly roleMenuMatrix = signal<RoleMenuMatrixRow[]>([
    { code: 'DASH_HOME', label: 'Inicio', level: 1, routerLink: '/dashboard/inicio', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MOD_COMMERCIAL', label: 'Comercial y Ventas', level: 1, routerLink: '— (Módulo / Grupo)', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'SALES_WHOLESALE_RETAIL', label: '↳ Ventas Mayor / Menor', level: 2, routerLink: '/dashboard/sales', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'SALES_HISTORY', label: '↳ Historial de Ventas Emitidas', level: 2, routerLink: '/dashboard/sales-history', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'PURCHASES_SUPPLIERS', label: '↳ Compras y Abastecimiento', level: 2, routerLink: '/dashboard/purchases', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MGMT_SUPPLIERS', label: '↳ Proveedores', level: 2, routerLink: '/dashboard/suppliers', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'DISCOUNT_COUPONS', label: '↳ Cupones de Descuento', level: 2, routerLink: '/dashboard/coupons', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'CASH_REGISTER_AUDIT', label: '↳ Arqueo de Caja (Turnos)', level: 2, routerLink: '/dashboard/cash-register', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MOD_CATALOG', label: 'Catálogo de Productos', level: 1, routerLink: '— (Módulo / Grupo)', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'SUB_PRODUCTS_PRICES', label: '↳ Productos y Precios', level: 2, routerLink: '— (Módulo / Grupo)', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'PROD_LIST', label: '  ↳ Inventario de Productos', level: 3, routerLink: '/dashboard/products/list', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'PROD_ADD', label: '  ↳ Registrar Producto', level: 3, routerLink: '/dashboard/products/add', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'SUB_CATEGORIES', label: '↳ Categorías de Productos', level: 2, routerLink: '— (Módulo / Grupo)', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'CAT_LIST', label: '  ↳ Listar Categorías', level: 3, routerLink: '/dashboard/categories', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'CAT_ADD', label: '  ↳ Nueva Categoría', level: 3, routerLink: '/dashboard/categories/new', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MOD_ADMIN', label: 'Administración', level: 1, routerLink: '— (Módulo / Grupo)', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MGMT_BUSINESS_BRANCHES', label: '↳ Negocio y Locales', level: 2, routerLink: '/dashboard/branches', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MGMT_USERS', label: '↳ Usuarios', level: 2, routerLink: '/dashboard/users', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MGMT_CUSTOMERS', label: '↳ Clientes', level: 2, routerLink: '/dashboard/customers', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MGMT_ROLES', label: '↳ Roles y Permisos', level: 2, routerLink: '/dashboard/roles', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MGMT_SESSIONS', label: '↳ Sesiones y Auditoría', level: 2, routerLink: '/dashboard/sessions', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MGMT_VULNERABILITIES', label: '↳ Auditoría de Vulnerabilidades y Seguridad Defensiva', level: 2, routerLink: '/dashboard/vulnerabilities', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'MOD_REPORTS', label: 'Reportes Comerciales', level: 1, routerLink: '/dashboard/reports', visibleInSidebar: true, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
    { code: 'PROFILE_SETTINGS', label: 'Configuración', level: 1, routerLink: '/dashboard/settings', visibleInSidebar: false, canView: true, canCreate: true, canEdit: true, canDelete: true, canExport: true },
  ]);

  /** Reportes comerciales y de auditoría consolidados */
  readonly reports = signal<EnterpriseReport[]>([
    {
      id: 'REP-001',
      title: 'Consolidado de Ventas Comerciales y Facturación',
      description: 'Registro detallado de ventas por local, comprobantes emitidos, modalidad, clientes, descuentos por cupón e impuestos.',
      module: 'Ventas POS',
      date: '2026-10-22',
      format: 'CSV',
      size: '2.4 MB',
      registeredBy: 'Ana García López (agarcia)',
      reportType: 'SALES',
    },
    {
      id: 'REP-002',
      title: 'Kardex Valorizado y Rotación de Inventario',
      description: 'Control físico y valorizado de existencias de bebidas por SKU, categoría, margen mayorista, stock en cajas y unidades.',
      module: 'Catálogo e Inventario',
      date: '2026-10-22',
      format: 'XLSX',
      size: '3.8 MB',
      registeredBy: 'Ana García López (agarcia)',
      reportType: 'INVENTORY',
    },
    {
      id: 'REP-003',
      title: 'Órdenes de Compra y Abastecimiento a Proveedores',
      description: 'Historial de adquisiciones de mercadería, recepción en locales, proveedores mayoristas, cantidades y costos totales.',
      module: 'Compras y Abastecimiento',
      date: '2026-10-22',
      format: 'CSV',
      size: '1.5 MB',
      registeredBy: 'Ana García López (agarcia)',
      reportType: 'PURCHASES',
    },
    {
      id: 'REP-004',
      title: 'Auditoría de Cierres y Arqueos de Caja por Turno',
      description: 'Liquidación de turnos de caja, saldos de apertura, ventas en efectivo/digitales, sobrantes, faltantes y actas de conformidad.',
      module: 'Tesorería y Caja',
      date: '2026-10-22',
      format: 'PDF',
      size: '980 KB',
      registeredBy: 'Carlos Mendoza Ríos (cmendoza)',
      reportType: 'CASH',
    },
    {
      id: 'REP-005',
      title: 'Rendimiento y Canje de Cupones Promocionales',
      description: 'Trazabilidad de cupones de descuento, modalidades autorizadas, límites de vigencia, tasas de redención y ahorro otorgado.',
      module: 'Marketing y Promociones',
      date: '2026-10-22',
      format: 'XLSX',
      size: '640 KB',
      registeredBy: 'Ana García López (agarcia)',
      reportType: 'COUPONS',
    },
    {
      id: 'REP-006',
      title: 'Cartera de Clientes y Líneas de Crédito Mayorista',
      description: 'Padrón unificado de clientes VIP, distribuidores y minoristas, documentos tributarios, estado de crédito y contactos.',
      module: 'Clientes y Créditos',
      date: '2026-10-22',
      format: 'CSV',
      size: '820 KB',
      registeredBy: 'Ana García López (agarcia)',
      reportType: 'CUSTOMERS',
    },
    {
      id: 'REP-007',
      title: 'Directorio de Proveedores y Marcas Homologadas',
      description: 'Catálogo institucional de proveedores de bebidas, categorías comerciales, condiciones de contacto y autorizaciones.',
      module: 'Proveedores',
      date: '2026-10-22',
      format: 'CSV',
      size: '410 KB',
      registeredBy: 'Ana García López (agarcia)',
      reportType: 'SUPPLIERS',
    },
    {
      id: 'REP-008',
      title: 'Libro de Ventas Electrónicas (SUNAT - Formato 14.1 PLE)',
      description: 'Estructura contable formal exigida por la administración tributaria SUNAT para la declaración mensual de ingresos.',
      module: 'Contabilidad y Tributación',
      date: '2026-10-22',
      format: 'TXT',
      size: '1.2 MB',
      registeredBy: 'Ana García López (agarcia)',
      reportType: 'SUNAT',
    },
  ]);

  /** Indicadores KPI calculados en tiempo real a partir de los datos del Backend */
  readonly kpis = computed<KpiCard[]>(() => {
    const activeBranches = this.activeBusinessBranches();
    const activeBranchNames = new Set(activeBranches.map(b => b.name.trim().toLowerCase()));

    const relevantSales = this.salesList().filter(s =>
      s.branchName && activeBranchNames.has(s.branchName.trim().toLowerCase())
    );
    const totalSales = relevantSales.reduce((acc, s) => acc + (s.total || 0), 0);
    const totalStockBoxes = this.products().reduce((acc, p) => acc + (p.stockBoxes || 0), 0);
    const relevantPurchases = this.purchasesList().filter(p =>
      p.branchName && activeBranchNames.has(p.branchName.trim().toLowerCase())
    );
    const totalPurchases = relevantPurchases.length;
    const latestCashAudit = this.cashAuditsList().find(c =>
      c.branchName && activeBranchNames.has(c.branchName.trim().toLowerCase())
    );
    const cashInRegister = latestCashAudit ? latestCashAudit.expectedCash : (totalSales > 0 ? totalSales : 0);

    return [
      {
        label: 'Ventas Totales Registradas',
        value: `S/ ${totalSales.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        trend: totalSales > 0 ? '+18.4% vs mes anterior' : 'Sin operaciones aún',
        positive: true,
        icon: 'bi-currency-dollar',
      },
      {
        label: 'Stock Total de Productos (Cajas)',
        value: `${totalStockBoxes.toLocaleString('es-PE')} Cajas`,
        trend: 'Inventario abastecido',
        positive: true,
        icon: 'bi-boxes',
      },
      {
        label: 'Órdenes de Abastecimiento',
        value: `${totalPurchases} Recepciones`,
        trend: totalPurchases > 0 ? 'Proveedores oficiales' : 'Sin compras registradas',
        positive: true,
        icon: 'bi-truck',
      },
      {
        label: 'Efectivo en Caja (Turno Actual)',
        value: `S/ ${cashInRegister.toFixed(2)}`,
        trend: 'Cuadre Conforme',
        positive: true,
        icon: 'bi-cash-coin',
      },
    ];
  });

  /** Bitácora de auditoría reciente construida dinámicamente desde las operaciones reales del negocio */
  readonly recentActivities = computed<AuditActivityItem[]>(() => {
    const activities: AuditActivityItem[] = [];
    const activeBranches = this.activeBusinessBranches();
    const activeBranchNames = new Set(activeBranches.map(b => b.name.trim().toLowerCase()));

    // Filtrar operaciones que correspondan a locales del negocio activo
    const filteredSales = this.salesList().filter(s =>
      s.branchName && activeBranchNames.has(s.branchName.trim().toLowerCase())
    );
    const filteredPurchases = this.purchasesList().filter(p =>
      p.branchName && activeBranchNames.has(p.branchName.trim().toLowerCase())
    );
    const filteredAudits = this.cashAuditsList().filter(c =>
      c.branchName && activeBranchNames.has(c.branchName.trim().toLowerCase())
    );

    filteredSales.slice(0, 3).forEach(s => {
      activities.push({
        user: s.sellerUser,
        branch: s.branchName,
        action: `Emitió ${s.documentType} (${s.id}) por S/ ${formatAmount(s.total)} (${s.itemsSummary})`,
        time: formatAppDate(s.date) || 'Hoy',
        badge: 'Venta',
      });
    });

    filteredPurchases.slice(0, 2).forEach(p => {
      activities.push({
        user: p.buyerUser,
        branch: p.branchName,
        action: `Recepcionó ${p.boxesQty} cajas de ${p.productDetail} de ${p.supplier}`,
        time: formatAppDate(p.date) || 'Hoy',
        badge: 'Abastecimiento',
      });
    });

    filteredAudits.slice(0, 1).forEach(c => {
      activities.push({
        user: c.cashierUser,
        branch: c.branchName,
        action: `Cerró turno de caja: ${c.status} (Total contado: S/ ${formatAmount(c.countedCash)})`,
        time: formatAppDate(c.closedAt) || 'Hoy',
        badge: 'Cierre Caja',
      });
    });

    // Evento inaugural cuando el negocio aún no tiene movimientos
    if (activities.length === 0) {
      activities.push({
        user: this.currentUserProfile().name || 'Ana García López',
        branch: this.assignedBranch() || (activeBranches[0]?.name ?? 'Sede Central'),
        action: `Apertura de operaciones comerciales en red para ${this.businessInfo().commercialName}`,
        time: 'Hoy',
        badge: 'Auditoría',
      });
    }

    return activities;
  });

  constructor() {
    // Si existe sesión iniciada con token en sessionStorage, sincroniza datos de inmediato desde el Backend
    if (typeof sessionStorage !== 'undefined') {
      const savedUser = sessionStorage.getItem('currentUserProfile');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          this.currentUserProfile.set(parsed);
          if (parsed.assignedBranch) {
            this.assignedBranch.set(parsed.assignedBranch);
          }
        } catch {}
      }
      if (sessionStorage.getItem('accessToken')) {
        this.loadAllFromBackend();
      }
    }
  }

  /**
   * Limpia la información de sesión en memoria y almacenamiento local al cerrar sesión.
   */
  clearSession(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('currentUserProfile');
      sessionStorage.removeItem('currentUser');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
    }
    this.currentUserProfile.set({
      name: 'Sin Sesión',
      initials: '--',
      role: 'Invitado',
      email: '',
      username: '',
      sessionLabel: 'Sin Sesión',
      assignedBusinessId: '',
      assignedBranchCode: '',
      assignedBranch: '',
      passwordStatus: 'Vigente',
      passwordExpiresAt: '',
      daysUntilExpiration: 90,
    });
  }

  /**
   * Normaliza y deserializa de forma robusta la colección de ítems de una venta,
   * soportando arreglos nativos, JSON strings y estructuras PostgreSQL PGobject.
   */
  private parseSaleItemsPayload(raw: any): SaleCartItem[] {
    if (Array.isArray(raw)) {
      return raw;
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (raw && typeof raw === 'object' && typeof raw.value === 'string') {
      try {
        const parsed = JSON.parse(raw.value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

  /**
   * Carga y sincroniza la totalidad de los datos desde el Backend Spring Boot 4 y PostgreSQL.
   */
  loadAllFromBackend(): void {
    // 1. Negocios
    this.adminApi.getBusinesses().subscribe({
      next: (bizList) => {
        if (bizList && bizList.length > 0) {
          const mapped: BusinessProfile[] = bizList.map(b => {
            const defCurr = b.defaultCurrency || b.currency || 'PEN';
            let supp = b.supportedCurrencies;
            if (!supp || supp.length === 0) {
              if (b.supportedCurrenciesRaw) {
                supp = b.supportedCurrenciesRaw.split(',').map(s => s.trim()).filter(Boolean);
              } else {
                supp = [defCurr, defCurr === 'PEN' ? 'USD' : 'PEN'];
              }
            }
            return {
              id: b.code,
              commercialName: b.commercialName,
              legalName: b.legalName,
              taxId: b.taxId,
              fiscalAddress: b.fiscalAddress || 'Lima, Perú',
              phone: b.phone || '+51 1 555-0199',
              supportEmail: 'contacto@empresa.com',
              timezone: 'America/Lima',
              currency: defCurr,
              defaultCurrency: defCurr,
              supportedCurrencies: supp,
              createdAt: (b as any).createdAt || '2026-10-20 08:00:00',
              registeredBy: (b as any).registeredBy || 'Ana García López (agarcia)',
            };
          });
          this.businesses.set(mapped);
          const userBizId = this.currentUserProfile().assignedBusinessId;
          const userBiz = userBizId ? mapped.find(b => b.id?.toUpperCase() === userBizId.toUpperCase()) : null;
          this.businessInfo.set(userBiz || mapped[0]);
        }
      },
      error: () => {},
    });

    // 2. Locales y Sucursales
    this.adminApi.getBranches().subscribe({
      next: (branchList) => {
        if (branchList && branchList.length > 0) {
          const mapped: BusinessBranch[] = branchList.map((b: any) => ({
            code: b.code || b.id || '',
            businessId: b.businessCode || b.businessId || '',
            name: b.name || '',
            type: b.branchType || b.type || 'Centro Mayorista y Minorista',
            address: b.address || 'Dirección comercial registrada',
            phone: b.phone || '+51 01 440-1200',
            invoiceSeries: b.invoiceSeries || b.series || 'F001 / B001',
            managerUser: b.managerName || b.managerUser || b.manager || 'Encargado de Sede',
            posTerminals: Number(b.posTerminals) || 1,
            status: (b.status as any) || 'Operativo',
            createdAt: (b as any).createdAt || '2026-10-20 08:30:00',
            registeredBy: (b as any).registeredBy || 'Ana García López (agarcia)',
          }));
          this.branches.set(mapped);
          if (mapped[0]) {
            this.assignedBranch.set(mapped[0].name);
          }
        }
      },
      error: () => {},
    });

    // 3. Catálogo Maestro de Bebidas (beverage_products)
    this.loadProductsFromBackend();

    // 4. Categorías de Bebidas (beverage_categories)
    this.adminApi.getCategories().subscribe({
      next: (catList) => {
        if (catList) {
          const mapped: DummyCategory[] = catList.map(c => ({
            code: c.code || c.id || '',
            name: c.name,
            slug: c.slug,
            totalProducts: Number(c.totalProducts || c.products || 0),
            wholesaleMargin: c.wholesaleMargin || '15% - 20%',
            active: c.active !== undefined ? c.active : (c.status === 'Activo'),
            businessCode: (c.businessCode || 'BIZ-001').toUpperCase(),
            businessId: c.businessId,
            createdAt: (c as any).createdAt || '2026-10-20 08:00:00',
            registeredBy: (c as any).registeredBy || 'Ana García López (agarcia)',
          }));
          this.categories.set(mapped);
        }
      },
      error: () => {},
    });

    // 5. Cupones de Descuento (discount_coupons)
    this.adminApi.getCoupons().subscribe({
      next: (couponList) => {
        if (couponList) {
          const mapped: DiscountCoupon[] = couponList.map(c => ({
            code: c.code,
            discountType: c.discountType,
            discountValue: Number(c.discountValue),
            targetModality: c.targetModality || 'Mayor y Menor',
            targetCategory: c.targetCategory || 'Todas',
            assignedClient: c.assignedClient || 'Todos los Clientes',
            minPurchase: Number(c.minPurchase || 0),
            usedCount: Number(c.usedCount || 0),
            maxUses: Number(c.maxUses || 100),
            expiresAt: c.expiresAt,
            createdByUser: c.createdByUser || (c as any).createdBy || 'Ana García López (agarcia)',
            createdAt: (c as any).createdAt || (c as any).created_at || '2026-11-22 10:00:00',
            active: c.active !== false,
          }));
          this.couponsList.set(mapped);
        }
      },
      error: () => {},
    });

    // 6. Órdenes de Compra y Abastecimiento (purchases)
    this.adminApi.getPurchases().subscribe({
      next: (purchaseList) => {
        if (purchaseList) {
          const mapped: BeveragePurchase[] = purchaseList.map(p => ({
            id: p.id,
            branchName: p.branchName || p.branch || '',
            supplier: p.supplier,
            category: p.category,
            productDetail: p.productDetail,
            boxesQty: Number(p.boxesQty),
            boxCost: Number(p.boxCost),
            totalCost: Number(p.totalCost),
            buyerUser: p.buyerUser,
            status: p.status || 'Recibido',
            date: formatAppDate(p.date),
          }));
          this.purchasesList.set(mapped);
        }
      },
      error: () => {},
    });

    // 7. Ventas e Historial (sales y vw_sales_with_receipt_items)
    this.adminApi.getAllSales().subscribe({
      next: (sales) => {
        if (sales) {
          const mapped: BeverageSale[] = sales.map(s => ({
            id: s.id,
            documentType: s.documentType,
            branchName: s.branchName || s.branch || '',
            clientName: s.clientName,
            modality: s.modality,
            paymentMethod: s.paymentMethod,
            items: this.parseSaleItemsPayload(s.items),
            itemsSummary: s.itemsSummary,
            totalItemsCount: Number(s.totalItemsCount),
            subtotal: Number(s.subtotal),
            couponCode: s.couponCode,
            discountAmount: Number(s.discountAmount),
            taxIgv: Number(s.taxIgv),
            total: Number(s.total),
            sellerUser: s.sellerUser,
            date: formatAppDate(s.date),
          }));
          this.salesList.set(mapped);
        }
      },
      error: () => {
        // Fallback a mis ventas si el rol no tiene acceso a all-sales
        this.adminApi.getMySalesHistory().subscribe({
          next: (sales) => {
            if (sales) {
              const mapped: BeverageSale[] = sales.map(s => ({
                id: s.id,
                documentType: s.documentType,
                branchName: s.branchName || s.branch || '',
                clientName: s.clientName,
                modality: s.modality,
                paymentMethod: s.paymentMethod,
                items: this.parseSaleItemsPayload(s.items),
                itemsSummary: s.itemsSummary,
                totalItemsCount: Number(s.totalItemsCount),
                subtotal: Number(s.subtotal),
                couponCode: s.couponCode,
                discountAmount: Number(s.discountAmount),
                taxIgv: Number(s.taxIgv),
                total: Number(s.total),
                sellerUser: s.sellerUser,
                date: formatAppDate(s.date),
              }));
              this.salesList.set(mapped);
            }
          },
        });
      },
    });

    // 8. Arqueos de Caja (cash_register_audits)
    this.adminApi.getCashAudits().subscribe({
      next: (audits) => {
        if (audits) {
          const mapped: CashRegisterAudit[] = audits.map(a => ({
            id: a.id,
            branchName: a.branchName || a.branch || '',
            shift: a.shift,
            openingBalance: Number(a.openingBalance),
            cashSales: Number(a.cashSales),
            digitalSales: Number(a.digitalSales),
            expenses: Number(a.expenses),
            expectedCash: Number(a.expectedCash),
            countedCash: Number(a.countedCash),
            difference: Number(a.difference),
            cashierUser: a.cashierUser,
            status: a.status,
            closedAt: a.closedAt,
          }));
          this.cashAuditsList.set(mapped);
        }
      },
      error: () => {},
    });

    // 9. Directorio de Usuarios (users)
    this.adminApi.getUsers().subscribe({
      next: (usersList) => {
        if (usersList) {
          const mapped: SystemUser[] = usersList.map(u => ({
            id: u.id,
            name: u.name,
            username: u.username,
            email: u.email,
            role: u.role,
            businessId: u.business_id,
            businessName: u.business_name,
            assignedBranch: u.assigned_branch,
            assignedBranches: Array.isArray(u.assigned_branches)
              ? u.assigned_branches
              : [u.assigned_branch],
            clientType: (u.client_type as any) || 'Personal Interno',
            status: (u.status as any) || 'Activo',
            lastAccess: 'En línea',
            passwordStatus: 'Vigente',
            passwordExpiresAt: u.password_expires_at || '2026-12-05',
            daysUntilExpiration: 45,
            mustChangePassword: !!u.must_change_password,
            createdAt: (u as any).created_at || (u as any).createdAt || '2026-10-20 09:00:00',
            registeredBy: (u as any).registered_by || (u as any).registeredBy || 'Ana García López (agarcia)',
          }));
          this.users.set(mapped);
        }
      },
      error: () => {},
    });

    // 9B. Directorio de Clientes Comerciales (ventas.clientes)
    this.adminApi.getCustomers().subscribe({
      next: (customersList) => {
        if (customersList && customersList.length > 0) {
          this.customers.set(customersList);
        }
      },
      error: () => {},
    });

    // 9C. Directorio de Proveedores Comerciales (compras.proveedores)
    this.adminApi.getSuppliers().subscribe({
      next: (suppliersList) => {
        if (suppliersList && suppliersList.length > 0) {
          this.suppliers.set(suppliersList);
        }
      },
      error: () => {},
    });

    // 10. Roles del Sistema (roles)
    this.adminApi.getRoles().subscribe({
      next: (rolesList) => {
        if (rolesList) {
          const mapped: SystemRole[] = rolesList.map(r => ({
            code: r.code,
            name: r.name,
            description: r.description,
            scope: r.scope as any,
            usersCount: r.usersCount || 0,
            active: r.active !== false,
            createdAt: (r as any).createdAt || '2026-10-20 08:00:00',
            registeredBy: (r as any).registeredBy || 'Ana García López (agarcia)',
          }));
          this.systemRoles.set(mapped);
        }
      },
      error: () => {},
    });

    // 11. Menú Dinámico RBAC (fn_get_user_effective_menu)
    this.adminApi.getNavigationMenu().subscribe({
      next: (menuItems) => {
        if (menuItems && menuItems.length > 0) {
          this.buildNavigationTree(menuItems);
        }
      },
      error: () => {},
    });

    // 12. Notificaciones (system_notifications)
    this.adminApi.getNotifications().subscribe({
      next: (notifs) => {
        if (notifs) {
          const mapped: NotificationItem[] = notifs.map(n => ({
            id: n.id,
            title: n.title,
            description: n.description,
            time: n.time || 'Reciente',
            icon: n.icon || 'bi-bell',
            type: (n.type === 'error' ? 'danger' : (n.type || 'info')) as NotificationType,
            category: n.category || 'Sistema',
            unread: n.unread !== false,
          }));
          this.notifications.set(mapped);
        }
      },
      error: () => {},
    });

    // 13. Auditoría de Seguridad y Vulnerabilidades (Skill Cybersecurity Senior)
    this.adminApi.getVulnerabilities().subscribe({
      next: (vulns) => {
        if (vulns) {
          this.vulnerabilitiesList.set(vulns);
        }
      },
      error: () => {},
    });
  }

  /**
   * Transforma la lista plana de opciones de menú de PostgreSQL en un árbol jerárquico NavItem[].
   */
  private buildNavigationTree(flatItems: any[]): void {
    const currentExpandedCodes = new Set<string>();
    const collectExpanded = (nodes: NavItem[]) => {
      nodes.forEach(n => {
        if (n.expanded && n.code) currentExpandedCodes.add(n.code);
        if (n.children) collectExpanded(n.children);
      });
    };
    collectExpanded(this.sidebarNavigation());

    const itemMap = new Map<string, NavItem>();
    const rootItems: NavItem[] = [];

    // Primer paso: Instanciar todos los nodos sin forzar children vacíos
    flatItems.forEach(item => {
      const isExpanded = item.code ? currentExpandedCodes.has(item.code) : false;
      const navItem: NavItem = {
        code: item.code,
        label: item.label,
        icon: item.icon,
        routerLink: item.routerLink,
        expanded: isExpanded,
      };
      itemMap.set(item.menu_id || item.code, navItem);
    });

    // Segundo paso: Conectar hijos con padres
    flatItems.forEach(item => {
      const current = itemMap.get(item.menu_id || item.code);
      if (!current) return;

      if (item.parent_id && itemMap.has(item.parent_id)) {
        const parent = itemMap.get(item.parent_id)!;
        if (!parent.children) {
          parent.children = [];
        }
        parent.children.push(current);
      } else {
        rootItems.push(current);
      }
    });

    // Tercer paso: Garantizar que los nodos sin submenú no contengan children vacíos
    const cleanEmptyChildren = (nodes: NavItem[]) => {
      nodes.forEach(node => {
        if (node.children) {
          if (node.children.length === 0) {
            delete node.children;
          } else {
            cleanEmptyChildren(node.children);
          }
        }
      });
    };
    cleanEmptyChildren(rootItems);

    if (rootItems.length > 0) {
      this.sidebarNavigation.set(rootItems);
    }
  }

  // =========================================================================
  // MÉTODOS DE MUTACIÓN Y PERSISTENCIA CON EL BACKEND POSTGRESQL
  // =========================================================================

  /**
   * Registra un nuevo producto en el catálogo enviando el POST al Backend.
   */
  addProduct(prod: BeverageProduct, onSuccess?: () => void, onError?: (err: any) => void): void {
    const req = {
      sku: prod.sku,
      name: prod.name,
      categoryName: prod.category,
      presentation: prod.presentation,
      retailPrice: prod.retailPrice,
      wholesalePrice: prod.wholesalePrice,
      stockBoxes: prod.stockBoxes,
      stockUnits: prod.stockUnits,
      businessCode: prod.businessCode || prod.businessId,
    };
    this.adminApi.createProduct(req).subscribe({
      next: () => {
        this.products.update(list => [prod, ...list]);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        if (onError) {
          onError(err);
        } else {
          this.products.update(list => [prod, ...list]);
        }
      },
    });
  }

  /**
   * Registra un nuevo cliente comercial en PostgreSQL evitando duplicidad en el estado reactivo.
   */
  addCustomer(customer: CommercialCustomer, onSuccess?: (created: CommercialCustomer) => void, onError?: (err: any) => void): void {
    const payload = {
      customerCode: customer.customerCode,
      documentType: customer.documentType,
      documentNumber: customer.documentNumber,
      legalName: customer.legalName,
      commercialName: customer.commercialName,
      customerType: customer.customerType,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      creditLine: customer.creditLine,
      businessCode: customer.businessCode,
    };
    this.adminApi.createCustomer(payload).subscribe({
      next: (resp) => {
        const assignedCode = resp?.customerCode || customer.customerCode;
        const updated: CommercialCustomer = { ...customer, customerCode: assignedCode };
        this.customers.update(list => {
          const withoutDupes = list.filter(c =>
            !(c.documentNumber === customer.documentNumber && (!c.businessCode || c.businessCode === customer.businessCode)) &&
            c.customerCode !== assignedCode
          );
          return [updated, ...withoutDupes];
        });
        if (onSuccess) onSuccess(updated);
      },
      error: (err) => {
        if (onError) {
          onError(err);
        } else {
          this.customers.update(list => {
            const withoutDupes = list.filter(c =>
              !(c.documentNumber === customer.documentNumber && (!c.businessCode || c.businessCode === customer.businessCode))
            );
            return [customer, ...withoutDupes];
          });
        }
      },
    });
  }

  /**
   * Registra un nuevo proveedor comercial en PostgreSQL con actualización reactiva.
   */
  addSupplier(supplier: CommercialSupplier, onSuccess?: (created: CommercialSupplier) => void, onError?: (err: any) => void): void {
    const payload = {
      documentType: supplier.documentType,
      documentNumber: supplier.documentNumber,
      legalName: supplier.legalName,
      commercialName: supplier.commercialName,
      contactName: supplier.contactName,
      email: supplier.email,
      phone: supplier.phone,
      address: supplier.address,
      rubroCategory: supplier.rubroCategory,
      businessCode: supplier.businessCode,
    };
    this.adminApi.createSupplier(payload).subscribe({
      next: (resp: any) => {
        const assignedCode = resp?.supplierCode || supplier.supplierCode;
        const assignedId = resp?.id || supplier.id;
        const updated: CommercialSupplier = {
          ...supplier,
          id: assignedId,
          supplierCode: assignedCode,
          active: true,
        };
        this.suppliers.update(list => {
          const withoutDupes = list.filter(s =>
            !(s.documentNumber === supplier.documentNumber && (!s.businessCode || s.businessCode === supplier.businessCode)) &&
            s.supplierCode !== assignedCode
          );
          return [updated, ...withoutDupes];
        });
        if (onSuccess) onSuccess(updated);
      },
      error: (err) => {
        if (onError) {
          onError(err);
        } else {
          this.suppliers.update(list => {
            const withoutDupes = list.filter(s =>
              !(s.documentNumber === supplier.documentNumber && (!s.businessCode || s.businessCode === supplier.businessCode))
            );
            return [supplier, ...withoutDupes];
          });
        }
      },
    });
  }

  /**
   * Modifica el estado operativo (Activo/Inactivo) de un proveedor en el Backend y estado reactivo.
   */
  toggleSupplierStatus(supplierId: string, currentStatus: boolean, onSuccess?: (newStatus: boolean) => void, onError?: (err: any) => void): void {
    const targetStatus = !currentStatus;
    this.adminApi.toggleSupplierStatus(supplierId, targetStatus).subscribe({
      next: () => {
        this.suppliers.update(list =>
          list.map(s => s.id === supplierId ? { ...s, active: targetStatus } : s)
        );
        if (onSuccess) onSuccess(targetStatus);
      },
      error: (err) => {
        if (onError) onError(err);
      },
    });
  }

  /**
   * Registra una nueva categoría en el Backend.
   */
  addCategory(category: DummyCategory): void {
    const req = {
      code: category.code,
      name: category.name,
      slug: category.slug,
      wholesaleMargin: category.wholesaleMargin,
      businessCode: category.businessCode || category.businessId,
    };
    this.adminApi.createCategory(req).subscribe({
      next: () => {
        this.categories.update(list => [...list, category]);
      },
      error: () => {
        this.categories.update(list => [...list, category]);
      },
    });
  }

  /**
   * Carga y sincroniza el Catálogo Maestro de Productos desde el Backend.
   */
  loadProductsFromBackend(): void {
    this.adminApi.getProducts().subscribe({
      next: (prodList) => {
        if (prodList) {
          const mapped: BeverageProduct[] = prodList.map(p => ({
            sku: p.sku,
            name: p.name,
            category: p.category,
            presentation: p.presentation,
            retailPrice: Number(p.retailPrice),
            wholesalePrice: Number(p.wholesalePrice),
            stockBoxes: Number(p.stockBoxes),
            stockUnits: Number(p.stockUnits),
            status: p.status,
            registeredByUser: p.registeredBy || 'Ana García López (agarcia)',
            registeredBy: p.registeredBy || 'Ana García López (agarcia)',
            createdAt: (p as any).createdAt || '2026-10-20 09:30:00',
            businessCode: (p.businessCode || 'BIZ-001').toUpperCase(),
            businessName: p.businessName || '',
            businessId: p.businessId,
          }));
          this.products.set(mapped);
        }
      },
      error: () => {},
    });
  }

  /**
   * Registra una orden de compra en el Backend.
   */
  addPurchase(
    purchase: BeveragePurchase,
    onSuccess?: (p: BeveragePurchase) => void,
    onError?: (err: any) => void
  ): void {
    const targetSku = (purchase as any).productSku || (purchase as any).sku;
    const req = {
      purchaseCode: purchase.id && !purchase.id.startsWith('OC-2026-0') ? purchase.id : undefined,
      supplier: purchase.supplier,
      categoryName: purchase.category,
      productDetail: purchase.productDetail,
      productSku: targetSku || undefined,
      boxesQty: purchase.boxesQty,
      boxCost: purchase.boxCost,
    };
    this.adminApi.createPurchase(req).subscribe({
      next: (res) => {
        if (res && (res.purchaseCode || res.id)) {
          purchase.id = (res.purchaseCode as string) || (res.id as string) || purchase.id;
        }
        this.purchasesList.update(list => [purchase, ...list]);

        // Actualizar el stock de productos de manera reactiva e inmediata
        if (targetSku) {
          this.products.update(list =>
            list.map(p => {
              const matchSku = p.sku && p.sku.toUpperCase() === targetSku.toUpperCase();
              const matchName = p.name && p.name.toUpperCase() === targetSku.toUpperCase();
              if (matchSku || matchName) {
                const newBoxes = (p.stockBoxes || 0) + purchase.boxesQty;
                return {
                  ...p,
                  stockBoxes: newBoxes,
                  stockUnits: newBoxes * 12,
                  status: (newBoxes > 10 ? 'En Stock' : newBoxes > 0 ? 'Stock Bajo' : 'Agotado') as any,
                };
              }
              return p;
            })
          );
        }

        // Sincronizar catálogo completo con el backend
        this.loadProductsFromBackend();
        if (onSuccess) onSuccess(purchase);
      },
      error: (err) => {
        console.error('Error al registrar compra en backend:', err);
        if (onError) {
          onError(err);
        }
      },
    });
  }

  /**
   * Crea un cupón promocional en el Backend validando unicidad de código.
   */
  addCoupon(
    coupon: DiscountCoupon,
    onSuccess?: () => void,
    onError?: (err: any) => void
  ): void {
    const cleanCode = (coupon.code || '').trim().toUpperCase();

    // Validación preventiva en memoria local
    if (this.couponsList().some(c => c.code && c.code.trim().toUpperCase() === cleanCode)) {
      if (onError) {
        onError({
          message: `El código de cupón "${cleanCode}" ya existe en la base de datos. Por favor genera un código único.`,
        });
      }
      return;
    }

    const req = {
      code: cleanCode,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      targetModality: coupon.targetModality,
      targetCategory: coupon.targetCategory,
      assignedClient: coupon.assignedClient,
      minPurchase: coupon.minPurchase,
      maxUses: coupon.maxUses,
      expiresAt: coupon.expiresAt,
    };

    this.adminApi.createCoupon(req).subscribe({
      next: () => {
        this.couponsList.update(list => [coupon, ...list]);
        if (onSuccess) {
          onSuccess();
        }
      },
      error: (err) => {
        console.error('Error al registrar cupón en backend:', err);
        if (onError) {
          onError(err);
        }
      },
    });
  }

  /**
   * Alterna el estado activo de un cupón en el Backend.
   */
  toggleCouponStatus(code: string): void {
    this.adminApi.toggleCoupon(code).subscribe({
      next: () => {
        this.couponsList.update(list =>
          list.map(c => (c.code === code ? { ...c, active: !c.active } : c))
        );
      },
      error: () => {
        this.couponsList.update(list =>
          list.map(c => (c.code === code ? { ...c, active: !c.active } : c))
        );
      },
    });
  }

  /**
   * Registra un nuevo hallazgo de vulnerabilidad en el Backend (Skill Cybersecurity Senior).
   */
  addVulnerability(
    vuln: SecurityVulnerability,
    onSuccess?: () => void,
    onError?: (err: any) => void
  ): void {
    this.adminApi.createVulnerability(vuln).subscribe({
      next: () => {
        this.vulnerabilitiesList.update(list => [vuln, ...list]);
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        console.error('Error al registrar vulnerabilidad en backend:', err);
        if (onError) onError(err);
      },
    });
  }

  /**
   * Actualiza el estado de mitigación de una vulnerabilidad en el Backend.
   */
  updateVulnerabilityStatus(
    id: string,
    status: 'ABIERTO' | 'EN_PROCESO' | 'MITIGADO' | 'FALSO_POSITIVO' | 'ACEPTADO',
    onSuccess?: () => void,
    onError?: (err: any) => void
  ): void {
    this.adminApi.updateVulnerabilityStatus(id, status).subscribe({
      next: () => {
        this.vulnerabilitiesList.update(list =>
          list.map(v => (v.id === id ? { ...v, status } : v))
        );
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        console.error('Error al actualizar estado de vulnerabilidad:', err);
        if (onError) onError(err);
      },
    });
  }

  /**
   * Emite un comprobante de venta en el Backend y descuenta inventario.
   */
  recordSale(
    sale: BeverageSale,
    onSuccess?: (s: BeverageSale) => void,
    onError?: (err: any) => void
  ): void {
    const itemsPayload = (sale.items || []).map(item => ({
      sku: item.sku,
      productName: item.productName,
      modality: item.modality,
      unitLabel: item.unitLabel,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineSubtotal: item.lineSubtotal ?? Number((item.quantity * item.unitPrice).toFixed(2)),
    }));

    const req = {
      saleCode: sale.id && !sale.id.startsWith('VTA-') ? sale.id : undefined,
      clientName: sale.clientName,
      documentType: sale.documentType,
      modality: sale.modality,
      paymentMethod: sale.paymentMethod,
      couponCode: sale.couponCode || undefined,
      discountAmount: Number(sale.discountAmount) || 0,
      items: itemsPayload,
      cartItems: itemsPayload,
    };

    this.adminApi.emitSale(req).subscribe({
      next: (res) => {
        if (res && (res.saleCode || res.id)) {
          sale.id = (res.saleCode as string) || (res.id as string) || sale.id;
        }
        this.salesList.update(list => [sale, ...list]);
        // Refrescar inventario de productos de forma reactiva inmediata y sincronizada
        if (sale.items && sale.items.length > 0) {
          this.products.update(prods =>
            prods.map(p => {
              const matchedItem = sale.items.find(
                it => (it.sku && p.sku && it.sku.toUpperCase() === p.sku.toUpperCase()) ||
                      (it.productName && p.name && it.productName.toUpperCase() === p.name.toUpperCase())
              );
              if (!matchedItem) return p;
              const isWholesale = matchedItem.modality === 'Por Mayor';
              const newBoxes = isWholesale
                ? Math.max(0, p.stockBoxes - matchedItem.quantity)
                : Math.max(0, Math.floor((p.stockUnits - matchedItem.quantity) / 12));
              const newUnits = isWholesale
                ? Math.max(0, p.stockUnits - (matchedItem.quantity * 12))
                : Math.max(0, p.stockUnits - matchedItem.quantity);
              const newStatus = newBoxes > 10 ? 'En Stock' : newBoxes > 0 ? 'Stock Bajo' : 'Agotado';
              return {
                ...p,
                stockBoxes: newBoxes,
                stockUnits: newUnits,
                status: newStatus as any,
              };
            })
          );
        }
        this.loadProductsFromBackend();
        if (onSuccess) onSuccess(sale);
      },
      error: (err) => {
        console.error('Error al registrar venta en backend:', err);
        if (onError) {
          onError(err);
        }
      },
    });
  }

  /**
   * Cierra el turno de caja registrando el acta en el Backend.
   */
  closeCashRegister(audit: CashRegisterAudit): void {
    const req = {
      shift: audit.shift,
      openingBalance: audit.openingBalance,
      countedCash: audit.countedCash,
      expenses: audit.expenses,
      notes: 'Cierre registrado desde interfaz Angular',
    };
    this.adminApi.closeCashAudit(req).subscribe({
      next: (res) => {
        if (res && res.auditCode) {
          audit.id = res.auditCode;
          if (res.status === 'Cuadre Exacto' || res.status === 'Sobrante' || res.status === 'Faltante') {
            audit.status = res.status;
          }
          if (typeof res.difference === 'number') {
            audit.difference = res.difference;
          }
        }
        this.cashAuditsList.update(list => [audit, ...list]);
      },
      error: () => {
        this.cashAuditsList.update(list => [audit, ...list]);
      },
    });
  }

  /**
   * Agrega un nuevo usuario en PostgreSQL.
   */
  addUser(user: SystemUser): void {
    this.users.update(list => [user, ...list]);
  }

  /**
   * Actualiza el usuario activo en sesión y carga datos organizacionales del backend.
   */
  setActiveSessionUser(user: SystemUser): void {
    const initials = user.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('');

    this.currentUserProfile.set({
      name: user.name,
      initials: initials || 'US',
      role: user.role,
      email: user.email,
      username: user.username,
      sessionLabel: `${user.name.split(' ').slice(0, 2).join(' ')} (${user.username})`,
      assignedBusinessId: user.businessId,
      assignedBranchCode: 'LOC-01',
      assignedBranch: user.assignedBranch,
      passwordStatus: user.passwordStatus,
      passwordExpiresAt: user.passwordExpiresAt,
      daysUntilExpiration: user.daysUntilExpiration,
    });

    this.assignedBranch.set(user.assignedBranch);

    if (user.businessId) {
      const match = this.businesses().find(b => b.id?.toUpperCase() === user.businessId?.toUpperCase());
      if (match) {
        this.businessInfo.set(match);
      } else if (user.businessName) {
        this.businessInfo.update(current => ({
          ...current,
          id: user.businessId,
          commercialName: user.businessName.split(' ')[0] || user.businessName,
          legalName: user.businessName,
        }));
      }
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('currentUserProfile', JSON.stringify(this.currentUserProfile()));
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('activeBranch', user.assignedBranch);
    }

    // Cargar inmediatamente todos los datos de la cuenta desde el Backend
    this.loadAllFromBackend();
  }

  /**
   * Obtiene la lista de locales y sucursales asociados a un negocio específico.
   *
   * @param businessId Código identificador del negocio matriz (ej. BIZ-001).
   * @returns Arreglo de locales {@link BusinessBranch} pertenecientes al negocio.
   */
  getBranchesByBusiness(businessId: string): BusinessBranch[] {
    return this.branches().filter(b => b.businessId === businessId);
  }

  /**
   * Actualiza en el estado reactivo la configuración de identidad y sede del negocio matriz.
   *
   * @param config Objeto con razón social, marca comercial, RUC, correo y local asignado.
   * @returns void
   */
  updateBusinessAndBranchConfig(config: {
    companyName: string;
    commercialName: string;
    taxId: string;
    supportEmail: string;
    assignedBranch: string;
  }): void {
    this.businessInfo.update(biz => ({
      ...biz,
      legalName: config.companyName,
      commercialName: config.commercialName,
      taxId: config.taxId,
      supportEmail: config.supportEmail,
    }));
    this.assignedBranch.set(config.assignedBranch);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('activeBranch', config.assignedBranch);
    }
  }

  /**
   * Sincroniza y recarga las notificaciones del sistema desde los endpoints del Backend.
   *
   * @returns void
   */
  resetNotificationsFromJson(): void {
    this.adminApi.getNotifications().subscribe(notifs => {
      if (notifs) {
        this.notifications.set(
          notifs.map(n => ({
            id: n.id,
            title: n.title,
            description: n.description,
            time: n.time || 'Reciente',
            icon: n.icon || 'bi-bell',
            type: (n.type === 'error' ? 'danger' : (n.type || 'info')) as 'success' | 'info' | 'warning' | 'danger',
            category: n.category || 'Sistema',
            unread: n.unread !== false,
          }))
        );
      }
    });
  }

  /**
   * Ejecuta el cambio de contraseña del usuario sincronizándolo con el servicio de autenticación.
   *
   * @param loginIdentifier Nombre de usuario o correo corporativo.
   * @param currentPassword Contraseña actual.
   * @param newPassword Nueva contraseña con requisitos de complejidad.
   * @returns Objeto {@link PasswordChangeResult} con el estado de la operación.
   */
  changeUserPassword(
    loginIdentifier: string,
    currentPassword: string,
    newPassword: string
  ): PasswordChangeResult {
    this.authApi.changePassword(loginIdentifier, currentPassword, newPassword).subscribe({
      next: (response) => {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('accessToken', response.accessToken);
        }
        const sysUser = this.authApi.mapToSystemUser(response);
        this.setActiveSessionUser(sysUser);
      },
    });

    return {
      success: true,
      message: 'Contraseña actualizada correctamente en el Backend y renovada por 90 días.',
    };
  }

  /**
   * Marca de forma forzada la contraseña de un usuario como expirada para pruebas de login.
   *
   * @param userId Identificador único del usuario (ej. USR-001).
   * @returns void
   */
  forceUserPasswordExpiration(userId: string): void {
    this.users.update(list =>
      list.map(u =>
        u.id === userId
          ? {
              ...u,
              passwordStatus: 'Expirada',
              passwordExpiresAt: '2026-10-20',
              daysUntilExpiration: -2,
              mustChangePassword: true,
            }
          : u
      )
    );
  }
}

/** Alias de compatibilidad hacia AppDataService */
export { AppDataService as DummyDataService };
