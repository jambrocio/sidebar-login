# ==============================================================================
# BevAdmin Pro - Script de Inicio del Módulo de Seguridad y Monitoreo (VPS)
# ==============================================================================
param(
    [switch]$Stop,
    [switch]$Down,
    [switch]$Status,
    [switch]$Logs
)

$ErrorActionPreference = 'Stop'

# 0. Asegurar que siempre opere desde la raíz del repositorio
$projectRoot = $PSScriptRoot
if ($projectRoot) {
    Set-Location $projectRoot
}

function Write-Color([string]$text, [string]$color = 'White') {
    Write-Host $text -ForegroundColor $color
}

# 1. Detener servicios y restaurar puertos HTTP si se solicita -Stop o -Down
if ($Stop -or $Down) {
    & "$PSScriptRoot\stop-ops.ps1"
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

# 4. Cargar archivo .env.ops si existe
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
Write-Color "   INICIANDO MODULO OPERATIVO DE SEGURIDAD (WAF/TLS) Y MONITOREO (VPS)          " "Green"
Write-Color "================================================================================" "Cyan"

# 6. Aislamiento Perimetral Zero-Trust: Desactivar puertos HTTP no cifrados del host
$appRunning = docker ps --filter "name=dev-frontend" --format "{{.Names}}"
if ($appRunning) {
    Write-Color "`n[Aislamiento Perimetral Zero-Trust]" "Yellow"
    Write-Color "  Desactivando puertos HTTP no cifrados del host (4200 y 8080)..." "DarkGray"
    docker compose -f docker-compose.yml -f docker-compose.ops-ports.yml up -d --no-build dev-frontend dev-backend dev-postgres | Out-Null
    Write-Color "  [OK] Puertos directos cerrados. Ingreso exclusivo por HTTPS en puerto 443." "Green"
}

# 7. Iniciar stack operativo
docker compose -f docker-compose.ops.yml up -d --remove-orphans

Write-Color "`nEstado de los Servicios Operativos:" "Yellow"
docker compose -f docker-compose.ops.yml ps

Write-Host ""
Write-Color "Endpoints y Seguridad Activa:" "Cyan"
Write-Host "  - Acceso Web y API (Exclusivo HTTPS):   " -NoNewline; Write-Color "https://localhost" "Green"
Write-Host "  - Puertos HTTP Inactivos (Bloqueados): " -NoNewline; Write-Color ":80, :4200, :8080 [Cerrados]" "Red"
Write-Host "  - Uptime Kuma (Monitoreo Alert-on-Down): http://localhost:3001"
Write-Host "  - Databasus (Panel Visual de Respaldos): http://localhost:8085"
Write-Host "  - Traefik Dashboard (Seguridad Ingress): http://localhost:8088/dashboard/"
Write-Host ""
Write-Color "Para detener este modulo y volver a HTTP: .\stop-ops.ps1" "Yellow"
Write-Color "Para ver los logs en tiempo real ejecute: .\start-ops.ps1 -Logs" "DarkGray"
