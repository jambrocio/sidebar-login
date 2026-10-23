package com.elroble.bevadmin.modules.coupons.repository;

import com.elroble.bevadmin.modules.coupons.dto.CreateCouponRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para Cupones Promocionales de Descuento ({@code cupones_descuento}).
 */
@Repository
public class CouponsRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public CouponsRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta todos los cupones promocionales pertenecientes al negocio matriz especificado.
     *
     * @param businessId UUID del negocio matriz
     * @return lista de cupones con contador de usos y usuario creador
     */
    public List<Map<String, Object>> findCouponsByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT c.codigo AS code, c.tipo_descuento AS "discountType", c.valor_descuento AS "discountValue",
                       c.modalidad_objetivo AS "targetModality", c.categoria_objetivo AS "targetCategory",
                       c.cliente_asignado AS "assignedClient", c.compra_minima AS "minPurchase",
                       c.usos_actuales AS "usedCount", c.usos_maximos AS "maxUses",
                       c.etiqueta_expiracion AS "expiresAt", c.activo AS active,
                       (u.nombre_completo || ' (' || u.nombre_usuario || ')') AS "createdBy"
                FROM cupones_descuento c
                INNER JOIN usuarios u ON u.id = c.creado_por_usuario_id
                WHERE c.empresa_id = :businessId
                ORDER BY c.fecha_creacion DESC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    /**
     * Inserta un nuevo cupón promocional en {@code cupones_descuento}.
     *
     * @param businessId UUID del negocio matriz
     * @param userId     UUID del usuario creador
     * @param req        DTO con los datos del cupón
     */
    public void insertCoupon(UUID businessId, UUID userId, CreateCouponRequest req) {
        jdbcClient.sql("""
                INSERT INTO cupones_descuento (
                    empresa_id, codigo, tipo_descuento, valor_descuento, modalidad_objetivo,
                    categoria_objetivo, cliente_asignado, compra_minima, usos_maximos,
                    etiqueta_expiracion, activo, creado_por_usuario_id
                ) VALUES (
                    :businessId, :code, :discountType, :discountValue, :targetModality,
                    :targetCategory, :assignedClient, :minPurchase, :maxUses,
                    :expiresAt, TRUE, :userId
                )
                """)
                .param("businessId", businessId)
                .param("code", req.code().toUpperCase())
                .param("discountType", req.discountType())
                .param("discountValue", req.discountValue())
                .param("targetModality", req.targetModality())
                .param("targetCategory", req.targetCategory())
                .param("assignedClient", req.assignedClient())
                .param("minPurchase", req.minPurchase() != null ? req.minPurchase() : BigDecimal.ZERO)
                .param("maxUses", req.maxUses())
                .param("expiresAt", req.expiresAt())
                .param("userId", userId)
                .update();
    }

    /**
     * Alterna el estado activo/pausado ({@code activo}) de un cupón dentro del negocio matriz.
     *
     * @param businessId UUID del negocio matriz
     * @param code       código del cupón (ej. {@code MAYORISTA15})
     */
    public void toggleCouponStatus(UUID businessId, String code) {
        jdbcClient.sql("""
                UPDATE cupones_descuento
                SET activo = NOT activo
                WHERE empresa_id = :businessId AND codigo = :code
                """)
                .param("businessId", businessId)
                .param("code", code.toUpperCase())
                .update();
    }
}
