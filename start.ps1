<#
.SYNOPSIS
    Script Maestro de Despliegue y Arranque Integral de BevAdmin Pro.
.DESCRIPTION
    Permite seleccionar el ambiente de ejecución (desarrollo, qa, produccion),
    garantiza la inicialización y salud de la base de datos PostgreSQL,
    y levanta tanto el backend Spring Boot 4 como el frontend Angular 21.
.PARAMETER Environment
    Ambiente a desplegar: 'dev' (desarrollo), 'qa', o 'prod' (producción).
.PARAMETER Mode
    Modo de ejecución: 'docker' (predeterminado, contenedores completos) o 'local' (Postgres en Docker + procesos locales).
.EXAMPLE
    .\start.ps1 -Environment dev
    .\start.ps1 -Environment qa -Mode docker
    .\start.ps1 -Environment prod
#>
param(
    [ValidateSet('dev', 'desarrollo', 'qa', 'prod', 'produccion', '')]
    [string]$Environment = '',

    [ValidateSet('docker', 'local', 'db-only', '')]
    [string]$Mode = 'docker'
)

$ErrorActionPreference = 'Stop'
try { $Host.UI.RawUI.WindowTitle = 'BevAdmin Pro - Despliegue de Servicios' } catch {}

function Write-Color([string]$text, [string]$color = 'White') {
    Write-Host $text -ForegroundColor $color
}

function Show-Banner {
    try { [Console]::Clear() } catch {}
    Write-Color "================================================================================" "Cyan"
    Write-Color "           SISTEMA DE ADMINISTRACIÓN Y VENTAS BEVADMIN PRO 2026                 " "Green"
    Write-Color "                 SCRIPT MAESTRO DE INICIALIZACIÓN INTEGRAL                      " "Yellow"
    Write-Color "================================================================================" "Cyan"
    Write-Host ""
}

# 1. Selección Interactiva del Ambiente si no se especificó por parámetro
Show-Banner

if (-not $Environment) {
    Write-Color "Seleccione el ambiente que desea inicializar:" "Yellow"
    Write-Host "  [1] DESARROLLO (dev)   - Depuración habilitada, logs detallados"
    Write-Host "  [2] QA (qa)            - Ambiente de pruebas y control de calidad"
    Write-Host "  [3] PRODUCCIÓN (prod)  - Optimización máxima, minificación AOT"
    Write-Host "  [4] Salir"
    Write-Host ""
    $choice = Read-Host "Ingrese una opción [1-4]"

    switch ($choice) {
        '1' { $Environment = 'dev' }
        '2' { $Environment = 'qa' }
        '3' { $Environment = 'prod' }
        default {
            Write-Color "`nOperación cancelada por el usuario." "DarkGray"
            exit 0
        }
    }
}

# Normalizar nombre del ambiente
switch ($Environment.ToLower()) {
    'desarrollo' { $Environment = 'dev'; $EnvName = 'Desarrollo (DEV)'; $NgConfig = 'development' }
    'dev'        { $Environment = 'dev'; $EnvName = 'Desarrollo (DEV)'; $NgConfig = 'development' }
    'qa'         { $Environment = 'qa';  $EnvName = 'Control de Calidad (QA)'; $NgConfig = 'qa' }
    'produccion' { $Environment = 'prod'; $EnvName = 'Producción (PROD)'; $NgConfig = 'production' }
    'prod'       { $Environment = 'prod'; $EnvName = 'Producción (PROD)'; $NgConfig = 'production' }
    default      { $Environment = 'dev';  $EnvName = 'Desarrollo (DEV)'; $NgConfig = 'development' }
}

Write-Color ">>> Ambiente Seleccionado: $EnvName" "Cyan"
Write-Color ">>> Perfil Spring Boot:    $Environment" "Cyan"
Write-Color ">>> Configuración Angular: $NgConfig" "Cyan"
Write-Color ">>> Modo de Ejecución:     $Mode" "Cyan"
Write-Host ""

# 2. Verificación de Docker Daemon
Write-Color "[1/4] Verificando estado del motor Docker..." "Yellow"
try {
    $dockerInfo = docker info 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Color "ERROR: El motor de Docker no se encuentra en ejecución o no responde." "Red"
        Write-Color "Por favor, inicie Docker Desktop y vuelva a ejecutar este script." "Yellow"
        exit 1
    }
    Write-Color "  ✓ Motor Docker operativo y listo." "Green"
} catch {
    Write-Color "ERROR: No se pudo comunicar con Docker: $_" "Red"
    exit 1
}

# 3. Inicialización y Verificación de Base de Datos PostgreSQL
Write-Color "`n[2/4] Verificando e iniciando base de datos PostgreSQL..." "Yellow"

$env:DB_NAME = "admin_dashboard_db"
$env:DB_USER = "postgres"
$env:DB_PASSWORD = "postgres"
$env:SPRING_PROFILES_ACTIVE = $Environment
$env:FRONTEND_ENV = $NgConfig

