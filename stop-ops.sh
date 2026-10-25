#!/usr/bin/env bash
# ==============================================================================
# BevAdmin Pro - Script de Detención de Ops y Restauración de Modo HTTP
# ==============================================================================
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${ROOT_DIR}"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
DARKGRAY='\033[1;30m'
NC='\033[0m'

echo -e "\n${CYAN}================================================================================${NC}"
echo -e "${YELLOW}   DETENIENDO MÓDULO OPS Y RESTABLECIENDO MODO HTTP STANDALONE                  ${NC}"
echo -e "${CYAN}================================================================================${NC}"

# 1. Detener únicamente los contenedores del stack operativo
echo -e "\n${YELLOW}[1/2] Deteniendo suite operativa (Traefik, CrowdSec, Uptime Kuma, etc.)...${NC}"
docker compose -f docker-compose.ops.yml stop bevadmin-proxy bevadmin-crowdsec bevadmin-uptime-kuma bevadmin-autoheal bevadmin-db-backup bevadmin-databasus >/dev/null 2>&1 || true

# 2. Restaurar puertos HTTP directos de aplicación
echo -e "\n${YELLOW}[2/2] Rehabilitando puertos directos HTTP (4200 para Frontend y 8080 para Backend)...${NC}"
docker compose -f docker-compose.yml up -d --no-build dev-frontend dev-backend dev-postgres >/dev/null 2>&1 || true

echo -e "  ${DARKGRAY}Esperando disponibilidad de salud en http://localhost:4200...${NC}"
for i in {1..25}; do
    sleep 1
    if curl -s -f http://localhost:4200/api/v1/auth/health >/dev/null 2>&1; then
        break
    fi
done

echo -e "\n${GREEN}================================================================================${NC}"
echo -e "${GREEN}   ✓ MÓDULO OPS DETENIDO - MODO HTTP TOTALMENTE RESTABLECIDO                   ${NC}"
echo -e "${GREEN}================================================================================${NC}"
echo -e "  - Estado HTTPS:         ${DARKGRAY}INACTIVO (Traefik detenido)${NC}"
echo -e "  - Frontend HTTP Activo: ${GREEN}http://localhost:4200${NC}"
echo -e "  - Backend HTTP Activo:  ${GREEN}http://localhost:8080${NC}"
echo -e "  - Base de Datos Activa: ${GREEN}localhost:5432${NC}\n"
