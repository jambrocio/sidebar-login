---
name: cybersecurity-senior
description: >-
  Estándar y marco maestro de Ciberseguridad Defensiva, Auditoría de Seguridad, Inteligencia de Amenazas
  y Hacking Ético orientado a la prevención, detección y mitigación de riesgos en aplicaciones web, APIs,
  modelos de IA/LLMs, cadenas de suministro CI/CD, redes, bases de datos y contenedores Docker. Especializado
  en blindaje contra OWASP Top 10, OWASP API Security Top 10, OWASP LLM Top 10, vectores modernos de ataque
  (Supply Chain, AitM, LOLBins, Token Theft, Ransomware), framework MITRE ATT&CK y estándares CIS.
---

# 🛡️ Estándar Maestro de Ciberseguridad Defensiva, Auditoría de Seguridad y Hacking Ético Senior

Este documento establece el marco integral de ingeniería de seguridad defensiva, inteligencia de amenazas, auditoría técnica y aseguramiento de software empresarial. Su objetivo es garantizar la resiliencia técnica de los activos digitales frente a vectores de amenaza modernos mediante un enfoque proactivo de **Defensa en Profundidad (Defense in Depth)**, **Seguridad por Diseño (Security by Design)**, **Asunción de Brecha (Assume Breach)** y cumplimiento riguroso de estándares internacionales (**OWASP Top 10**, **OWASP API Security Top 10**, **OWASP Top 10 for LLM**, **MITRE ATT&CK** y **CIS Benchmarks**).

---

## 1. Filosofía y Principios Rectores de Seguridad Defensiva

El rol del especialista en seguridad y auditoría ética de nivel Senior se fundamenta en seis pilares universales:

1. **Principio de Confianza Cero (Zero Trust Architecture)**:
   - "Nunca confiar, siempre verificar". Cada solicitud, usuario, microservicio, proceso y componente de red debe autenticarse, autorizarse y cifrarse explícitamente sin asumir seguridad perimetral.

2. **Principio del Menor Privilegio (Principle of Least Privilege - PoLP)**:
   - Usuarios, servicios de aplicación, procesos y contenedores deben operar únicamente con los permisos mínimos indispensables para cumplir su función operativa.

3. **Superficie Mínima de Ataque (Attack Surface Reduction)**:
   - Eliminación proactiva de puertos expuestos, dependencias en desuso, endpoints innecesarios, métodos HTTP deshabilitados, metadatos expuestos y opciones de depuración en entornos productivos.

4. **Defensa en Profundidad (Layered Defense)**:
   - La seguridad no recae en un único punto. Se implementan controles concéntricos: WAF/Edge, proxy inverso, validación estricta de esquemas, políticas de autorización desacopladas (RBAC/ABAC), cifrado en tránsito/reposo, aislamiento de ejecución y monitoreo de eventos.

5. **Postura de Asunción de Brecha (Assume Breach Mindset)**:
   - Diseñar la arquitectura asumiendo que el adversario ya cuenta con credenciales válidas o ha comprometido un nodo de la red. La prioridad radica en la contención, segmentación, detección temprana del movimiento lateral y minimización del radio de impacto (*blast radius*).

6. **Seguridad Shift-Left en el Ciclo de Vida del Software (SSDLC)**:
   - Detección temprana de debilidades de seguridad en fases de diseño, desarrollo y pruebas automatizadas (SAST, DAST, SCA) antes del despliegue productivo.

---

## 2. Marco OWASP Top 10: Prevención y Mitigación Integral

### A01: Pérdida de Control de Acceso (Broken Access Control)
- **Riesgo:** Usuarios que acceden o modifican recursos ajenos manipulando identificadores de objeto o escalando privilegios verticales/horizontales.
- **Estrategia Defensiva:**
  - Aplicar control de acceso basado en roles y atributos (RBAC / ABAC) en la capa de negocio, nunca únicamente en el frontend.
  - Validar siempre la pertenencia del recurso: `recurso.businessId == usuarioAutenticado.businessId` antes de cualquier operación de lectura o mutación.
  - Implementar denegación por defecto (*deny-by-default*): cualquier ruta o endpoint sin regla de autorización explícita debe ser inaccesible.

