# 🗄️ Diccionario y Diseño de Base de Datos Modular en Español (`docs/sql/`)

Esta carpeta contiene el diseño relacional oficial en **PostgreSQL 14+ / 17** implementado **100% en idioma español** bajo una **Arquitectura de Esquemas Desacoplados**. 

El sistema separa el núcleo de **Identidad, Autenticación y RBAC** de la **Estructura Organizacional** y de los **Módulos de Negocio Satélites**, garantizando que cualquier módulo nuevo que se agregue en el futuro sea independiente y no altere el subsistema de usuarios.

---

## 1. Esquemas Relacionales y Separación de Responsabilidades

| Esquema | Propósito y Bounded Context | Tablas Agrupadas | Nivel de Dependencia |
| :--- | :--- | :--- | :--- |
| **`auth`** | **Identidad, Autenticación y Auditoría de Seguridad**: Credenciales de usuario, control de intentos fallidos, expiración de claves, sesiones concurrentes (Kill Session) y bitácora de auditoría. | `usuarios`<br>`sesiones_usuario`<br>`auditoria_autenticacion` | **Núcleo / Nivel 0** (No depende de ningún módulo de negocio). |
| **`rbac`** | **Control de Acceso Basado en Roles**: Perfiles con alcance multi-sede o local, catálogo jerárquico del menú lateral (hasta 4 niveles) y matriz granular de permisos (Ver, Crear, Editar, Eliminar, Exportar). | `roles`<br>`usuario_roles`<br>`opciones_menu`<br>`permisos_rol_menu`<br>`permisos_usuario_menu` | Depende únicamente de `auth.usuarios`. |
| **`core`** | **Estructura Multi-Tenant**: Empresas Matriz (Razones Sociales / RUC), sedes físicas/almacenes y asignación N:M de sedes autorizadas por usuario. | `empresas`<br>`sedes`<br>`usuario_sedes` | Estructura organizacional transversal. |
| **`inventario`**| **Catálogo y Stock**: Familias de bebidas, SKUs con doble lista de precios (Por Menor unitario y Por Mayor por caja/pack) y balance de existencias. | `categorias_bebidas`<br>`productos_bebidas` | Consume `core.empresas` y `auth.usuarios` (auditoría). |
| **`ventas`** | **Facturación Electrónica y Comercial**: Comprobantes (Facturas/Boletas), líneas multiproducto del carrito y cupones promocionales con compra mínima. | `cupones_descuento`<br>`ventas`<br>`detalles_venta` | Consume `core.sedes`, `core.empresas` y `auth.usuarios`. |
| **`compras`** | **Abastecimiento y Proveedores**: Órdenes de compra e ingreso de lotes de mercadería para abastecer inventario en almacenes de cada sede. | `compras` | Consume `core.sedes` y `auth.usuarios`. |
| **`tesoreria`**| **Caja y Turnos**: Actas de arqueo y liquidación de efectivo y pagos digitales al cierre de turno laboral con semáforo de cuadre. | `arqueos_caja` | Consume `core.sedes` y `auth.usuarios`. |
| **`notificaciones`**| **Mensajería Operativa**: Alertas y notificaciones del sistema (quiebres de stock, cierres de turno, cupones por vencer). | `notificaciones_sistema` | Consume `core.empresas`. |

---

## 2. Garantía de Independencia para Módulos Nuevos

La regla fundamental de esta arquitectura es la **Inversión de Dependencias en Base de Datos**:

1. **`auth` y `rbac` son esquemas fundacionales**: Ninguna tabla dentro de `auth` o `rbac` tiene llaves foráneas (`FOREIGN KEY`) apuntando a tablas transaccionales de negocio.
2. **Extensibilidad sin impacto**: Para crear un nuevo módulo (ejemplo: `logistica`, `crm`, `recursos_humanos`), basta con crear un nuevo esquema sin tocar las tablas de autenticación:
   ```sql
   CREATE SCHEMA IF NOT EXISTS logistica;

   CREATE TABLE logistica.rutas_despacho (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       codigo VARCHAR(30) NOT NULL UNIQUE,
       sede_origen_id UUID NOT NULL REFERENCES core.sedes(id),
       conductor_usuario_id UUID NOT NULL REFERENCES auth.usuarios(id),
       estado VARCHAR(30) NOT NULL DEFAULT 'En Ruta',
       fecha_salida TIMESTAMPTZ NOT NULL DEFAULT NOW()
   );
   ```
3. **Resolución Transparente (`search_path`)**:
   El motor está parametrizado con:
   ```sql
   ALTER DATABASE admin_dashboard_db SET search_path TO auth, rbac, core, inventario, ventas, compras, tesoreria, notificaciones, public;
   ```
   Esto permite que las consultas de las capas de aplicación puedan resolver nombres sin prefijo o con prefijo explícito según convenga.

---

## 3. Secuencia de Scripts en `docs/sql/`

Los scripts están orquestados para inicializarse automáticamente en el contenedor Docker `dev-postgres` (`/docker-entrypoint-initdb.d/`):

- [`01_schema_ddl.sql`](./01_schema_ddl.sql): Creación de los 8 esquemas, 19 tablas relacionales y diccionario de datos en catálogo (`COMMENT ON`).
- [`02_seed_dummy_data.sql`](./02_seed_dummy_data.sql): Carga de datos semilla completos (empresas, sedes, roles, usuarios, categorías, productos, cupones, ventas, compras, arqueos y notificaciones).
- [`03_queries_and_views.sql`](./03_queries_and_views.sql): Función recursiva `fn_obtener_menu_efectivo_usuario` y vistas consolidadas (`vw_arbol_jerarquia_menu`, `vw_usuarios_empresas_sedes`, `vw_ventas_con_detalles_comprobante`).
- [`04_password_expiration_and_locked_status.sql`](./04_password_expiration_and_locked_status.sql): Vigencia de claves (90 días), bloqueo de cuentas por intentos fallidos y bandera de cambio obligatorio.
- [`05_active_sessions_and_remote_kill.sql`](./05_active_sessions_and_remote_kill.sql): Monitor de sesiones activas concurrentes, auditoría de geolocalización/IP y funciones de revocación remota (`Kill Session`).
- [`06_add_sessions_menu_item_and_permissions.sql`](./06_add_sessions_menu_item_and_permissions.sql): Opción de navegación 'Sesiones y Auditoría' en el menú lateral para perfil ADMIN.
- [`07_analyst_and_auditor_permissions.sql`](./07_analyst_and_auditor_permissions.sql): Matriz de permisos RBAC para perfiles Cajero/Vendedor y Auditor.
