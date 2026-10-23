package com.elroble.bevadmin.modules.purchases.repository;

import com.elroble.bevadmin.modules.purchases.dto.RegisterPurchaseRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para Compras y Abastecimiento ({@code compras}).
 */
@Repository
public class PurchasesRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public PurchasesRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta las órdenes de compra registradas para el negocio matriz especificado.
     *
     * @param businessId UUID del negocio matriz
     * @return lista de órdenes de compra con sede receptora y usuario comprador
     */
    public List<Map<String, Object>> findPurchasesByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT p.codigo_compra AS id, p.fecha_compra AS date, br.nombre AS branch,
                       p.proveedor AS supplier, p.nombre_categoria AS category, p.detalle_producto AS "productDetail",
                       p.cantidad_cajas AS "boxesQty", p.costo_caja AS "boxCost", p.costo_total AS "totalCost",
                       (u.nombre_completo || ' (' || u.nombre_usuario || ')') AS "buyerUser", p.estado AS status
                FROM compras p
                INNER JOIN sedes br ON br.id = p.sede_id
                INNER JOIN usuarios u ON u.id = p.usuario_comprador_id
                WHERE p.empresa_id = :businessId
                ORDER BY p.fecha_compra DESC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    /**
     * Inserta una nueva orden de compra en la tabla {@code compras} vinculada a la Sede Asignada del usuario.
     *
     * @param req       DTO con los datos de la compra
     * @param user      usuario comprador autenticado
     * @param totalCost costo total calculado ({@code boxCost * boxesQty})
     */
    public void insertPurchaseOrder(
            RegisterPurchaseRequest req,
            AuthenticatedUserPrincipal user,
            BigDecimal totalCost) {
        jdbcClient.sql("""
                INSERT INTO compras (
                    codigo_compra, empresa_id, sede_id, usuario_comprador_id,
                    proveedor, nombre_categoria, detalle_producto, cantidad_cajas,
                    costo_caja, costo_total, estado
                ) VALUES (
                    :purchaseCode, :businessId, :branchId, :buyerUserId,
                    :supplier, :categoryName, :productDetail, :boxesQty,
                    :boxCost, :totalCost, 'Recibido'
                )
                """)
                .param("purchaseCode", req.purchaseCode())
                .param("businessId", user.businessId())
                .param("branchId", user.assignedBranchId())
                .param("buyerUserId", user.userId())
                .param("supplier", req.supplier())
                .param("categoryName", req.categoryName())
                .param("productDetail", req.productDetail())
                .param("boxesQty", req.boxesQty())
                .param("boxCost", req.boxCost())
                .param("totalCost", totalCost)
                .update();
    }
}
