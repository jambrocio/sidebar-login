# =========================================================================
# BevAdmin Pro - Script de Inicio del Módulo de Seguridad y Monitoreo (VPS)
# =========================================================================
param(
    [switch]$Down,
    [switch]$Status,
    [switch]$Logs
)

$ErrorActionPreference = 'Stop'

function Write-Color([string]$text, [string]$color = 'White') {
    Write-Host $text -ForegroundColor $color
}

# 1. Detener servicios si se solicita el flag -Down
if ($Down) {
    Write-Color "Deteniendo módulo de Seguridad y Monitoreo..." "Yellow"
    docker compose -f docker-compose.ops.yml down
    Write-Color "Módulo detenido exitosamente." "Green"
    exit 0
}

# 2. Consultar estado si se solicita el flag -Status
if ($Status) {
    docker compose -f docker-compose.ops.yml ps
    exit 0
}

# 3. Consultar logs si se solicita el flag -Logs
if ($Logs) {
    docker compose -f docker-compose.ops.yml logs -f
    exit 0
}

# 4. Asegurar que la red bevadmin-network exista
$netCheck = docker network ls --filter "name=^bevadmin-network$" --format "{{.Name}}"
if (-not $netCheck) {
    Write-Color "Creando red de infraestructura 'bevadmin-network'..." "Yellow"
    docker network create bevadmin-network | Out-Null
}

# 5. Cargar archivo .env.ops si existe
if (Test-Path "ops\.env.ops") {
    Write-Color "Cargando variables operativas desde ops\.env.ops..." "DarkGray"
    Get-Content "ops\.env.ops" | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim())
        }
    }
}

Write-Color "================================================================================" "Cyan"
Write-Color "   INICIANDO MÓDULO OPERATIVO DE SEGURIDAD (WAF/TLS) Y MONITOREO (VPS)          " "Green"
Write-Color "================================================================================" "Cyan"

docker compose -f docker-compose.ops.yml up -d

Write-Color "`nEstado de los Servicios Operativos:" "Yellow"
docker compose -f docker-compose.ops.yml ps

Write-Host ""
Write-Color "Endpoints de Gestión Operativa Disponibles:" "Cyan"
Write-Host "  - Uptime Kuma (Monitoreo Alert-on-Down): http://localhost:3001"
Write-Host "  - Traefik Dashboard (Seguridad Ingress): http://localhost:8088/dashboard/"
Write-Host ""
Write-Color "Para ver los logs en tiempo real ejecute: .\ops\start-ops.ps1 -Logs" "DarkGray"
Write-Color "Para detener este módulo ejecute:         .\ops\start-ops.ps1 -Down" "DarkGray"