### A02: Fallas Criptográficas (Cryptographic Failures)
- **Riesgo:** Exposición o manipulación de datos en tránsito o en reposo debido a algoritmos obsoletos o gestión descuidada de secretos.
- **Estrategia Defensiva:**
  - Canal de comunicación cifrado exclusivamente con TLS 1.3 o TLS 1.2 estricto con perfect forward secrecy (PFS).
  - Criptografía de contraseñas mediante funciones de derivación de claves adaptativas con sal única: **Argon2id** (preferido) o **bcrypt** con factor de trabajo adecuado.
  - Uso de criptografía asimétrica moderna para firma de tokens (ej. RSA con SHA-256 / RS256 o Ed25519) con claves públicas expuestas mediante especificación JWKS (RFC 7517).
  - Cero secretos en código fuente: inyección mediante variables de entorno aisladas o gestores de secretos dedicados (HashiCorp Vault, AWS Secrets Manager, etc.).

### A03: Inyección (Injection Flaws)
- **Riesgo:** Inclusión de datos no confiables interpretados erróneamente como comandos o consultas en bases de datos, sistemas operativos o parsers.
- **Estrategia Defensiva:**
  - Uso mandatorio de consultas parametrizadas (**Prepared Statements**) o capas de persistencia ORM que aíslen los datos del plano de ejecución.
  - Validación de esquemas de entrada estricta y fuertemente tipada en cada capa de la API (mediante bibliotecas de validación de modelos como Bean Validation o Zod).
  - Codificación y escape contextual de salidas en capas de presentación para neutralizar inyecciones de interfaz (XSS).

### A04: Diseño Inseguro (Insecure Design)
- **Riesgo:** Ausencia de controles arquitectónicos previos a la codificación, dejando vacíos de lógica de negocio o abuso de recursos.
- **Estrategia Defensiva:**
  - Realización de modelado de amenazas sistemático (metodología STRIDE / PASTA) en la definición de nuevas capacidades.
  - Establecimiento de límites de consumo por cliente (Rate Limiting) y políticas de expiración en operaciones críticas.
  - Implementación de patrones de fallo seguro (*Fail-Secure*): ante un error inesperado, el sistema deniega el acceso y registra la excepción sin exponer información técnica.

### A05: Configuración de Seguridad Defectuosa (Security Misconfiguration)
- **Riesgo:** Ajustes por defecto, servicios innecesarios activos, mensajes de error detallados con volcados de memoria (*stack traces*) o cabeceras faltantes.
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
  - Mantener un inventario continuo y actualizado de dependencias (SBOM - Software Bill of Materials en formato CycloneDX o SPDX).
  - Integración de escaneos automáticos de dependencias de software (SCA) en la integración continua (`npm audit`, `trivy fs`, `snyk`, `owasp-dependency-check`).
  - Política de mantenimiento preventivo y aplicación oportuna de parches de seguridad.

### A07: Fallas de Identificación y Autenticación
- **Riesgo:** Mecanismos débiles de gestión de identidad que permiten ataques de fuerza bruta, secuestro de sesión o reutilización de credenciales.
- **Estrategia Defensiva:**
  - Protección de endpoints de autenticación mediante limitación de intentos, bloqueos temporales adaptativos y retardos progresivos.
  - Expiración breve de tokens de acceso (Access Tokens) combinada con rotación segura de tokens de actualización (Refresh Tokens).
  - Invalidación centralizada de sesiones ante eventos de cierre de sesión o cambio de credenciales.

### A08: Fallas de Integridad de Software y Datos
- **Riesgo:** Dependencias o artefactos alterados en tránsito, deserialización insegura o pipelines de despliegue no protegidos.
- **Estrategia Defensiva:**
  - Fijación estricta de versiones mediante archivos de bloqueo (`package-lock.json`, hashes SHA-256 de imágenes base).
  - Deserialización segura y tipada, evitando la ejecución de código dinámico a partir de cadenas no estructuradas.
  - Verificación de la integridad de las canalizaciones de entrega continua mediante firmas criptográficas.

