package com.elroble.bevadmin.modules.menu.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para la resolución del Menú Lateral Dinámico ({@code opciones_menu},
 * {@code permisos_rol_menu}, {@code permisos_usuario_menu} y función {@code fn_obtener_menu_efectivo_usuario}).
 */
@Repository
public class MenuRepository {

    /** Cliente JDBC síncrono conectado a PostgreSQL. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC de Spring
     */
    public MenuRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Ejecuta la función almacenada {@code fn_obtener_menu_efectivo_usuario(:userId)} en PostgreSQL
     * para recuperar las opciones de menú visibles y sus permisos efectivos.
     *
     * @param userId identificador UUID del usuario autenticado
     * @return lista ordenada de opciones de menú visibles con sus banderas RBAC
     */
    public List<Map<String, Object>> findEffectiveMenuByUserId(UUID userId) {
        return jdbcClient.sql("""
                SELECT opcion_menu_id AS menu_id, padre_id AS parent_id, codigo AS code, etiqueta AS label, icono AS icon,
                       ruta_enlace AS "routerLink", etiqueta_miga_pan AS "breadcrumb", orden AS "sortOrder",
                       es_grupo AS "isGroup", es_visible AS "isVisible",
                       puede_ver AS "canView", puede_crear AS "canCreate",
                       puede_editar AS "canEdit", puede_eliminar AS "canDelete", puede_exportar AS "canExport"
                FROM fn_obtener_menu_efectivo_usuario(:userId)
                WHERE es_visible = TRUE
                ORDER BY padre_id NULLS FIRST, orden ASC
                """)
                .param("userId", userId)
                .query()
                .listOfRows();
    }
}
