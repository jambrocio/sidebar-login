-- =============================================================================
-- SCRIPT SQL: 16_add_decision_dashboard_menu.sql
-- DESCRIPCIÓN: Registro de la opción 'Toma de Decisiones' (DECISION_DASHBOARD)
--              en rbac.opciones_menu y asignación de permisos RBAC.
-- =============================================================================

SET search_path TO auth, rbac, core, inventario, ventas, compras, tesoreria, notificaciones, public;

INSERT INTO rbac.opciones_menu (
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
    '33333333-3333-4333-8333-333333333220',
    NULL,
    'DECISION_DASHBOARD',
    'Toma de Decisiones',
    'bi bi-graph-up-arrow',
    '/dashboard/decision-dashboard',
    'Toma de Decisiones',
    2,
    FALSE,
    TRUE
) ON CONFLICT (id) DO UPDATE SET
    codigo = EXCLUDED.codigo,
    etiqueta = EXCLUDED.etiqueta,
    icono = EXCLUDED.icono,
    ruta_enlace = EXCLUDED.ruta_enlace,
    etiqueta_miga_pan = EXCLUDED.etiqueta_miga_pan,
    orden = EXCLUDED.orden,
    es_visible = EXCLUDED.es_visible;

INSERT INTO rbac.permisos_rol_menu (
    rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
)
SELECT r.id, '33333333-3333-4333-8333-333333333220', TRUE, TRUE, FALSE, FALSE, FALSE, TRUE
FROM rbac.roles r
WHERE r.codigo IN ('ADMIN', 'ADMIN_NEGOCIO', 'SUPERVISOR', 'ANALYST', 'AUDITOR')
ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE SET
    visible_en_menu = TRUE,
    puede_ver = TRUE,
    puede_exportar = TRUE;
