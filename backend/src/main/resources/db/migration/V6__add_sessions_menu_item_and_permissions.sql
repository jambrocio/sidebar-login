-- =============================================================================
-- SCRIPT SQL: 06_add_sessions_menu_item_and_permissions.sql
-- DESCRIPCIÓN: Registro de la opción de navegación 'Sesiones y Auditoría'
--              en el módulo de Administración y asignación de permisos RBAC
--              para el Administrador General (ADMIN).
-- =============================================================================

-- 1. Insertar el elemento en opciones_menu bajo 'Administración' (MOD_ADMIN)
INSERT INTO opciones_menu (
    id,
    padre_id,
    codigo,
    etiqueta,
    icono,
    ruta_enlace,
    etiqueta_miga_pan,
    orden,
    es_grupo,
    es_visible
) VALUES (
    '33333333-3333-4333-8333-333333333210',
    '33333333-3333-4333-8333-333333333104',
    'MGMT_SESSIONS',
    'Sesiones y Auditoría',
    'bi bi-shield-lock-fill',
    '/dashboard/sessions',
    'Sesiones y Auditoría',
    4,
    FALSE,
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    padre_id = EXCLUDED.padre_id,
    codigo = EXCLUDED.codigo,
    etiqueta = EXCLUDED.etiqueta,
    icono = EXCLUDED.icono,
    ruta_enlace = EXCLUDED.ruta_enlace,
    etiqueta_miga_pan = EXCLUDED.etiqueta_miga_pan,
    orden = EXCLUDED.orden,
    es_grupo = EXCLUDED.es_grupo,
    es_visible = EXCLUDED.es_visible;

-- 2. Asignar permisos completos para el rol ADMIN (Administrador General)
INSERT INTO permisos_rol_menu (
    rol_id,
    opcion_menu_id,
    visible_en_menu,
    puede_ver,
    puede_crear,
    puede_editar,
    puede_eliminar,
    puede_exportar
) VALUES (
    '22222222-2222-4222-8222-222222222201',
    '33333333-3333-4333-8333-333333333210',
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE
) ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE SET
    visible_en_menu = TRUE,
    puede_ver = TRUE,
    puede_crear = TRUE,
    puede_editar = TRUE,
    puede_eliminar = TRUE,
    puede_exportar = TRUE;
