# Frontend — Plataforma de Compra y Venta de Bebidas (Angular 21 PWA)

Aplicación Frontend empresarial ubicada en la carpeta `frontend/`, desarrollada con **Angular 21+**, **Standalone Components**, **Signals**, **Lazy Loading (`loadComponent`)**, **PWA (Service Worker + Web Manifest)**, diseño **Responsive** y sistema de temas **Claro / Oscuro**.

---

## 1. Características Funcionales Implementadas

1. **Estructura Multi-Empresa y Multi-Local (`1 Negocio Matriz ➔ N Locales`)**:
   - Administración de Negocios Matriz (`BIZ-001`, `BIZ-002`) y sus Locales asociados (`LOC-01` a `LOC-06`) en `/dashboard/branches`.
2. **Restricción Operativa al Local Asignado**:
   - El usuario autenticado visualiza su **Negocio y Local Asignado** en la barra superior (`NavbarComponent`) y solo puede registrar Ventas, Compras y Arqueos en su local asignado.
3. **Punto de Venta por Mayor y Menor (`/dashboard/sales`)**:
   - Carrito multiproducto que permite combinar bebidas **Por Mayor (Caja/Pack)** y **Por Menor (Unidad)**, calcula subtotal de productos agregados, aplica cupones promocionales y genera la **Vista de Comprobante Electrónico (`Factura` / `Boleta`)** lista para imprimir.
4. **Historial de Ventas Emitidas por Usuario (`/dashboard/sales-history`)**:
   - Opción de menú independiente que filtra y muestra exclusivamente los comprobantes emitidos por el usuario activo en sesión.
5. **Compras y Abastecimiento (`/dashboard/purchases`)**, **Cupones de Descuento (`/dashboard/coupons`)** y **Arqueo de Caja por Turno (`/dashboard/cash-register`)**.
6. **Registro de Usuarios con Asignación de Negocio y Locales (`/dashboard/users`)** y **Administración de Roles y Matriz RBAC (`/dashboard/roles`)**.
7. **Datos Dummy Desacoplados en [`./json/`](./json/README.md)**:
   - Consumidos de forma centralizada por [`DummyDataService`](./src/app/core/services/dummy-data.service.ts) para integrarse sin impacto con el Backend en [`../backend/`](../backend/README.md).

---

## 2. Instalación y Ejecución del Frontend

```bash
cd frontend
npm install
npm start
```

Abre en tu navegador:
```text
http://localhost:4200/
```

---

## 3. Credenciales de Usuarios de Prueba (`/login`)

Sincronizadas con [`./json/users-and-roles.json`](./json/users-and-roles.json) y [`../docs/sql/02_seed_dummy_data.sql`](../docs/sql/02_seed_dummy_data.sql):

| Rol | Correo Electrónico (Usuario) | Contraseña de Prueba | Negocio / Local Principal |
| :--- | :--- | :--- | :--- |
| **Administrador General** *(Recomendado)* | `ana.garcia@empresa.com` | `Admin123*` | El Roble (`BIZ-001`) — Sede Central (Mayorista) |
| **Jefe de Tienda y Compras** | `carlos.mendoza@empresa.com` | `Admin123*` | El Roble (`BIZ-001`) — Tienda Miraflores (Minorista) |
| **Cajero / Vendedor de Local** | `lucia.torres@empresa.com` | `Admin123*` | El Roble (`BIZ-001`) — Tienda Surco (Mayor y Menor) |
| **Auditor de Inventario y Caja** | `miguel.rios@empresa.com` | `Admin123*` | Bebidas del Sur (`BIZ-002`) — Sede Arequipa Cercado |

---

## 4. Estructura Interna de `frontend/`

```text
frontend/
├── .agents/                        # Reglas y Skills del proyecto
├── json/                           # 11 Archivos JSON con datos dummy (sidebar-menu.json, etc.)
├── public/                         # Manifiesto PWA (manifest.webmanifest) y Service Worker (sw.js)
├── src/
│   ├── app/
│   │   ├── auth/login/             # Inicio de Sesión (/login)
│   │   ├── core/
│   │   │   ├── models/             # Modelos de dominio (domain.models.ts)
│   │   │   └── services/           # Servicio reactivo central (dummy-data.service.ts)
│   │   ├── pages/                  # 14 Componentes de página independientes (Lazy Loaded)
│   │   ├── shared/                 # SidebarComponent, NavbarComponent, Breadcrumb, SaleReceiptView
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   └── styles.scss                 # Design Tokens globales (Modo Claro / Modo Oscuro y Responsive)
└── package.json
```

---

## 5. Enlaces Relacionados en el Monorepo

- **Backend Spring Boot 4 (Java 21)**: [`../backend/README.md`](../backend/README.md)
- **Base de Datos PostgreSQL (`sql/`)**: [`../sql/README.md`](../sql/README.md)
- **Plan Maestro del Proyecto**: [`../docs/PLAN_MAESTRO_PROYECTO.md`](../docs/PLAN_MAESTRO_PROYECTO.md)
- **Diagramas C4 y de Flujo**: [`../docs/DIAGRAMAS_C4_Y_FLUJOS.md`](../docs/DIAGRAMAS_C4_Y_FLUJOS.md)
- **Guía de Integración Backend**: [`../docs/backend/README.md`](../docs/backend/README.md)
