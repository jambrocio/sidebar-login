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
> **Experiencia de Referencia**: Este marco ha sido puesto a prueba y validado en la construcción de sistemas empresariales como **BevAdmin Pro** (Spring Boot 4, Java 21 LTS con Hilos Virtuales síncronos, seguridad JWT con invalidación en base de datos, perfiles de despliegue `dev`, `qa` y `prod`, transaccionalidad ACID en PostgreSQL 17 y contratos OpenAPI 3.1 documentados).

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

## 4. Documentación y Contratos de Integración (OpenAPI / Swagger)

Todo endpoint backend debe auto-documentar su contrato funcional con anotaciones OpenAPI 3.1:

```java
@Operation(
    summary = "Revocación remota de sesión activa",
    description = "Permite a un administrador de seguridad invalidar una sesión activa y desconectar al usuario en tiempo real."
)
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Sesión revocada exitosamente"),
    @ApiResponse(responseCode = "404", description = "Sesión no encontrada o ya expirada"),
    @ApiResponse(responseCode = "403", description = "Permisos insuficientes para revocar sesiones")
})
@PostMapping("/sessions/{id}/revoke")
public ResponseEntity<RevokeSessionResponse> revokeSession(
    @PathVariable("id") UUID sessionId,
    @Valid @RequestBody RevokeSessionRequest request,
    @AuthenticationPrincipal AuthenticatedUser currentUser
) {
    return ResponseEntity.ok(sessionAuditService.revokeSession(sessionId, request.reason(), currentUser));
}
```

---

## 5. Checklist de Calidad Backend Senior

- [ ] **Compilación e Integración**: Compilación Maven/Gradle limpia (`mvn clean package -DskipTests=false`) con 100% de tests unitarios y de integración pasando.
- [ ] **Transaccionalidad Correcta**: `@Transactional(readOnly = true)` en consultas de lectura; aislamiento `READ_COMMITTED` por defecto en escrituras.
- [ ] **Sin Fugas de Secretos**: Ninguna credencial ni clave hardcodeada en el código fuente.
- [ ] **Health Checks Operativos**: Endpoints de `/actuator/health` o `/api/v1/auth/health` disponibles para orquestadores Docker y Kubernetes.
- [ ] **Manejo de Errores Limpio**: Sin stacktraces expuestos a los clientes de la API.
