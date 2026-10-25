#!/usr/bin/env bash
# ==============================================================================
# BevAdmin Pro - Herramienta de Gestión y Supervisión de Respaldos de Base de Datos
# ==============================================================================
set -e

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

if ! docker ps --filter "name=bevadmin-db-backup" --format "{{.Names}}" | grep -q "bevadmin-db-backup"; then
    echo -e "${YELLOW}ADVERTENCIA: El contenedor 'bevadmin-db-backup' no se encuentra en ejecución.${NC}"
    echo "Inicie el módulo de operaciones con: ./ops/start-ops.sh"
    exit 1
fi

case "$1" in
    --backup-now|backup-now)
        echo -e "\n${CYAN}================================================================================${NC}"
        echo -e "${GREEN}   EJECUTANDO RESPALDO INMEDIATO DE BASE DE DATOS Y ENVIANDO NOTIFICACIONES     ${NC}"
        echo -e "${CYAN}================================================================================${NC}"
        docker exec bevadmin-db-backup /backup.sh
        echo -e "\n${GREEN}✓ Proceso de respaldo completado.${NC}"
        docker exec bevadmin-db-backup cat /backups/backup_latest.json 2>/dev/null || true
        exit 0
        ;;

    --list|list)
        echo -e "\n${CYAN}================================================================================${NC}"
        echo -e "${GREEN}   INVENTARIO DE RESPALDOS DISPONIBLES EN EL ALMACENAMIENTO PERSISTENTE         ${NC}"
        echo -e "${CYAN}================================================================================${NC}"
        echo -e "\n${YELLOW}[Últimos Respaldos Realizados (/backups/last)]${NC}"
        docker exec bevadmin-db-backup sh -c "ls -lh /backups/last/*.sql.gz 2>/dev/null" || echo "  (Sin archivos)"
        echo -e "\n${YELLOW}[Respaldos Diarios Disponibles - Retención 7 días (/backups/daily)]${NC}"
        docker exec bevadmin-db-backup sh -c "ls -lh /backups/daily/*.sql.gz 2>/dev/null" || echo "  (Sin archivos)"
        echo -e "\n${YELLOW}[Respaldos Semanales Disponibles - Retención 4 semanas (/backups/weekly)]${NC}"
        docker exec bevadmin-db-backup sh -c "ls -lh /backups/weekly/*.sql.gz 2>/dev/null" || echo "  (Sin archivos)"
        echo -e "\n${YELLOW}[Respaldos Mensuales Disponibles - Retención 6 meses (/backups/monthly)]${NC}"
        docker exec bevadmin-db-backup sh -c "ls -lh /backups/monthly/*.sql.gz 2>/dev/null" || echo "  (Sin archivos)"
        exit 0
        ;;

    --test-notify|test-notify)
        echo -e "\n${CYAN}Probando canales de notificación configurados en 'bevadmin-db-backup'...${NC}"
        docker exec bevadmin-db-backup sh -c "if [ -x /hooks/notify-backup ]; then /hooks/notify-backup post-backup; else echo 'Hook no encontrado'; fi"
        exit 0
        ;;

    --restore|restore)
        FILE="$2"
        if [ -z "$FILE" ]; then
            echo -e "${RED}Error: Debe especificar el nombre del archivo a restaurar.${NC}"
            echo "Ejemplo: ./ops/manage-backups.sh restore admin_dashboard_db-20261024-120000.sql.gz"
            exit 1
        fi
        echo -e "\n${RED}================================================================================${NC}"
        echo -e "${YELLOW}   PROCEDIMIENTO DE RESTAURACIÓN DE BASE DE DATOS POSTGRESQL                    ${NC}"
        echo -e "${RED}================================================================================${NC}"
        echo -e "${YELLOW}¡ATENCIÓN! La restauración sobreescribirá los datos actuales de 'admin_dashboard_db'.${NC}"
        read -p "¿Está seguro de que desea proceder con la restauración de '$FILE'? (escriba 'SI'): " CONFIRM
        if [ "$CONFIRM" != "SI" ]; then
            echo "Operación cancelada."
            exit 0
        fi
        echo -e "\nRestaurando archivo: $FILE..."
        docker exec -i dev-postgres sh -c "gunzip -c /backups/$FILE 2>/dev/null || gunzip -c /backups/daily/$FILE 2>/dev/null || gunzip -c /backups/last/$FILE 2>/dev/null" | docker exec -i dev-postgres psql -U postgres -d admin_dashboard_db
        echo -e "${GREEN}✓ Restauración completada.${NC}"
        exit 0
        ;;

    --status|status|*)
        echo -e "\n${CYAN}================================================================================${NC}"
        echo -e "${GREEN}   ESTADO OPERATIVO DEL MÓDULO DE RESPALDOS POSTGRESQL                          ${NC}"
        echo -e "${CYAN}================================================================================${NC}"
        HEALTH=$(docker inspect bevadmin-db-backup --format "{{.State.Health.Status}}" 2>/dev/null || echo "Desconocido")
        echo -e "  - Salud del Contenedor:       ${GREEN}${HEALTH}${NC}"
        echo -e "  - Resumen del Último Respaldo:"
        docker exec bevadmin-db-backup cat /backups/backup_latest.json 2>/dev/null || echo "    (No hay registro de respaldo previo aún)"
        echo -e "\n${YELLOW}Últimas 5 entradas en la bitácora de auditoría histórica:${NC}"
        docker exec bevadmin-db-backup tail -n 5 /backups/backup_history.log 2>/dev/null || echo "  (Sin entradas registradas)"
        echo ""
        ;;
esac