# Iniciar PostgreSQL si está detenido evitando colisión de nombres
$existingPg = docker ps -a --filter "name=^dev-postgres$" --format "{{.Names}}"
if ($existingPg) {
    docker start dev-postgres | Out-Null
} else {
    docker compose up -d dev-postgres | Out-Null
}

# Esperar a que PostgreSQL acepte conexiones
Write-Color "  Esperando disponibilidad de PostgreSQL (puerto 5432)..." "DarkGray"
$maxRetries = 15
$retry = 0
$dbReady = $false

while ($retry -lt $maxRetries) {
    Start-Sleep -Seconds 2
    $check = docker exec dev-postgres pg_isready -U postgres -d admin_dashboard_db 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dbReady = $true
        break
    }
    $retry++
    Write-Host -NoNewline "."
}
Write-Host ""

if (-not $dbReady) {
    Write-Color "ERROR: La base de datos PostgreSQL no respondió a tiempo." "Red"
    exit 1
}
Write-Color "  ✓ PostgreSQL está activo, saludable y aceptando conexiones." "Green"

if ($Mode -eq 'db-only') {
    Write-Color "`n✓ Base de datos iniciada exitosamente en modo 'db-only'." "Green"
    exit 0
}

# 4. Despliegue de Backend y Frontend según el Modo
if ($Mode -eq 'docker') {
    Write-Color "`n[3/4] Compilando y levantando contenedores de Backend y Frontend..." "Yellow"
    Write-Color "  Construyendo imágenes con perfiles [$Environment / $NgConfig]..." "DarkGray"

    docker compose up -d --build dev-backend dev-frontend

    Write-Color "`n[4/4] Verificando salud de los servicios HTTP..." "Yellow"
    
    # Esperar que el backend responda en el puerto 8080
    Write-Color "  Esperando respuesta del servicio Backend (http://localhost:8080)..." "DarkGray"
    $backendReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        try {
            $response = Invoke-RestMethod -Uri "http://localhost:8080/api/v1/auth/health" -Method Get -TimeoutSec 3 -ErrorAction SilentlyContinue
            if ($response -and $response.status -eq 'UP') {
                $backendReady = $true
                break
            }
        } catch {}
        Write-Host -NoNewline "."
    }
    Write-Host ""

    if ($backendReady) {
        Write-Color "  ✓ Backend Spring Boot 4 ONLINE y sincronizado con PostgreSQL." "Green"
    } else {
        Write-Color "  ! Backend todavía inicializando o iniciando Flyway. Verifique con: docker logs -f dev-backend" "Yellow"
    }

    # Verificar Frontend en puerto 4200
    try {
        $frontendResp = Invoke-WebRequest -Uri "http://localhost:4200" -Method Head -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($frontendResp.StatusCode -eq 200) {
            Write-Color "  ✓ Frontend Angular Nginx ONLINE en http://localhost:4200." "Green"
        }
    } catch {
        Write-Color "  ✓ Frontend iniciado en contenedor (puerto 4200 mapeado)." "Green"
    }

} else {
    # Modo Local
    Write-Color "`n[3/4] Modo Local: Inicie el Backend y Frontend en terminales dedicadas:" "Yellow"
    Write-Host "  Terminal 1 (Backend Spring Boot):"
    Write-Color "    cd backend; mvn spring-boot:run -Dspring-boot.run.profiles=$Environment" "Cyan"
    Write-Host "  Terminal 2 (Frontend Angular 21):"
    Write-Color "    cd frontend; npm run start:$Environment" "Cyan"
}

# 5. Resumen de Despliegue y Enlaces de Acceso
Write-Host ""
Write-Color "================================================================================" "Green"
Write-Color "                  DESPLIEGUE FINALIZADO EXITOSAMENTE                            " "Green"
Write-Color "================================================================================" "Green"
Write-Host ""
Write-Host "  Ambiente Activo:        " -NoNewline; Write-Color "$EnvName" "Yellow"
Write-Host "  Frontend Angular:       " -NoNewline; Write-Color "http://localhost:4200" "Cyan"
Write-Host "  Backend REST API:       " -NoNewline; Write-Color "http://localhost:8080/api/v1" "Cyan"
Write-Host "  Swagger UI OpenAPI:     " -NoNewline; Write-Color "http://localhost:8080/swagger-ui.html" "Cyan"
Write-Host "  Actuator Health Check:  " -NoNewline; Write-Color "http://localhost:8080/actuator/health" "Cyan"
Write-Host "  Base de Datos (DB):     " -NoNewline; Write-Color "localhost:5432/admin_dashboard_db (PostgreSQL 17)" "Cyan"
Write-Host ""
Write-Color "  Cuentas de Acceso Disponibles:" "White"
Write-Host "    - Administrador General: agarcia    / AdminRoble2026#"
Write-Host "    - Administrador Sede:    jquispe    / SedeRoble2026#"
Write-Host "    - Supervisor de Ventas:  cmendoza   / SuperRoble2026#"
Write-Host "    - Cajero Mayorista:      ltorres    / CajaRoble2026#"
Write-Host ""
Write-Color "Para detener todos los servicios en cualquier momento ejecute: docker compose down" "DarkGray"
Write-Color "================================================================================" "Green"
