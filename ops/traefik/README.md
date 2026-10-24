# 🚦 Traefik v3.2 — Reverse Proxy, SSL Automático y Seguridad Ingress

---

## 1. Descripción de su Funcionalidad

**Traefik v3.2** actúa como el punto único de entrada seguro (**Ingress Controller & Reverse Proxy**) para toda la infraestructura del VPS:
- **Terminación SSL/TLS 1.3 Automatizada:** Emite y renueva certificados criptográficos válidos a través de **Let's Encrypt (ACME)** sin necesidad de configurar tareas cron ni scripts externos.
- **Bloqueo Estricto de HTTP Inseguro:** Todo el tráfico que ingresa por el puerto no cifrado `80/tcp` es interceptado y forzado de inmediato mediante redirección permanente (`HTTP 301 Moved Permanently`) hacia `https://` (puerto `443/tcp`). Los routers de la aplicación solo escuchan en el entrypoint seguro (`websecure`), impidiendo cualquier fuga de datos o credenciales en texto claro.
- **Middlewares de Seguridad Perimetral (OWASP Top 10):** Inyecta cabeceras de protección activa contra Clickjacking, MIME-Sniffing y XSS, además de aplicar **HSTS estricto con precarga** (`preload`), compresión dinámica (Gzip/Brotli) y **Rate Limiting** para mitigar ataques de fuerza bruta y DoS.
- **Bitácoras Estructuradas JSON:** Registra cada solicitud en `/var/log/traefik/access.log` para alimentar el motor de detección de intrusiones de **CrowdSec**.

---

## 2. Consideraciones a Tomar en Cuenta

1. **Puertos del Host:**
   - Traefik requiere acceso exclusivo a los puertos `80/tcp` y `443/tcp` del host. Asegúrese de que no haya otros servicios (como Apache o Nginx instalados localmente en el SO) ocupando estos puertos.
2. **Registro DNS Público (Para Producción):**
   - El protocolo ACME de Let's Encrypt exige que el dominio (`DOMAIN_NAME`, ej: `bevadmin.com`) y sus subdominios (`api.bevadmin.com`, `app.bevadmin.com`) apunten mediante un registro DNS tipo `A` a la dirección IP pública del VPS.
   - En entornos locales de prueba (`localhost`), Traefik genera un certificado autofirmado por defecto que requiere la bandera `--insecure` o `-SkipCertificateCheck`.
3. **Seguridad del Docker Socket:**
   - El socket `/var/run/docker.sock` está montado en modo **solo lectura (`:ro`)**, mitigando riesgos de escalada de privilegios.
4. **Permisos del Almacén de Certificados (`acme.json`):**
   - Let's Encrypt exige que el archivo de almacenamiento de llaves privadas dentro del volumen `traefik-acme` posea permisos restrictivos `chmod 600`. Traefik gestiona este permiso automáticamente dentro de su volumen dedicado.

---

## 3. Configuraciones Realizadas

La configuración de Traefik está dividida en dos capas limpias:

### A. Configuración Estática ([`traefik.yml`](file:///D:/tools/Proyectos/sidebar-login/ops/traefik/traefik.yml))
- **Entrypoints:**
  - `web` (`:80`): Redirección HTTP $\rightarrow$ HTTPS (`permanent: true`, `priority: 10000`).
  - `websecure` (`:443`): Entrypoint principal TLS con certificado ACME.
  - `traefik` (`:8080`): Expuesto localmente en `127.0.0.1:8088` para el Dashboard de telemetría y sonda `/ping`.
- **CertificatesResolvers:** Configurado con `letsencrypt` (desafío `httpChallenge` y `tlsChallenge`).

### B. Configuración Dinámica ([`dynamic/`](file:///D:/tools/Proyectos/sidebar-login/ops/traefik/dynamic/))
- **[`middlewares.yml`](file:///D:/tools/Proyectos/sidebar-login/ops/traefik/dynamic/middlewares.yml):**
  - `secHeaders`: `stsSeconds: 31536000`, `stsIncludeSubdomains: true`, `stsPreload: true`, `customFrameOptionsValue: SAMEORIGIN`, `contentTypeNosniff: true`.
  - `rateLimit`: Promedio de 120 peticiones/minuto por IP con ráfagas máximas de 60.
  - `compression`: Compresión automática para respuestas mayores a 1 KB.
  - `tls.options.default`: Restricción a **TLS 1.2 y TLS 1.3**, bloqueando protocolos vulnerables (SSLv3, TLS 1.0, TLS 1.1).
- **[`routes.yml`](file:///D:/tools/Proyectos/sidebar-login/ops/traefik/dynamic/routes.yml):**
  - `frontend-router`: Enruta `Host(app.bevadmin.com) || Host(localhost)` hacia `http://dev-frontend:80`.
  - `backend-router`: Enruta `Host(api.bevadmin.com)` o prefijos `/api/v1` hacia `http://dev-backend:8080`.
  - `status-router`: Enruta `Host(status.bevadmin.com)` hacia `http://bevadmin-uptime-kuma:3001`.

---

## 4. Pruebas y Validación Paso a Paso

### Prueba 1: Bloqueo y Redirección Forzada de HTTP a HTTPS
Verifica que cualquier petición entrante por el puerto 80 no cifrado sea rechazada y redirigida con código `301`:
```powershell
# En PowerShell:
try {
    Invoke-WebRequest -Uri "http://localhost/api/v1/auth/health" -MaximumRedirection 0
} catch {
    $_.Exception.Response.StatusCode  # Debe responder: MovedPermanently (301)
}
```
```bash
# En Bash / cURL:
curl -I http://localhost/api/v1/auth/health
# Respuesta esperada:
# HTTP/1.1 301 Moved Permanently
# Location: https://localhost/api/v1/auth/health
```

### Prueba 2: Acceso Seguro a la API Backend vía HTTPS
```powershell
Invoke-RestMethod -Uri "https://localhost/api/v1/auth/health" -SkipCertificateCheck
# Respuesta esperada:
# status: UP, service: bevadmin-backend
```

### Prueba 3: Acceso Seguro al Frontend y Verificación de Cabeceras OWASP
```powershell
$resp = Invoke-WebRequest -Uri "https://localhost/" -SkipCertificateCheck -Method Head
$resp.StatusCode                       # 200
$resp.Headers["Strict-Transport-Security"] # max-age=31536000; includeSubDomains; preload
$resp.Headers["Referrer-Policy"]       # strict-origin-when-cross-origin
$resp.Headers["Permissions-Policy"]     # camera=(), microphone=(), geolocation=()
```

### Prueba 4: Acceso al Dashboard de Traefik
Abra en el navegador [http://localhost:8088/dashboard/](http://localhost:8088/dashboard/) para visualizar los routers, middlewares y servicios enrutados en tiempo real.
