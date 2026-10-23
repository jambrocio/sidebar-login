---
name: frontend-senior
description: >-
  Estándar y guía maestra de ingeniería Frontend Senior para la conceptualización,
  arquitectura, desarrollo, refactorización y aseguramiento de aplicaciones web modernas,
  modulares, mantenibles y altamente seguras (Angular, React, Vue, TypeScript, SCSS).
  Incorpora mitigación rigurosa de vulnerabilidades OWASP Top 10, patrones de diseño limpios,
  accesibilidad WCAG, gestión de estado reactivo/síncrono, internacionalización y documentación
  exhaustiva para proyectos empresariales de cualquier industria.
---

# 🚀 Estándar Maestro de Ingeniería Frontend Senior

Este documento define el estándar global de excelencia técnica, arquitectura limpia, buenas prácticas de desarrollo, análisis de requerimientos, mantenibilidad a largo plazo y seguridad integral (mitigación activa de vulnerabilidades **OWASP Top 10**) para ingenieros Frontend de nivel Senior.

Está diseñado con un **nivel de conocimiento estándar e interoperable**, permitiendo su aplicación inmediata en cualquier proyecto de software (Enterprise SPAs, Paneles Administrativos, Portales B2B/B2C, Aplicaciones Fintech o Retail).

> [!NOTE]
> **Experiencia de Referencia**: Este marco de estándares ha sido consolidado a través del desarrollo y evolución de proyectos empresariales de alta criticidad, como la plataforma de administración y telemetría **BevAdmin Pro** (arquitectura Angular 21 Standalone, sistema de permisos RBAC multinivel, semaforización de sesiones en tiempo real, mapas de conexiones NOC, personalización dinámica de apariencia Claro/Oscuro y cero dependencias de datos dummy).

---

## 1. Perfil, Rol y Capacidades del Ingeniero Frontend Senior

Un Ingeniero Frontend Senior no se limita a escribir código de interfaces; lidera el análisis, la ingeniería de software y la resiliencia del cliente web:

1. **Capacidad de Análisis Integral**: Descompone requerimientos de negocio complejos en arquitecturas de componentes desacopladas, predecibles y de bajo acoplamiento.
2. **Pensamiento Sistémico**: Diseña flujos de navegación, gestión de estado y consumo de APIs anticipando estados de carga, fallos de red, accesibilidad y degradación elegante.
3. **Mantenibilidad y Legibilidad como Prioridad**: Todo código debe poder ser mantenido, refactorizado o auditado por cualquier miembro del equipo sin requerir conocimiento implícito o dependencias no documentadas.
4. **Seguridad Nativa ("Security by Design")**: Comprende el modelo de seguridad del navegador (Same-Origin Policy, CORS, CSP, Storage APIs) y aplica mitigaciones proactivas contra vectores de ataque web.

---

## 2. Arquitectura de Software y Buenas Prácticas

### 2.1. Arquitectura Modular y Desacoplada (Screaming Architecture)

Organizar la aplicación en capas claramente delimitadas:

```text
src/app/
├── core/                  # Singletons, servicios globales de infraestructura, interceptores, guards
│   ├── auth/              # Autenticación, gestión de JWT en memoria, sesión activa
│   ├── http/              # Interceptores (Auth, Error, Loading, CSRF, CorrelationId)
│   ├── guards/            # Route Guards funcionales (AuthGuard, RoleGuard, PendingChangesGuard)
│   └── services/          # Temas (Dark/Light), Notificaciones, Telemetría, Logger centralizado
├── shared/                # Componentes puros (Dumb/Presentational), directivas, pipes, UI kits
│   ├── components/        # Modales, tablas genéricas, breadcrumbs, inputs con validación, botones
│   ├── directives/        # Directivas de permisos RBAC (*hasRole, *hasPermission), autofocus
│   └── pipes/             # Formateo monetario, fechas relativas, truncado seguro
├── layouts/               # Shells de aplicación (DashboardLayout, AuthLayout, BlankLayout)
│   ├── sidebar/           # Menú multinivel dinámico, colapsable y responsivo
│   ├── navbar/            # Cabecera, perfil de usuario, buscador global, selector de sedes
│   └── footer/            # Información legal, versión y estado de conexión
├── pages/                 # Módulos funcionales de negocio (Smart / Container Components)
│   ├── auth/              # Login, recuperación de contraseña, cambio obligatorio
│   ├── dashboard/         # Métricas, KPIs, resúmenes operativos
│   ├── administration/    # Usuarios, Roles, Sedes, Sesiones y Auditoría de Red
│   └── commercial/        # Ventas, POS, Catálogo, Compras, Arqueos de caja
└── models/                # Interfaces TypeScript estrictas, DTOs y Enums de dominio
```

