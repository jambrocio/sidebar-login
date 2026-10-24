#!/usr/bin/env bash
# =========================================================================
# BevAdmin Pro - Script de Inicio del Módulo de Seguridad y Monitoreo (VPS)
# =========================================================================
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

case "$1" in
    --down|down)
        echo -e "${YELLOW}Deteniendo módulo de Seguridad y Monitoreo...${NC}"
        docker compose -f docker-compose.ops.yml down
        echo -e "${GREEN}Módulo detenido exitosamente.${NC}"
        exit 0
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

# Asegurar que la red bevadmin-network exista
if ! docker network ls --filter "name=^bevadmin-network$" --format "{{.Name}}" | grep -q "bevadmin-network"; then
    echo -e "${YELLOW}Creando red de infraestructura 'bevadmin-network'...${NC}"
    docker network create bevadmin-network >/dev/null 2>&1 || true
fi

# Cargar variables de entorno operativas si existen
if [ -f "ops/.env.ops" ]; then
    echo -e "${CYAN}Cargando variables operativas desde ops/.env.ops...${NC}"
    export $(grep -v '^#' ops/.env.ops | xargs)
fi

echo -e "${CYAN}================================================================================${NC}"
echo -e "${GREEN}   INICIANDO MÓDULO OPERATIVO DE SEGURIDAD (WAF/TLS) Y MONITOREO (VPS)          ${NC}"
echo -e "${CYAN}================================================================================${NC}"

docker compose -f docker-compose.ops.yml up -d

echo -e "\n${YELLOW}Estado de los Servicios Operativos:${NC}"
docker compose -f docker-compose.ops.yml ps

echo -e "\n${CYAN}Endpoints de Gestión Operativa Disponibles:${NC}"
echo -e "  - Uptime Kuma (Monitoreo Alert-on-Down): http://localhost:3001"
echo -e "  - Traefik Dashboard (Seguridad Ingress): http://localhost:8088/dashboard/"
echo -e "\nPara ver logs en tiempo real: ./ops/start-ops.sh logs"
echo -e "Para detener el módulo:       ./ops/start-ops.sh down\n"
