-- ============================================================================
-- Migración V16: Módulo de Registro y Auditoría de Vulnerabilidades de Seguridad
-- Origen: Detección y directrices del Skill Cybersecurity Senior (OWASP / CIS)
-- Estándar: Senior DBA / Clean Architecture (PostgreSQL 17)
-- ============================================================================

SET search_path TO core, auth, rbac, inventario, ventas, compras, public;

-- 1. Crear tabla de vulnerabilidades de seguridad
CREATE TABLE IF NOT EXISTS core.vulnerabilidades_seguridad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES core.empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(30) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    severidad VARCHAR(20) NOT NULL CHECK (severidad IN ('CRITICA', 'ALTA', 'MEDIA', 'BAJA', 'INFORMATIVA')),
    estado VARCHAR(20) NOT NULL DEFAULT 'ABIERTO' CHECK (estado IN ('ABIERTO', 'EN_PROCESO', 'MITIGADO', 'FALSO_POSITIVO', 'ACEPTADO')),
    componente_afectado VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    impacto_estimado TEXT,
    plan_remediacion TEXT NOT NULL,
    reportado_por_usuario_id UUID NOT NULL REFERENCES auth.usuarios(id) ON DELETE RESTRICT,
    mitigado_por_usuario_id UUID REFERENCES auth.usuarios(id) ON DELETE SET NULL,
    fecha_deteccion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fecha_mitigacion TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    fecha_modificacion TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT uq_vulnerabilidad_empresa_codigo UNIQUE (empresa_id, codigo)
);

COMMENT ON TABLE core.vulnerabilidades_seguridad IS 'Catálogo de hallazgos y vulnerabilidades identificadas por el marco de ciberseguridad defensiva y auditoría ética';
COMMENT ON COLUMN core.vulnerabilidades_seguridad.empresa_id IS 'Identificador del negocio matriz auditado';
COMMENT ON COLUMN core.vulnerabilidades_seguridad.codigo IS 'Código correlativo único del hallazgo (ej. SEC-2026-001)';
COMMENT ON COLUMN core.vulnerabilidades_seguridad.categoria IS 'Categoría del hallazgo según OWASP Top 10, CIS Benchmarks o Seguridad de Red';
COMMENT ON COLUMN core.vulnerabilidades_seguridad.severidad IS 'Nivel de riesgo: CRITICA, ALTA, MEDIA, BAJA o INFORMATIVA';
COMMENT ON COLUMN core.vulnerabilidades_seguridad.estado IS 'Ciclo de vida: ABIERTO, EN_PROCESO, MITIGADO, FALSO_POSITIVO o ACEPTADO';
COMMENT ON COLUMN core.vulnerabilidades_seguridad.componente_afectado IS 'Servicio, contenedor o archivo específico afectado';
COMMENT ON COLUMN core.vulnerabilidades_seguridad.plan_remediacion IS 'Estrategia de hardening y corrección recomendada para mitigar el riesgo';

-- 2. Índices para acelerar auditorías y filtrados
CREATE INDEX IF NOT EXISTS idx_vuln_empresa_estado ON core.vulnerabilidades_seguridad(empresa_id, estado);
CREATE INDEX IF NOT EXISTS idx_vuln_empresa_severidad ON core.vulnerabilidades_seguridad(empresa_id, severidad);
CREATE INDEX IF NOT EXISTS idx_vuln_empresa_fecha ON core.vulnerabilidades_seguridad(empresa_id, fecha_deteccion DESC);

