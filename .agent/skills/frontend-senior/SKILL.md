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

### 3.2. Estándar Maestro de Documentación de Código en Español (TSDoc / JSDoc) [MANDATORIO]

Todo archivo fuente TypeScript, componente, servicio, guard, interceptor, directiva, pipe, interfaz, modelo de dominio y función debe contar con documentación exhaustiva y estructurada **100% en idioma Español**. Este estándar es vinculante para cualquier desarrollo, refactorización o mantenimiento futuro.

#### 3.2.1. Reglas Estrictas de Documentación
1. **Encabezado de Archivo**: Cada archivo debe iniciar con una descripción clara de su responsabilidad arquitectónica, contexto de negocio y relación con otros módulos.
2. **Clases y Componentes**:
   - Propósito funcional y de negocio.
   - Patrón arquitectónico aplicado (Smart Container vs. Presentational Dumb).
   - Componentes hijos o servicios consumidos.
   - `@author` y `@version`.
3. **Propiedades, Signals y Computed**:
   - Propósito funcional de cada señal reactiva (`signal`, `computed`, `model`).
   - Dependencias y detonadores de reactividad.
4. **Métodos y Funciones**:
   - `@description`: Qué hace el método y por qué.
   - `@param`: Descripción detallada de cada parámetro de entrada y su formato esperado.
   - `@returns`: Tipo y significado del valor devuelto (especialmente en `Observable`, `Promise` o tipos compuestos).
   - `@throws`: Condiciones bajo las cuales lanza excepciones o emite estados de error.
   - `@example`: Ejemplo conciso de invocación y uso.
5. **Tipado Estricto de Retorno**: Todo método debe declarar explícitamente su tipo de retorno (`: void`, `: Observable<T>`, `: Promise<R>`, `: Signal<D>`).

