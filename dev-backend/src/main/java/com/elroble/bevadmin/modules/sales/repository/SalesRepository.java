package com.elroble.bevadmin.modules.sales.repository;

import com.elroble.bevadmin.modules.sales.dto.EmitSaleRequest;
import com.elroble.bevadmin.modules.sales.dto.SaleCartItemRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para Ventas por Mayor y Menor ({@code ventas},
 * {@code detalles_venta}, {@code cupones_descuento} y vista {@code vw_ventas_con_detalles_comprobante}).
 */
@Repository
public class SalesRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public SalesRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta la vista {@code vw_ventas_con_detalles_comprobante} filtrando estrictamente por el
     * {@code seller_user_id} del usuario vendedor autenticado en sesión.
     *
     * @param sellerUserId UUID del usuario vendedor activo
     * @return lista de comprobantes emitidos por el usuario con su arreglo JSON de productos
     */
    public List<Map<String, Object>> findSalesHistoryBySellerUserId(UUID sellerUserId) {
        return jdbcClient.sql("""
                SELECT id, emitted_at AS date, branch_name AS branch, client_name AS "clientName",
                       document_type AS "documentType", modality, items_summary AS "itemsSummary",
                       total_items_count AS "totalItemsCount", subtotal, coupon_code AS "couponCode",
                       discount_amount AS "discountAmount", tax_igv AS "taxIgv", total,
                       payment_method AS "paymentMethod", seller_user AS "sellerUser", items
                FROM vw_ventas_con_detalles_comprobante
                WHERE seller_user_id = :sellerUserId
                ORDER BY emitted_at DESC
                """)
                .param("sellerUserId", sellerUserId)
                .query()
                .listOfRows();
    }

    /**
     * Consulta todos los comprobantes emitidos en la Empresa Matriz para reportes y tableros.
     */
    public List<Map<String, Object>> findAllSalesByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT id, emitted_at AS date, branch_name AS branch, client_name AS "clientName",
                       document_type AS "documentType", modality, items_summary AS "itemsSummary",
                       total_items_count AS "totalItemsCount", subtotal, coupon_code AS "couponCode",
                       discount_amount AS "discountAmount", tax_igv AS "taxIgv", total,
                       payment_method AS "paymentMethod", seller_user AS "sellerUser", items
                FROM vw_ventas_con_detalles_comprobante
                WHERE business_id = :businessId
                ORDER BY emitted_at DESC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    /**
     * Genera el siguiente código correlativo de venta si no se envía uno desde el cliente.
     */
    public String generateNextSaleCode() {
        Integer max = jdbcClient.sql("""
                SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_venta FROM '[0-9]+$') AS INT)), 0) + 1
                FROM ventas
                """)
                .query(Integer.class)
                .single();
        return String.format("VTA-%04d", max != null ? max : 1);
    }

    /**
     * Inserta la cabecera del comprobante de venta en la tabla {@code ventas}.
     *
     * @param saleId               UUID generado para la venta
     * @param req                  DTO con los datos del comprobante
     * @param user                 usuario vendedor autenticado (define {@code business_id}, {@code branch_id} y {@code seller_user_id})
     * @param consolidatedModality modalidad consolidada ({@code Por Mayor}, {@code Por Menor} o {@code Mixta (Mayor y Menor)})
     * @param itemsSummary         resumen textual de productos
     * @param subtotal             subtotal antes de descuentos
     * @param discount             importe descontado
     * @param taxIgv               impuesto IGV (18%)
     * @param total                importe total neto cobrado
     */
    public void insertSaleHeader(
            UUID saleId,
            String saleCode,
            EmitSaleRequest req,
            AuthenticatedUserPrincipal user,
            String consolidatedModality,
            String itemsSummary,
            BigDecimal subtotal,
            BigDecimal discount,
            BigDecimal taxIgv,
            BigDecimal total) {
        jdbcClient.sql("""
                INSERT INTO ventas (
                    id, codigo_venta, tipo_comprobante, empresa_id, sede_id, usuario_vendedor_id,
                    nombre_cliente, modalidad, metodo_pago, resumen_items, cantidad_total_items,
                    subtotal, codigo_cupon, monto_descuento, impuesto_igv, total
                ) VALUES (
                    :id, :saleCode, :documentType, :businessId, :branchId, :sellerUserId,
                    :clientName, :modality, :paymentMethod, :itemsSummary, :totalItemsCount,
                    :subtotal, :couponCode, :discountAmount, :taxIgv, :total
                )
                """)
                .param("id", saleId)
                .param("saleCode", saleCode)
                .param("documentType", req.documentType())
                .param("businessId", user.businessId())
                .param("branchId", user.assignedBranchId())
                .param("sellerUserId", user.userId())
                .param("clientName", req.clientName())
                .param("modality", consolidatedModality)
                .param("paymentMethod", req.paymentMethod())
                .param("itemsSummary", itemsSummary)
                .param("totalItemsCount", req.items().size())
                .param("subtotal", subtotal)
                .param("couponCode", req.couponCode())
                .param("discountAmount", discount)
                .param("taxIgv", taxIgv)
                .param("total", total)
                .update();
    }

    /**
     * Inserta una línea de detalle de producto en la tabla {@code detalles_venta}.
     *
     * @param saleId       UUID de la cabecera de venta
     * @param item         DTO del ítem vendido
     * @param lineSubtotal importe subtotal calculado para la línea
     */
    public void insertSaleItem(UUID saleId, SaleCartItemRequest item, BigDecimal lineSubtotal) {
        jdbcClient.sql("""
                INSERT INTO detalles_venta (
                    venta_id, sku_producto, nombre_producto, modalidad,
                    etiqueta_unidad, cantidad, precio_unitario, subtotal_linea
                ) VALUES (
                    :saleId, :sku, :productName, :modality,
                    :unitLabel, :quantity, :unitPrice, :lineSubtotal
                )
                """)
                .param("saleId", saleId)
                .param("sku", item.sku())
                .param("productName", item.productName())
                .param("modality", item.modality())
                .param("unitLabel", item.unitLabel())
                .param("quantity", item.quantity())
                .param("unitPrice", item.unitPrice())
                .param("lineSubtotal", lineSubtotal)
                .update();
    }

    /**
     * Incrementa en 1 el contador de redenciones ({@code usos_actuales}) del cupón utilizado en la venta.
     *
     * @param businessId UUID del negocio matriz
     * @param couponCode código del cupón canjeado
     */
    public void incrementCouponUsage(UUID businessId, String couponCode) {
        jdbcClient.sql("""
                UPDATE cupones_descuento
                SET usos_actuales = usos_actuales + 1
                WHERE empresa_id = :businessId AND codigo = :code
                """)
                .param("businessId", businessId)
                .param("code", couponCode.toUpperCase())
                .update();
    }

    /**
     * Descuenta del inventario el producto vendido según su modalidad (Cajas x Mayor o Unidades x Menor).
     *
     * @param businessId  UUID del negocio matriz
     * @param sku         código SKU del producto (opcional si coincide nombre)
     * @param productName nombre del producto
     * @param modality    modalidad de venta ('Por Mayor' o 'Por Menor')
     * @param quantity    cantidad vendida
     */
    public void decrementProductStock(UUID businessId, String sku, String productName, String modality, int quantity) {
        String cleanSku = sku != null ? sku.trim() : "";
        String cleanName = productName != null ? productName.trim() : "";

        if ("Por Mayor".equalsIgnoreCase(modality)) {
            jdbcClient.sql("""
                    UPDATE inventario.productos_bebidas
                    SET stock_cajas = GREATEST(0, stock_cajas - :qty),
                        stock_unidades = GREATEST(0, stock_unidades - (:qty * 12)),
                        estado_stock = CASE WHEN GREATEST(0, stock_cajas - :qty) > 10 THEN 'En Stock'
                                            WHEN GREATEST(0, stock_cajas - :qty) > 0 THEN 'Stock Bajo'
                                            ELSE 'Agotado' END
                    WHERE (:businessId::uuid IS NULL OR empresa_id = :businessId)
                      AND (
                        (:sku != '' AND UPPER(codigo_sku) = UPPER(:sku))
                        OR UPPER(nombre) = UPPER(:name)
                        OR :name ILIKE '%' || nombre || '%'
                        OR nombre ILIKE '%' || :name || '%'
                      )
                    """)
                    .param("qty", quantity)
                    .param("businessId", businessId)
                    .param("sku", cleanSku)
                    .param("name", cleanName)
                    .update();
        } else {
            jdbcClient.sql("""
                    UPDATE inventario.productos_bebidas
                    SET stock_unidades = GREATEST(0, stock_unidades - :qty),
                        stock_cajas = GREATEST(0, stock_unidades - :qty) / 12,
                        estado_stock = CASE WHEN (GREATEST(0, stock_unidades - :qty) / 12) > 10 THEN 'En Stock'
                                            WHEN GREATEST(0, stock_unidades - :qty) / 12 > 0 THEN 'Stock Bajo'
                                            ELSE 'Agotado' END
                    WHERE (:businessId::uuid IS NULL OR empresa_id = :businessId)
                      AND (
                        (:sku != '' AND UPPER(codigo_sku) = UPPER(:sku))
                        OR UPPER(nombre) = UPPER(:name)
                        OR :name ILIKE '%' || nombre || '%'
                        OR nombre ILIKE '%' || :name || '%'
                      )
                    """)
                    .param("qty", quantity)
                    .param("businessId", businessId)
                    .param("sku", cleanSku)
                    .param("name", cleanName)
                    .update();
        }
    }
}
