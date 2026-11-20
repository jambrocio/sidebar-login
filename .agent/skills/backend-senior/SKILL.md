---
name: backend-senior
description: >-
  Estándar y guía maestra de ingeniería Backend Senior para el diseño, desarrollo,
  escalamiento y aseguramiento de APIs RESTful, microservicios y sistemas empresariales
  de misión crítica (Spring Boot, Java 21 LTS, Node.js/TypeScript, Python, Go, C# .NET).
  Aplica Arquitectura Limpia, patrones SOLID, alta concurrencia con Hilos Virtuales,
  seguridad robusta contra OWASP Top 10 y OWASP API Security Top 10, observabilidad completa
  y documentación exhaustiva (OpenAPI / Swagger / JavaDoc) para cualquier tipo de requerimiento.
---

# ⚙️ Estándar Maestro de Ingeniería Backend Senior

Este documento establece el marco global de excelencia técnica, arquitectura limpia, principios de diseño robustos, análisis de requerimientos, mantenibilidad a largo plazo y seguridad integral (mitigación de vulnerabilidades **OWASP Top 10** y **OWASP API Security Top 10**) para ingenieros Backend de nivel Senior.

Define un **estándar de conocimiento universal y reutilizable**, aplicable en cualquier proyecto backend moderno (APIs RESTful, Microservicios, Arquitecturas Orientadas a Eventos, Pasarelas Transaccionales y Sistemas Multi-Tenant).

> [!NOTE]
> **Experiencia de Referencia**: Este marco ha sido puesto a prueba y validado en la construcción de sistemas empresariales como **BevAdmin Pro** y su microservicio desacoplado de identidad **auth-service** (Spring Boot 3.4 / 4, Java 21 LTS con Hilos Virtuales síncronos, seguridad asimétrica RS256 con descubrimiento JWKS RFC 7517, perfiles de despliegue `dev`, `qa` y `prod`, transaccionalidad ACID en PostgreSQL 17 y contratos OpenAPI 3.1 documentados en español).

---

## 1. Perfil, Rol y Capacidades del Ingeniero Backend Senior

Un Ingeniero Backend Senior diseña los cimientos invisibles pero críticos del ecosistema de software:

1. **Diseño de Dominio Rico (DDD)**: Modela las entidades y procesos del negocio reflejando fielmente la lógica del mundo real, manteniendo las capas de infraestructura desacopladas del núcleo de negocio.
2. **Arquitectura Limpia y Principios SOLID**:
   - **S (Single Responsibility)**: Cada clase o servicio tiene una única razón para cambiar.
   - **O (Open/Closed)**: Clases abiertas para extensión pero cerradas para modificación directa.
   - **L (Liskov Substitution)**: Las subclases o implementaciones deben ser intercambiables con sus tipos base.
   - **I (Interface Segregation)**: Interfaces pequeñas y específicas para cada consumidor.
   - **D (Dependency Inversion)**: Los módulos de alto nivel no dependen de módulos de bajo nivel; ambos dependen de abstracciones (inyección por constructor obligatoria).
3. **Escalabilidad y Concurrencia Eficiente**: Aprovecha los avances de concurrencia moderna (como los **Virtual Threads** de Java 21 Project Loom) para mantener un modelo de programación síncrono, secuencial, legible y de bajísimo consumo de memoria por hilo.
4. **Mantenibilidad y Documentación**: Cada endpoint, servicio transaccional y entidad debe estar documentado de forma que cualquier ingeniero pueda mantenerlo y extenderlo sin fricción.

---

## 2. Arquitectura de Capas y Buenas Prácticas de Desarrollo

### 2.1. Estructura de Paquetes Limpia (Package by Feature / Layer)

```text
com.enterprise.app/
├── core/
│   ├── config/              # Configuraciones de seguridad, CORS, Swagger, Jackson, Virtual Threads
│   ├── exception/           # Manejo global de excepciones (@ControllerAdvice, RFC 7807)
│   ├── security/            # Filtros JWT, UserDetailsService, AuthenticationEntryPoint, PasswordEncoders
│   └── util/                # Criptografía, formateadores, validadores utilitarios
├── domain/                  # Entidades JPA/ORM de dominio puro, Enums, Value Objects
├── repository/              # Interfaces Spring Data / Repositorios desacoplados con queries seguras
├── service/                 # Servicios transaccionales (@Service, @Transactional) con lógica de negocio
├── web/
│   ├── controller/          # Controladores REST (@RestController) delgados y delegativos
│   ├── dto/                 # Java Records inmutables para Request y Response (sin exponer entidades)
│   └── mapper/              # Mapeadores de dominio a DTOs (MapStruct o métodos puros)
└── db/migration/            # Scripts versionados de base de datos (Flyway / Liquibase)
```

### 2.2. DTOs Inmutables y Separación de Capas

- **Nunca exponer Entidades de Base de Datos en la API**: Las entidades JPA/ORM no deben retornarse directamente en los controladores; esto previene filtración de datos sensibles, recursión cíclica en serialización JSON y problemas de *Mass Assignment*.
- Emplear **Java Records** o clases inmutables con validación declarativa:
  ```java
  public record CreateUserRequest(
      @NotBlank(message = "El nombre de usuario es obligatorio")
      @Size(min = 4, max = 50, message = "El usuario debe tener entre 4 y 50 caracteres")
      @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "El usuario solo permite caracteres alfanuméricos")
      String username,

      @NotBlank(message = "El correo electrónico es obligatorio")
      @Email(message = "Formato de correo electrónico inválido")
      String email,

      @NotNull(message = "El rol asignado es obligatorio")
      UUID roleId
  ) {}
  ```

### 2.3. Manejo Global de Excepciones y Respuestas Estandarizadas (RFC 7807)

Todos los errores deben retornar un cuerpo JSON estructurado, predecible y sin revelar trazas de pila (*stacktraces*) al cliente:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Recurso No Encontrado");
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Error de Validación de Parámetros");
        Map<String, String> errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(FieldError::getField, FieldError::getDefaultMessage, (a, b) -> a));
        problem.setProperty("invalidParams", errors);
        return ResponseEntity.badRequest().body(problem);
    }
}
```

---

## 3. Seguridad de Nivel Empresarial: Mitigación OWASP Top 10

Un Backend Senior construye aplicaciones resistentes por defecto:

### 3.1. A01: Broken Access Control (Control de Acceso Roto) & BOLA/IDOR
- **Validación de Propiedad de Recursos**: Cada petición que accede a un registro mediante ID debe verificar que el registro pertenezca al negocio (*tenant*) o usuario autenticado:
  ```java
  // Correcto: Verificación en query con scoping de seguridad
  @Query("SELECT s FROM Sale s WHERE s.id = :saleId AND s.business.id = :currentBusinessId")
  Optional<Sale> findByIdAndBusinessId(UUID saleId, UUID currentBusinessId);
  ```
- **Autorización Declarativa por Método**: Usar `@PreAuthorize("hasAuthority('ADMIN') or hasRole('SUPERVISOR')")` en la capa de servicios o controladores.
- **Principio de Denegación por Defecto**: Todas las rutas requieren autenticación salvo excepciones explícitas y fundamentadas (`/api/v1/auth/login`, `/health`).

### 3.2. A02: Cryptographic Failures (Fallas Criptográficas)
- **Almacenamiento de Contraseñas**: Emplear algoritmos de derivación de claves resistentes a GPU/ASIC como **Argon2id** o **BCrypt** con factor de trabajo adecuado (coste 12+).
- **Gestión de Secretos**: Nunca commitear claves en el repositorio. Cargar secretos (como `JWT_SECRET`) exclusivamente mediante variables de entorno o gestores de secretos (HashiCorp Vault, AWS Secrets Manager).
- **Firmas Fuertes en Tokens JWT**: Usar claves simétricas HMAC-SHA256 con entropía mínima de 256 bits, o pares de claves asimétricas RSA/ECDSA (2048+ bits).

### 3.3. A03: Injection (Inyecciones SQL, NoSQL, Comandos)
- **Uso Estricto de Parámetros Vinculados (Prepared Statements)**: Prohibir concatenación de strings en sentencias SQL/HQL/JPQL:
  ```java
  // Inseguro: "SELECT u FROM User u WHERE u.username = '" + input + "'"
  // Seguro:
  @Query("SELECT u FROM User u WHERE u.username = :username")
  Optional<User> findByUsername(@Param("username") String username);
  ```
- Validación y tipado estricto de toda entrada de usuario.

### 3.4. A04: Insecure Design (Diseño Inseguro)
- **Tasa Límite de Peticiones (Rate Limiting)**: Aplicar límites en endpoints críticos (login, cambio de contraseña, envío de OTPs) para evitar ataques de fuerza bruta.
- **Políticas de Rotación de Credenciales**: Bloqueo preventivo de cuentas tras 5 intentos fallidos consecutivos y control de expiración de contraseñas (rotación periódica a 90 días).
- **Invalidación Remota de Sesiones**: Diseñar tablas de auditoría de sesiones (`user_sessions`) que permitan revocar instantáneamente tokens activos en caso de anomalías o accesos no autorizados.

### 3.5. A05: Security Misconfiguration (Configuración Insegura)
- **Perfiles Aislados**: Separar configuraciones por perfil (`application-dev.yml`, `application-qa.yml`, `application-prod.yml`).
- Deshabilitar consolas de depuración, H2 console y endpoints de Actuator con información sensible en producción.
- **Cabeceras de Seguridad HTTP**:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - CORS restrictivo con lista blanca explícita de orígenes autorizados.

### 3.6. A07: Identification and Authentication Failures
- Validar caducidad estricta de tokens JWT (`exp`, `nbf`, `iat`).
- Proteger contra ataques de timing en comparación de claves mediante comparaciones de tiempo constante (`MessageDigest.isEqual()`).

### 3.7. A09: Security Logging and Monitoring Failures (Fallas de Registro y Monitoreo)
- Registrar eventos críticos de seguridad (inicios de sesión, cambios de credenciales, accesos denegados, revocación de sesiones) en tablas inmutables de auditoría (`auth_audit_logs`).
- **No registrar Información Personalmente Identificable (PII)** ni secretos en los logs del servidor (números de tarjeta, contraseñas en texto claro, tokens JWT completos).

---

## 4. Estándar Maestro de Documentación de Código en Español (JavaDoc y OpenAPI 3.1) [MANDATORIO]

> [!IMPORTANT]
> **PROTOCOLO DE AUTO-APLICACIÓN OBLIGATORIA**: En cualquier tarea, desarrollo, refactorización o corrección en el backend (Java / Spring Boot / Node.js / Python), el agente DEBE aplicar de manera automática y sin requerir indicación expresa del usuario este estándar exhaustivo de documentación en **español neutro técnico**.

### 4.1. Cobertura Exhaustiva de JavaDoc en Español
Cada artefacto de código Java backend debe incluir comentarios JavaDoc completos y profesionales:
1. **Encabezado de Clase / Interfaz / Record / Enum**:
   - Descripción clara y conceptual del propósito, arquitectura y alcance del componente.
   - Contexto de infraestructura o base de datos que maneja.
   - Etiquetas `@author Equipo de Arquitectura e Identidad` y `@version 1.0`.
2. **Métodos y Constructores**:
   - Descripción concisa de la operación transaccional o lógica ejecutada.
   - Etiqueta `@param <nombre>` explicando el propósito y formato de cada argumento.
   - Etiqueta `@return` detallando el resultado, entidad o DTO devuelto.
   - Etiqueta `@throws <TipoExcepcion>` describiendo las condiciones que detonan el error.
3. **Parámetros de Java Records**:
   - En Java Records inmutables, documentar en el bloque de clase cada componente mediante `@param <campo>` detallando significado, formato y ejemplos si aplica.

### 4.2. Contratos OpenAPI 3.1 / Swagger en Español
Todos los controladores y DTOs expuestos en la API REST deben contener metadatos OpenAPI 3.1 redactados íntegramente en español neutro técnico:
1. **Controladores**:
   - `@Tag(name = "...", description = "...")` en español formal.
   - `@Operation(summary = "...", description = "...")` con resumen ejecutivo y descripción detallada.
   - `@ApiResponse(responseCode = "...", description = "...")` cubriendo tanto escenarios exitosos (200, 201) como de error previstos (400, 401, 403, 404, 422, 423).
2. **DTOs (Records)**:
   - `@Schema(description = "...")` en el record.
   - `@Schema(description = "...", example = "...")` en cada atributo para clarificar su uso en la consola interactiva Swagger UI.

```java
/**
 * Controlador REST para el gobierno de sesiones concurrentes activas y Kill Session remoto.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@RestController
@RequestMapping("/api/v1/sessions")
@Tag(name = "Gobierno de Sesiones de Usuario", description = "Monitoreo de conexiones activas y revocación remota")
public class SessionController {

    private final SessionService sessionService;

    public SessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    /**
     * Revoca remotamente una sesión activa invalidando el token de refresco.
     *
     * @param request Datos de la solicitud indicando el ID de sesión y motivo.
     * @return Mensaje confirmatorio de revocación.
     */
    @PostMapping("/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(
        summary = "Terminar sesión remotamente (Kill Session)",
        description = "Invalida de inmediato una sesión activa específica forzando el rechazo de cualquier solicitud posterior."
    )
    @ApiResponse(responseCode = "200", description = "Sesión terminada exitosamente")
    @ApiResponse(responseCode = "403", description = "Acceso restringido a usuarios con rol ADMIN")
    public ResponseEntity<Map<String, String>> revokeSession(@Valid @RequestBody RevokeSessionRequest request) {
        sessionService.revokeSession(request.sessionId(), true, request.reason());
        return ResponseEntity.ok(Map.of("message", "Sesión terminada exitosamente."));
    }
}
```

---

## 5. Estándar SonarQube Clean as You Code (CAYC) y Cobertura de Código > 80% [MANDATORIO]

Para garantizar sistemas empresariales altamente mantenibles, libres de vulnerabilidades y con una arquitectura evolutiva robusta, todo desarrollo backend debe certificar el **Quality Gate** de SonarQube bajo la filosofía **Clean as You Code (CAYC)**:

### 5.1. Umbrales Mandatorios del Quality Gate Backend
1. **Cobertura de Código (Code Coverage JaCoCo) > 80%**:
   - Todo servicio de negocio (`@Service`), controlador REST (`@RestController`), repositorio y componente de seguridad debe alcanzar como mínimo un **80% de cobertura de líneas y ramas ejecutadas**.
   - Ningún Pull Request o artefacto de compilación puede ser liberado si la cobertura global o del código nuevo desciende del 80%.
2. **Confiabilidad (Reliability) - Calificación A**:
   - `0` Bugs en el código fuente.
   - Manejo exhaustivo de punteros nulos (`Optional<T>`, `@NonNull`, `@Nullable`), prevención de `NullPointerException` y cierre de flujos I/O mediante *try-with-resources*.
3. **Seguridad (Security) - Calificación A**:
   - `0` Vulnerabilidades y `0` Hotspots de seguridad sin auditar.
   - Mitigación rigurosa de inyección SQL (uso obligatorio de sentencias parametrizadas en JDBC/JPA), protección contra CSRF, validación estricta de tokens JWT (verificación de firma y tiempo de expiración) y control de acceso RBAC por método.
4. **Mantenibilidad (Maintainability) - Calificación A**:
   - Tasa de Deuda Técnica (*Technical Debt Ratio*) menor al `5%`.
   - `0` Code Smells bloqueantes o críticos.
   - Líneas de código duplicadas inferiores al `3%`.

### 5.2. Reglas de Complejidad y Calidad de Código
- **Complejidad Cognitiva Máxima de 15 por Método**:
   - Ningún método puede superar una complejidad cognitiva de `15`.
   - Reemplazar condicionales profundamente anidados por cláusulas de guarda (*Guard Clauses*), polimorfismo o descomposición en métodos privados especializados.
- **Inmutabilidad y DTOs**:
   - Uso mandatorio de **Java Records** para todos los DTOs de solicitud y respuesta.
   - Colecciones inmutables (`List.copyOf()`, `Collections.unmodifiableList()`) al retornar estructuras desde entidades o servicios para evitar efectos secundarios no controlados.
- **Inyección por Constructor Exclusiva**:
   - Prohibido el uso de `@Autowired` sobre atributos de clase (inyección de campo). Emplear inyección explícita por constructor para garantizar la testabilidad unitaria y la inmutabilidad (`final`).

### 5.3. Estrategia de Testing Automatizado para Superar el 80% de Cobertura
Las suites de prueba automatizadas (JUnit 5 + Mockito + AssertJ) deben estructurarse de la siguiente manera:
1. **Tests Unitarios de Servicios (`@ExtendWith(MockitoExtension.class)`)**:
   - Validación del flujo principal de negocio (*Happy Path*).
   - Validación de reglas de negocio y excepciones esperadas: simulación de entidad no encontrada (`ResourceNotFoundException`), conflicto de unicidad o violación de reglas (`BusinessRuleException`).
   - Verificación de interacciones con repositorios (`verify(repo).insert(...)`) y aislamiento completo de la base de datos.
2. **Tests de Controladores REST (`@WebMvcTest`)**:
   - Verificación de códigos de estado HTTP (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found).
   - Validación de serialización/deserialización JSON de los DTOs y encabezados de respuesta.
   - Verificación de validaciones declarativas `@Valid` (`@NotBlank`, `@Email`, `@Size`) asegurando que devuelvan el cuerpo RFC 7807 `ProblemDetail` esperado.
3. **Tests de Integración y Persistencia (`@DataJpaTest` / Testcontainers)**:
   - Verificación de transaccionalidad ACID y ejecución limpia de migraciones Flyway sobre PostgreSQL.
   - Pruebas de constraints relacionales (claves foráneas, índices únicos, checks de dominio).
4. **Casos Límite y Robustez (Edge Cases)**:
   - Cadenas vacías, identificadores UUID malformados, colecciones nulas o sin elementos, y desbordamiento de límites numéricos.

---

## 6. Checklist de Calidad Backend Senior

- [ ] **Compilación e Integración**: Compilación Maven/Gradle limpia (`mvn clean package -DskipTests=false`) con 100% de tests unitarios y de integración pasando.
- [ ] **Documentación Completa en Español**: JavaDoc exhaustivo en el 100% de clases, métodos, parámetros y excepciones, junto con anotaciones OpenAPI 3.1 en español en controladores y DTOs.
- [ ] **Calidad SonarQube (Quality Gate)**:
  - [ ] Cobertura de código unitario JaCoCo > `80%`.
  - [ ] `0` Bugs y `0` Vulnerabilidades (Calificación A).
  - [ ] Complejidad cognitiva <= `15` en todos los métodos.
  - [ ] Duplicidad de código < `3%`.
- [ ] **Transaccionalidad Correcta**: `@Transactional(readOnly = true)` en consultas de lectura; aislamiento `READ_COMMITTED` por defecto en escrituras.
- [ ] **Sin Fugas de Secretos**: Ninguna credencial ni clave hardcodeada en el código fuente.
- [ ] **Health Checks Operativos**: Endpoints de `/actuator/health` o `/api/v1/auth/health` disponibles para orquestadores Docker y Kubernetes.
- [ ] **Manejo de Errores Limpio**: Sin stacktraces expuestos a los clientes de la API (RFC 7807 ProblemDetail).
