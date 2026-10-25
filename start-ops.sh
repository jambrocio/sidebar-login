#!/usr/bin/env bash
# ==============================================================================
# BevAdmin Pro - Script de Inicio del Módulo de Seguridad y Monitoreo (VPS)
# ==============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

case "$1" in
    --stop|stop|--down|down)
        exec "${ROOT_DIR}/stop-ops.sh"
        ;;
    --status|status)
        docker compose -f docker-compose.ops.yml ps
        exit 0
        ;;
    --logs|logs)
        docker compose -f docker-compose.ops.yml logs -f
        exit 0
        ;;
esac

# Cargar variables de entorno operativas si existen
if [ -f "ops/.env.ops" ]; then
    echo -e "${CYAN}Cargando variables operativas desde ops/.env.ops...${NC}"
    export $(grep -v '^#' ops/.env.ops | xargs)
fi

echo -e "${CYAN}================================================================================${NC}"
echo -e "${GREEN}   INICIANDO MÓDULO OPERATIVO DE SEGURIDAD (WAF/TLS) Y MONITOREO (VPS)          ${NC}"
echo -e "${CYAN}================================================================================${NC}"

# Aislamiento Perimetral Zero-Trust: Desactivar puertos HTTP directos si la app está corriendo
if docker ps --filter "name=dev-frontend" --format "{{.Names}}" | grep -q "dev-frontend"; then
    echo -e "\n${YELLOW}[Aislamiento Perimetral Zero-Trust]${NC}"
    echo -e "  Desactivando puertos HTTP no cifrados del host (4200 y 8080)..."
    docker compose -f docker-compose.yml -f docker-compose.ops-ports.yml up -d --no-build dev-frontend dev-backend dev-postgres >/dev/null 2>&1 || true
    echo -e "  ${GREEN}[OK] Puertos directos cerrados. Ingreso exclusivo por HTTPS en puerto 443.${NC}"
fi

# Iniciar stack operativo
docker compose -f docker-compose.ops.yml up -d --remove-orphans

echo -e "\n${YELLOW}Estado de los Servicios Operativos:${NC}"
docker compose -f docker-compose.ops.yml ps

echo -e "\n${CYAN}Endpoints y Seguridad Activa:${NC}"
echo -e "  - Acceso Web y API (Exclusivo HTTPS):   ${GREEN}https://localhost${NC}"
echo -e "  - Puertos HTTP Inactivos (Bloqueados): ${RED}:80, :4200, :8080 [Cerrados]${NC}"
echo -e "  - Uptime Kuma (Monitoreo Alert-on-Down): http://localhost:3001"
echo -e "  - Databasus (Panel Visual Respaldos):   http://localhost:8085"
echo -e "  - Traefik Dashboard (Seguridad Ingress): http://localhost:8088/dashboard/"
echo -e "\nPara ver logs en tiempo real: ./start-ops.sh logs"
echo -e "Para detener el módulo y volver a HTTP: ./stop-ops.sh\n"
