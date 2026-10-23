# 🗄️ Diccionario y Diseño de Base de Datos en Español (`docs/sql/`)

Esta carpeta contiene el diseño relacional oficial en **PostgreSQL 14+ / 17** implementado **100% en idioma español** (tablas, columnas, restricciones, secuencias, funciones almacenadas y vistas):

- `01_schema_ddl.sql`: Definición DDL de las 19 tablas relacionales con comentarios `COMMENT ON` nativos en el catálogo.
- `02_seed_dummy_data.sql`: Datos semilla sincronizados para empresas, sedes, roles, usuarios, categorías, bebidas y ventas.
- `03_queries_and_views.sql`: Función recursiva `fn_obtener_menu_efectivo_usuario` y vistas de jerarquía de menú, empresas y ventas.
- `04_password_expiration_and_locked_status.sql`: Columnas de seguridad, vigencia de claves (90 días) y bloqueo por intentos fallidos.
- `05_active_sessions_and_remote_kill.sql`: Tabla `sesiones_usuario`, auditoría de IP/navegador, semaforización y soporte de Kill Session.
- `06_add_sessions_menu_item_and_permissions.sql`: Registro en menú lateral de la pantalla de Monitoreo de Conexiones Activas.
- `07_analyst_and_auditor_permissions.sql`: Permisos RBAC para perfiles de Auditor Interno y Analista de Seguridad.

---

## 1. Inventario General de Objetos de Base de Datos

| Categoría del Objeto | Cantidad | Nombre de los Objetos | Explicación en Español | Archivo SQL |
| :--- | :---: | :--- | :--- | :--- |
| **1. Extensión Criptográfica** | **1** | `pgcrypto` | Habilita la generación nativa de identificadores únicos universales (`UUID v4`) mediante `gen_random_uuid()`. | [`01_schema_ddl.sql`](./01_schema_ddl.sql) |
| **2. Tablas Relacionales** | **19** | `empresas`, `sedes`, `roles`, `usuarios`, `usuario_sedes`, `usuario_roles`, `sesiones_usuario`, `auditoria_autenticacion`, `opciones_menu`, `permisos_rol_menu`, `permisos_usuario_menu`, `categorias_bebidas`, `productos_bebidas`, `cupones_descuento`, `ventas`, `detalles_venta`, `compras`, `arqueos_caja`, `notificaciones_sistema` | Tablas transaccionales y de configuración para Empresas, Sedes, Usuarios, Roles, Menú, Bebidas, Cupones, Ventas, Compras, Arqueos y Alertas. | [`01_schema_ddl.sql`](./01_schema_ddl.sql) |
| **3. Secuencia Autoincremental**| **1** | `auditoria_autenticacion_id_seq` | Generador numérico correlativo para los eventos de la bitácora de auditoría. | [`01_schema_ddl.sql`](./01_schema_ddl.sql) |
| **4. Índices de Búsqueda** | **7** | `idx_sedes_empresa`, `idx_usuarios_empresa_sede`, `idx_opciones_menu_padre`, `idx_ventas_usuario_vendedor`, `idx_ventas_sede`, `idx_sesiones_usuario_activo`, `idx_sesiones_ip_activo` | Índices que optimizan consultas por empresa, árbol de menú, ventas y control de sesiones activas concurrentes e IP. | [`01_schema_ddl.sql`](./01_schema_ddl.sql), [`05_active_sessions_and_remote_kill.sql`](./05_active_sessions_and_remote_kill.sql) |
| **5. Función Almacenada** | **1** | `fn_obtener_menu_efectivo_usuario(p_id_usuario UUID)` | Calcula dinámicamente el menú permitido de un usuario combinando los permisos de su rol con sus excepciones individuales (`ALLOW` / `DENY`). | [`03_queries_and_views.sql`](./03_queries_and_views.sql) |
| **6. Vistas Consolidadas** | **4** | `vw_arbol_jerarquia_menu`, `vw_usuarios_empresas_sedes`, `vw_ventas_con_detalles_comprobante`, `vw_sesiones_activas_usuario` | Vistas para alimentar el menú lateral de 4 niveles, directorio de colaboradores, historial de ventas y **monitor semaforizado de sesiones activas en tiempo real**. | [`03_queries_and_views.sql`](./03_queries_and_views.sql), [`05_active_sessions_and_remote_kill.sql`](./05_active_sessions_and_remote_kill.sql) |

---

## 2. Diccionario de las 19 Tablas Relacionales en Español

