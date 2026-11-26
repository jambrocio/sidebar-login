-- ============================================================================
-- V21: Replicar hallazgos de seguridad auditados para COTIC S.A.C.
-- ============================================================================

INSERT INTO core.vulnerabilidades_seguridad (
    empresa_id, codigo, titulo, categoria, severidad, estado,
    componente_afectado, descripcion, impacto_estimado, plan_remediacion, solucion_aplicada,
    reportado_por_usuario_id, mitigado_por_usuario_id, fecha_deteccion, fecha_mitigacion
)
SELECT 
    e.id AS empresa_id,
    v.codigo, v.titulo, v.categoria, v.severidad, v.estado,
    v.componente_afectado, v.descripcion, v.impacto_estimado, v.plan_remediacion, v.solucion_aplicada,
    u.id AS reportado_por_usuario_id,
    CASE WHEN v.mitigado_por_usuario_id IS NOT NULL THEN u.id ELSE NULL END AS mitigado_por_usuario_id,
    v.fecha_deteccion, v.fecha_mitigacion
FROM core.vulnerabilidades_seguridad v
CROSS JOIN core.empresas e
JOIN auth.usuarios u ON u.empresa_id = e.id AND u.nombre_usuario = 'rambrocio'
WHERE v.empresa_id = 'a0000000-0000-4000-8000-000000000001'
  AND e.id = '5f897841-04a7-40e6-87b1-ca8298457e41'
ON CONFLICT (empresa_id, codigo) DO NOTHING;
