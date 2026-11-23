-- ============================================================================
-- Migración V18: Registro de Nuevos Hallazgos de Auditoría y Seguridad Defensiva
-- Skill Cybersecurity Senior: Validación integral de Backends y Frontend
-- ============================================================================

SET search_path TO core, auth, rbac, inventario, ventas, compras, public;

INSERT INTO core.vulnerabilidades_seguridad (
    empresa_id, codigo, titulo, categoria, severidad, estado,
    componente_afectado, descripcion, impacto_estimado, plan_remediacion, solucion_aplicada,
    reportado_por_usuario_id, mitigado_por_usuario_id, fecha_deteccion, fecha_mitigacion
) VALUES
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-008',
    'Falla de Control de Autorización de Objeto y Función (BOLA/BFLA) en Consulta de Sedes y Negocios',
    'A01: Pérdida de Control de Acceso (Broken Access Control)',
    'ALTA',
    'MITIGADO',
    'backend (OrganizationController.java)',
    'Los métodos listBusinesses y listBranches permitían el acceso sin forzar validación estricta de AuthenticatedUserPrincipal, posibilitando que peticiones sin contexto de sesión o con parámetros manipulados consultaran locales de otros negocios matriz.',
    'Exposición no autorizada de sedes, locales comerciales y metadatos de facturación entre diferentes empresas del sistema multi-tenant.',
    'Inyectar @AuthenticationPrincipal AuthenticatedUserPrincipal en ambos endpoints y forzar aislamiento estricto de businessCode para usuarios no-superadmin.',
    'Se refactorizaron listBusinesses y listBranches en OrganizationController.java inyectando @AuthenticationPrincipal y garantizando aislamiento estricto por negocio matriz.',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '3 hours',
    now()
),
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-009',
    'Ausencia de Encabezados de Seguridad Defensiva y Protección de Transporte en Microservicio de Identidad',
    'A05: Configuración de Seguridad Defectuosa (Security Misconfiguration)',
    'ALTA',
    'MITIGADO',
    'auth-service (SecurityConfig.java)',
    'El SecurityFilterChain del microservicio de autenticación e identidad no configuraba encabezados de seguridad HTTP (HSTS, FrameOptions DENY, X-Content-Type-Options nosniff ni protección XSS) ni integraba Customizer.withDefaults() en CORS.',
    'Exposición del proveedor centralizado de identidad (IdP) a ataques de Clickjacking, MIME sniffing y degradación de canal TLS.',
    'Configurar bloque http.headers(...) con HSTS max-age 31536000, frameOptions DENY y nosniff en la configuración de Spring Security.',
    'Se añadieron directivas headers() y cors() en SecurityConfig.java de auth-service habilitando HSTS de 1 año con subdominios, FrameOptions DENY, nosniff y CORS institucional.',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '2 hours',
    now()
),
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-010',
    'Evasión de Política de Rotación y Carencia de Complejidad en Renovación de Contraseñas',
    'A07: Fallas de Identificación y Autenticación',
    'MEDIA',
    'MITIGADO',
    'auth-service (ChangePasswordRequest.java / AuthServiceImpl.java)',
    'La renovación de credenciales en auth-service carecía de validación de complejidad mediante expresiones regulares y no validaba la no-reutilización de la contraseña activa, permitiendo a usuarios renovar con su misma clave o claves débiles.',
    'Bypass de la política de caducidad obligatoria de contraseñas de 90 días y uso de contraseñas triviales vulnerables a ataques de diccionario.',
    'Agregar validación @Pattern con mayúsculas, minúsculas, números y caracteres especiales en ChangePasswordRequest y rechazar contraseñas idénticas a la actual en AuthServiceImpl.',
    'Se incorporó validación regex estricta en ChangePasswordRequest y se bloqueó en AuthServiceImpl la reutilización de la contraseña activa con registro en la bitácora de auditoría inmutable.',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '2 hours',
    now()
),
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-011',
    'Restricción Incompleta de Orígenes en CSP para Comunicación con Servicio IdP',
    'A05: Configuración de Seguridad Defectuosa (Security Misconfiguration)',
    'MEDIA',
    'MITIGADO',
    'dev-frontend (nginx.conf)',
    'La política Content-Security-Policy en Nginx no contemplaba el puerto 8081 del microservicio de autenticación en su directiva connect-src, ni contaba con proxy inverso para rutas IdP.',
    'Bloqueo de peticiones legítimas del navegador hacia el servicio de identidad o requerimiento de configuraciones laxas de CSP.',
    'Incluir http://localhost:8081 y http://127.0.0.1:8081 en connect-src y configurar un bloque location /auth/ hacia dev-auth-service.',
    'Se actualizó nginx.conf en el frontend autorizando el puerto 8081 en connect-src y habilitando el proxy inverso hacia dev-auth-service.',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '1 hour',
    now()
),
(
    'a0000000-0000-4000-8000-000000000001',
    'SEC-2026-012',
    'Riesgo de Inyección DOM y Escape de Iframe en Impresión de Comprobantes de Venta',
    'A03: Inyección (Injection Flaws)',
    'BAJA',
    'MITIGADO',
    'frontend (sale-receipt-view.component.ts)',
    'La generación de iframe para la impresión de tickets de venta no definía atributos de sandboxing defensivo, dejando abierta la posibilidad de manipulación del contexto de ventana.',
    'Potencial escape de iframe y manipulación del contexto de ventana durante la invocación del diálogo nativo de impresión.',
    'Configurar atributo sandbox restrictivo en el elemento iframe dinámico.',
    'Se configuró sandbox con allow-modals, allow-same-origin y allow-scripts en los iframes de impresión de tickets y facturas en sale-receipt-view.component.ts.',
    '11111111-1111-4111-8111-111111111101',
    '11111111-1111-4111-8111-111111111101',
    now() - interval '30 minutes',
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
