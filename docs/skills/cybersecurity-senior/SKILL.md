---
name: cybersecurity-senior
description: >-
  Estándar y marco maestro de Ciberseguridad Defensiva, Auditoría de Seguridad y Hacking Ético
  orientado a la prevención, detección y mitigación de riesgos en aplicaciones web, APIs,
  redes, bases de datos y contenedores Docker. Especializado en evaluación y blindaje contra el
  OWASP Top 10 y OWASP API Security Top 10, análisis de vulnerabilidades estáticas y dinámicas
  (SAST/DAST/SCA), endurecimiento de infraestructura (Hardening) y cumplimiento de estándares CIS.
---

# 🛡️ Estándar Maestro de Ciberseguridad Defensiva, Auditoría de Seguridad y Hacking Ético Senior

Este documento establece el marco integral de ingeniería de seguridad, auditoría defensiva y mejores prácticas de aseguramiento de software empresarial. Su objetivo es garantizar la resiliencia técnica de los activos digitales frente a vectores de amenaza modernos mediante un enfoque proactivo de **Defensa en Profundidad (Defense in Depth)**, **Seguridad por Diseño (Security by Design)** y **Cumplimiento de Estándares Internacionales (OWASP Top 10, OWASP API Security Top 10 y CIS Benchmarks)**.

---

## 1. Filosofía y Principios Rectores de Seguridad Defensiva

El rol del especialista en seguridad y auditoría ética de nivel Senior se fundamenta en cinco pilares universales:

1. **Principio de Confianza Cero (Zero Trust Architecture)**:
   - "Nunca confiar, siempre verificar". Cada solicitud, usuario, microservicio y componente de red debe autenticarse, autorizarse y cifrarse explícitamente sin asumir seguridad perimetral.

2. **Principio del Menor Privilegio (Principle of Least Privilege - PoLP)**:
   - Usuarios, servicios de aplicación y contenedores deben operar únicamente con los permisos mínimos indispensables para cumplir su función operativa.

3. **Superficie Mínima de Ataque (Attack Surface Reduction)**:
   - Eliminación proactiva de puertos expuestos, dependencias en desuso, endpoints innecesarios, métodos HTTP deshabilitados y opciones de depuración en entornos productivos.

4. **Defensa en Profundidad (Layered Defense)**:
   - La seguridad no recae en un único punto. Se implementan controles concéntricos: firewall perimetral, proxy de aplicación/WAF, validación estricta de entrada, políticas de autorización desacopladas, cifrado en tránsito/reposo y monitoreo de eventos.

5. **Seguridad Shift-Left en el Ciclo de Vida del Software (SSDLC)**:
   - Detección temprana de debilidades de seguridad en fases de diseño, desarrollo y pruebas automatizadas antes del despliegue productivo.

---

## 2. Marco OWASP Top 10: Prevención y Mitigación Integral

### A01: Pérdida de Control de Acceso (Broken Access Control)
- **Riesgo:** Usuarios que acceden o modifican recursos ajenos manipulando identificadores de objeto o escalando privilegios verticales/horizontales.
- **Estrategia Defensiva:**
  - Aplicar control de acceso basado en roles y atributos (RBAC / ABAC) en la capa de negocio, nunca únicamente en el frontend.
  - Validar siempre la pertenencia del recurso: `recurso.businessId == usuarioAutenticado.businessId` antes de cualquier operación de lectura o mutación.
  - Implementar denegación por defecto: cualquier ruta o endpoint sin regla de autorización explícita debe ser inaccesible.

### A02: Fallas Criptográficas (Cryptographic Failures)
- **Riesgo:** Exposición o manipulación de datos en tránsito o en reposo debido a algoritmos obsoletos o gestión descuidada de secretos.
- **Estrategia Defensiva:**
  - Canal de comunicación cifrado exclusivamente con TLS 1.3 o TLS 1.2 estricto.
  - Criptografía de contraseñas mediante funciones de derivación de claves adaptativas: **Argon2id** o **bcrypt** con factor de trabajo adecuado.
  - Uso de criptografía asimétrica moderna para firma de tokens (ej. RSA con SHA-256 / RS256 o Ed25519) con claves públicas expuestas mediante especificación JWKS (RFC 7517).
  - Cero secretos en código fuente: inyección mediante variables de entorno aisladas o gestores de secretos dedicados.

