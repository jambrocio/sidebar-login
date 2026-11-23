-- ============================================================================
-- V20: Otorgar permisos de Auditoría de Vulnerabilidades a ADMIN_NEGOCIO y AUDITOR
-- ============================================================================

INSERT INTO rbac.permisos_rol_menu (rol_id, opcion_menu_id, puede_ver, puede_crear, puede_editar, puede_eliminar)
SELECT r.id, m.id, TRUE, TRUE, TRUE, TRUE
FROM rbac.roles r
CROSS JOIN rbac.opciones_menu m
WHERE r.codigo IN ('ADMIN_NEGOCIO', 'AUDITOR')
  AND m.codigo = 'MGMT_VULNERABILITIES'
ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE
SET puede_ver = EXCLUDED.puede_ver,
    puede_crear = EXCLUDED.puede_crear,
    puede_editar = EXCLUDED.puede_editar,
    puede_eliminar = EXCLUDED.puede_eliminar;
