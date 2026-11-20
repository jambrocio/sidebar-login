package com.elroble.bevadmin.modules.catalog.repository;

import com.elroble.bevadmin.modules.catalog.dto.CreateBeverageRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para el Catálogo Maestro de Bebidas ({@code productos_bebidas})
 * y Líneas / Categorías ({@code categorias_bebidas}).
 */
@Repository
public class CatalogRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public CatalogRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public java.util.Optional<UUID> findBusinessIdByCode(String businessCode) {
        return jdbcClient.sql("""
                SELECT id FROM core.empresas
                WHERE codigo = :code OR CAST(id AS text) = :code
                LIMIT 1
                """)
                .param("code", businessCode.toUpperCase())
                .query(UUID.class)
                .optional();
    }

    /**
     * Consulta todas las bebidas del catálogo maestro para todas las empresas (Superusuario).
     *
     * @return lista global de bebidas con precios por mayor/menor, stock y negocio propietario
     */
    public List<Map<String, Object>> findAllBeverages() {
        return jdbcClient.sql("""
                SELECT p.codigo_sku AS sku, p.nombre AS name, p.nombre_categoria AS category, p.presentacion AS presentation,
                       p.precio_minorista AS "retailPrice", p.precio_mayorista AS "wholesalePrice",
                       p.stock_cajas AS "stockBoxes", p.stock_unidades AS "stockUnits",
                       p.estado_stock AS status,
                       (u.nombre_completo || ' (' || u.nombre_usuario || ')') AS "registeredBy",
                       e.codigo AS "businessCode", e.nombre_comercial AS "businessName"
                FROM productos_bebidas p
                INNER JOIN empresas e ON e.id = p.empresa_id
                INNER JOIN usuarios u ON u.id = p.registrado_por_usuario_id
                ORDER BY p.fecha_creacion DESC
                """)
                .query()
                .listOfRows();
    }

    /**
     * Consulta todas las bebidas del catálogo maestro para el Negocio Matriz especificado.
     *
     * @param businessId UUID del negocio matriz
     * @return lista de bebidas con precios por mayor/menor, stock y usuario registrador
     */
    public List<Map<String, Object>> findBeveragesByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT p.codigo_sku AS sku, p.nombre AS name, p.nombre_categoria AS category, p.presentacion AS presentation,
                       p.precio_minorista AS "retailPrice", p.precio_mayorista AS "wholesalePrice",
                       p.stock_cajas AS "stockBoxes", p.stock_unidades AS "stockUnits",
                       p.estado_stock AS status,
                       (u.nombre_completo || ' (' || u.nombre_usuario || ')') AS "registeredBy",
                       e.codigo AS "businessCode", e.nombre_comercial AS "businessName"
                FROM productos_bebidas p
                INNER JOIN empresas e ON e.id = p.empresa_id
                INNER JOIN usuarios u ON u.id = p.registrado_por_usuario_id
                WHERE p.empresa_id = :businessId
                ORDER BY p.fecha_creacion DESC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    /**
     * Inserta una nueva bebida (SKU) en la tabla {@code productos_bebidas}.
     *
     * @param businessId  UUID del negocio matriz
     * @param userId      UUID del usuario registrador
     * @param req         DTO con los datos de la bebida
     * @param stockStatus estado de stock calculado ({@code En Stock}, {@code Stock Bajo}, {@code Agotado})
     */
    public void insertBeverageProduct(
            UUID businessId,
            UUID userId,
            CreateBeverageRequest req,
            String stockStatus) {
        jdbcClient.sql("""
                INSERT INTO productos_bebidas (
                    empresa_id, codigo_sku, nombre, nombre_categoria, presentacion,
                    precio_minorista, precio_mayorista, stock_cajas, stock_unidades,
                    estado_stock, registrado_por_usuario_id
                ) VALUES (
                    :businessId, :sku, :name, :categoryName, :presentation,
                    :retailPrice, :wholesalePrice, :stockBoxes, :stockUnits,
                    :stockStatus, :userId
                )
                """)
                .param("businessId", businessId)
                .param("sku", req.sku().toUpperCase())
                .param("name", req.name())
                .param("categoryName", req.categoryName())
                .param("presentation", req.presentation())
                .param("retailPrice", req.retailPrice())
                .param("wholesalePrice", req.wholesalePrice())
                .param("stockBoxes", req.stockBoxes())
                .param("stockUnits", req.stockUnits())
                .param("stockStatus", stockStatus)
                .param("userId", userId)
                .update();
    }

    /**
     * Consulta todas las líneas y categorías de bebidas para todas las empresas (Superusuario).
     *
     * @return lista global de categorías con su margen mayorista
     */
    public List<Map<String, Object>> findAllCategories() {
        return jdbcClient.sql("""
                SELECT c.codigo AS id, c.nombre AS name, c.slug, c.total_productos AS products,
                       c.margen_mayorista AS "wholesaleMargin",
                       CASE WHEN c.activo THEN 'Activo' ELSE 'Inactivo' END AS status,
                       e.codigo AS "businessCode"
                FROM categorias_bebidas c
                INNER JOIN empresas e ON e.id = c.empresa_id
                ORDER BY c.codigo ASC
                """)
                .query()
                .listOfRows();
    }

    /**
     * Consulta las líneas y categorías de bebidas ({@code categorias_bebidas}) del negocio matriz.
     *
     * @param businessId UUID del negocio matriz
     * @return lista de categorías con su margen mayorista
     */
    public List<Map<String, Object>> findCategoriesByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT c.codigo AS id, c.nombre AS name, c.slug, c.total_productos AS products,
                       c.margen_mayorista AS "wholesaleMargin",
                       CASE WHEN c.activo THEN 'Activo' ELSE 'Inactivo' END AS status,
                       e.codigo AS "businessCode"
                FROM categorias_bebidas c
                INNER JOIN empresas e ON e.id = c.empresa_id
                WHERE c.empresa_id = :businessId
                ORDER BY c.codigo ASC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    /**
     * Inserta una nueva categoría en la tabla {@code categorias_bebidas}.
     */
    public void insertCategory(UUID businessId, String code, String name, String slug, String wholesaleMargin) {
        jdbcClient.sql("""
                INSERT INTO categorias_bebidas (empresa_id, codigo, nombre, slug, margen_mayorista, activo)
                VALUES (:businessId, :code, :name, :slug, :margin, true)
                """)
                .param("businessId", businessId)
                .param("code", code)
                .param("name", name)
                .param("slug", slug)
                .param("margin", wholesaleMargin)
                .update();
    }
}