### A09: Fallas en el Registro y Monitoreo de Seguridad
- **Riesgo:** Incapacidad de detectar intrusiones o actividades sospechosas en tiempo oportuno debido a registros insuficientes.
- **Estrategia Defensiva:**
  - Registro auditable de eventos relevantes de seguridad: intentos de autenticación fallidos, cambios de roles, accesos anómalos a datos sensibles y transacciones financieras.
  - Formato estructurado de logs (JSON) preparado para ingestión en sistemas de gestión de eventos e información de seguridad (SIEM).
  - Anonimización y sanitización de registros para evitar la inclusión de datos personales (PII) o credenciales en los logs.

### A10: Falsificación de Solicitudes del Lado del Servidor (SSRF)
- **Riesgo:** El servidor web realiza peticiones de red hacia destinos arbitrarios controlados por el usuario, pudiendo alcanzar servicios internos o metadatos de nube.
- **Estrategia Defensiva:**
  - Validación mediante lista blanca estricta (*Allowlist*) de dominios, esquemas (solo `https://`) y puertos autorizados.
  - Bloqueo explícito de resoluciones hacia direcciones IP privadas (rangos RFC 1918) y servicios de metadatos locales (ej. `169.254.169.254`).

---

## 3. Marco OWASP API Security Top 10 y Amenazas Automatizadas

Las APIs constituyen el objetivo primario en arquitecturas modernas de microservicios y Single Page Applications:

1. **API1 - BOLA (Broken Object Level Authorization)**:
   - *Ataque*: Manipulación de IDs numéricos o UUIDs en URIs (`GET /api/v1/invoices/9842`) para consultar registros de otros usuarios.
   - *Mitigación*: Validación de contexto tenant/ownership en cada consulta a la base de datos a nivel de repositorio o filtro de autorización.

2. **API2 - Broken Authentication**:
   - *Ataque*: Credential stuffing, debilidad en flujos OAuth2 o falta de verificación de firma en tokens JWT (`alg: none` o confusión de algoritmo HMAC vs RSA).
   - *Mitigación*: Validación estricta del encabezado `alg`, verificación de firma con claves públicas JWKS, limitación de tasa agresiva por IP y huella digital del cliente.

3. **API3 - Broken Object Property Level Authorization (Mass Assignment & Excessive Data Exposure)**:
   - *Ataque*: Enviar campos adicionales en el cuerpo JSON (ej. `{"isAdmin": true}`) que el ORM mapea ciegamente, o consumir APIs que exponen el objeto entidad completo con contraseñas o datos bancarios.
   - *Mitigación*: Uso obligatorio de DTOs (*Data Transfer Objects*) explícitos para entrada y salida. Prohibición de mapeo directo entre payloads JSON y entidades de base de datos.

4. **API4 - Unrestricted Resource Consumption**:
   - *Ataque*: Solicitudes masivas de paginación (`pageSize=1000000`), consultas complejas o anidadas en GraphQL (*deep nesting query bombs*), subida de archivos sobredimensionados (*Zip Bombs* o *Billion Laughs* XML).
   - *Mitigación*: Paginación forzada con techo máximo inmutable (`maxPageSize=50`), validación estricta de límites de profundidad y costo en GraphQL, límites de tamaño de carga a nivel de Gateway (`client_max_body_size`).

5. **API5 - BFLA (Broken Function Level Authorization)**:
   - *Ataque*: Usuarios con privilegios regulares que envían peticiones a métodos administrativos cambiando el verbo HTTP (`PUT /api/admin/users`) o cambiando la ruta interna.
   - *Mitigación*: Control de autorización granular declarativo a nivel de método o controlador (`@PreAuthorize`, guards basados en permisos/scopes de OAuth).

6. **API7 - Server-Side Request Forgery en APIs**:
   - *Ataque*: APIs que procesan webhooks o importan URLs externas invocando endpoints de metadatos de nube o servicios internos sin autenticar.
   - *Mitigación*: Resolución DNS previa con validación de IP contra listas de denegación antes de despachar la conexión HTTP saliente; uso de redes de salida aisladas (*egress proxy*).