```typescript
/**
 * Componente Smart/Container encargado de la administración y ciclo de vida de usuarios
 * del sistema, asignación de Negocio Matriz, locales autorizados y control RBAC.
 *
 * @description Permite listar, registrar, editar, desactivar y forzar expiración de contraseñas
 * de cuentas de acceso vinculadas a una empresa comercial en PostgreSQL.
 *
 * @author Equipo de Arquitectura Frontend
 * @version 2.0
 */
@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users-management.component.html',
  styleUrl: './users-management.component.scss',
})
export class UsersManagementComponent implements OnInit {

  /** Señal reactiva que almacena el listado de usuarios cargados desde el backend. */
  readonly users = signal<SystemUser[]>([]);

  /**
   * Carga los usuarios registrados en el sistema aplicando el filtro del negocio activo.
   *
   * @param businessCode Código único del negocio matriz para filtrar o 'ALL' para superusuarios.
   * @returns void - Actualiza de forma asíncrona la señal reactiva {@link users}.
   */
  loadUsers(businessCode: string): void {
    // Implementación desacoplada
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

## 5. Estándar SonarQube Clean as You Code (CAYC) y Cobertura de Código > 80% [MANDATORIO]

Para asegurar la máxima mantenibilidad, robustez y transferibilidad del código fuente, todo desarrollo y refactorización debe superar de forma obligatoria el **Quality Gate** de SonarQube / SonarCloud con una política estricta de **Clean as You Code (CAYC)**:

### 5.1. Umbrales Mandatorios del Quality Gate
1. **Cobertura de Código (Code Coverage) > 80%**:
   - Todo componente, servicio, guard, pipe y clase utilitaria nueva o modificada debe contar con tests unitarios automatizados que alcancen como mínimo el **80% de cobertura de líneas y de ramas (branch coverage)**.
   - Prohibido hacer merge o pasar a producción código con cobertura inferior al 80%.
2. **Confiabilidad (Reliability) - Calificación A**:
   - `0` Bugs detectados.
   - No desreferenciar variables potencialmente nulas o indefinidas sin verificación previa (`optional chaining ?.`, *nullish coalescing ??* o *type guards*).
3. **Seguridad (Security) - Calificación A**:
   - `0` Vulnerabilidades.
   - `0` Hotspots de seguridad sin auditar.
4. **Mantenibilidad (Maintainability) - Calificación A**:
   - Tasa de Deuda Técnica (*Technical Debt Ratio*) menor al `5%`.
   - `0` Code Smells bloqueantes, críticos o mayores.
5. **Duplicidad de Código**:
   - Líneas duplicadas inferiores al `3%` en el código analizado. Aplicar el principio **DRY (Don't Repeat Yourself)** mediante funciones utilitarias puras y componentes presentacionales compartidos.

### 5.2. Reglas de Mantenibilidad y Complejidad Cognitiva
- **Complejidad Cognitiva Máxima de 15 por Función**:
   - Ninguna función, método o getter/computed debe exceder una complejidad cognitiva de `15`.
   - Descomponer lógicas anidadas (`if` dentro de `for`, ternarios múltiples) en funciones puras auxiliares con responsabilidades unitarias.
- **Prohibición Absoluta del Tipo `any`**:
   - Todo dato debe modelarse mediante `interface`, `type` o `Record<string, T>`.
   - Cuando la estructura sea dinámica o incierta, emplear `unknown` junto con validación en tiempo de ejecución (*Zod*, *type guards* o *narrowing*).
- **Tipado Explícito de Métodos y Propiedades**:
   - Todas las firmas de métodos y funciones públicas o privadas deben declarar su tipo de retorno explícito.
- **Inmutabilidad y Prevención de Efectos Secundarios**:
   - Nunca mutar arreglos o estructuras de estado directamente (`push`, `splice`, `sort` sobre arreglos originales). Utilizar métodos inmutables (`toSorted`, `filter`, `map`, propagación `[...arr]`).
- **Limpieza de Suscripciones Reactivas**:
   - En componentes basados en RxJS, desuscribir obligatoriamente en la destrucción mediante `takeUntilDestroyed(this.destroyRef)` o pipe `take(1)`. En componentes Angular modernos, preferir `Signal` y `computed` sobre `Observable`.

### 5.3. Estrategia de Testing Unitario para Superar el 80% de Cobertura
Las suites de prueba unitaria (Jasmine/Karma, Jest o Vitest) deben estructurarse cubriendo:
1. **Pruebas de Componentes (Smart & Dumb)**:
   - Inicialización correcta del componente y carga de estado por defecto.
   - Verificación de renderizado de elementos clave y bindings reactivos en el DOM.
   - Pruebas de interacción de usuario: simulación de clicks en botones, envío de formularios, eventos de teclado y cambios en inputs.
   - Verificación de emisión de eventos `@Output()` y mutación correcta de `Signals`.
2. **Pruebas de Servicios HTTP y Capa de Datos**:
   - Mockeo completo de dependencias HTTP mediante `HttpTestingController` o mocks de servicios.
   - Prueba del flujo exitoso (*Happy Path*): verificación de transformación de datos y emisión del resultado.
   - Prueba de flujos de error (*Unhappy Path*): simulación de códigos HTTP 400, 401, 403, 404, 500 y validación de la emisión del error RFC 7807 (`ProblemDetail`).
3. **Pruebas de Guards e Interceptores**:
   - Validación de redirección y bloqueo cuando el usuario no cuenta con sesión o permisos requeridos.
   - Validación de pase libre cuando el usuario cumple con las condiciones RBAC.
   - Interceptores: verificación de inyección de encabezados `Authorization: Bearer <token>` y captura centralizada de errores.
4. **Pruebas de Casos Límite (Edge Cases)**:
   - Colecciones vacías (`[]`), cadenas en blanco, valores límite de paginación, caracteres especiales, y reconexión tras fallo de red.

---

## 6. Checklist de Verificación de Calidad Frontend Senior

Antes de entregar cualquier requerimiento, el código debe cumplir con este checklist:

- [ ] **Compilación Limpia**: `0` errores y `0` advertencias en el build de producción (`ng build --configuration=production` o equivalente).
- [ ] **Documentación Completa en Español**: Comentarios TSDoc exhaustivos en el 100% de clases, componentes, métodos, propiedades y contratos de modelo en idioma español.
- [ ] **Calidad SonarQube (Quality Gate)**:
  - [ ] Cobertura de código unitario > `80%`.
  - [ ] `0` Bugs y `0` Vulnerabilidades (Calificación A).
  - [ ] Complejidad cognitiva <= `15` en todas las funciones.
  - [ ] Duplicidad de código < `3%`.
  - [ ] `0` usos del tipo `any` en todo el módulo.
- [ ] **Sin Datos Dummy**: Los datos provienen exclusivamente de servicios HTTP sincronizados con contratos de backend o de mocks explícitos en tests unitarios.
- [ ] **Resiliencia ante Fallos**: Todos los endpoints HTTP cuentan con gestión de errores (alertas de usuario legibles, no bloqueos de pantalla).
- [ ] **Accesibilidad (A11y)**: Etiquetas `aria-label`, contraste de colores conforme a WCAG AA, navegación completa por teclado.
- [ ] **Rendimiento**: Carga diferida (*lazy loading*) de rutas, imágenes optimizadas, sin reflows ni repaints innecesarios.
- [ ] **Homologación Visual y Respeto al Sistema de Diseño**: Toda nueva funcionalidad utiliza estrictamente las clases, tokens de color (`var(--...)`), fuentes y jerarquías de botones preexistentes en el sistema, garantizando paridad visual idéntica tanto en Modo Claro como en Modo Oscuro.

---

## 7. Protocolo Obligatorio de Versionado Semántico, Cache-Busting y Despliegue Transparente [MANDATORIO]

Queda terminantemente prohibido indicar a los usuarios finales o administradores instrucciones manuales como `"Presione Ctrl + F5 para refrescar la caché y ver los cambios"`. Toda aplicación frontend empresarial debe incorporar resiliencia nativa ante despliegues continuos:

### 7.1. Sincronización Automática de Versión ante Cada Cambio
- **Hook de Compilación (`prebuild`)**: Todo build (`npm run build`, `ng build`) ejecuta de forma obligatoria el script `scripts/update-version.js`.
- **Artefactos Sincronizados**:
  1. `public/version.json`: Mantiene la versión semántica (`version`), fecha (`buildDate`), hora local (`buildTime`), código de entrega (`release`) y nombre oficial del sistema (**COTIC: SISTEMA POS & GESTIÓN DE PRODUCTOS**).
  2. `src/environments/environment*.ts`: Sincroniza `version` y `buildDate` en los perfiles `development`, `qa` y `production`.
  3. `package.json`: Mantiene alineado el atributo `"version"`.

### 7.2. Encabezados de Red y Anti-Caché Estricto (Nginx & Service Worker)
- **Archivos No Cacheables (`no-store`)**:
  `index.html`, `version.json`, `sw.js` y `manifest.webmanifest` deben servirse con:
  ```http
  Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0
  Pragma: no-cache
  Expires: 0
  ```
- **Activos Inmutables**:
  Exclusivamente los bundles con hash de contenido generado por Angular (`chunk-*.js`, `styles-*.css`) pueden utilizar `Cache-Control: public, max-age=31536000, immutable`.
- **Bypass de Service Worker**:
  El Service Worker nunca debe interceptar ni cachear peticiones a `version.json`, `sw.js` ni a la API REST.

### 7.3. Detección Proactiva y Manejo de Chunks Desfasados
- **`AppVersionService`**: Realiza sondeo periódico en segundo plano (cada 45s) y en cada evento `NavigationEnd`. Al detectar una versión remota diferente, ofrece actualización inmediata o la aplica purgando `CacheStorage` sin destruir las credenciales del usuario.
- **`AppErrorHandler`**: Captura excepciones de tipo `ChunkLoadError` o `Failed to fetch dynamically imported module` y recarga automáticamente la aplicación sin interrumpir el flujo del usuario.

### 7.4. Ubicación Estratégica de Versión y Soporte Técnico
- **Pastilla de Versión en Navbar**: Ubicada en la barra superior junto al selector de sedes, con semáforo verde pulsante (`Online`) y acceso directo al modal de soporte técnico.
- **Badge en Cabecera de Sidebar**: Visible junto al título del sistema en el panel lateral.
- **Modal de Diagnóstico**: Diseñado con las variables de tema (Claro/Oscuro), con botón de 1 clic para copiar la información completa de diagnóstico al portapapeles.

### 7.5. Estandarización Universal de Diálogos y Alertas (`AppDialogService`)
- **Prohibición de `window.alert()` y `window.confirm()`**: Quedan erradicadas todas las alertas nativas bloqueantes del navegador.
- **Servicio `AppDialogService`**:
  - Implementa promesas asíncronas (`confirm()` y `alert()`).
  - Provee variantes semánticas: `danger`, `warning`, `info`, `primary`, `success`.
  - Diseñado con altura estándar de 42px en botones, bordes redondeados (10px), iconos y sombras sutiles, 100% adaptable a modo Claro y Oscuro.
  - Aplicado obligatoriamente en: Cierre de Sesión, Restablecimiento de Contraseña ("Reset Clave"), Bloqueo de Sesiones/Usuarios y operaciones destructivas.

---

## 8. Homologación Visual Obligatoria y Respeto al Sistema de Diseño (Design System Enforcement) [MANDATORIO]

Para garantizar una experiencia de usuario profesional, predecible y coherente, **toda nueva funcionalidad, módulo, componente o refactorización que se incorpore a la aplicación debe respetar de forma estricta los estilos, patrones visuales y componentes ya definidos en el sistema**.

Queda terminantemente prohibido introducir estilos ad-hoc, clases inventadas, tipografías discordantes o botones sin contraste que rompan la armonía visual de la plataforma.

### 8.1. Principio de Cero-Dispersión Visual (Zero-Drift UI)
- **Reutilización antes de invención**: Si el sistema ya cuenta con un patrón para formularios, tablas, tarjetas, toolbars, badges o botones, es **obligatorio reutilizarlo**.
- **Consistencia de Marca**: Toda interfaz debe respetar la identidad corporativa (**COTIC: SISTEMA POS & GESTIÓN DE PRODUCTOS**), su paleta de colores institucional y la tipografía base definida (`Plus Jakarta Sans` / `JetBrains Mono`).

### 8.2. Catálogo Oficial de Componentes y Patrones Homologados

#### A. Contenedores de Vistas y Tablas de Datos
- **Estructura Estándar de Página**:
  ```html
  <div class="page-wrapper">
    <div class="card">
      <div class="toolbar">
        <h2 class="section-title">Título del Módulo</h2>
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input type="text" placeholder="Buscar..." [ngModel]="searchQuery()" (ngModelChange)="searchQuery.set($event)" />
        </div>
      </div>
      <div class="table-responsive">
        <table class="data-table">
          <thead>
            <tr><th>Encabezado</th>...</tr>
          </thead>
          <tbody>
            <tr><td>Dato</td>...</tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  ```

#### B. Estándar Universal de Botones
Toda nueva acción debe encajar exactamente en una de las dos jerarquías oficiales:
1. **Botón de Acción Principal (`.btn-primary` o `.btn-corporate-action`)**:
   - Altura estándar: `42px` (o compacta con `.btn-sm`).
   - Radio de borde: `8px` a `10px`.
   - Peso tipográfico: `600` o `700`.
   - Gradiente de color según variante semántica (`primary`, `danger`, `warning`, `success`, `info`).
   - Sombra cromática suave con elevación en hover (`transform: translateY(-1.5px)`).
   - Siempre incluye icono ilustrativo de Bootstrap Icons con margen `me-1`.

2. **Botón Secundario / Cancelar / Volver (`.btn-corporate-secondary` o `.btn-secondary`)**:
   - **Regla Estricta**: Jamás debe renderizarse como texto plano sin bordes ni fondo perceptible.
   - Altura estándar: `42px` (o `32px` con `.btn-sm`).
   - Borde visible de alto contraste: `1.5px solid var(--btn-secondary-border, #cbd5e1)` en Claro y `#475569` en Oscuro.
   - Fondo diferenciado: `var(--btn-secondary-bg, #f1f5f9)` en Claro y `#334155` en Oscuro.
   - Tipografía contrastada: `var(--btn-secondary-text, #1e293b)` en Claro y `#f8fafc` en Oscuro con peso `700`.
   - Estados interactivos: En `hover`, oscurece el fondo a `#e2e8f0` (Claro) o `#475569` (Oscuro) con elevación sutil.
   - Icono contextual: `bi-x-circle`, `bi-shield-check`, `bi-arrow-left`, etc.

#### C. Formularios y Entradas de Datos
- Todos los inputs, selects y textareas deben utilizar:
  - Borde estándar: `1px solid var(--border-color)`.
  - Radio: `8px`.
  - Altura: proporcional con padding `0.58rem 0.85rem`.
  - Resaltado en foco: `border-color: var(--primary-color); outline: none; box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.15)`.
  - Acciones de formulario agrupadas al final con la clase `.form-actions`.

#### D. Modales y Diálogos de Confirmación
- Toda ventana modal o diálogo interactivo debe acoplarse al servicio `AppDialogService` o implementar la estructura de `.app-dialog-card` y `.support-modal-dialog`:
  - **Cabecera**: Título en negrita, subtítulo corporativo y badge redondeado con icono temático.
  - **Cuerpo**: Mensaje claro y directo; si implica riesgo de pérdida de datos o revocación de acceso, incluir un `.dialog-warning-callout`.
  - **Pie**: `.dialog-footer` con botón secundario ("Cancelar" / "Permanecer") a la izquierda o en primer término móvil, y botón de acción principal a la derecha.

### 8.3. Soporte Reactivo de Temas (Claro y Oscuro Obligatorio)
- **Cero colores fijos incompatibles**: Queda prohibido el uso de `#fff` o `#000` hardcodeados en fondos o textos que no respondan al cambio de tema.
- **Uso estricto de variables CSS**:
  - Fondos de tarjetas: `var(--card-bg)`.
  - Textos principales: `var(--text-color)`.
  - Textos secundarios/muted: `var(--text-muted-color)`.
  - Bordes y divisores: `var(--border-color)`.
- **Verificación en ambos temas**: Antes de entregar una funcionalidad, debe comprobarse visualmente alternando el interruptor de tema del Navbar entre **Modo Claro** y **Modo Oscuro** (`body[data-theme="dark"]`). Todos los elementos deben mantener un contraste conforme al estándar **WCAG AA (ratio mínimo 4.5:1)**.