### A03: Inyección (Injection Flaws)
- **Riesgo:** Inclusión de datos no confiables interpretados erróneamente como comandos o consultas en bases de datos, sistemas operativos o parsers.
- **Estrategia Defensiva:**
  - Uso mandatorio de consultas parametrizadas (**Prepared Statements**) o capas de persistencia ORM que aíslen los datos del plano de ejecución.
  - Validación de esquemas de entrada estricta y tipada en cada capa de la API (mediante bibliotecas de validación de modelos como Bean Validation o Zod).
  - Codificación y escape contextual de salidas en capas de presentación para neutralizar inyecciones de interfaz.

### A04: Diseño Inseguro (Insecure Design)
- **Riesgo:** Ausencia de controles arquitectónicos previos a la codificación, dejando vacíos de lógica de negocio o abuso de recursos.
- **Estrategia Defensiva:**
  - Realización de modelado de amenazas sistemático (metodología STRIDE) en la definición de nuevas capacidades.
  - Establecimiento de límites de consumo por cliente (Rate Limiting) y políticas de expiración en operaciones críticas.
  - Implementación de patrones de fallo seguro (Fail-Secure): ante un error inesperado, el sistema deniega el acceso y registra la excepción sin exponer información técnica.

### A05: Configuración de Seguridad Defectuosa (Security Misconfiguration)
- **Riesgo:** Ajustes por defecto, servicios innecesarios activos, mensajes de error detallados con volcados de memoria (stack traces) o cabeceras faltantes.
- **Estrategia Defensiva:**
  - Configuración mandatoria de cabeceras de respuesta HTTP seguras:
    - `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Content-Security-Policy (CSP)` con directivas restringidas.
  - Manejo uniforme de errores de API mediante el estándar RFC 7807 (Problem Details), suprimiendo trazas internas al cliente.
  - Desactivación rigurosa de paneles de administración y perfiles de depuración en entornos productivos.

### A06: Componentes Vulnerables y Obsoletos (Vulnerable Components)
- **Riesgo:** Uso de bibliotecas de terceros o imágenes base con vulnerabilidades conocidas reportadas en bases de datos públicas (CVE).
- **Estrategia Defensiva:**
  - Mantener un inventario continuo y actualizado de dependencias (SBOM - Software Bill of Materials).
  - Integración de escaneos automáticos de dependencias de software (SCA) en la integración continua (`npm audit`, `trivy fs`, etc.).
  - Política de mantenimiento preventivo y aplicación oportuna de parches de seguridad.

### A07: Fallas de Identificación y Autenticación
- **Riesgo:** Mecanismos débiles de gestión de identidad que permiten ataques de fuerza bruta, secuestro de sesión o reutilización de credenciales.
- **Estrategia Defensiva:**
  - Protección de endpoints de inicio de sesión mediante limitación de intentos y retardos progresivos.
  - Expiración breve de tokens de acceso (Access Tokens) combinada con rotación segura de tokens de actualización (Refresh Tokens).
  - Invalidación centralizada de sesiones ante eventos de cierre de sesión o cambio de credenciales.

### A08: Fallas de Integridad de Software y Datos
- **Riesgo:** Dependencias o artefactos alterados en tránsito, deserialización insegura o pipelines de despliegue no protegidos.
- **Estrategia Defensiva:**
  - Fijación estricta de versiones mediante archivos de bloqueo (`package-lock.json`, hashes SHA-256 de imágenes base).
  - Deserialización segura y tipada, evitando la ejecución de código dinámico a partir de cadenas no estructuradas.
  - Verificación de la integridad de las canalizaciones de entrega continua.

### A09: Fallas en el Registro y Monitoreo de Seguridad
- **Riesgo:** Incapacidad de detectar intrusiones o actividades sospechosas en tiempo oportuno debido a registros insuficientes.
- **Estrategia Defensiva:**
  - Registro auditable de eventos relevantes de seguridad: intentos de autenticación fallidos, cambios de roles, acceso a datos sensibles y transacciones financieras.
  - Formato estructurado de logs (JSON) preparado para ingestión en sistemas de gestión de eventos (SIEM).
  - Anonimización y sanitización de registros para evitar la inclusión de datos personales (PII) o credenciales en los logs.

