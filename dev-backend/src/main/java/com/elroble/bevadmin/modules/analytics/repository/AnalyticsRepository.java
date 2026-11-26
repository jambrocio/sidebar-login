package com.elroble.bevadmin.modules.analytics.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Repositorio síncrono de analítica ejecutiva para el Dashboard de Toma de Decisiones.
 * Consolida métricas reales de ventas, compras, inventario, categorías y locales desde PostgreSQL.
 */
@Repository
public class AnalyticsRepository {

    private final JdbcClient jdbcClient;

    public AnalyticsRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Construye el resumen ejecutivo completo filtrado por negocio (opcional) y ventana de días.
     *
     * @param businessCode código del negocio matriz o {@code null}/{@code ALL} para vista global
     * @param days         ventana temporal en días (ej. 7, 30, 90, 365)
     * @return mapa estructurado con KPIs, series, ranking de locales, top productos y stock crítico
     */
    public Map<String, Object> getDecisionDashboard(String businessCode, int days) {
        boolean filterByBusiness = businessCode != null && !businessCode.isBlank() && !"ALL".equalsIgnoreCase(businessCode);
        String bizCodeUpper = filterByBusiness ? businessCode.trim().toUpperCase() : "";

        Map<String, Object> salesKpi = jdbcClient.sql("""
                SELECT COUNT(v.id) AS "totalSales",
                       COALESCE(SUM(v.total), 0) AS "totalRevenue",
                       COALESCE(AVG(v.total), 0) AS "averageTicket"
                FROM ventas v
                INNER JOIN empresas e ON e.id = v.empresa_id
                WHERE v.fecha_emision >= NOW() - (:days || ' days')::INTERVAL
                  AND (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                """)
                .param("days", days)
                .param("filterByBiz", filterByBusiness)
                .param("bizCode", bizCodeUpper)
                .query()
                .singleRow();

        Map<String, Object> purchasesKpi = jdbcClient.sql("""
                SELECT COUNT(c.id) AS "totalPurchases",
                       COALESCE(SUM(c.costo_total), 0) AS "totalPurchasesAmount"
                FROM compras c
                INNER JOIN empresas e ON e.id = c.empresa_id
                WHERE c.fecha_compra >= NOW() - (:days || ' days')::INTERVAL
                  AND (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                """)
                .param("days", days)
                .param("filterByBiz", filterByBusiness)
                .param("bizCode", bizCodeUpper)
                .query()
                .singleRow();

        Map<String, Object> inventoryKpi = jdbcClient.sql("""
                SELECT COUNT(p.id) AS "totalProducts",
                       COUNT(p.id) FILTER (
                           WHERE UPPER(COALESCE(p.estado_stock, '')) IN ('CRÍTICO', 'CRITICO', 'BAJO', 'AGOTADO')
                              OR p.stock_cajas <= 5
                       ) AS "criticalStockCount",
                       COALESCE(SUM(p.stock_cajas * p.precio_mayorista), 0) AS "inventoryValuation"
                FROM productos_bebidas p
                INNER JOIN empresas e ON e.id = p.empresa_id
                WHERE (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                """)
                .param("filterByBiz", filterByBusiness)
                .param("bizCode", bizCodeUpper)
                .query()
                .singleRow();

        List<Map<String, Object>> dailyTrend = jdbcClient.sql("""
                WITH dias AS (
                    SELECT generate_series(
                        CURRENT_DATE - (:trendDays - 1),
                        CURRENT_DATE,
                        INTERVAL '1 day'
                    )::date AS fecha
                ),
                ventas_dia AS (
                    SELECT DATE(v.fecha_emision) AS fecha,
                           COALESCE(SUM(v.total), 0) AS monto_ventas,
                           COUNT(v.id) AS cantidad_ventas
                    FROM ventas v
                    INNER JOIN empresas e ON e.id = v.empresa_id
                    WHERE v.fecha_emision >= CURRENT_DATE - (:trendDays - 1)
                      AND (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                    GROUP BY DATE(v.fecha_emision)
                ),
                compras_dia AS (
                    SELECT DATE(c.fecha_compra) AS fecha,
                           COALESCE(SUM(c.costo_total), 0) AS monto_compras
                    FROM compras c
                    INNER JOIN empresas e ON e.id = c.empresa_id
                    WHERE c.fecha_compra >= CURRENT_DATE - (:trendDays - 1)
                      AND (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                    GROUP BY DATE(c.fecha_compra)
                )
                SELECT TO_CHAR(d.fecha, 'YYYY-MM-DD') AS date,
                       TO_CHAR(d.fecha, 'DD/MM') AS label,
                       COALESCE(vd.monto_ventas, 0) AS sales,
                       COALESCE(vd.cantidad_ventas, 0) AS "salesCount",
                       COALESCE(cd.monto_compras, 0) AS purchases
                FROM dias d
                LEFT JOIN ventas_dia vd ON vd.fecha = d.fecha
                LEFT JOIN compras_dia cd ON cd.fecha = d.fecha
                ORDER BY d.fecha ASC
                """)
                .param("trendDays", Math.min(days, 14))
                .param("filterByBiz", filterByBusiness)
                .param("bizCode", bizCodeUpper)
                .query()
                .listOfRows();

        List<Map<String, Object>> branchPerformance = jdbcClient.sql("""
                SELECT s.codigo AS code,
                       s.nombre AS name,
                       e.codigo AS "businessCode",
                       COUNT(v.id) AS "salesCount",
                       COALESCE(SUM(v.total), 0) AS revenue,
                       COALESCE(AVG(v.total), 0) AS "avgTicket"
                FROM sedes s
                INNER JOIN empresas e ON e.id = s.empresa_id
                LEFT JOIN ventas v ON v.sede_id = s.id
                  AND v.fecha_emision >= NOW() - (:days || ' days')::INTERVAL
                WHERE COALESCE(s.estado, 'Operativo') <> 'Inactivo'
                  AND (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                GROUP BY s.id, s.codigo, s.nombre, e.codigo
                ORDER BY revenue DESC, s.codigo ASC
                """)
                .param("days", days)
                .param("filterByBiz", filterByBusiness)
                .param("bizCode", bizCodeUpper)
                .query()
                .listOfRows();

        List<Map<String, Object>> topProducts = jdbcClient.sql("""
                SELECT COALESCE(dv.sku_producto, 'N/A') AS sku,
                       dv.nombre_producto AS name,
                       COALESCE(MAX(p.nombre_categoria), 'General') AS category,
                       COALESCE(SUM(dv.cantidad), 0) AS "unitsSold",
                       COALESCE(SUM(dv.subtotal_linea), 0) AS revenue,
                       COALESCE(MAX(p.stock_cajas), 0) AS "currentStock"
                FROM detalles_venta dv
                INNER JOIN ventas v ON v.id = dv.venta_id
                INNER JOIN empresas e ON e.id = v.empresa_id
                LEFT JOIN productos_bebidas p ON p.codigo_sku = dv.sku_producto AND p.empresa_id = v.empresa_id
                WHERE v.fecha_emision >= NOW() - (:days || ' days')::INTERVAL
                  AND (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                GROUP BY dv.sku_producto, dv.nombre_producto
                ORDER BY revenue DESC
                LIMIT 8
                """)
                .param("days", days)
                .param("filterByBiz", filterByBusiness)
                .param("bizCode", bizCodeUpper)
                .query()
                .listOfRows();

        List<Map<String, Object>> criticalStock = jdbcClient.sql("""
                SELECT COALESCE(p.codigo_sku, 'SIN-SKU') AS sku,
                       p.nombre AS name,
                       e.codigo AS "businessCode",
                       p.stock_cajas AS "currentStock",
                       5 AS "minStock",
                       p.precio_mayorista AS "unitCost"
                FROM productos_bebidas p
                INNER JOIN empresas e ON e.id = p.empresa_id
                WHERE (UPPER(COALESCE(p.estado_stock, '')) IN ('CRÍTICO', 'CRITICO', 'BAJO', 'AGOTADO')
                       OR p.stock_cajas <= 5)
                  AND (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                ORDER BY p.stock_cajas ASC, p.nombre ASC
                LIMIT 10
                """)
                .param("filterByBiz", filterByBusiness)
                .param("bizCode", bizCodeUpper)
                .query()
                .listOfRows();

        List<Map<String, Object>> categoryBreakdown = jdbcClient.sql("""
                SELECT COALESCE(p.nombre_categoria, 'General') AS category,
                       COALESCE(SUM(dv.cantidad), 0) AS units,
                       COALESCE(SUM(dv.subtotal_linea), 0) AS revenue
                FROM detalles_venta dv
                INNER JOIN ventas v ON v.id = dv.venta_id
                INNER JOIN empresas e ON e.id = v.empresa_id
                LEFT JOIN productos_bebidas p ON p.codigo_sku = dv.sku_producto AND p.empresa_id = v.empresa_id
                WHERE v.fecha_emision >= NOW() - (:days || ' days')::INTERVAL
                  AND (:filterByBiz = FALSE OR UPPER(e.codigo) = :bizCode)
                GROUP BY COALESCE(p.nombre_categoria, 'General')
                ORDER BY revenue DESC
                LIMIT 6
                """)
                .param("days", days)
                .param("filterByBiz", filterByBusiness)
                .param("bizCode", bizCodeUpper)
                .query()
                .listOfRows();

        BigDecimal totalRevenue = toBigDecimal(salesKpi.get("totalRevenue"));
        BigDecimal totalPurchases = toBigDecimal(purchasesKpi.get("totalPurchasesAmount"));
        BigDecimal estimatedMargin = totalRevenue.subtract(totalPurchases);
        BigDecimal marginPercent = totalRevenue.compareTo(BigDecimal.ZERO) > 0
                ? estimatedMargin.multiply(BigDecimal.valueOf(100)).divide(totalRevenue, 1, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;

        Map<String, Object> kpis = new HashMap<>();
        kpis.put("totalSales", salesKpi.get("totalSales"));
        kpis.put("totalRevenue", totalRevenue);
        kpis.put("averageTicket", toBigDecimal(salesKpi.get("averageTicket")).setScale(2, RoundingMode.HALF_UP));
        kpis.put("totalPurchases", purchasesKpi.get("totalPurchases"));
        kpis.put("totalPurchasesAmount", totalPurchases);
        kpis.put("estimatedMargin", estimatedMargin);
        kpis.put("marginPercent", marginPercent);
        kpis.put("totalProducts", inventoryKpi.get("totalProducts"));
        kpis.put("criticalStockCount", inventoryKpi.get("criticalStockCount"));
        kpis.put("inventoryValuation", inventoryKpi.get("inventoryValuation"));

        Map<String, Object> result = new HashMap<>();
        result.put("days", days);
        result.put("businessCode", filterByBusiness ? bizCodeUpper : "ALL");
        result.put("kpis", kpis);
        result.put("dailyTrend", dailyTrend);
        result.put("branchPerformance", branchPerformance);
        result.put("topProducts", topProducts);
        result.put("criticalStock", criticalStock);
        result.put("categoryBreakdown", categoryBreakdown);
        return result;
    }

    private BigDecimal toBigDecimal(Object val) {
        if (val instanceof BigDecimal bd) {
            return bd;
        }
        if (val instanceof Number n) {
            return BigDecimal.valueOf(n.doubleValue());
        }
        return BigDecimal.ZERO;
    }
}
