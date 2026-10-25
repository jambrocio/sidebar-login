# ==============================================================================
# BevAdmin Pro - Herramienta de Gestion y Supervision de Respaldos PostgreSQL
# ==============================================================================
param(
    [switch]$Status,
    [switch]$List,
    [switch]$BackupNow,
    [string]$Restore = "",
    [switch]$TestNotification,
    [switch]$Help
)

$ErrorActionPreference = 'Continue'

function Write-Color([string]$text, [string]$color = 'White') {
    Write-Host $text -ForegroundColor $color
}

function Show-Help {
    Write-Color "`n================================================================================" "Cyan"
    Write-Color "   BEVADMIN PRO - GESTION Y SUPERVISION DE RESPALDOS POSTGRESQL 17             " "Green"
    Write-Color "================================================================================" "Cyan"
    Write-Host "Uso:"
    Write-Host "  .\ops\manage-backups.ps1 -Status             Consulta el estado del ultimo respaldo realizado"
    Write-Host "  .\ops\manage-backups.ps1 -List               Lista todos los respaldos generados (diarios, etc.)"
    Write-Host "  .\ops\manage-backups.ps1 -BackupNow          Ejecuta un respaldo inmediato y envia notificaciones"
    Write-Host "  .\ops\manage-backups.ps1 -Restore <archivo>  Restaura la base de datos a partir de un volcado"
    Write-Host "  .\ops\manage-backups.ps1 -TestNotification   Prueba los canales de alerta (Telegram, Discord, etc.)"
    Write-Host ""
}

if ($Help) {
    Show-Help
    exit 0
}

# 1. Validar que el contenedor de backup este corriendo
$containerRunning = docker ps --filter "name=bevadmin-db-backup" --format "{{.Names}}"
if (-not $containerRunning) {
    Write-Color "ADVERTENCIA: El contenedor 'bevadmin-db-backup' no se encuentra en ejecucion." "Yellow"
    Write-Color "Inicie el modulo de operaciones con: .\ops\start-ops.ps1" "DarkGray"
    exit 1
}

# 2. ACCION: Ejecutar Respaldo Inmediato (-BackupNow)
if ($BackupNow) {
    Write-Color "`n================================================================================" "Cyan"
    Write-Color "   EJECUTANDO RESPALDO INMEDIATO DE BASE DE DATOS Y ENVIANDO NOTIFICACIONES     " "Green"
    Write-Color "================================================================================" "Cyan"

    docker exec bevadmin-db-backup /backup.sh

    Write-Color "`n[OK] Proceso de respaldo completado." "Green"
    Write-Color "Consultando estado consolidado..." "DarkGray"
    $Status = $true
}

# 3. ACCION: Listar Respaldos (-List)
if ($List) {
    Write-Color "`n================================================================================" "Cyan"
    Write-Color "   INVENTARIO DE RESPALDOS DISPONIBLES EN EL ALMACENAMIENTO PERSISTENTE         " "Green"
    Write-Color "================================================================================" "Cyan"

    Write-Color "`n[Ultimos Respaldos Realizados (/backups/last)]" "Yellow"
    docker exec bevadmin-db-backup ls -lh /backups/last

    Write-Color "`n[Respaldos Diarios Disponibles - Retencion 7 dias (/backups/daily)]" "Yellow"
    docker exec bevadmin-db-backup ls -lh /backups/daily

    Write-Color "`n[Respaldos Semanales Disponibles - Retencion 4 semanas (/backups/weekly)]" "Yellow"
    docker exec bevadmin-db-backup ls -lh /backups/weekly

    Write-Color "`n[Respaldos Mensuales Disponibles - Retencion 6 meses (/backups/monthly)]" "Yellow"
    docker exec bevadmin-db-backup ls -lh /backups/monthly

    Write-Host ""
    exit 0
}

# 4. ACCION: Probar Notificaciones (-TestNotification)
if ($TestNotification) {
    Write-Color "`nProbando canales de notificacion configurados en 'bevadmin-db-backup'..." "Cyan"
    docker exec bevadmin-db-backup /hooks/notify-backup post-backup
    exit 0
}

