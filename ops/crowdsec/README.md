# 🛡️ CrowdSec — WAF Colaborativo y Prevención de Intrusiones (IPS)

---

## 1. Descripción de su Funcionalidad

**CrowdSec** es un sistema moderno de detección y prevención de intrusiones (**IDS/IPS**) y firewall de aplicaciones web (**WAF**) de código abierto y arquitectura colaborativa:
- **Análisis de Tráfico en Tiempo Real:** Consume de forma desatendida las bitácoras de acceso emitidas por Traefik (`/var/log/traefik/access.log`), identificando comportamientos anómalos o maliciosos.
- **Protección contra OWASP Top 10:** Detecta y mitiga intentos de **SQL Injection (SQLi)**, **Cross-Site Scripting (XSS)**, **Path Traversal**, escaneos de vulnerabilidades automatizados y ataques de fuerza bruta hacia endpoints críticos de autenticación (`/api/v1/auth/login`).
- **Inteligencia Colectiva de Amenazas:** Se sincroniza con la red comunitaria global de CrowdSec para bloquear proactivamente direcciones IP que ya han sido identificadas atacando a otros servidores en Internet.
- **Remediación Automatizada:** Al detectar una amenaza que supera los umbrales de seguridad, genera una decisión de bloqueo (*remediation decision*) expulsando la IP del atacante con respuestas `HTTP 403 Forbidden` o bloqueo a nivel de red.

---

## 2. Consideraciones a Tomar en Cuenta

1. **Volumen Compartido de Bitácoras:**
   - Para que CrowdSec pueda inspeccionar el tráfico entrante, el volumen `traefik-logs` debe estar montado en modo **solo lectura (`:ro`)** en el contenedor `bevadmin-crowdsec`.
2. **Uso de Memoria y CPU:**
   - CrowdSec es altamente eficiente (escrito en Go). Su consumo oscila entre 30 MB y 60 MB de memoria RAM.
3. **Colecciones y Escenarios Actualizados:**
   - El contenedor descarga automáticamente las colecciones configuradas (`crowdsecurity/traefik`, `crowdsecurity/http-cve`, etc.) al arrancar por primera vez, requiriendo conectividad saliente a Internet.
4. **Falsos Positivos y Whitelists:**
   - La colección incluye `crowdsecurity/whitelist-good-actors` para evitar el bloqueo accidental de rastreadores legítimos o redes privadas locales (`127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).

---

## 3. Configuraciones Realizadas

### A. Adquisición de Bitácoras ([`acquis.yaml`](file:///D:/tools/Proyectos/sidebar-login/ops/crowdsec/acquis.yaml))
Indica a CrowdSec la ubicación y el formato del archivo de registro a supervisar:
```yaml
filenames:
  - /var/log/traefik/access.log
labels:
  type: traefik
```

### B. Colecciones de Seguridad Activas en [`docker-compose.ops.yml`](file:///D:/tools/Proyectos/sidebar-login/docker-compose.ops.yml)
- `crowdsecurity/traefik`: Analizadores de registros específicos para el formato JSON de Traefik.
- `crowdsecurity/http-cve`: Detección de vulnerabilidades conocidas y exploits web.
- `crowdsecurity/base-http-scenarios`: Mitigación de escaneos, rastreo agresivo, enumeración de directorios y fuerza bruta HTTP.
- `crowdsecurity/whitelist-good-actors`: Exclusión de motores de búsqueda benignos e interfaces locales.

---

## 4. Pruebas y Validación Paso a Paso

### Prueba 1: Verificar el Estado y Versión del Motor CrowdSec
```powershell
docker exec bevadmin-crowdsec cscli version
```

### Prueba 2: Consultar las Métricas de Ingestión y Detección
Muestra la cantidad de líneas de logs leídas desde Traefik y los escenarios evaluados:
```powershell
docker exec bevadmin-crowdsec cscli metrics
```
*Debe mostrar la tabla `Acquisition Metrics` reflejando líneas leídas del archivo `/var/log/traefik/access.log`.*

### Prueba 3: Listar Escenarios y Parsers Instalados
```powershell
docker exec bevadmin-crowdsec cscli collections list
docker exec bevadmin-crowdsec cscli scenarios list
```

### Prueba 4: Consultar Decisiones de Bloqueo Activas (Bans)
```powershell
docker exec bevadmin-crowdsec cscli decisions list
```
*(Inicialmente la tabla estará vacía si no se han detectado ataques recientes).*

### Prueba 5: Simulación de Ataque Web Malicioso (Detección WAF)
Para comprobar que CrowdSec intercepta peticiones maliciosas a través de Traefik, ejecute una solicitud con un User-Agent sospechoso o una carga de sondeo:
```powershell
# Enviar petición con firma de escáner conocido:
Invoke-WebRequest -Uri "https://localhost/api/v1/auth/login" -UserAgent "nikto" -SkipCertificateCheck -ErrorAction SilentlyContinue

# Consultar las alertas generadas en CrowdSec:
docker exec bevadmin-crowdsec cscli alerts list
```
*CrowdSec registrará el intento en su bitácora de alertas de seguridad con fecha, IP de origen y escenario disparado.*
