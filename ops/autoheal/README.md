# 🔄 Autoheal — Watchdog de Auto-Recuperación y Resiliencia de Contenedores

---

## 1. Descripción de su Funcionalidad

**Autoheal** actúa como un perro guardián (**Watchdog**) autónomo que monitoriza en tiempo real el ciclo de vida de los contenedores Docker en el servidor VPS:
- **Supervisión de Salud:** Escucha activamente el demonio de Docker a través de su socket local, verificando el estado de salud reportado por las instrucciones `HEALTHCHECK` de cada contenedor.
- **Auto-Reinicio Desatendido:** Cuando un contenedor pasa a estado `unhealthy` (no saludable) debido a bloqueos de memoria, paros inesperados en hilos o saturación de base de datos, Autoheal emite una orden de reinicio inmediato (`docker restart`).
- **Minimización del MTTR (Mean Time to Recovery):** Reduce el tiempo de inactividad de minutos u horas a menos de **15 segundos**, resolviendo de forma autónoma más del 80% de incidencias transitorias sin necesidad de intervención de un operador humano.

---

## 2. Consideraciones a Tomar en Cuenta

1. **Acceso al Docker Socket:**
   - Autoheal requiere montar `/var/run/docker.sock:/var/run/docker.sock:ro` para consultar el estado de los contenedores y ordenar reinicios al demonio Docker.
2. **Selección Selectiva por Etiqueta (`Label`):**
   - Para evitar reiniciar contenedores que no deben recuperarse automáticamente, Autoheal está configurado con `AUTOHEAL_CONTAINER_LABEL=autoheal`. Solo reiniciará aquellos contenedores que incluyan explícitamente la etiqueta:
     ```yaml
     labels:
       - "autoheal=true"
     ```
3. **Período de Gracia de Arranque (`START_PERIOD`):**
   - Evita reiniciar contenedores durante su fase de inicialización inicial (por ejemplo, mientras Spring Boot compila o Flyway ejecuta migraciones de base de datos). El valor está fijado en 30 segundos.

---

## 3. Configuraciones Realizadas

### Parámetros en [`docker-compose.ops.yml`](file:///D:/tools/Proyectos/sidebar-login/docker-compose.ops.yml)
- **Imagen:** `willfarrell/autoheal:latest`
- **Nombre:** `bevadmin-autoheal`
- **Variables de Entorno:**
  - `AUTOHEAL_CONTAINER_LABEL=autoheal`: Filtro estricto para supervisar únicamente contenedores marcados.
  - `AUTOHEAL_INTERVAL=15`: Frecuencia de verificación en segundos del estado de los contenedores.
  - `AUTOHEAL_START_PERIOD=30`: Segundos de gracia antes de evaluar el primer fallo.
- **Volúmenes:**
  - `/var/run/docker.sock:/var/run/docker.sock:ro`: Conexión de solo lectura al demonio de Docker.

---

## 4. Pruebas y Validación Paso a Paso

### Prueba 1: Verificar el Estado y Salud de Autoheal
```powershell
docker inspect bevadmin-autoheal --format "{{.State.Health.Status}}"
# Debe responder: healthy
```

### Prueba 2: Consultar la Bitácora de Supervisión Activa
```powershell
docker logs bevadmin-autoheal --tail 20
```
*Debe mostrar la confirmación de inicialización y el intervalo de monitoreo configurado:*
```text
Monitoring containers every 15 seconds
Autoheal container label: autoheal
```

### Prueba 3: Simular Auto-Recuperación de un Contenedor
Para comprobar cómo Autoheal detecta un contenedor no saludable y lo recupera:
```powershell
# 1. Monitorear los logs de Autoheal en tiempo real:
docker logs -f bevadmin-autoheal

# 2. En otra terminal, si un contenedor marcado con 'autoheal=true' falla sus healthchecks
# consecutivos (por ejemplo, si el proceso web interno deja de responder en su puerto),
# Autoheal registrará en su consola:
# Container dev-backend (ID) is unhealthy. Restarting...
# Container dev-backend restarted.
```
*El contenedor volverá a iniciar automáticamente y pasará nuevamente a estado `healthy`.*
