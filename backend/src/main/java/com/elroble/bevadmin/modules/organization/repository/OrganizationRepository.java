package com.elroble.bevadmin.modules.organization.repository;

import com.elroble.bevadmin.modules.organization.dto.CreateBranchRequest;
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
     * Proporciona la moneda configurada por defecto y las monedas admitidas.
     *
     * @return lista de negocios matriz
     */
    public List<Map<String, Object>> findAllBusinesses() {
        List<Map<String, Object>> rows = jdbcClient.sql("""
                SELECT codigo AS id, codigo AS code, razon_social AS "legalName", nombre_comercial AS "commercialName",
                       identificacion_fiscal AS "taxId", direccion_fiscal AS "fiscalAddress", telefono AS phone,
                       correo_soporte AS "supportEmail", zona_horaria AS timezone,
                       COALESCE(moneda_defecto, moneda, 'PEN') AS currency,
                       COALESCE(moneda_defecto, moneda, 'PEN') AS "defaultCurrency",
                       COALESCE(monedas_permitidas, 'PEN,USD') AS "supportedCurrenciesRaw",
                       CASE WHEN activo THEN 'Activo' ELSE 'Inactivo' END AS status
                FROM empresas
                ORDER BY codigo ASC
                """)
                .query()
                .listOfRows();

        return rows.stream().map(row -> {
            Map<String, Object> mutableRow = new java.util.HashMap<>(row);
            String raw = (String) mutableRow.get("supportedCurrenciesRaw");
            List<String> currencies = (raw != null && !raw.isBlank())
                    ? java.util.Arrays.stream(raw.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()
                    : List.of((String) mutableRow.getOrDefault("currency", "PEN"));
            mutableRow.put("supportedCurrencies", currencies);
            return mutableRow;
        }).toList();
    }

    /**
     * Inserta un nuevo Negocio Matriz en la tabla {@code empresas} y registra sus
     * monedas admitidas en {@code core.empresa_monedas}.
     *
     * @param req DTO con los datos fiscales y comerciales del negocio
     */
    public void insertBusiness(CreateBusinessRequest req) {
        String defCurr = (req.defaultCurrency() != null && !req.defaultCurrency().isBlank())
                ? req.defaultCurrency().trim().toUpperCase()
                : ((req.currency() != null && !req.currency().isBlank()) ? req.currency().trim().toUpperCase() : "PEN");

        List<String> currencies = (req.supportedCurrencies() != null && !req.supportedCurrencies().isEmpty())
                ? req.supportedCurrencies().stream().map(c -> c.trim().toUpperCase()).distinct().toList()
                : List.of(defCurr);

        if (!currencies.contains(defCurr)) {
            List<String> mutable = new java.util.ArrayList<>(currencies);
            mutable.add(0, defCurr);
            currencies = mutable;
        }

        String supportedRaw = String.join(",", currencies);

        jdbcClient.sql("""
                INSERT INTO empresas (codigo, nombre_comercial, razon_social, identificacion_fiscal, direccion_fiscal, telefono, correo_soporte, moneda, moneda_defecto, monedas_permitidas)
                VALUES (:code, :commercialName, :legalName, :taxId, :fiscalAddress, :phone, :supportEmail, :currency, :defaultCurrency, :supportedCurrencies)
                """)
                .param("code", req.code().toUpperCase())
                .param("commercialName", req.commercialName())
                .param("legalName", req.legalName())
                .param("taxId", req.taxId())
                .param("fiscalAddress", req.fiscalAddress())
                .param("phone", req.phone())
                .param("supportEmail", req.supportEmail())
                .param("currency", defCurr)
                .param("defaultCurrency", defCurr)
                .param("supportedCurrencies", supportedRaw)
                .update();

        // Población en core.empresa_monedas
        for (String c : currencies) {
            String sym = c.equalsIgnoreCase("PEN") ? "S/" : (c.equalsIgnoreCase("EUR") ? "€" : "$");
            String name = c.equalsIgnoreCase("PEN") ? "Soles Peruanos (PEN)" : (c.equalsIgnoreCase("EUR") ? "Euros (EUR)" : "Dólares Estadounidenses (USD)");
            boolean isDef = c.equalsIgnoreCase(defCurr);
            jdbcClient.sql("""
                    INSERT INTO empresa_monedas (empresa_id, codigo_moneda, simbolo, nombre, es_defecto)
                    SELECT id, :c, :sym, :name, :isDef
                    FROM empresas WHERE codigo = :code
                    ON CONFLICT (empresa_id, codigo_moneda) DO UPDATE SET es_defecto = :isDef
                    """)
                    .param("c", c)
                    .param("sym", sym)
                    .param("name", name)
                    .param("isDef", isDef)
                    .param("code", req.code().toUpperCase())
                    .update();
        }
    }

    /**
     * Consulta las sedes/sucursales registradas en {@code sedes}, filtrando opcionalmente
     * por el código del Negocio Matriz.
     * Proporciona alias duales para garantizar compatibilidad completa con el Frontend.
     *
     * @param businessCode código opcional del negocio matriz (ej. {@code BIZ-001}) o {@code ALL}
     * @return lista de sedes/sucursales con sus datos completos
     */
    public List<Map<String, Object>> findBranchesByBusinessCode(String businessCode) {
        String baseSql = """
                SELECT br.codigo AS id, br.codigo AS code,
                       b.codigo AS "businessId", b.codigo AS "businessCode",
                       b.razon_social AS "businessLegalName", b.nombre_comercial AS "businessCommercialName",
                       br.nombre AS name, br.tipo_sede AS type, br.tipo_sede AS "branchType",
                       br.direccion AS address, br.telefono AS phone,
                       br.serie_facturacion AS series, br.serie_facturacion AS "invoiceSeries",
                       br.nombre_encargado AS manager, br.nombre_encargado AS "managerName", br.nombre_encargado AS "managerUser",
                       br.terminales_pos AS "posTerminals", br.estado AS status
                FROM sedes br
                INNER JOIN empresas b ON b.id = br.empresa_id
                """;

        if (businessCode == null || businessCode.isBlank() || "ALL".equalsIgnoreCase(businessCode)) {
            return jdbcClient.sql(baseSql + " ORDER BY br.codigo ASC")
                    .query()
                    .listOfRows();
        }

        return jdbcClient.sql(baseSql + " WHERE b.codigo = :businessCode OR CAST(b.id AS text) = :businessCode ORDER BY br.codigo ASC")
                .param("businessCode", businessCode)
                .query()
                .listOfRows();
    }

    /**
     * Inserta una nueva Sede / Sucursal en la tabla {@code sedes} asociada a su Negocio Matriz.
     *
     * @param req DTO con los datos del local a registrar
     */
    public void insertBranch(CreateBranchRequest req) {
        String type = (req.type() != null && !req.type().isBlank()) ? req.type() : "Centro Mayorista y Minorista";
        String phone = (req.phone() != null && !req.phone().isBlank()) ? req.phone() : "+51 01 440-1200";
        String series = (req.invoiceSeries() != null && !req.invoiceSeries().isBlank()) ? req.invoiceSeries() : "F001 / B001";
        String manager = (req.manager() != null && !req.manager().isBlank()) ? req.manager() : "Encargado de Sede";
        int posTerminals = (req.posTerminals() != null && req.posTerminals() > 0) ? req.posTerminals() : 1;

        int rows = jdbcClient.sql("""
                INSERT INTO sedes (empresa_id, codigo, nombre, tipo_sede, direccion, telefono, serie_facturacion, nombre_encargado, terminales_pos, estado)
                SELECT b.id, :code, :name, :type, :address, :phone, :series, :manager, :posTerminals, 'Operativo'
                FROM empresas b
                WHERE b.codigo = :businessCode OR CAST(b.id AS text) = :businessCode
                """)
                .param("businessCode", req.businessCode().toUpperCase())
                .param("code", req.code().toUpperCase())
                .param("name", req.name())
                .param("type", type)
                .param("address", req.address())
                .param("phone", phone)
                .param("series", series)
                .param("manager", manager)
                .param("posTerminals", posTerminals)
                .update();

        if (rows == 0) {
            throw new IllegalArgumentException("No se encontró el Negocio Matriz con código o ID: " + req.businessCode());
        }
    }
}
