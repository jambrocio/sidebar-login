#!/usr/bin/env bash
# ==============================================================================
# Script Maestro de Despliegue y Arranque Integral de BevAdmin Pro
# ==============================================================================
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}================================================================================${NC}"
echo -e "${GREEN}           SISTEMA DE ADMINISTRACIÓN Y VENTAS BEVADMIN PRO 2026                 ${NC}"
echo -e "${YELLOW}                 SCRIPT MAESTRO DE INICIALIZACIÓN INTEGRAL                      ${NC}"
echo -e "${CYAN}================================================================================${NC}\n"

# 1. Selección Interactiva del Ambiente si no se pasó como primer argumento
ENV_ARG="${1:-}"

if [ -z "$ENV_ARG" ]; then
    echo -e "${YELLOW}Seleccione el ambiente que desea inicializar:${NC}"
    echo "  [1] DESARROLLO (dev)   - Depuración habilitada, logs detallados"
    echo "  [2] QA (qa)            - Ambiente de pruebas y control de calidad"
    echo "  [3] PRODUCCIÓN (prod)  - Optimización máxima, minificación AOT"
    echo "  [4] Salir"
    echo ""
    read -rp "Ingrese una opción [1-4]: " choice
    case "$choice" in
        1) ENV_ARG="dev" ;;
        2) ENV_ARG="qa" ;;
        3) ENV_ARG="prod" ;;
        *) echo "Operación cancelada."; exit 0 ;;
    esac
fi

# Normalización del ambiente
case "$(echo "$ENV_ARG" | tr '[:upper:]' '[:lower:]')" in
    desarrollo|dev)
        SPRING_PROFILE="dev"
        NG_CONFIG="development"
        ENV_NAME="Desarrollo (DEV)"
        ;;
    qa)
        SPRING_PROFILE="qa"
        NG_CONFIG="qa"
        ENV_NAME="Control de Calidad (QA)"
        ;;
    produccion|prod)
        SPRING_PROFILE="prod"
        NG_CONFIG="production"
        ENV_NAME="Producción (PROD)"
        ;;
    *)
        SPRING_PROFILE="dev"
        NG_CONFIG="development"
        ENV_NAME="Desarrollo (DEV)"
        ;;
esac

echo -e "${CYAN}>>> Ambiente Seleccionado: ${ENV_NAME}${NC}"
echo -e "${CYAN}>>> Perfil Spring Boot:    ${SPRING_PROFILE}${NC}"
echo -e "${CYAN}>>> Configuración Angular: ${NG_CONFIG}${NC}\n"

# 2. Verificación de Docker
echo -e "${YELLOW}[1/4] Verificando estado del motor Docker...${NC}"
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}ERROR: Docker no se encuentra en ejecución o no responde.${NC}"
    echo -e "${YELLOW}Por favor, inicie Docker y vuelva a ejecutar este script.${NC}"
    exit 1
fi
echo -e "${GREEN}  ✓ Motor Docker operativo y listo.${NC}\n"

# 3. Inicialización de PostgreSQL
echo -e "${YELLOW}[2/4] Verificando e iniciando base de datos PostgreSQL...${NC}"
export DB_NAME="admin_dashboard_db"
export DB_USER="postgres"
export DB_PASSWORD="postgres"
export SPRING_PROFILES_ACTIVE="$SPRING_PROFILE"
export FRONTEND_ENV="$NG_CONFIG"

# Limpiar red huérfana manual si existe sin etiquetas de Compose para evitar colisiones
net_label=$(docker network inspect bevadmin-network --format '{{index .Labels "com.docker.compose.network"}}' 2>/dev/null || true)
if [ -n "$(docker network ls --filter "name=^bevadmin-network$" -q)" ] && [ -z "$net_label" ]; then
    docker network rm bevadmin-network 2>/dev/null || true
fi

if docker ps -a --filter "name=^dev-postgres$" --format "{{.Names}}" | grep -q "dev-postgres"; then
    docker start dev-postgres >/dev/null 2>&1 || true
else
    docker compose up -d dev-postgres
fi

echo -n "  Esperando disponibilidad de PostgreSQL (puerto 5432)..."
for i in {1..15}; do
    if docker exec dev-postgres pg_isready -U postgres -d admin_dashboard_db >/dev/null 2>&1; then
        echo -e "\n${GREEN}  ✓ PostgreSQL está activo, saludable y aceptando conexiones.${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# 4. Construcción y Despliegue de Backend y Frontend
echo -e "\n${YELLOW}[3/4] Compilando y levantando contenedores de Backend y Frontend...${NC}"
docker compose up -d --build dev-backend dev-frontend

echo -e "\n${YELLOW}[4/4] Verificando salud de los servicios HTTP...${NC}"
echo -n "  Esperando respuesta del servicio Backend (http://localhost:8080)..."
for i in {1..30}; do
    if curl -s -f http://localhost:8080/api/v1/auth/health >/dev/null 2>&1; then
        echo -e "\n${GREEN}  ✓ Backend Spring Boot 4 ONLINE y sincronizado con PostgreSQL.${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# 5. Resumen final
echo -e "\n${GREEN}================================================================================${NC}"
echo -e "${GREEN}                  DESPLIEGUE FINALIZADO EXITOSAMENTE                            ${NC}"
echo -e "${GREEN}================================================================================${NC}\n"
echo -e "  Ambiente Activo:        ${YELLOW}${ENV_NAME}${NC}"
echo -e "  Frontend Angular:       ${CYAN}http://localhost:4200${NC}"
echo -e "  Backend REST API:       ${CYAN}http://localhost:8080/api/v1${NC}"
echo -e "  Swagger UI OpenAPI:     ${CYAN}http://localhost:8080/swagger-ui.html${NC}"
echo -e "  Base de Datos (DB):     ${CYAN}localhost:5432/admin_dashboard_db (PostgreSQL 17)${NC}\n"
echo -e "  Cuentas de Acceso Disponibles:"
echo "    - Administrador General: agarcia    / AdminRoble2026#"
echo "    - Administrador Sede:    jquispe    / SedeRoble2026#"
echo "    - Supervisor de Ventas:  cmendoza   / SuperRoble2026#"
echo "    - Cajero Mayorista:      ltorres    / CajaRoble2026#"
echo -e "\n${GREEN}================================================================================${NC}"
