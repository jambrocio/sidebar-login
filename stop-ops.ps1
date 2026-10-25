# ==============================================================================
# BevAdmin Pro - Script de Detención de Ops y Restauración de Modo HTTP
# ==============================================================================
param(
    [switch]$RemoveVolumes
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

Write-Color "`n================================================================================" "Cyan"
Write-Color "   DETENIENDO MODULO OPS Y RESTABLECIENDO MODO HTTP STANDALONE                  " "Yellow"
Write-Color "================================================================================" "Cyan"

# 1. Detener únicamente los contenedores del stack operativo
Write-Color "`n[1/2] Deteniendo suite operativa (Traefik, CrowdSec, Uptime Kuma, etc.)..." "Yellow"
docker compose -f docker-compose.ops.yml stop bevadmin-proxy bevadmin-crowdsec bevadmin-uptime-kuma bevadmin-autoheal bevadmin-db-backup bevadmin-databasus | Out-Null

# 2. Restaurar puertos HTTP directos (4200 y 8080) en los contenedores de aplicación
Write-Color "`n[2/2] Rehabilitando puertos directos HTTP (4200 Frontend y 8080 Backend)..." "Yellow"
docker compose -f docker-compose.yml up -d --no-build dev-frontend dev-backend dev-postgres | Out-Null

Write-Color "  Esperando disponibilidad de salud en http://localhost:4200 y http://localhost:8080..." "DarkGray"
$ready = $false
for ($i = 0; $i -lt 25; $i++) {
    Start-Sleep -Seconds 1
    try {
        $res = Invoke-RestMethod -Uri "http://localhost:4200/api/v1/auth/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($res.status -eq 'UP') {
            $ready = $true
            break
        }
    } catch {}
}

Write-Host ""
Write-Color "================================================================================" "Green"
Write-Color "   [OK] MODULO OPS DETENIDO - MODO HTTP TOTALMENTE RESTABLECIDO                " "Green"
Write-Color "================================================================================" "Green"
Write-Host "  - Estado HTTPS:         " -NoNewline; Write-Color "INACTIVO (Traefik detenido)" "DarkGray"
Write-Host "  - Frontend HTTP Activo: " -NoNewline; Write-Color "http://localhost:4200" "Green"
Write-Host "  - Backend HTTP Activo:  " -NoNewline; Write-Color "http://localhost:8080" "Green"
Write-Host "  - Base de Datos Activa: " -NoNewline; Write-Color "localhost:5432" "Green"
Write-Host ""
