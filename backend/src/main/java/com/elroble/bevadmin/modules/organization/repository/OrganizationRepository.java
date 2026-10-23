package com.elroble.bevadmin.modules.organization.repository;

import com.elroble.bevadmin.modules.organization.dto.CreateBusinessRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

/**
 * Repositorio síncrono de acceso a datos para Negocios Matriz ({@code empresas}) y
 * Sedes / Sucursales ({@code sedes}).
 */
@Repository
public class OrganizationRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public OrganizationRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta todos los Negocios Matriz registrados ordenados por su código.
     *
     * @return lista de negocios matriz
     */
    public List<Map<String, Object>> findAllBusinesses() {
        return jdbcClient.sql("""
                SELECT codigo AS id, razon_social AS "legalName", nombre_comercial AS "commercialName",
                       identificacion_fiscal AS "taxId", direccion_fiscal AS "fiscalAddress", telefono AS phone,
                       correo_soporte AS "supportEmail", zona_horaria AS timezone, moneda AS currency,
                       CASE WHEN activo THEN 'Activo' ELSE 'Inactivo' END AS status
                FROM empresas
                ORDER BY codigo ASC
                """)
                .query()
                .listOfRows();
    }

    /**
     * Inserta un nuevo Negocio Matriz en la tabla {@code empresas}.
     *
     * @param req DTO con los datos fiscales y comerciales del negocio
     */
    public void insertBusiness(CreateBusinessRequest req) {
        jdbcClient.sql("""
                INSERT INTO empresas (codigo, nombre_comercial, razon_social, identificacion_fiscal, direccion_fiscal, telefono, correo_soporte)
                VALUES (:code, :commercialName, :legalName, :taxId, :fiscalAddress, :phone, :supportEmail)
                """)
                .param("code", req.code().toUpperCase())
                .param("commercialName", req.commercialName())
                .param("legalName", req.legalName())
                .param("taxId", req.taxId())
                .param("fiscalAddress", req.fiscalAddress())
                .param("phone", req.phone())
                .param("supportEmail", req.supportEmail())
                .update();
    }

    /**
     * Consulta las sedes/sucursales registradas en {@code sedes}, filtrando opcionalmente
     * por el código del Negocio Matriz.
     *
     * @param businessCode código opcional del negocio matriz (ej. {@code BIZ-001})
     * @return lista de sedes/sucursales
     */
    public List<Map<String, Object>> findBranchesByBusinessCode(String businessCode) {
        if (businessCode == null || businessCode.isBlank()) {
            return jdbcClient.sql("""
                    SELECT br.codigo AS id, b.codigo AS "businessId", br.nombre AS name, br.tipo_sede AS type,
                           br.direccion AS address, br.telefono AS phone, br.serie_facturacion AS series,
                           br.nombre_encargado AS manager, br.terminales_pos AS "posTerminals", br.estado AS status
                    FROM sedes br
                    INNER JOIN empresas b ON b.id = br.empresa_id
                    ORDER BY br.codigo ASC
                    """)
                    .query()
                    .listOfRows();
        }

        return jdbcClient.sql("""
                SELECT br.codigo AS id, b.codigo AS "businessId", br.nombre AS name, br.tipo_sede AS type,
                       br.direccion AS address, br.telefono AS phone, br.serie_facturacion AS series,
                       br.nombre_encargado AS manager, br.terminales_pos AS "posTerminals", br.estado AS status
                FROM sedes br
                INNER JOIN empresas b ON b.id = br.empresa_id
                WHERE b.codigo = :businessCode
                ORDER BY br.codigo ASC
                """)
                .param("businessCode", businessCode)
                .query()
                .listOfRows();
    }
}
