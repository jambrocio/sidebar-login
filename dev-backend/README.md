# Plantilla Base Backend — Spring Boot 4.0 + Java 21 LTS (`backend/`)

Esta carpeta contiene la implementación completa del backend corporativo en **Spring Boot 4.0 (Spring Framework 7, Spring Security 7, Hibernate 7 y Java 21 LTS)**, empaquetable en JAR autónomo y contenedorizada mediante **Docker**.

---

## 1. Enlaces Principales y Documentación Web de la API

Con el backend en ejecución (puerto `8080`), los siguientes portales y especificaciones se encuentran disponibles en vivo:

| Recurso | URL Directa | Método | Tipo de Acceso | Descripción |
| :--- | :--- | :---: | :---: | :--- |
| **Swagger UI Interactivo** | [**http://localhost:8080/swagger-ui.html**](http://localhost:8080/swagger-ui.html) | `GET` | Público | **Portal Web Oficial OpenAPI 3.1**: Interfaz gráfica para explorar endpoints, modelos y ejecutar pruebas interactivas en vivo. |
| **Swagger UI Alternativo** | [**http://localhost:8080/swagger-ui/index.html**](http://localhost:8080/swagger-ui/index.html) | `GET` | Público | Ruta interna servida dinámicamente por Springdoc UI. |
| **Especificación OpenAPI 3.1** | [**http://localhost:8080/v3/api-docs**](http://localhost:8080/v3/api-docs) | `GET` | Público | Contrato OpenAPI 3.1 en formato JSON generado automáticamente a partir de las anotaciones Java del código. |
| **Sondeo de Salud Actuator** | [**http://localhost:8080/actuator/health**](http://localhost:8080/actuator/health) | `GET` | Público | Sondeo de estado del servicio (`liveness` y `readiness` para Docker y Kubernetes). |
| **Inicio de Sesión** | [**http://localhost:8080/api/v1/auth/login**](http://localhost:8080/api/v1/auth/login) | `POST` | Público | Autenticación con verificación de vigencia de clave, intentos fallidos y emisión de JWT. |
| **Renovación de Contraseña** | [**http://localhost:8080/api/v1/auth/change-password**](http://localhost:8080/api/v1/auth/change-password) | `POST` | Público | Renovación voluntaria o forzada por expiración (extiende vigencia a 90 días). |
| **Perfil en Sesión** | [**http://localhost:8080/api/v1/auth/me**](http://localhost:8080/api/v1/auth/me) | `GET` | `Bearer JWT` | Retorna el Negocio Matriz, Local Asignado y Locales Autorizados del usuario activo. |
| **Menú Lateral Multinivel** | [**http://localhost:8080/api/v1/menu/my-navigation**](http://localhost:8080/api/v1/menu/my-navigation) | `GET` | `Bearer JWT` | Árbol de navegación de 4 niveles resuelto por la función PostgreSQL `fn_get_user_effective_menu`. |

> [!NOTE]  
> **Generación 100% Automática**: La documentación se genera en tiempo de ejecución con `springdoc-openapi-starter-webmvc-ui` (v2.8.5). No se requieren ni se utilizan archivos HTML estáticos en `src/main/resources/static/`, evitando desincronizaciones de contrato.

---

## 2. Enlaces a Documentación y Módulos del Proyecto

- **Portal Central de Documentación**: [`../docs/README.md`](../docs/README.md)
- **Diagramas Técnicos de Arquitectura (Archify)**: [`../docs/diagrams/index.html`](../docs/diagrams/index.html)
- **Arquitectura Cloud y Comparativa de Costos**: [`../docs/cloud/index.html`](../docs/cloud/index.html)
- **Diseño Relacional y Scripts SQL en Español**: [`../docs/sql/README.md`](../docs/sql/README.md)
- **Mapeo Técnico de Interfaces y Base de Datos**: [`../docs/technical_frontend_interfaces_and_database_mapping.md`](../docs/technical_frontend_interfaces_and_database_mapping.md)
- **Catálogo de Usuarios de Prueba JSON**: [`../frontend/json/auth-test-users.json`](../frontend/json/auth-test-users.json)
- **Frontend Angular 21 (PWA)**: [`../frontend/README.md`](../frontend/README.md)

---

## 3. Principios de Arquitectura del Backend

1. **100% Imperativo / Síncrono (NO Reactivo)**:
   - Opera sobre **Spring Web MVC (Servlet Tomcat tradicional)** con `spring.main.web-application-type: servlet`.
   - Persistencia síncrona con **`JdbcClient` / Spring Data JPA** y transacciones `@Transactional`.
   - Se descarta por completo programación reactiva (`WebFlux`, `Mono`, `Flux`, `R2DBC`) garantizando trazas de depuración lineales y mantenibilidad limpia.
2. **Arquitectura Modular en 4 Capas por Módulo**:
   - `controller/` (`*Controller.java`): Solo recibe la petición HTTP, valida DTOs (`@Valid`), expone anotaciones `@Tag` / `@Operation` y delega a la capa de servicio.
   - `service/` (`*Service.java` + `*ServiceImpl.java`): Reglas de negocio (cálculo de subtotales, IGV, diferencias de caja, vigencia de contraseñas y aislamiento por Local Asignado).
   - `repository/` (`*Repository.java`): Consultas SQL síncronas hacia las 19 tablas y vistas PostgreSQL.
   - `dto/` (`*Request.java` / `*Response.java`): Objetos inmutables (`record`) con validaciones Jakarta y metadatos `@Schema`.
3. **Manejo Centralizado de Errores RFC 9457 (`ProblemDetail`)**:
   - Implementado en [`GlobalExceptionHandler.java`](./src/main/java/com/elroble/bevadmin/common/GlobalExceptionHandler.java), estandarizando respuestas de error para validaciones (400), credenciales inválidas (401), acceso denegado (403), recursos inexistentes (404), cuentas bloqueadas (423) y reglas de negocio (422).

---

## 4. Casos de Prueba de Autenticación, Expiración y Bloqueo

El backend implementa de forma nativa la política de seguridad corporativa:
- **Rotación de Contraseñas**: 90 días de vigencia.
- **Advertencia Preventiva**: Se activa cuando restan ≤ 7 días para el vencimiento.
- **Cambio Obligatorio por Expiración**: Si la clave venció o es temporal, el login rechaza el acceso con **HTTP 403** y exige invocar `/api/v1/auth/change-password`.
- **Bloqueo de Cuentas**: Si el usuario acumula 5 intentos fallidos o su estado es `'LOCKED'`, el sistema responde **HTTP 423**.

### Matriz de Usuarios y Comportamiento Esperado

| Caso | Usuario | Contraseña | Estado en BD | Resultado HTTP | Comportamiento |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | `agarcia` | `Admin123*` | `ACTIVE`, Vigente (+45 días) | **200 OK** | Acceso concedido con token JWT. `passwordStatus: "Vigente"`, `mustChangePassword: false`. |
| **2** | `ltorres` | `Cajero123*` | `ACTIVE`, Expirada (-3 días) | **403 Forbidden** | Acceso bloqueado por clave vencida. Detalle: `actionRequired: "CHANGE_PASSWORD"`. |
| **3** | `cmendoza` | `Tienda123*` | `ACTIVE`, Por Expirar (+4 días) | **200 OK** | Acceso concedido con token JWT. Alerta preventiva: `passwordStatus: "Por Expirar"`, `daysUntilExpiration: 4`. |
| **4** | `mparedes` | `Andina123*` | `ACTIVE`, Expirada (-1 día) | **403 Forbidden** | Acceso bloqueado. Exige cambio obligatorio en Negocio 2 (`Andina Drinks`). |
| **5** | `rdiaz` | `Temporal2026*` | `ACTIVE`, Clave Temporal (0 días) | **403 Forbidden** | Primer ingreso: exige personalizar la contraseña inicial. |
| **6** | `jquispe` | `Bloqueado123*` | `LOCKED`, 5 intentos fallidos | **423 Locked** | Cuenta bloqueada. Informa comunicarse con el administrador. |

---

## 5. Comandos de Consola para Ejecutar las Pruebas

### Probar Caso 1 (Clave Vigente)
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"username":"agarcia","password":"Admin123*"}' | `
  Select-Object passwordStatus, daysUntilExpiration, mustChangePassword, passwordExpiresAt
```

### Probar Caso 2 (Clave Expirada con Cambio Obligatorio)
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" `
    -Method Post -ContentType "application/json" `
    -Body '{"username":"ltorres","password":"Cajero123*"}'
} catch {
  $_.ErrorDetails.Message
}
# Respuesta esperada: HTTP 403 con actionRequired: "CHANGE_PASSWORD"
```

### Probar Caso 3 (Clave Por Expirar)
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" `
  -Method Post -ContentType "application/json" `
  -Body '{"username":"cmendoza","password":"Tienda123*"}' | `
  Select-Object passwordStatus, daysUntilExpiration, mustChangePassword, passwordExpiresAt
```

### Probar Caso 4 (Cuenta Bloqueada)
```powershell
try {
  Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/login" `
    -Method Post -ContentType "application/json" `
    -Body '{"username":"jquispe","password":"Bloqueado123*"}'
} catch {
  $_.ErrorDetails.Message
}
# Respuesta esperada: HTTP 423 con accountStatus: "LOCKED"
```

### Probar Caso 5 (Renovación de Contraseña)
```powershell
Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/change-password" `
  -Method Post -ContentType "application/json" `
  -Body '{"username":"ltorres","currentPassword":"Cajero123*","newPassword":"RobleSegura2026#"}' | `
  Select-Object passwordStatus, daysUntilExpiration, mustChangePassword, passwordExpiresAt
# Respuesta esperada: HTTP 200, vigencia extendida a 90 días y nuevo JWT emitido
```

---

## 6. Compilación, Empaquetado y Ejecución Local

### Prerrequisitos
- **Java**: OpenJDK 21 LTS o superior.
- **Maven**: 3.9+ (`mvn`).
- **PostgreSQL**: 14+ con las tablas de [`../sql/`](../sql/README.md).

### Comandos de Maven
```bash
# Situarse en la carpeta backend
cd backend

# Compilar código fuente
mvn clean compile -DskipTests

# Generar el artefacto JAR ejecutable (target/bevadmin-backend.jar)
mvn clean package -DskipTests

# Ejecutar el backend con Maven
mvn spring-boot:run
```

### Ejecutar directamente el JAR
```bash
java -jar target/bevadmin-backend.jar
```

---

## 7. Despliegue con Docker (Modo Oficial y Recomendado)

A partir de la versión actual, el backend se ejecuta y prueba exclusivamente en **contenedores Docker** para garantizar aislamiento, control de entornos y reproducibilidad.

### A. Despliegue con Docker Compose (Recomendado)
Desde la raíz del proyecto (`sidebar-login/`):
```bash
# Construir y levantar backend + postgres en segundo plano
docker compose up -d --build

# Ver logs en vivo del backend
docker compose logs -f bevadmin-backend

# Detener los contenedores
docker compose down
```

### B. Gestión Directa con Docker CLI
```bash
# 1. Construir la imagen optimizada (Multi-stage con Java 21 Alpine)
docker build -t bevadmin-backend:latest ./backend

# 2. Iniciar el contenedor conectado a la red de PostgreSQL
docker run -d \
  --name bevadmin-backend \
  --network bevadmin-network \
  -p 8080:8080 \
  -e DB_URL="jdbc:postgresql://bevadmin-postgres:5432/admin_dashboard_db" \
  -e DB_USER="postgres" \
  -e DB_PASSWORD="postgres" \
  -e SPRING_PROFILES_ACTIVE="prod" \
  bevadmin-backend:latest

# 3. Consultar logs de ejecución
docker logs -f bevadmin-backend

# 4. Detener o reiniciar el contenedor
docker stop bevadmin-backend
docker start bevadmin-backend
```

### C. Verificar Estado y Salud del Contenedor
```bash
# Ver estado del contenedor y comprobación de salud (Healthcheck Actuator)
docker ps --filter "name=bevadmin-backend"

# Consultar sonda de salud desde el host
curl http://localhost:8080/actuator/health
curl http://localhost:8080/api/v1/auth/health
```