### A10: Falsificación de Solicitudes del Lado del Servidor (SSRF)
- **Riesgo:** El servidor web realiza peticiones de red hacia destinos arbitrarios controlados por el usuario, pudiendo alcanzar servicios internos o metadatos de nube.
- **Estrategia Defensiva:**
  - Validación mediante lista blanca estricta (Allowlist) de dominios, esquemas (solo `https://`) y puertos autorizados.
  - Bloqueo explícito de resoluciones hacia direcciones IP privadas (rangos RFC 1918) y servicios de metadatos locales (ej. `169.254.169.254`).

---

## 3. Seguridad y Blindaje en Redes y Capa de Transporte

1. **Configuración de Proxy Reverso (Nginx / Edge Gateway)**:
   - Configuración de TLS con suite de cifrado robusta y deshabilitación de protocolos legados (SSLv3, TLS 1.0, TLS 1.1).
   - Ocultamiento de cabeceras de identificación de versión de servidor (`server_tokens off;`).
   - Políticas de mitigación de saturación de peticiones mediante módulos de limitación de frecuencia (`limit_req_zone`).

2. **Control de Origen Cruzado (CORS)**:
   - Declaración explícita de los dominios autorizados de la organización.
   - Prohibición del uso de comodines (`*`) en presencia de credenciales o cabeceras de autorización.

3. **Segmentación de Redes en Contenedores**:
   - Aislamiento de capas: la base de datos y los microservicios internos deben pertenecer a redes de puente privadas sin mapeo directo de puertos hacia el host exterior.

---

## 4. Endurecimiento de Bases de Datos y Almacenamiento

1. **Gestión de Cuentas y Privilegios**:
   - Separación estricta de usuarios de base de datos: el usuario de la aplicación no debe poseer privilegios de superusuario ni facultades administrativas de esquema (DDL) en tiempo de ejecución.

2. **Cifrado y Conectividad**:
   - Conexiones obligatoriamente autenticadas y cifradas vía SSL/TLS entre la aplicación y el motor de base de datos.
   - Respaldo automatizado periódico con verificación de integridad y almacenamiento cifrado fuera del entorno productivo.

3. **Auditoría Transaccional**:
   - Registro de marcas de tiempo, usuario emisor y origen en las tablas transaccionales del negocio para asegurar la no-repudiación.

---

## 5. Seguridad en Contenedores Docker (DevSecOps Shift-Left)

1. **Ejecución sin Privilegios (Rootless Containers)**:
   - Los contenedores deben ejecutar sus procesos bajo un usuario sin privilegios explícitamente definido (`USER 10001:10001` o `USER appuser`).

2. **Imágenes Base Mínimas y Seguras**:
   - Utilización de imágenes oficiales mínimas (Alpine Linux, Distroless o Debian Slim) reduciendo el número de binarios ejecutables presentes en el sistema de archivos.

3. **Control de Recursos y Superficie de Montaje**:
   - Asignación de límites de memoria y cuotas de procesador para prevenir degradación por uso indebido.
   - Montaje de sistemas de archivos de solo lectura en contenedores de aplicación donde no se requiera escritura local persistente.
   - Escaneo regular de imágenes de contenedor con herramientas de análisis de vulnerabilidades (`trivy image`).

---

## 6. Lista de Verificación para Auditorías de Seguridad (Checklist Defensivo)

| Categoría | Elemento a Verificar | Criterio de Aprobación |
| :--- | :--- | :--- |
| **Autenticación** | Manejo de Tokens | Tokens firmados criptográficamente, tiempo de expiración acotado, claves asimétricas rotadas. |
| **Autorización** | Control Multitenant | Todas las consultas y mutaciones restringen el ámbito por el identificador del negocio (`businessId`). |
| **Datos** | Consultas a BD | 100% de consultas parametrizadas o a través de ORM tipado. Sin concatenación dinámica. |
| **Cabeceras** | Seguridad HTTP | Presencia de HSTS, CSP, X-Frame-Options y X-Content-Type-Options en todas las respuestas. |
| **Secretos** | Código Fuente | Cero credenciales, tokens o contraseñas en repositorios o historial Git. |
| **Docker** | Usuarios de Contenedor | Directiva `USER` no root verificada en todos los Dockerfiles de producción. |
| **Dependencias** | Auditoría de Paquetes | Cero vulnerabilidades críticas o de severidad alta reportadas sin mitigar. |