| # | Tabla Física SQL | Descripción Funcional en Español | Clave Primaria | Claves Foráneas y Reglas Principales |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `empresas` | Empresas o razones sociales matrices. Una empresa matriz puede tener múltiples sedes (`1 a N`). | `id` (`UUID`) | Código único (`codigo_empresa`) y RUC único (`ruc`). |
| **2** | `sedes` | Tiendas minoristas, almacenes mayoristas y sedes logísticas con su serie de facturación (`F001/B001`). | `id` (`UUID`) | Pertenece a una empresa (`id_empresa -> empresas.id`). Código único (`codigo_sede`). |
| **3** | `roles` | Perfiles de acceso con alcance a `Nivel Negocio (Multi-Sede)` o `Nivel Sede Asignada`. | `id` (`UUID`) | Pertenece a empresa (`id_empresa`). Código único (`codigo_rol`). |
| **4** | `usuarios` | Colaboradores y clientes vinculados a su **Empresa Matriz** y a su **Sede Principal de Operación**. Incluye columnas de vigencia de contraseña y bloqueo. | `id` (`UUID`) | Pertenece a empresa (`id_empresa`) y a sede principal (`id_sede_defecto`). |
| **5** | `usuario_sedes` | Relación muchos a muchos que define en qué sedes de la empresa está autorizado a operar cada usuario. | `id` (`UUID`) | Vincula usuario (`id_usuario`) y sede (`id_sede`). Indica cuál es la principal (`es_sede_principal`). |
| **6** | `usuario_roles` | Vincula usuarios con uno o más roles del sistema, soportando fecha de asignación. | `id` (`UUID`) | Vincula usuario (`id_usuario`) y rol (`id_rol`). |
| **7** | `sesiones_usuario` | Controla los tokens de sesión iniciados por dispositivo/navegador, IP, país y estado para Kill Session. | `id` (`UUID`) | Pertenece a un usuario (`id_usuario`). Hash único (`token_jwt_hash`). |
| **8** | `auditoria_autenticacion` | Registro inmutable con fecha, hora, usuario autor y sede de cada evento de seguridad y acceso. | `id` (`BIGSERIAL`)| Referencia al usuario (`id_usuario`) y almacena `detalles_json`. |
| **9** | `opciones_menu` | Árbol jerárquico recursivo de hasta 4 niveles que construye el menú lateral colapsable (`Sidebar`). | `id` (`UUID`) | Referencia recursiva al menú padre (`id_menu_padre -> opciones_menu.id`). Código único (`codigo_menu`). |
| **10** | `permisos_rol_menu` | Matriz RBAC que define si un rol puede Ver, Crear, Editar, Eliminar o Imprimir cada opción de menú. | `id` (`UUID`) | Vincula rol (`id_rol`) y opción de menú (`id_menu`). |
| **11** | `permisos_usuario_menu` | Permisos especiales individuales que prevalecen sobre el rol para habilitar o restringir módulos. | `id` (`UUID`) | Vincula usuario (`id_usuario`) y opción de menú (`id_menu`). |
| **12** | `categorias_bebidas` | Familias de productos (*Licores*, *Cervezas*, *Gaseosas*) y su política de margen comercial. | `id` (`UUID`) | Pertenece a empresa (`id_empresa`). Código único (`codigo_categoria`). |
| **13** | `productos_bebidas` | Ficha de cada bebida (SKU) con **Precio por Menor (unidad)**, **Precio por Mayor (caja)** y stock actual. | `id` (`UUID`) | Pertenece a empresa (`id_empresa`) y categoría (`id_categoria`). SKU único (`sku`). |
| **14** | `cupones_descuento` | Códigos promocionales de descuento porcentual o monto fijo dirigidos a clientes con compra mínima. | `id` (`UUID`) | Pertenece a empresa (`id_empresa`). Código único (`codigo_cupon`). |
| **15** | `ventas` | Facturas y Boletas Electrónicas emitidas en la sede asignada, con totales, IGV, descuento y vendedor. | `id` (`UUID`) | Vincula empresa (`id_empresa`), sede (`id_sede`) y usuario vendedor (`id_usuario_vendedor`). |
| **16** | `detalles_venta` | Renglones de productos agregados al carrito dentro de cada comprobante de venta (`ventas`). | `id` (`UUID`) | Pertenece a una venta (`id_venta -> ventas.id` con borrado en cascada). |
| **17** | `compras` | Órdenes de compra e ingreso de cajas de proveedores al almacén de la sede asignada. | `id` (`UUID`) | Vincula empresa (`id_empresa`) y sede receptora (`id_sede`). |
| **18** | `arqueos_caja` | Conciliación de efectivo al cierre de turno laboral en cada sede (`Cuadre Exacto`, `Sobrante`, `Faltante`). | `id` (`UUID`) | Vincula empresa (`id_empresa`), sede (`id_sede`) y cajero responsable (`id_usuario_cajero`). |
| **19** | `notificaciones_sistema` | Alertas operativas de stock crítico, ventas mayoristas, cierres de caja y vencimiento de cupones. | `id` (`UUID`) | Pertenece a una empresa (`id_empresa`). Código único (`codigo_notificacion`). |

---

## 3. Ejecución y Migración en Contenedor

Los scripts se ejecutan automáticamente en el contenedor Docker `dev-postgres` al inicializar el volumen montado desde `./docs/sql`:

```bash
# Inicialización automática con docker-compose
docker compose up -d dev-postgres

# Verificación de tablas en PostgreSQL
docker exec -it dev-postgres psql -U postgres -d admin_dashboard_db -c "\dt"
```
