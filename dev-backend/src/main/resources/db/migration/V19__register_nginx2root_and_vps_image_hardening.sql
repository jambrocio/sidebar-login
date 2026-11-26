-- ============================================================================
-- Migración V19: Registro de Hallazgos de Seguridad en Contenedores VPS Hardened
-- Skill Cybersecurity Senior: Mitigación de Vulnerabilidad nginx2root y CIS 5.25
-- ============================================================================

SET search_path TO core, auth, rbac, inventario, ventas, compras, public;

INSERT INTO core.vulnerabilidades_seguridad (
    empresa_id, codigo, titulo, categoria, severidad, estado,
    componente_afectado, descripcion, impacto_estimado, plan_remediacion, solucion_aplicada,
    reportado_por_usuario_id, mitigado_por_usuario_id, fecha_deteccion, fecha_mitigacion
) VALUES
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-013',
    'Riesgo de Escalamiento de Privilegios Local a Root (nginx2root) en Contenedor Frontend Nginx',
    'Seguridad en Contenedores Docker (CIS Benchmarks)',
    'ALTA',
    'MITIGADO',
    'dev-frontend (Dockerfile / docker-compose.yml / nginx.conf)',
    'La imagen base de Nginx ejecutaba su proceso maestro (PID 1) bajo el usuario root (UID 0). En configuraciones por defecto, cualquier compromiso o inyección en procesos worker de Nginx permite explotar vectores locales de elevación de privilegios hacia root (nginx2root) y manipulación de archivos del sistema.',
    'Compromiso con privilegios de superusuario dentro del contenedor web, facilitando intentos de evasión de contenedor (container breakout) o alteración del host.',
    'Aplicar CIS Docker Benchmark 4.1 y 5.25: configurar ejecución 100% rootless bajo USER nginx (UID 101) con capability cap_net_bind_service en el binario, desactivar escalamiento con security_opt: no-new-privileges:true y descartar todas las capabilities innecesarias con cap_drop: ALL.',
    'Se refactorizó frontend/Dockerfile implementando ejecución rootless bajo USER nginx con setcap cap_net_bind_service para bind en puerto 80, ownership en /var/run/nginx.pid y /var/cache/nginx, y endurecimiento en docker-compose.yml con cap_drop ALL y no-new-privileges:true.',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '20 minutes',
    now()
),
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-014',
    'Ausencia de Restricción de Capacidades y no-new-privileges en Imágenes Docker del VPS (CIS 5.25)',
    'Seguridad en Contenedores Docker (CIS Benchmarks)',
    'MEDIA',
    'MITIGADO',
    'docker-compose.yml / docker-compose.ops.yml',
    'Los servicios dev-backend, dev-auth-service y dev-postgres no tenían declarada la directiva security_opt: no-new-privileges:true ni la eliminación preventiva de capabilities (cap_drop: ALL), permitiendo potencialmente que procesos hijos adquirieran privilegios adicionales.',
    'Mayor radio de impacto (blast radius) ante la explotación de vulnerabilidades en las librerías o dependencias de los microservicios.',
    'Configurar cap_drop: ALL y security_opt: no-new-privileges:true de forma generalizada en los descriptores de despliegue Docker Compose.',
    'Se aplicaron las directivas cap_drop: ALL y security_opt: no-new-privileges:true en dev-backend, dev-auth-service, dev-frontend y dev-postgres en docker-compose.yml.',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '15 minutes',
    now()
)
ON CONFLICT (empresa_id, codigo) DO UPDATE
SET titulo = EXCLUDED.titulo,
    categoria = EXCLUDED.categoria,
    severidad = EXCLUDED.severidad,
    estado = EXCLUDED.estado,
    componente_afectado = EXCLUDED.componente_afectado,
    descripcion = EXCLUDED.descripcion,
    impacto_estimado = EXCLUDED.impacto_estimado,
    plan_remediacion = EXCLUDED.plan_remediacion,
    solucion_aplicada = EXCLUDED.solucion_aplicada,
    fecha_mitigacion = EXCLUDED.fecha_mitigacion;