7. **API8 - Amenazas Automatizadas y Bots (Automated Threats & Credential Stuffing)**:
   - *Ataque*: Redes de bots distribuidas que prueban millones de pares de credenciales filtradas, realizan raspado agresivo (*scraping*) o agotan inventarios comerciales.
   - *Mitigación*: Protección antibot multicapa (desafíos CAPTCHA adaptativos invisibles, análisis de reputación de IP, TLS/JA4 fingerprinting, algoritmos de detección de anomalías comportamentales).

8. **API9 - Gestión Inadecuada de Inventario (Zombie & Shadow APIs)**:
   - *Ataque*: Invocación de versiones antiguas y no parcheadas de la API (`/api/v1/auth` vs `/api/v2/auth`) que quedaron expuestas sin monitoreo.
   - *Mitigación*: Documentación automatizada de contratos OpenAPI/Swagger generada desde el código, deprecación estricta con eliminación física de rutas obsoletas y escaneos de descubrimiento de endpoints.

---

## 4. Tendencias Globales en Vectores de Ataque Modernos (Threat Intelligence)

El panorama de ciberamenazas ha evolucionado hacia ataques altamente automatizados, dirigidos a la cadena de suministro, la identidad descentralizada y las tecnologías emergentes:

### 4.1. Ataques a la Cadena de Suministro de Software (Supply Chain Attacks & CI/CD Compromise)
- **Vectores de Ataque:**
  - *Dependency Confusion*: Registro de paquetes públicos maliciosos en repositorios oficiales (npm, PyPI) con nombres idénticos a paquetes internos privados de la empresa.
  - *Typosquatting*: Paquetes con nombres visualmente similares a librerías populares (ej. `cross-env` vs `crossenv`).
  - *Repo-jacking / Account Takeover de Mantenedores*: Compromiso de cuentas de desarrolladores de librerías de código abierto para publicar versiones con código malicioso silencioso.
  - *Pipeline Poisoning*: Modificación de scripts de build en GitHub Actions o GitLab CI para inyectar código durante la compilación o exfiltrar secretos de despliegue.
- **Estrategias Defensivas Senior:**
  - Configuración estricta de repositorios de artefactos privados (Nexus, Artifactory) con resolución con alcance exclusivo (*scoped packages*, ej. `@miempresa/*`).
  - Fijación mandatoria de dependencias por hash criptográfico o digest SHA-256 inmutable, no solo por etiquetas semánticas (`@v1.2.3`).
  - Generación y verificación de firmas de procedencia criptográfica de artefactos (estándar **SLSA** - Supply-chain Levels for Software Artifacts) utilizando herramientas como **Sigstore** y **Cosign**.
  - Restricción de permisos en workflows de CI/CD aplicando el principio de menor privilegio (`permissions: read-all`).

### 4.2. Vectores de Ataque en Inteligencia Artificial Generativa y LLMs (OWASP Top 10 for LLM)
- **Vectores de Ataque:**
  - *Direct Prompt Injection*: El usuario manipula las instrucciones del sistema (*system prompt*) mediante técnicas de evasión o jailbreaks para forzar comportamientos no deseados.
  - *Indirect Prompt Injection*: El modelo procesa contenido no confiable de terceros (páginas web, correos electrónicos, documentos RAG) que contiene instrucciones ocultas destinadas a exfiltrar datos o ejecutar llamadas a APIs maliciosas.
  - *Exfiltración de PII y Secretos*: El modelo memoriza o revela inadvertidamente datos sensibles presentes en su contexto o base de conocimientos vectorial (RAG).
  - *Agencia Excesiva (Excessive Agency)*: Asignar a un agente autónomo permisos de ejecución de código, consultas de escritura a BD o APIs externas sin validación humana intermedia (*Human-in-the-Loop*).