### 2.2. Patrón Smart vs. Dumb Components

- **Smart / Container Components (Pages)**:
  - Manejan la comunicación con servicios HTTP e inyectan el estado.
  - Orquestan la lógica de negocio, coordinan acciones y orquestan navegación.
  - No definen estilos visuales complejos ni manipulación de DOM directa.
- **Dumb / Presentational Components (Shared)**:
  - Reciben datos exclusivamente mediante `@Input()` o Signals de entrada.
  - Notifican eventos mediante `@Output()` o Custom Events.
  - Son 100% reutilizables, independientes del contexto de negocio y fácilmente testeables de forma unitaria.

### 2.3. Reactividad y Gestión de Estado

- Preferir **Signals** y programación declarativa sobre suscripciones manuales a RxJS.
- Evitar fugas de memoria (*memory leaks*): en caso de usar `Observable`, gestionar la desuscripción estricta mediante `takeUntilDestroyed()`, `take(1)` o pipe `async`.
- Inmutabilidad estricta: nunca mutar objetos o arrays de estado; utilizar propagación (`[...arr]`, `{...obj}`) o funciones de transformación pura (`map`, `filter`, `reduce`).

---

## 3. Estándar de Codificación, Tipado y Documentación

### 3.1. Tipado Estricto en TypeScript

- Prohibido el uso de `any`. En casos de datos desconocidos, emplear `unknown` con *type narrowing* o *type guards*.
- Activar en `tsconfig.json`:
  ```json
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
  ```
- Crear interfaces bien documentadas para cada contrato de API (request y response).

### 3.2. Documentación de Código (TSDoc / JSDoc)

Todo servicio, guard, función pública, modelo y componente debe contar con documentación contextual:

```typescript
/**
 * Servicio centralizado para la administración de sesiones activas y auditoría de conexiones NOC.
 * 
 * Permite monitorear el estado semaforizado de los usuarios (Online, Idle, Disconnected),
 * geolocalizar nodos sospechosos y ejecutar revocación forzada de tokens JWT en tiempo real.
 * 
 * @example
 * ```ts
 * const activeCount = this.sessionService.onlineCount();
 * this.sessionService.revokeSession('session-uuid', 'Violación de políticas de seguridad');
 * ```
 */
@Injectable({ providedIn: 'root' })
export class SessionAuditService {
  /**
   * Termina remotamente una sesión activa notificando al backend para su invalidación inmediata.
   * 
   * @param sessionId Identificador UUID de la sesión a revocar.
   * @param reason Motivo administrativo de la terminación para el registro de auditoría.
   * @returns Observable con el resultado de la operación de revocación.
   */
  revokeSession(sessionId: string, reason: string): Observable<AuditOperationResult> {
    // Implementación limpia y desacoplada
  }
}
```

### 3.3. Estilo Visual y Sistemas de Diseño (SCSS / CSS)

- Uso estricto de **Variables CSS (Design Tokens)** para soporte nativo y limpio de temas (Dark / Light):
  ```scss
  :root {
    --primary-color: #007bff;
    --background-color: #f8fafc;
    --card-bg: #ffffff;
    --text-color: #0f172a;
    --border-color: #e2e8f0;
  }

  body[data-theme="dark"] {
    --background-color: #0a0f1d;
    --card-bg: #11192e;
    --text-color: #f1f5f9;
    --border-color: #1e293b;
  }
  ```
- No hardcodear colores hexadecimales en las clases CSS de los componentes; consumir siempre tokens semánticos (`var(--card-bg)`, `var(--text-color)`).
- Diseño responsivo con enfoque *Mobile First* utilizando Flexbox y CSS Grid.

