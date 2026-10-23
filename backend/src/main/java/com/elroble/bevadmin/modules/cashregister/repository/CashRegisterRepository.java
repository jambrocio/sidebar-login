package com.elroble.bevadmin.modules.cashregister.repository;

import com.elroble.bevadmin.modules.cashregister.dto.CloseCashAuditRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para Arqueo y Cierre de Caja ({@code arqueos_caja}).
 */
@Repository
public class CashRegisterRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public CashRegisterRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta el historial de actas de arqueo y cierre de caja de la empresa matriz especificada.
     *
     * @param businessId UUID de la empresa matriz
     * @return lista de actas de arqueo con su diferencia y dictamen contable
     */
    public List<Map<String, Object>> findCashAuditsByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT a.codigo_arqueo AS id, br.nombre AS branch, a.nombre_turno AS shift,
                       a.fecha_cierre AS "closedAt",
                       (u.nombre_completo || ' (' || u.nombre_usuario || ')') AS "cashierUser",
                       a.saldo_apertura AS "openingBalance", a.ventas_efectivo AS "cashSales",
                       a.ventas_digitales AS "digitalSales", a.gastos AS expenses,
                       a.efectivo_esperado AS "expectedCash", a.efectivo_contado AS "countedCash",
                       a.diferencia AS difference, a.estado_arqueo AS status
                FROM arqueos_caja a
                INNER JOIN sedes br ON br.id = a.sede_id
                INNER JOIN usuarios u ON u.id = a.usuario_cajero_id
                WHERE a.empresa_id = :businessId
                ORDER BY a.fecha_cierre DESC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    /**
     * Inserta una nueva acta de arqueo de caja en {@code arqueos_caja} vinculada a la Sede Asignada.
     *
     * @param req          DTO con los montos declarados
     * @param user         cajero o responsable autenticado
     * @param expectedCash efectivo teórico esperado ({@code openingBalance + cashSales - expenses})
     * @param difference   diferencia resultante ({@code countedCash - expectedCash})
     * @param auditStatus  dictamen contable ({@code Cuadre Exacto}, {@code Sobrante}, {@code Faltante})
     */
    public void insertCashAudit(
            CloseCashAuditRequest req,
            AuthenticatedUserPrincipal user,
            BigDecimal expectedCash,
            BigDecimal difference,
            String auditStatus) {
        jdbcClient.sql("""
                INSERT INTO arqueos_caja (
                    codigo_arqueo, empresa_id, sede_id, usuario_cajero_id, nombre_turno,
                    saldo_apertura, ventas_efectivo, ventas_digitales, gastos,
                    efectivo_esperado, efectivo_contado, diferencia, estado_arqueo
                ) VALUES (
                    :auditCode, :businessId, :branchId, :cashierUserId, :shiftName,
                    :openingBalance, :cashSales, :digitalSales, :expenses,
                    :expectedCash, :countedCash, :difference, :auditStatus
                )
                """)
                .param("auditCode", req.auditCode())
                .param("businessId", user.businessId())
                .param("branchId", user.assignedBranchId())
                .param("cashierUserId", user.userId())
                .param("shiftName", req.shiftName())
                .param("openingBalance", req.openingBalance())
                .param("cashSales", req.cashSales())
                .param("digitalSales", req.digitalSales())
                .param("expenses", req.expenses())
                .param("expectedCash", expectedCash)
                .param("countedCash", req.countedCash())
                .param("difference", difference)
                .param("auditStatus", auditStatus)
                .update();
    }
}
