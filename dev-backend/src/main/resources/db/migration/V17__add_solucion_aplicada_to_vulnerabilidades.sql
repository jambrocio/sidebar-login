-- ============================================================================
-- Migración V17: Agregar campo solucion_aplicada en Vulnerabilidades de Seguridad
-- Permite registrar cuál fue la solución técnica implementada para mitigar el hallazgo.
-- ============================================================================

SET search_path TO core, auth, rbac, inventario, ventas, compras, public;

-- 1. Agregar columna solucion_aplicada si no existe
ALTER TABLE core.vulnerabilidades_seguridad
ADD COLUMN IF NOT EXISTS solucion_aplicada TEXT;

COMMENT ON COLUMN core.vulnerabilidades_seguridad.solucion_aplicada IS 'Descripción técnica de la solución o fix implementado para mitigar el problema reportado';

-- 2. Poblar soluciones aplicadas para los hallazgos ya mitigados
UPDATE core.vulnerabilidades_seguridad
SET solucion_aplicada = 'Se configuró la cabecera Content-Security-Policy (CSP) en nginx.conf con directivas estrictas (default-src ''self''; script-src ''self''; style-src ''self'' ''unsafe-inline''; font-src ''self'' data:; connect-src ''self'') neutralizando inyecciones XSS y fuentes no autorizadas.'
WHERE codigo = 'SEC-2026-001' AND solucion_aplicada IS NULL;

UPDATE core.vulnerabilidades_seguridad
SET solucion_aplicada = 'Se implementó validación preventiva existsByCode en CouponsServiceImpl.java, control de unicidad compuesto (empresa_id, UPPER(codigo)) en base de datos y captura explícita de DataIntegrityViolationException.'
WHERE codigo = 'SEC-2026-002' AND solucion_aplicada IS NULL;

UPDATE core.vulnerabilidades_seguridad
SET solucion_aplicada = 'Se refactorizó el Dockerfile de backend y frontend adoptando builds multietapa (multi-stage) con imágenes ligeras Alpine y ejecución bajo usuario sin privilegios USER spring:spring (UID 10001).'
WHERE codigo = 'SEC-2026-003' AND solucion_aplicada IS NULL;

UPDATE core.vulnerabilidades_seguridad
SET solucion_aplicada = 'Se configuró GlobalExceptionHandler bajo estándar RFC 7807 (Problem Details), suprimiendo trazas de stack traces en respuestas al cliente y registrando logs de auditoría estructurados internamente.'
WHERE codigo = 'SEC-2026-004' AND solucion_aplicada IS NULL;

UPDATE core.vulnerabilidades_seguridad
SET solucion_aplicada = 'Se añadieron directivas server_tokens off;, X-Content-Type-Options nosniff, X-Frame-Options DENY y cabecera HSTS en la configuración del proxy Nginx y Traefik.'
WHERE codigo = 'SEC-2026-005' AND solucion_aplicada IS NULL;

UPDATE core.vulnerabilidades_seguridad
SET solucion_aplicada = 'Se activó endurecimiento en Spring Security habilitando protección contra Clickjacking (frameOptions SAMEORIGIN), sniffing MIME y forzado de canal seguro HTTPS.'
WHERE codigo = 'SEC-2026-006' AND solucion_aplicada IS NULL;

UPDATE core.vulnerabilidades_seguridad
SET solucion_aplicada = 'Se incorporó validación estricta de esquema con @Size(min = 8) y expresión regular de complejidad (mayúscula, minúscula, número y símbolo) en CreateUserRequest, cifrando con BCrypt adaptativo.'
WHERE codigo = 'SEC-2026-007' AND solucion_aplicada IS NULL;