- **Estrategias Defensivas Senior:**
  - Separación formal de planos de datos: el contenido provisto por usuarios o fuentes externas nunca debe tener privilegios de instrucción de sistema.
  - Implementación de guardrails de seguridad y clasificadores de seguridad semántica a la entrada y a la salida del modelo (ej. NeMo Guardrails, Llama Guard).
  - Políticas estrictas de menor privilegio para herramientas de agentes (solo lectura por defecto; operaciones destructivas requieren confirmación criptográfica o aprobación humana interactiva).
  - Sandboxing rígido para herramientas que ejecutan código dinámico (aislamiento en microVMs efímeras sin acceso a red).

### 4.3. Ataques Avanzados contra Identidad y Sesión (Identity, Token Theft & AitM)
- **Vectores de Ataque:**
  - *Adversary-in-the-Middle (AitM) Phishing*: Herramientas como Evilginx que actúan como proxy reverso entre la víctima y el proveedor de identidad legítimo, interceptando en tiempo real tanto la contraseña como la sesión autenticada (cookies/tokens), inutilizando el MFA tradicional basado en SMS o TOTP (Google Authenticator).
  - *Robo de Tokens por Infostealers*: Malware especializado (Lumma, Redline, Vidar) que extrae las bases de datos de cookies de sesión, tokens de navegador y credenciales locales en estaciones de trabajo de usuarios o administradores.
  - *Token Tampering & Session Forgery*: Ataques dirigidos a la validez temporal o firma de tokens JWT cuando la clave privada se ve comprometida o se utiliza cifrado débil.
- **Estrategias Defensivas Senior:**
  - Transición mandatoria hacia **MFA resistente al phishing**: Adopción de **FIDO2 / WebAuthn / Passkeys**, donde la autenticación está criptográficamente vinculada al dominio legítimo (*Origin Binding*), haciendo inviable el secuestro mediante proxies AitM.
  - Implementación del estándar **DPoP (Demonstrating Proof-of-Possession at the Application Layer - RFC 9449)**: El token de acceso queda criptográficamente atado a una clave privada generada por el cliente legítimo, impidiendo su reutilización si es interceptado o robado.
  - Análisis de huella digital de conexión (JA4 / TLS Fingerprinting) y detección de saltos anómalos de IP/dispositivo dentro de la misma sesión activa.

### 4.4. Living-off-the-Land (LotL / LOLBins) y Ransomware Moderno
- **Vectores de Ataque:**
  - *LOLBins / LOLBas (Living off the Land Binaries)*: Adversarios que no descargan binarios compilados sospechosos, sino que utilizan ejecutables legítimos del propio sistema operativo (`powershell.exe`, `certutil.exe`, `wmic.exe`, `curl`, `mshta.exe`, `ssh`) para descargar payloads en memoria, evadir soluciones EDR tradicionales y mantener persistencia.
  - *Ransomware de Múltiple Extorsión (Double/Triple Extortion)*: Los ciberdelincuentes no se limitan a cifrar los datos del negocio; primero exfiltran terabytes de información sensible, amenazan con publicarla en la Dark Web, contactan directamente a los clientes de la empresa afectada y despliegan ataques DDoS extorsivos.
- **Estrategias Defensivas Senior:**
  - Endurecimiento de endpoints mediante políticas de integridad de código y control de aplicaciones (**AppLocker / Windows Defender Application Control / SELinux / AppArmor**).
  - Activación de políticas de lenguaje restringido (*Constrained Language Mode*) y auditoría completa de bloques de comandos en herramientas de scripting.
  - Monitorización y telemetría de comportamiento a nivel de proceso (Sysmon, EDR) correlacionando la creación anómala de subprocesos (ej. `nginx` o `java` ejecutando `cmd.exe` o `bash`).
  - Estrategia de respaldos inmutables (Backups *Write-Once-Read-Many* - WORM), con retención fuera de línea (*Air-Gapped*) y pruebas periódicas de restauración en frío.

### 4.5. Abuso de Metadatos Cloud y Escalada de Privilegios IAM
- **Vectores de Ataque:**
  - *Explotación de Metadata Services (IMDSv1)*: Explotación de vulnerabilidades SSRF en aplicaciones alojadas en la nube para consultar `http://169.254.169.254/latest/meta-data/` y extraer credenciales temporales de roles IAM de instancia.
  - *Permissions Sprawl / Sobreprivilegios en Cloud IAM*: Roles de servicio con políticas comodín (`*`) que permiten a un atacante con acceso a un pod o VM escalar a privilegios de administrador de suscripción/cuenta de nube.
