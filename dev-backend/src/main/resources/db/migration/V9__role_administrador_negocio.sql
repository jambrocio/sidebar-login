-- =============================================================================
-- MIGRACIÓN V9: Rol Administrador de Negocio vs Administrador General (Superusuario)
-- =============================================================================

SET search_path TO auth, rbac, core, inventario, ventas, compras, tesoreria, notificaciones, public;

-- 1. Ampliar el CHECK constraint de rbac.roles para admitir 'Nivel Plataforma (Superusuario)'
ALTER TABLE rbac.roles DROP CONSTRAINT IF EXISTS roles_alcance_check;
ALTER TABLE rbac.roles ADD CONSTRAINT roles_alcance_check
    CHECK (alcance IN ('Nivel Plataforma (Superusuario)', 'Nivel Negocio (Multi-Local)', 'Nivel Local Asignado'));

-- 2. Actualizar el rol ADMIN a Administrador General (Superusuario) con alcance Nivel Plataforma
UPDATE rbac.roles
SET nombre = 'Administrador General (Superusuario)',
    alcance = 'Nivel Plataforma (Superusuario)',
    descripcion = 'Superusuario con control total sobre todos los negocios matriz, locales, usuarios y configuración global de la plataforma.'
WHERE codigo = 'ADMIN';

-- 3. Insertar el nuevo rol ADMIN_NEGOCIO con alcance Nivel Negocio (Multi-Local)
INSERT INTO rbac.roles (id, codigo, nombre, descripcion, alcance, es_sistema, activo)
VALUES (
    '22222222-2222-4222-8222-222222222205',
    'ADMIN_NEGOCIO',
    'Administrador de Negocio',
    'Control y administración completa de todas las opciones operativas dentro de su Negocio Matriz asignado.',
    'Nivel Negocio (Multi-Local)',
    TRUE,
    TRUE
)
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    alcance = EXCLUDED.alcance,
    activo = TRUE;

-- 4. Asignar matriz de permisos completa a ADMIN_NEGOCIO para todas las opciones de menú
INSERT INTO rbac.permisos_rol_menu (
    rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
)
SELECT
    '22222222-2222-4222-8222-222222222205',
    id,
    es_visible,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
FROM rbac.opciones_menu
ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE
SET visible_en_menu = EXCLUDED.visible_en_menu,
    puede_ver = EXCLUDED.puede_ver,
    puede_crear = EXCLUDED.puede_crear,
    puede_editar = EXCLUDED.puede_editar,
    puede_eliminar = EXCLUDED.puede_eliminar,
    puede_exportar = EXCLUDED.puede_exportar;

-- 5. Asignar el rol ADMIN_NEGOCIO al usuario demo mparedes (Marco Paredes, Administrador de BIZ-002)
DELETE FROM rbac.usuario_roles WHERE usuario_id = '11111111-1111-4111-8111-111111111104';
INSERT INTO rbac.usuario_roles (usuario_id, rol_id, asignado_por_id)
VALUES (
    '11111111-1111-4111-8111-111111111104',
    '22222222-2222-4222-8222-222222222205',
    '11111111-1111-4111-8111-111111111101'
);

-- Asegurar vigencia de contraseña para mparedes como Administrador de Negocio activo
UPDATE auth.usuarios
SET debe_cambiar_contrasena = FALSE,
    fecha_expiracion_contrasena = NOW() + INTERVAL '90 days'
WHERE id = '11111111-1111-4111-8111-111111111104';
