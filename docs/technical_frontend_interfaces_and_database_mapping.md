# 🗺️ Mapeo Técnico Integral: Interfaces Frontend, APIs RESTful y Objetos de Base de Datos en Español

> [!TIP] **Diagramas Interactivos Autónomos de la Arquitectura (Archify)**  
> Se encuentran disponibles los diagramas interactivos de alta fidelidad con soporte de temas claro/oscuro, zoom, navegación y exportación:
> - 🌐 **[Portal Central de Diagramas (`docs/diagrams/index.html`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/diagrams/index.html)**
> - ☁️ **[Portal de Arquitecturas Cloud y Costos (`docs/cloud/index.html`)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/cloud/index.html)**
> - 🏛️ **[01. Arquitectura C4 Contenedores y Red Docker](file:///D:/tools/Proyectos/mio/sidebar-login/docs/diagrams/01_arquitectura_sistema.html)**
> - 🧾 **[02. Secuencia: Emisión de Venta POS y Cupones](file:///D:/tools/Proyectos/mio/sidebar-login/docs/diagrams/02_secuencia_emision_venta.html)**
> - 🛡️ **[03. Secuencia: Auditoría NOC y Kill Session](file:///D:/tools/Proyectos/mio/sidebar-login/docs/diagrams/03_secuencia_monitoreo_sesiones.html)**
> - 🧭 **[04. Secuencia: Menú Dinámico y RBAC Jerárquico](file:///D:/tools/Proyectos/mio/sidebar-login/docs/diagrams/04_secuencia_menu_dinamico_rbac.html)**
> - ⚡ **[05. Flujo Operativo End-to-End (Workflow)](file:///D:/tools/Proyectos/mio/sidebar-login/docs/diagrams/05_flujo_operativo_negocio.html)**
> - 🗄️ **[06. Modelo de Datos Relacional ERD en Español](file:///D:/tools/Proyectos/mio/sidebar-login/docs/diagrams/06_modelo_datos_erd.html)**

Este documento técnico detalla la arquitectura de integración punto a punto entre las **18 interfaces de usuario habilitadas en el Frontend (Angular 21)**, los **Endpoints y Servicios de la API RESTful (Spring Boot 4 / Java 21)** y los **Objetos de Base de Datos relacionales (PostgreSQL 17)** estructurados 100% en idioma español que son consultados y actualizados en cada operación.

---

## 1. Diagrama de Arquitectura y Flujo de Datos

El siguiente diagrama ilustra la interacción entre las capas del sistema con la base de datos completamente en español:

```mermaid
flowchart TD
    subgraph UI["Capa Cliente (Frontend Angular 21)"]
        UI_AUTH["Autenticación & Login (/login)"]
        UI_SHELL["Shell, Sidebar & Notificaciones"]
        UI_COM["Módulo Comercial (POS, Historial, Cupones, Caja)"]
        UI_CAT["Catálogo (Productos, Categorías)"]
        UI_ADM["Administración (Sedes, Usuarios, Roles RBAC, Sesiones NOC)"]
    end

    subgraph API["Capa de Negocio (Spring Boot 4 REST API)"]
        API_AUTH["AuthController (/api/v1/auth)"]
        API_MENU["MenuController (/api/v1/menu)"]
        API_NOTIF["NotificationsController (/api/v1/notifications)"]
        API_SALES["SalesController (/api/v1/sales)"]
        API_COUP["CouponsController (/api/v1/coupons)"]
        API_CASH["CashRegisterController (/api/v1/cash-register)"]
        API_CAT["CatalogController (/api/v1/products, /categories)"]
        API_ORG["OrganizationController (/api/v1/businesses, /branches)"]
        API_USR["UsersController (/api/v1/users)"]
        API_ROLE["RolesController (/api/v1/roles)"]
        API_SESS["SessionController (/api/v1/admin/sessions)"]
    end

    subgraph DB["Capa de Persistencia (PostgreSQL 17 en Español)"]
        DB_AUTH["usuarios, usuario_roles, sesiones_usuario, auditoria_autenticacion"]
        DB_MENU["fn_obtener_menu_efectivo_usuario(), opciones_menu, permisos_rol_menu"]
        DB_NOTIF["notificaciones_sistema"]
        DB_SALES["vw_ventas_con_detalles_comprobante, ventas, detalles_venta"]
        DB_COUP["cupones_descuento"]
        DB_CASH["arqueos_caja"]
        DB_CAT["productos_bebidas, categorias_bebidas"]
        DB_ORG["empresas, sedes"]
        DB_USR["vw_usuarios_empresas_sedes, usuario_sedes"]
        DB_ROLE["roles, permisos_rol_menu"]
        DB_SESS["vw_sesiones_activas_usuario, sesiones_usuario"]
    end

    UI_AUTH --> API_AUTH --> DB_AUTH
    UI_SHELL --> API_MENU --> DB_MENU
    UI_SHELL --> API_NOTIF --> DB_NOTIF
    UI_COM --> API_SALES --> DB_SALES
    UI_COM --> API_COUP --> DB_COUP
    UI_COM --> API_CASH --> DB_CASH
    UI_CAT --> API_CAT --> DB_CAT
    UI_ADM --> API_ORG --> DB_ORG
    UI_ADM --> API_USR --> DB_USR
    UI_ADM --> API_ROLE --> DB_ROLE
    UI_ADM --> API_SESS --> DB_SESS
```

---

## 2. Matriz Detallada de Interfaces, APIs y Objetos de Base de Datos

A continuación se describe cada una de las interfaces de usuario habilitadas, indicando su componente Angular, los métodos HTTP consumidos del servicio `AdminApiService`, el controlador Spring Boot correspondiente y las tablas, vistas o funciones de PostgreSQL en español involucradas.

| # | Interfaz y Ruta UI | Componente Angular | Métodos y Endpoints API | Controlador Backend | Tablas / Objetos de BD Consultados / Afectados |
|---|-------------------|-------------------|------------------------|---------------------|------------------------------------------------|
| **1** | **Inicio / Dashboard General**<br>`/dashboard/inicio` | `HomeViewComponent` | • `GET /api/v1/sales`<br>• `GET /api/v1/cash-register/audits`<br>• `GET /api/v1/products`<br>• `GET /api/v1/branches`<br>• `GET /api/v1/notifications` | `SalesController`<br>`CashRegisterController`<br>`CatalogController`<br>`OrganizationController` | • `ventas`, `detalles_venta`<br>• `arqueos_caja`<br>• `productos_bebidas`<br>• `sedes`<br>• `notificaciones_sistema` |
| **2** | **Ventas Mayor / Menor (POS)**<br>`/dashboard/sales` | `SalesPosComponent` | • `GET /api/v1/products`<br>• `GET /api/v1/coupons`<br>• `POST /api/v1/sales` | `CatalogController`<br>`CouponsController`<br>`SalesController` | • `productos_bebidas`<br>• `cupones_descuento`<br>• `ventas` *(INSERT)*<br>• `detalles_venta` *(INSERT en lote)* |
| **3** | **Historial de Ventas Emitidas**<br>`/dashboard/sales-history` | `SalesHistoryComponent` | • `GET /api/v1/sales/my-history` | `SalesController` | • `vw_ventas_con_detalles_comprobante`<br>*(Filtra por usuario_vendedor_id sobre ventas, empresas, sedes, usuarios)* |
| **4** | **Compras y Abastecimiento**<br>`/dashboard/purchases` | `PurchasesViewComponent` | • `GET /api/v1/purchases`<br>• `POST /api/v1/purchases`<br>• `GET /api/v1/branches` | `PurchasesController`<br>`OrganizationController` | • `compras`<br>• `sedes`<br>• `empresas` |
| **5** | **Cupones de Descuento**<br>`/dashboard/coupons` | `CouponsViewComponent` | • `GET /api/v1/coupons`<br>• `POST /api/v1/coupons`<br>• `PATCH /api/v1/coupons/{code}/toggle` | `CouponsController` | • `cupones_descuento` *(SELECT, INSERT, UPDATE activo)* |
| **6** | **Arqueo y Cierre de Caja**<br>`/dashboard/cash-register` | `CashRegisterViewComponent` | • `GET /api/v1/cash-register/audits`<br>• `POST /api/v1/cash-register/audits` | `CashRegisterController` | • `arqueos_caja`<br>• `sedes`<br>• `usuarios` |
| **7** | **Inventario de Productos**<br>`/dashboard/products/list` | `ProductsListComponent` | • `GET /api/v1/products`<br>• `GET /api/v1/categories` | `CatalogController` | • `productos_bebidas`<br>• `categorias_bebidas` |
| **8** | **Registrar Nueva Bebida**<br>`/dashboard/products/add` | `ProductAddComponent` | • `GET /api/v1/categories`<br>• `POST /api/v1/products` | `CatalogController` | • `categorias_bebidas`<br>• `productos_bebidas` *(INSERT)* |
| **9** | **Líneas y Categorías**<br>`/dashboard/categories` | `CategoriesListComponent` | • `GET /api/v1/categories` | `CatalogController` | • `categorias_bebidas` |
| **10** | **Nueva Categoría**<br>`/dashboard/categories/new` | `CategoryAddComponent` | • `POST /api/v1/categories` | `CatalogController` | • `categorias_bebidas` *(INSERT)* |
| **11** | **Negocio y Locales (Sedes)**<br>`/dashboard/branches` | `BranchesManagementComponent` | • `GET /api/v1/businesses`<br>• `POST /api/v1/businesses`<br>• `GET /api/v1/branches` | `OrganizationController` | • `empresas`<br>• `sedes` |
| **12** | **Clientes y Usuarios**<br>`/dashboard/users` | `UsersManagementComponent` | • `GET /api/v1/users`<br>• `POST /api/v1/users`<br>• `GET /api/v1/roles`<br>• `GET /api/v1/branches` | `UsersController`<br>`RolesController`<br>`OrganizationController` | • `vw_usuarios_empresas_sedes`<br>• `usuarios` *(INSERT)*<br>• `usuario_roles` *(INSERT)*<br>• `usuario_sedes` *(INSERT múltiple)* |
| **13** | **Roles y Matriz RBAC**<br>`/dashboard/roles` | `RolesManagementComponent` | • `GET /api/v1/roles`<br>• `POST /api/v1/roles`<br>• `GET /api/v1/roles/{code}/permissions`<br>• `PUT /api/v1/roles/{code}/permissions` | `RolesController` | • `roles`<br>• `permisos_rol_menu` *(SELECT / UPSERT)*<br>• `opciones_menu`<br>• `usuario_roles` |
| **14** | **Monitor de Sesiones y Auditoría**<br>`/dashboard/sessions` | `ActiveSessionsComponent` | • `GET /api/v1/admin/sessions`<br>• `POST /api/v1/admin/sessions/{id}/revoke`<br>• `POST /api/v1/admin/sessions/users/{id}/lock` | `SessionController` | • `vw_sesiones_activas_usuario`<br>• `sesiones_usuario` *(UPDATE es_revocada = TRUE)*<br>• `usuarios` *(UPDATE estado = 'LOCKED')*<br>• `auditoria_autenticacion` *(INSERT auditoría)* |
| **15** | **Reportes Comerciales**<br>`/dashboard/reports` | `ReportsViewComponent` | • `GET /api/v1/sales`<br>• `GET /api/v1/branches` | `SalesController`<br>`OrganizationController` | • `vw_ventas_con_detalles_comprobante`<br>• `ventas`<br>• `sedes` |
| **16** | **Configuración de Sede y Negocio**<br>`/dashboard/settings` | `SettingsViewComponent` | • `GET /api/v1/businesses`<br>• `GET /api/v1/branches` | `OrganizationController` | • `empresas`<br>• `sedes`<br>• `usuarios` *(información de perfil)* |
| **17** | **Menú Lateral, Navbar & Avisos**<br>*(Shell del Sistema)* | `SidebarComponent`<br>`NavbarComponent` | • `GET /api/v1/menu/my-navigation`<br>• `GET /api/v1/notifications`<br>• `PATCH /api/v1/notifications/{code}/read`<br>• `POST /api/v1/auth/heartbeat` | `MenuController`<br>`NotificationsController`<br>`AuthController` | • `fn_obtener_menu_efectivo_usuario(p_usuario_id)`<br>• `opciones_menu`<br>• `permisos_rol_menu`<br>• `permisos_usuario_menu`<br>• `notificaciones_sistema`<br>• `sesiones_usuario` *(UPDATE fecha_ultima_actividad)* |
| **18** | **Autenticación y Login**<br>`/login` | `Login` | • `POST /api/v1/auth/login`<br>• `GET /api/v1/auth/health` | `AuthController` | • `usuarios` *(verificación hash_contrasena con BCrypt)*<br>• `usuario_roles`, `roles`<br>• `sedes`, `empresas`<br>• `sesiones_usuario` *(INSERT sesión)*<br>• `auditoria_autenticacion` *(INSERT auditoría)* |

---

## 3. Diagramas de Secuencia Técnicos

### 3.1. Flujo de Emisión de Venta en POS (`/dashboard/sales`)

```mermaid
sequenceDiagram
    autonumber
    actor Cajero as Cajero / Vendedor
    participant POS as SalesPosComponent (UI)
    participant API as SalesController (Backend)
    participant DB as PostgreSQL 17 (en Español)

    Cajero->>POS: Agrega productos al carrito y aplica cupón
    POS->>API: POST /api/v1/sales (Payload de Venta + Ítems)
    activate API
    API->>DB: SELECT * FROM cupones_descuento WHERE codigo = ? AND activo = TRUE
    DB-->>API: Valida vigencia y porcentaje de descuento
    API->>DB: INSERT INTO ventas (codigo_venta, total, nombre_cliente, usuario_vendedor_id, ...)
    DB-->>API: ID de Venta generado (UUID)
    API->>DB: INSERT INTO detalles_venta (venta_id, sku_producto, cantidad, precio_unitario, ...)
    DB-->>API: Ítems registrados (Transacción COMMIT)
    API-->>POS: 201 Created (Comprobante emitido con serie y número)
    deactivate API
    POS->>Cajero: Muestra Ticket / Factura con opción de impresión
```

### 3.2. Flujo de Monitoreo NOC y Cierre Remoto de Sesión (`/dashboard/sessions`)

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Administrador General
    participant UI as ActiveSessionsComponent (UI)
    participant Srv as SessionController (Backend)
    participant DB as PostgreSQL 17 (en Español)

    Admin->>UI: Abre "Monitor de Sesiones y Auditoría"
    UI->>Srv: GET /api/v1/admin/sessions
    Srv->>DB: SELECT * FROM vw_sesiones_activas_usuario ORDER BY fecha_ultima_actividad DESC
    DB-->>Srv: Nodos activos, estados de semáforo (Online/Idle/Disconnected), IPs y coordenadas
    Srv-->>UI: Lista DTO con telemetría de conexiones
    UI->>Admin: Renderiza tabla semaforizada y mapa cartográfico
    
    Admin->>UI: Clic en "Cerrar Sesión" de nodo sospechoso
    UI->>Srv: POST /api/v1/admin/sessions/{sessionId}/revoke (Motivo)
    activate Srv
    Srv->>DB: UPDATE sesiones_usuario SET es_revocada = TRUE, revocada_por_admin = TRUE WHERE id = ?
    Srv->>DB: INSERT INTO auditoria_autenticacion (usuario_id, tipo_evento, detalle_accion) VALUES (?, 'KILL_SESSION', ?)
    DB-->>Srv: Sesión invalidada
    Srv-->>UI: 200 OK (Sesión terminada exitosamente)
    deactivate Srv
    UI->>Admin: Actualiza estado del pin a Desconectado / Revocado
```

### 3.3. Resolución de Menú RBAC en la Carga de la Aplicación

```mermaid
sequenceDiagram
    autonumber
    actor Usuario as Usuario Autenticado
    participant Shell as SidebarComponent (UI)
    participant MenuAPI as MenuController (Backend)
    participant DB as PostgreSQL 17 (en Español)

    Usuario->>Shell: Ingreso exitoso o refresco de página
    Shell->>MenuAPI: GET /api/v1/menu/my-navigation (Bearer JWT)
    activate MenuAPI
    MenuAPI->>DB: SELECT * FROM fn_obtener_menu_efectivo_usuario(current_user_id)
    Note over DB: Resuelve precedencia: Excepciones individuales (ALLOW/DENY) > Permisos de Rol Activo
    DB-->>MenuAPI: Árbol recursivo con puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
    MenuAPI-->>Shell: Jerarquía multinivel de 4 niveles
    deactivate MenuAPI
    Shell->>Usuario: Renderiza menú lateral con íconos, badges y rutas autorizadas
```

---

## 4. Mapeo Inverso: Objeto de Base de Datos en Español $\rightarrow$ Endpoints $\rightarrow$ Interfaces UI

Esta tabla permite verificar qué pantallas se verían impactadas ante modificaciones en la estructura de tablas o vistas en español:

| Objeto en PostgreSQL | Tipo | Endpoints Backend Asociados | Interfaces Frontend Afectadas |
|----------------------|------|-----------------------------|-------------------------------|
| **`empresas`** | Tabla | `GET/POST /businesses` | • `/dashboard/branches`<br>• `/dashboard/settings`<br>• `/login` |
| **`sedes`** | Tabla | `GET /branches` | • `/dashboard/branches`<br>• `/dashboard/users`<br>• `/dashboard/purchases`<br>• `/dashboard/cash-register` |
| **`usuarios`** | Tabla | `GET/POST /users`<br>`POST /auth/login`<br>`POST /admin/sessions/users/{id}/lock` | • `/dashboard/users`<br>• `/dashboard/sessions`<br>• `/login` |
| **`vw_usuarios_empresas_sedes`** | Vista | `GET /users` | • `/dashboard/users` |
| **`roles`** | Tabla | `GET/POST /roles` | • `/dashboard/roles`<br>• `/dashboard/users` |
| **`permisos_rol_menu`** | Tabla | `GET/PUT /roles/{code}/permissions` | • `/dashboard/roles` *(Matriz de Permisos)*<br>• Menú Lateral |
| **`opciones_menu`** | Tabla | `GET /roles/{code}/permissions`<br>`GET /menu/my-navigation` | • `/dashboard/roles`<br>• Menú Lateral (`SidebarComponent`) |
| **`fn_obtener_menu_efectivo_usuario`** | Función | `GET /menu/my-navigation` | • Menú Lateral (`SidebarComponent`) |
| **`sesiones_usuario`** | Tabla | `GET /admin/sessions`<br>`POST /admin/sessions/{id}/revoke`<br>`POST /auth/heartbeat`<br>`POST /auth/login` | • `/dashboard/sessions`<br>• Navbar *(indicador de conexión)*<br>• `/login` |
| **`vw_sesiones_activas_usuario`** | Vista | `GET /admin/sessions` | • `/dashboard/sessions` *(Monitor y Mapa NOC)* |
| **`auditoria_autenticacion`** | Tabla | `POST /auth/login`<br>`POST /admin/sessions/{id}/revoke` | • `/dashboard/sessions`<br>• Auditoría interna del sistema |
| **`productos_bebidas`** | Tabla | `GET/POST /products` | • `/dashboard/sales` *(POS)*<br>• `/dashboard/products/list`<br>• `/dashboard/products/add`<br>• `/dashboard/inicio` |
| **`categorias_bebidas`** | Tabla | `GET/POST /categories` | • `/dashboard/categories`<br>• `/dashboard/categories/new`<br>• `/dashboard/products/add` |
| **`ventas` & `detalles_venta`** | Tablas | `GET/POST /sales`<br>`GET /sales/my-history` | • `/dashboard/sales` *(POS)*<br>• `/dashboard/sales-history`<br>• `/dashboard/reports`<br>• `/dashboard/inicio` |
| **`vw_ventas_con_detalles_comprobante`** | Vista | `GET /sales/my-history`<br>`GET /sales` | • `/dashboard/sales-history`<br>• `/dashboard/reports` |
| **`cupones_descuento`** | Tabla | `GET/POST /coupons`<br>`PATCH /coupons/{code}/toggle` | • `/dashboard/coupons`<br>• `/dashboard/sales` *(Aplicación en POS)* |
| **`arqueos_caja`** | Tabla | `GET/POST /cash-register/audits` | • `/dashboard/cash-register`<br>• `/dashboard/inicio` |
| **`compras`** | Tabla | `GET/POST /purchases` | • `/dashboard/purchases` |
| **`notificaciones_sistema`** | Tabla | `GET /notifications`<br>`PATCH /notifications/{code}/read` | • Navbar *(Centro de Notificaciones)*<br>• `/dashboard/inicio` |