- **Estrategias Defensivas Senior:**
  - Aplicar obligatoriamente **IMDSv2** (que exige un token de sesión en cabecera HTTP con límite de saltos de red `hop-limit=1`, neutralizando peticiones SSRF ciegas).
  - Principio de menor privilegio estricto en identidades de carga de trabajo (Workload Identity en Kubernetes / IAM Roles for Service Accounts - IRSA).

---

## 5. Mapeo Operativo MITRE ATT&CK vs Controles Defensivos

Alineación práctica entre las tácticas del adversario y la ingeniería de mitigación técnica:

| Táctica MITRE ATT&CK | Técnica / Vector Común | Control Defensivo Senior Obligatorio |
| :--- | :--- | :--- |
| **Acceso Inicial (TA0001)** | Phishing AitM, Explotación de app pública, Credential Stuffing | Passkeys FIDO2, WAF con reglas OWASP CRS, Rate Limiting adaptativo. |
| **Ejecución (TA0002)** | Inyección de Comandos, PowerShell malicioso, SQLi | Prepared Statements, Sandboxing de procesos, Deserialización segura y tipada. |
| **Persistencia (TA0003)** | Tareas programadas, webshells en directorios estáticos | Filesystem de contenedores de solo lectura (`read_only: true`), monitoreo de integridad (FIM). |
| **Evasión de Defensas (TA0005)** | LOLBins, ofuscación de payloads, manipulación de logs | Control de aplicaciones (WDAC/AppLocker), envío inmediato de logs a SIEM inmutable. |
| **Acceso a Credenciales (TA0006)** | Volcado de memoria LSASS, Infostealers, SSRF a metadatos | DPoP (RFC 9449), IMDSv2 mandatorio, deshabilitación de depuración y volcados en prod. |
| **Descubrimiento (TA0007)** | Escaneo de endpoints, enumeración de red interna | Ocultamiento de versiones de servidor (`server_tokens off`), bloqueo de respuestas verbose. |
| **Movimiento Lateral (TA0008)** | Movimiento entre microservicios con credenciales fijas | Segmentación de red privada en contenedores, Zero Trust mTLS (SPIFFE/SPIRE). |
| **Exfiltración (TA0010)** | Salida de datos vía túneles DNS, canales HTTP no autorizados | Filtrado estricto de tráfico saliente (*Egress Filtering*), inspección de tráfico por proxy. |

---

## 6. Seguridad y Blindaje en Redes y Capa de Transporte

1. **Configuración de Proxy Reverso (Nginx / Edge Gateway)**:
   - Configuración de TLS exclusivamente con suite de cifrado robusta (TLS 1.3 / TLS 1.2 ECDHE) y deshabilitación total de protocolos legados (SSLv3, TLS 1.0, TLS 1.1).
   - Ocultamiento de cabeceras de identificación de versión de servidor (`server_tokens off;`).
   - Mitigación de saturación de peticiones mediante módulos de limitación de frecuencia (`limit_req_zone` por IP y ruta sensible).

2. **Control de Origen Cruzado (CORS)**:
   - Declaración explícita de los orígenes autorizados de la organización (`Access-Control-Allow-Origin: https://app.empresa.com`).
   - Prohibición terminante del uso de comodines (`*`) en presencia de cabeceras de autorización o `Access-Control-Allow-Credentials: true`.

3. **Segmentación de Redes en Contenedores**:
   - Aislamiento de capas: la base de datos y los microservicios internos deben residir en redes puente internas privadas sin mapeo directo de puertos hacia el host exterior.

4. **Zero Trust en Tránsito (mTLS)**:
   - En arquitecturas de microservicios, requerir autenticación mutua TLS (mTLS) para que cada llamada entre servicios valide criptográficamente la identidad de emisor y receptor.

---

## 7. Endurecimiento de Bases de Datos y Almacenamiento