# 5. ACCION: Restauracion Segura de la Base de Datos (-Restore)
if ($Restore -ne "") {
    Write-Color "`n================================================================================" "Red"
    Write-Color "   PROCEDIMIENTO DE RESTAURACION DE BASE DE DATOS POSTGRESQL                    " "Yellow"
    Write-Color "================================================================================" "Red"

    Write-Color "ATENCION: La restauracion sobreescribira los datos actuales de 'admin_dashboard_db'." "Yellow"
    $confirm = Read-Host "Desea proceder con la restauracion de '$Restore'? (escriba 'SI' para confirmar)"
    if ($confirm -ne 'SI') {
        Write-Color "Operacion cancelada por el usuario." "DarkGray"
        exit 0
    }

    Write-Color "`nRestaurando archivo: $Restore..." "Yellow"
    docker exec -i dev-postgres sh -c "gunzip -c /backups/$Restore 2>/dev/null || gunzip -c /backups/daily/$Restore 2>/dev/null || gunzip -c /backups/last/$Restore 2>/dev/null" | docker exec -i dev-postgres psql -U postgres -d admin_dashboard_db

    if ($LASTEXITCODE -eq 0) {
        Write-Color "[OK] Base de datos restaurada exitosamente desde '$Restore'." "Green"
    } else {
        Write-Color "ERROR durante la restauracion. Verifique que el archivo exista dentro de /backups/." "Red"
    }
    exit 0
}

# 6. ACCION POR DEFECTO: Consultar Estado (-Status)
Write-Color "`n================================================================================" "Cyan"
Write-Color "   ESTADO OPERATIVO DEL MODULO DE RESPALDOS POSTGRESQL                          " "Green"
Write-Color "================================================================================" "Cyan"

$health = docker inspect bevadmin-db-backup --format "{{.State.Health.Status}}" 2>$null
Write-Host "  - Salud del Contenedor:       " -NoNewline
if ($health -eq 'healthy') { Write-Color "HEALTHY (Operativo)" "Green" } else { Write-Color "$health" "Yellow" }

# Consultar JSON de ultimo estado
$statusJson = docker exec bevadmin-db-backup cat /backups/backup_latest.json 2>$null
if ($statusJson) {
    try {
        $parsed = $statusJson | ConvertFrom-Json
        Write-Host "  - Estado del Ultimo Respaldo: " -NoNewline
        if ($parsed.status -eq 'SUCCESS') { Write-Color "EXITOSO (SUCCESS)" "Green" } else { Write-Color "$($parsed.status)" "Red" }
        Write-Host "  - Base de Datos Objetivo:     " -NoNewline; Write-Color "$($parsed.database)" "White"
        Write-Host "  - Archivo Generado:           " -NoNewline; Write-Color "$($parsed.filename)" "White"
        $sz = [string]$parsed.size_human + " (" + [string]$parsed.size_bytes + " bytes)"
        Write-Host "  - Tamano del Respaldo:        " -NoNewline; Write-Color $sz "Green"
        Write-Host "  - Duracion del Volcado:       " -NoNewline; Write-Color "$($parsed.duration_seconds) segundos" "White"
        Write-Host "  - Fecha / Hora del Respaldo:  " -NoNewline; Write-Color "$($parsed.date_readable) UTC" "Cyan"
    } catch {
        Write-Host "  $statusJson"
    }
} else {
    Write-Color "  - Aun no se ha registrado ningun respaldo en 'backup_latest.json'." "DarkGray"
    Write-Color "    Puede ejecutar uno inmediatamente con: .\ops\manage-backups.ps1 -BackupNow" "Yellow"
}

Write-Host ""
Write-Color "Ultimas 5 entradas en la bitacora de auditoria historica:" "Yellow"
docker exec bevadmin-db-backup tail -n 5 /backups/backup_history.log 2>$null
Write-Host ""