-- 3. Registrar Opción de Menú RBAC para Vulnerabilidades de Seguridad
INSERT INTO rbac.opciones_menu (
    id, padre_id, codigo, etiqueta, icono, ruta_enlace, etiqueta_miga_pan, orden, es_grupo, es_visible, activo
) VALUES (
    '33333333-3333-4333-8333-333333333213',
    '33333333-3333-4333-8333-333333333104',
    'MGMT_VULNERABILITIES',
    'Auditoría de Vulnerabilidades y Seguridad Defensiva',
    'bi bi-shield-exclamation',
    '/dashboard/vulnerabilities',
    'Vulnerabilidades y Seguridad',
    5,
    false,
    true,
    true
) ON CONFLICT (codigo) DO UPDATE 
SET ruta_enlace = EXCLUDED.ruta_enlace,
    etiqueta = EXCLUDED.etiqueta,
    icono = EXCLUDED.icono,
    orden = EXCLUDED.orden,
    etiqueta_miga_pan = EXCLUDED.etiqueta_miga_pan,
    activo = true;

-- 4. Asignar permisos automáticos a roles con capacidad de auditoría y administración
INSERT INTO rbac.permisos_rol_menu (
    rol_id, opcion_menu_id, visible_en_menu, puede_ver, puede_crear, puede_editar, puede_eliminar, puede_exportar
)
SELECT 
    r.id,
    '33333333-3333-4333-8333-333333333213',
    true, true, true, true, (r.codigo = 'ADMIN'), true
FROM rbac.roles r
WHERE r.codigo IN ('ADMIN', 'SUPERVISOR', 'AUDITOR_SEGURIDAD')
ON CONFLICT (rol_id, opcion_menu_id) DO UPDATE
SET visible_en_menu = EXCLUDED.visible_en_menu,
    puede_ver = EXCLUDED.puede_ver,
    puede_crear = EXCLUDED.puede_crear,
    puede_editar = EXCLUDED.puede_editar,
    puede_eliminar = EXCLUDED.puede_eliminar,
    puede_exportar = EXCLUDED.puede_exportar;

-- 5. Semilla inicial de hallazgos detectados por el skill cybersecurity-senior
INSERT INTO core.vulnerabilidades_seguridad (
    empresa_id, codigo, titulo, categoria, severidad, estado, componente_afectado,
    descripcion, impacto_estimado, plan_remediacion, reportado_por_usuario_id, fecha_deteccion
) VALUES
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-001',
    'Ausencia de Política Content-Security-Policy (CSP) Restrictiva',
    'A05: Configuración de Seguridad Defectuosa',
    'ALTA',
    'MITIGADO',
    'dev-frontend (nginx.conf)',
    'Las respuestas HTTP servidas por el frontend no definían una cabecera CSP estricta, aumentando la exposición a inyecciones de script en el navegador.',
    'Potencial ejecución de scripts no autorizados en navegadores de clientes.',
    'Configurar directivas default-src self, style-src self unsafe-inline y font-src en el archivo de configuración de Nginx.',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '2 days'
),
(
    'a0000000-0000-4000-8000-000000000002',
    'SEC-2026-002',
    'Riesgo de Duplicidad en Códigos de Cupón Promocional',
    'A04: Diseño Inseguro',
    'MEDIA',
    'MITIGADO',
    'backend (CouponsServiceImpl)',
    'El servicio de creación de cupones no validaba preventivamente en código la existencia previa del cupón antes de intentar la inserción.',
    'Posible sobrescritura conceptual o mensajes no controlados al usuario en caso de colisión de códigos.',
    'Implementar validación preventiva existsByCode en capa de servicio y captura explícita de DataIntegrityViolationException.',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '1 day'
),
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-003',
    'Verificación de Ejecución de Contenedores bajo Usuario No Root',
    'Seguridad en Contenedores Docker (CIS Benchmarks)',
    'MEDIA',
    'EN_PROCESO',
    'dev-backend (Dockerfile)',
    'Asegurar que todas las imágenes de contenedor productivas cuenten con directiva USER appuser y permisos mínimos de sistema de archivos.',
    'Escalamiento de privilegios en el host si un atacante compromete el proceso de la aplicación en el contenedor.',
    'Verificar usuario no-root spring en la etapa de ejecución de temurin-21 y deshabilitar capacidades innecesarias de Linux (cap_drop: ALL).',
    '11111111-1111-4111-8111-111111111101',
    now()
)
ON CONFLICT (empresa_id, codigo) DO NOTHING;
