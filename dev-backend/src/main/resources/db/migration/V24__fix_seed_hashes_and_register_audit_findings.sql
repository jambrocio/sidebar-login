-- ============================================================================
-- Migración V24: Migración de Hashes Semilla a BCrypt(12) Real y Registro de
-- Hallazgos de Auditoría Cybersecurity-Senior (SEC-2026-018 a SEC-2026-021)
-- ============================================================================

SET search_path TO core, auth, rbac, inventario, ventas, compras, public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Actualizar únicamente cuentas semilla que aún conserven el hash placeholder inicial ($2a$10$h3AZ/...)
UPDATE auth.usuarios
SET hash_contrasena = crypt('Admin123*', gen_salt('bf', 12))
WHERE nombre_usuario = 'agarcia'
  AND hash_contrasena = '$2a$10$h3AZ/SYsMB7J6aoLSAhAIOJxAbiga8eOCtXXPoP.jmUY/9GXRQauu';

UPDATE auth.usuarios
SET hash_contrasena = crypt('Cajero123*', gen_salt('bf', 12))
WHERE nombre_usuario = 'ltorres'
  AND hash_contrasena = '$2a$10$h3AZ/SYsMB7J6aoLSAhAIOJxAbiga8eOCtXXPoP.jmUY/9GXRQauu';

UPDATE auth.usuarios
SET hash_contrasena = crypt('Tienda123*', gen_salt('bf', 12))
WHERE nombre_usuario = 'cmendoza'
  AND hash_contrasena = '$2a$10$h3AZ/SYsMB7J6aoLSAhAIOJxAbiga8eOCtXXPoP.jmUY/9GXRQauu';

UPDATE auth.usuarios
SET hash_contrasena = crypt('Andina123*', gen_salt('bf', 12))
WHERE nombre_usuario = 'mparedes'
  AND hash_contrasena = '$2a$10$h3AZ/SYsMB7J6aoLSAhAIOJxAbiga8eOCtXXPoP.jmUY/9GXRQauu';

-- 2. Registrar hallazgos de auditoría global (sin empresa_id) como MITIGADO
INSERT INTO core.vulnerabilidades_seguridad (
    codigo, titulo, categoria, severidad, estado, componente_afectado,
    descripcion, impacto_estimado, plan_remediacion, solucion_aplicada,
    reportado_por_usuario_id, mitigado_por_usuario_id, fecha_deteccion, fecha_mitigacion
)
SELECT
    v.codigo,
    v.titulo,
    v.categoria,
    v.severidad,
    'MITIGADO',
    v.componente,
    v.descripcion,
    v.impacto,
    v.plan,
    v.solucion,
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    now(),
    now()
FROM (VALUES
    (
        'SEC-2026-018',
        'Bypass de Autenticación por Credenciales Fijas Hardcodeadas y Comparación en Texto Plano',
        'A07: Fallas de Identificación y Autenticación',
        'CRITICA',
        'backend (AuthServiceImpl.java)',
        'AuthServiceImpl permitía autenticar o cambiar contraseña mediante comparación directa en texto plano contra hash_contrasena o mediante un método hardcodeado isKnownTestPasswordMatch(), dejando activas las contraseñas fijas incluso tras rotar credenciales.',
        'Compromiso total de cuentas administrativas y operativas aun después de cambio obligatorio o rotación de clave.',
        'Eliminar comparaciones en texto plano y credenciales fijas en código, migrando hashes semilla a BCrypt factor 12 real.',
        'Se eliminaron request.password().equals(...) e isKnownTestPasswordMatch() de AuthServiceImpl.java, exigiendo exclusivamente BCryptPasswordEncoder(12) y migrando los hashes iniciales en PostgreSQL.'
    ),
    (
        'SEC-2026-019',
        'Vulnerabilidad BOLA Cross-Tenant en Edición de Usuarios y Revocación/Bloqueo de Sesiones',
        'A01: Pérdida de Control de Acceso (Broken Access Control)',
        'CRITICA',
        'backend (UsersController.java / SessionController.java)',
        'PUT /api/v1/users/{userId} no verificaba que el usuario objetivo perteneciera al negocio del administrador solicitante, permitiendo secuestrar o modificar usuarios de otra empresa (incluido SuperAdmin). Igualmente, los endpoints de revocación de sesión y bloqueo de usuario carecían de validación de tenant.',
        'Escalada de privilegios, toma de control de cuentas entre empresas y denegación de servicio contra administradores globales.',
        'Validar pertenencia del usuario y de la sesión al empresa_id del administrador autenticado antes de cualquier mutación.',
        'Se incorporó validateUserBelongsToBusiness en UsersController.updateUserWithBusinessAndBranches y validaciones de aislamiento multitenant en SessionService/SessionController para revokeSession y lockUserAndRevokeSessions.'
    ),
    (
        'SEC-2026-020',
        'Evasión de Política CORS por Sufijos Comodín de Dominio y Falta de Pinning de Algoritmo JWT',
        'A05: Configuración de Seguridad Defectuosa (Security Misconfiguration)',
        'ALTA',
        'backend (CorsAndWebConfig.java / JwtTokenService.java)',
        'CorsAndWebConfig usaba patrones abiertos como https://localhost* y https://*.bevadmin.com* con allowCredentials(true), aceptando orígenes externos maliciosos como https://localhost.attacker.com. Además, JwtTokenService no fijaba explícitamente el encabezado alg=HS256 antes de verificar el MAC.',
        'Exposición a peticiones autenticadas cross-origin desde dominios controlados por un atacante y riesgo de confusión algorítmica en JWT.',
        'Restringir comodines CORS exclusivamente al puerto (:[*]) y dominios exactos, y fijar alg=HS256 en la validación de tokens.',
        'Se reemplazaron los patrones en CorsAndWebConfig por comodines estrictos de puerto (http://localhost:[*], https://*.bevadmin.com) y se agregó verificación explícita JWSAlgorithm.HS256 en JwtTokenService.parseAndValidateToken().'
    ),
    (
        'SEC-2026-021',
        'Ausencia de Revocación de Sesiones Activas, Control Anti-Reuso y Complejidad en Cambio de Clave',
        'A07: Fallas de Identificación y Autenticación',
        'ALTA',
        'backend (AuthServiceImpl.java / ChangePasswordRequest.java)',
        'El endpoint /api/v1/auth/change-password no bloqueaba cuentas bloqueadas/inactivas, no contabilizaba intentos fallidos, permitía reutilizar la contraseña actual vencida, carecía de validación de complejidad/límite BCrypt y no invalidaba sesiones previas tras cambiar la clave.',
        'Fuerza bruta sobre el endpoint de cambio de clave, evasión de rotación de 90 días y persistencia de sesiones comprometidas tras cambio de credenciales.',
        'Exigir complejidad y longitud máxima (128), contabilizar intentos fallidos, impedir reutilización de clave y revocar sesiones activas previas.',
        'Se endureció ChangePasswordRequest con @Size(min=8, max=128) y @Pattern de complejidad, y en AuthServiceImpl.changePassword() se agregó validación de bloqueo, conteo de fallos, rechazo de reutilización y revocación automática de sesiones previas.'
    )
) AS v(codigo, titulo, categoria, severidad, componente, descripcion, impacto, plan, solucion)
WHERE NOT EXISTS (
    SELECT 1 FROM core.vulnerabilidades_seguridad existing
    WHERE UPPER(TRIM(existing.codigo)) = v.codigo
);
