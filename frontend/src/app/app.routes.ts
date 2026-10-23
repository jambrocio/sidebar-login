import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './core/guards/auth.guard';

/**
 * Definición de rutas del Sistema de Distribución y Venta de Bebidas.
 * Cada vista operativa e interfaz administrativa cuenta con su propio
 * componente standalone cargado mediante Lazy Loading (`loadComponent`).
 */
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./pages/inicio/home-view.component').then(m => m.HomeViewComponent),
        data: {
          title: 'Tablero Comercial del Negocio y Locales',
          breadcrumb: 'Inicio',
        },
      },
      {
        path: 'sales',
        loadComponent: () =>
          import('./pages/sales/sales-pos.component').then(m => m.SalesPosComponent),
        data: {
          title: 'Ventas por Mayor y por Menor',
          breadcrumb: 'Ventas Mayor / Menor',
          parent: 'Comercial y Ventas',
        },
      },
      {
        path: 'sales-history',
        loadComponent: () =>
          import('./pages/sales-history/sales-history.component').then(
            m => m.SalesHistoryComponent
          ),
        data: {
          title: 'Historial de Ventas Emitidas por el Usuario',
          breadcrumb: 'Historial de Ventas Emitidas',
          parent: 'Comercial y Ventas',
        },
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./pages/purchases/purchases-view.component').then(
            m => m.PurchasesViewComponent
          ),
        data: {
          title: 'Compras y Abastecimiento de Bebidas',
          breadcrumb: 'Compras y Abastecimiento',
          parent: 'Comercial y Ventas',
        },
      },
      {
        path: 'coupons',
        loadComponent: () =>
          import('./pages/coupons/coupons-view.component').then(
            m => m.CouponsViewComponent
          ),
        data: {
          title: 'Gestión de Cupones de Descuento',
          breadcrumb: 'Cupones de Descuento',
          parent: 'Comercial y Ventas',
        },
      },
      {
        path: 'cash-register',
        loadComponent: () =>
          import('./pages/cash-register/cash-register-view.component').then(
            m => m.CashRegisterViewComponent
          ),
        data: {
          title: 'Arqueo y Cierre de Caja por Local',
          breadcrumb: 'Arqueo de Caja (Turnos)',
          parent: 'Comercial y Ventas',
        },
      },
      { path: 'products', redirectTo: 'products/list', pathMatch: 'full' },
      {
        path: 'products/list',
        loadComponent: () =>
          import('./pages/products/products-list.component').then(
            m => m.ProductsListComponent
          ),
        data: {
          title: 'Inventario de Licores, Cervezas y Gaseosas',
          breadcrumb: 'Inventario Mayor / Menor',
          parent: ['Catálogo de Bebidas', 'Productos y Precios'],
        },
      },
      {
        path: 'products/add',
        loadComponent: () =>
          import('./pages/products/product-add.component').then(
            m => m.ProductAddComponent
          ),
        data: {
          title: 'Registrar Nueva Bebida o Licor',
          breadcrumb: 'Registrar Bebida',
          parent: ['Catálogo de Bebidas', 'Productos y Precios'],
        },
      },
      {
        path: 'categories',
        loadComponent: () =>
          import('./pages/categories/categories-list.component').then(
            m => m.CategoriesListComponent
          ),
        data: {
          title: 'Líneas de Bebidas y Licores',
          breadcrumb: 'Listar Categorías',
          parent: ['Catálogo de Bebidas', 'Productos y Precios', 'Líneas y Categorías'],
        },
      },
      {
        path: 'categories/new',
        loadComponent: () =>
          import('./pages/categories/category-add.component').then(
            m => m.CategoryAddComponent
          ),
        data: {
          title: 'Nueva Línea de Bebidas',
          breadcrumb: 'Nueva Categoría',
          parent: ['Catálogo de Bebidas', 'Productos y Precios', 'Líneas y Categorías'],
        },
      },
      {
        path: 'branches',
        loadComponent: () =>
          import('./pages/branches/branches-management.component').then(
            m => m.BranchesManagementComponent
          ),
        data: {
          title: 'Estructura del Negocio y Locales Asociados',
          breadcrumb: 'Negocio y Locales',
          parent: 'Administración',
        },
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/users-management.component').then(
            m => m.UsersManagementComponent
          ),
        data: {
          title: 'Registro de Usuarios y Asignación de Negocio / Locales',
          breadcrumb: 'Clientes y Usuarios',
          parent: 'Administración',
        },
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./pages/roles/roles-management.component').then(
            m => m.RolesManagementComponent
          ),
        data: {
          title: 'Registro y Administración de Roles y Permisos',
          breadcrumb: 'Roles y Permisos',
          parent: 'Administración',
        },
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./pages/sessions/active-sessions.component').then(
            m => m.ActiveSessionsComponent
          ),
        data: {
          title: 'Sesiones Activas, Auditoría de IP y Control Remoto',
          breadcrumb: 'Sesiones y Auditoría',
          parent: 'Administración',
        },
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports/reports-view.component').then(
            m => m.ReportsViewComponent
          ),
        data: {
          title: 'Reportes de Ventas y Rotación',
          breadcrumb: 'Reportes Comerciales',
        },
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings-view.component').then(
            m => m.SettingsViewComponent
          ),
        data: {
          title: 'Configuración del Negocio y Local Asignado',
          breadcrumb: 'Configuración',
        },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