---

## 4. Mitigación Integral de Vulnerabilidades (OWASP Top 10)

Un Frontend Senior diseña cada interacción asumiendo que el cliente es un entorno no confiable:

### 4.1. Prevención de Cross-Site Scripting (XSS - OWASP A03)
- **Sanitización de Salida**: Utilizar siempre *property binding* nativo (`{{ value }}` o `[textContent]="value"`).
- Evitar a toda costa `innerHTML`, `outerHTML` o `document.write`. Si es estrictamente necesario renderizar HTML seguro (ej. formateo de texto enriquecido), utilizar el servicio de sanitización del framework (`DomSanitizer.sanitize()`) con validación de esquema HTML restrictiva.
- Evitar `eval()`, `setTimeout(string)` o creación dinámica de funciones con código proveniente del usuario.

### 4.2. Prevención de Cross-Site Request Forgery (CSRF - OWASP A01)
- Emplear cookies de autenticación con banderas `SameSite=Strict` o `SameSite=Lax`.
- Configurar interceptores HTTP para adjuntar encabezados de verificación personalizados (ej. `X-Requested-With: XMLHttpRequest` o tokens anti-CSRF suministrados en el handshake inicial).

### 4.3. Control de Acceso Roto en el Cliente (Broken Access Control - OWASP A01)
- **Defensa en Profundidad**: Aunque la seguridad definitiva reside en el backend, la UI debe restringir proactivamente rutas, botones y acciones según el rol y permisos RBAC del usuario.
- Implementar **Route Guards** funcionales (`canActivate`, `canMatch`) que verifiquen los claims del token antes de cargar módulos lazy.
- Directivas de UI (`*hasPermission="['MGMT_USERS_EDIT']"`) para ocultar controles no autorizados y prevenir la filtración visual de funcionalidades protegidas.

### 4.4. Exposición de Datos Sensibles (Cryptographic Failures - OWASP A02)
- Nunca almacenar contraseñas, secretos de API o tokens sensibles de larga duración en `localStorage` o `sessionStorage` (vulnerables a extracción por XSS).
- Manejar tokens JWT de corta duración preferentemente en memoria de la aplicación (`Signals` o variables de servicio) o mediante cookies `HttpOnly` y `Secure`.
- Eliminar de inmediato cualquier dato de depuración (`console.log`, `console.table`, dumps de respuestas de API) en compilaciones de producción mediante flags de compilador y linters (`no-console`).

### 4.5. Configuración de Seguridad Deficiente (Security Misconfiguration - OWASP A05)
- Definir **Content Security Policy (CSP)** estricta en el servidor web de distribución (Nginx/CloudFront):
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:8080;
  ```
- Incorporar encabezados `X-Frame-Options: DENY` (anti-Clickjacking) y `X-Content-Type-Options: nosniff`.

### 4.6. Componentes Vulnerables y Desactualizados (OWASP A06)
- Auditar periódicamente dependencias del proyecto con `npm audit` y herramientas SCA (`Dependabot`, `Snyk`).
- Mantener librerías de terceros al mínimo imprescindible para reducir la superficie de ataque.

---

## 5. Checklist de Verificación de Calidad Frontend Senior

Antes de entregar cualquier requerimiento, el código debe cumplir con este checklist:

- [ ] **Compilación Limpia**: `0` errores y `0` advertencias en el build de producción (`ng build --configuration=production` o equivalente).
- [ ] **Sin Datos Dummy**: Los datos provienen exclusivamente de servicios HTTP sincronizados con contratos de backend o de mocks explícitos en tests unitarios.
- [ ] **Resiliencia ante Fallos**: Todos los endpoints HTTP cuentan con gestión de errores (alertas de usuario legibles, no bloqueos de pantalla).
- [ ] **Accesibilidad (A11y)**: Etiquetas `aria-label`, contraste de colores conforme a WCAG AA, navegación completa por teclado.
- [ ] **Rendimiento**: Carga diferida (*lazy loading*) de rutas, imágenes optimizadas, sin reflows ni repaints innecesarios.
- [ ] **Documentación Completa**: Comentarios TSDoc en todas las clases, métodos y modelos públicos para facilitar la mantenibilidad.