1. **Gestión de Cuentas y Privilegios**:
   - Separación estricta de usuarios de base de datos: el usuario de la aplicación no debe poseer privilegios de superusuario ni facultades administrativas de esquema (DDL) en tiempo de ejecución.

2. **Cifrado y Conectividad**:
   - Conexiones obligatoriamente autenticadas y cifradas vía SSL/TLS entre la aplicación y el motor de base de datos.
   - Cifrado en reposo (*Encryption at Rest*) para tablas con datos sensibles mediante algoritmos validados (AES-256).
   - Respaldo automatizado periódico con verificación de integridad y almacenamiento cifrado fuera del entorno productivo (con protección WORM contra ransomware).

3. **Auditoría Transaccional e Integridad**:
   - Registro de marcas de tiempo inmutables, usuario emisor y origen en las tablas transaccionales del negocio para asegurar la no-repudiación.

---

## 8. Seguridad en Contenedores Docker (DevSecOps Shift-Left)

1. **Ejecución sin Privilegios (Rootless Containers)**:
   - Los contenedores deben ejecutar sus procesos bajo un usuario sin privilegios explícitamente definido (`USER 10001:10001` o `USER appuser`).
   - Jamás correr como `root` dentro del contenedor; evitar el montaje del socket de Docker (`/var/run/docker.sock`).

2. **Imágenes Base Mínimas y Seguras**:
   - Utilización de imágenes oficiales mínimas (Alpine Linux, Distroless o Debian Slim) reduciendo al mínimo indispensable el inventario de paquetes y binarios ejecutables presentes.

3. **Control de Recursos y Superficie de Montaje**:
   - Asignación de límites de memoria (`mem_limit`) y cuotas de procesador (`cpus`) para prevenir ataques de denegación de servicio por agotamiento de recursos locales.
   - Montaje de sistemas de archivos de solo lectura (`read_only: true`) en contenedores de aplicación donde no se requiera escritura local persistente.
   - Escaneo continuo de imágenes de contenedor en el pipeline CI/CD con herramientas de análisis de vulnerabilidades (`trivy image`).

---

## 9. Lista Maestra de Verificación para Auditorías de Seguridad (Checklist Defensivo y Resiliencia)

| Categoría | Elemento a Verificar | Criterio de Aprobación Senior |
| :--- | :--- | :--- |
| **Autenticación** | Manejo de Tokens | Tokens firmados asimétricamente, caducidad corta, rotación segura y adopción de DPoP / FIDO2 resistente a AitM. |
| **Autorización** | Control Multitenant y BOLA | 100% de consultas y mutaciones validan la pertenencia del recurso (`businessId` / ownership) en la capa de negocio. |
| **Inyecciones** | Consultas a BD y Comandos | 100% de consultas parametrizadas o mediante ORM tipado. Cero llamadas dinámicas a shell del sistema. |
| **Cabeceras HTTP** | Seguridad Web | Presencia de HSTS con preload, CSP estricto, X-Frame-Options DENY y X-Content-Type-Options nosniff. |
| **Gestión de APIs** | Control de Recursos y DTOs | DTOs estrictos (sin Mass Assignment), paginación con tope inmutable y limitación de tasa por endpoint sensible. |
| **Secretos** | Código Fuente y CI/CD | Cero credenciales o tokens en Git. Secretos inyectados en runtime desde bóvedas y variables aisladas. |
| **Cadena de Suministro** | Dependencias y Pipelines | Paquetes fijados por hash/digest, SBOM generado (CycloneDX) y cero dependencias con CVEs críticos sin mitigar. |
| **IA / LLMs** | Control de Agentes y Prompts | Guardrails de validación semántica, sandboxing en herramientas de agentes y confirmación humana (*HITL*) en acciones críticas. |
| **Docker / Infra** | Contenedores y Metadatos | Directiva `USER` no root, filesystem de solo lectura cuando aplique, IMDSv2 activo en entornos cloud. |
| **Resiliencia** | Protección Anti-Ransomware | Respaldos periódicos cifrados e inmutables (WORM) con pruebas de restauración validada. |
