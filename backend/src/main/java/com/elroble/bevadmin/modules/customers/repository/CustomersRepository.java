package com.elroble.bevadmin.modules.customers.repository;

import com.elroble.bevadmin.modules.customers.dto.CreateCustomerRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio de acceso a datos para Clientes Comerciales ({@code ventas.clientes})
 * con aislamiento multi-tenant por Negocio Matriz ({@code empresa_id}).
 */
@Repository
public class CustomersRepository {

    private final JdbcClient jdbcClient;

    public CustomersRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    public List<Map<String, Object>> findCustomersByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT c.id,
                       c.codigo_cliente AS "customerCode",
                       c.tipo_documento AS "documentType",
                       c.numero_documento AS "documentNumber",
                       c.razon_social AS "legalName",
                       c.nombre_comercial AS "commercialName",
                       c.tipo_cliente AS "customerType",
                       c.correo_electronico AS email,
                       c.telefono AS phone,
                       c.direccion AS address,
                       c.linea_credito AS "creditLine",
                       c.activo AS active,
                       b.codigo AS "businessCode",
                       b.razon_social AS "businessName",
                       c.fecha_creacion AS "createdAt",
                       COALESCE(u.nombre_completo, 'Sistema') AS "registeredBy"
                FROM ventas.clientes c
                INNER JOIN core.empresas b ON b.id = c.empresa_id
                LEFT JOIN auth.usuarios u ON u.id = c.registrado_por_usuario_id
                WHERE c.empresa_id = :businessId
                ORDER BY c.fecha_creacion DESC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    public List<Map<String, Object>> findAllCustomers() {
        return jdbcClient.sql("""
                SELECT c.id,
                       c.codigo_cliente AS "customerCode",
                       c.tipo_documento AS "documentType",
                       c.numero_documento AS "documentNumber",
                       c.razon_social AS "legalName",
                       c.nombre_comercial AS "commercialName",
                       c.tipo_cliente AS "customerType",
                       c.correo_electronico AS email,
                       c.telefono AS phone,
                       c.direccion AS address,
                       c.linea_credito AS "creditLine",
                       c.activo AS active,
                       b.codigo AS "businessCode",
                       b.razon_social AS "businessName",
                       c.fecha_creacion AS "createdAt",
                       COALESCE(u.nombre_completo, 'Sistema') AS "registeredBy"
                FROM ventas.clientes c
                INNER JOIN core.empresas b ON b.id = c.empresa_id
                LEFT JOIN auth.usuarios u ON u.id = c.registrado_por_usuario_id
                ORDER BY b.codigo ASC, c.fecha_creacion DESC
                """)
                .query()
                .listOfRows();
    }

    public Optional<UUID> findBusinessIdByCode(String businessCode) {
        return jdbcClient.sql("""
                SELECT id FROM core.empresas
                WHERE codigo = :code OR CAST(id AS text) = :code
                LIMIT 1
                """)
                .param("code", businessCode.toUpperCase())
                .query(UUID.class)
                .optional();
    }

    public boolean existsByDocumentInBusiness(UUID businessId, String documentNumber) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(1) FROM ventas.clientes
                WHERE empresa_id = :businessId AND numero_documento = :documentNumber
                """)
                .param("businessId", businessId)
                .param("documentNumber", documentNumber.trim())
                .query(Integer.class)
                .single();
        return count != null && count > 0;
    }

    public String findNextCustomerCode(UUID businessId) {
        Integer maxCode = jdbcClient.sql("""
                SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_cliente FROM '[0-9]+') AS INT)), 0) + 1
                FROM ventas.clientes
                WHERE empresa_id = :businessId
                """)
                .param("businessId", businessId)
                .query(Integer.class)
                .single();
        return String.format("CLI-%03d", maxCode != null ? maxCode : 1);
    }

    public UUID insertCustomer(UUID businessId, UUID registeredByUserId, String customerCode, CreateCustomerRequest req) {
        UUID newId = UUID.randomUUID();
        BigDecimal credit = req.creditLine() != null ? req.creditLine() : BigDecimal.ZERO;
        String commName = req.commercialName() != null && !req.commercialName().isBlank()
                ? req.commercialName().trim()
                : req.legalName().trim();

        jdbcClient.sql("""
                INSERT INTO ventas.clientes (
                    id, empresa_id, codigo_cliente, tipo_documento, numero_documento,
                    razon_social, nombre_comercial, tipo_cliente, correo_electronico,
                    telefono, direccion, linea_credito, activo, registrado_por_usuario_id
                ) VALUES (
                    :id, :businessId, :customerCode, :docType, :docNumber,
                    :legalName, :commName, :custType, :email,
                    :phone, :address, :creditLine, TRUE, :userId
                )
                """)
                .param("id", newId)
                .param("businessId", businessId)
                .param("customerCode", customerCode)
                .param("docType", req.documentType().toUpperCase())
                .param("docNumber", req.documentNumber().trim())
                .param("legalName", req.legalName().trim())
                .param("commName", commName)
                .param("custType", req.customerType())
                .param("email", req.email() != null ? req.email().trim() : null)
                .param("phone", req.phone() != null ? req.phone().trim() : null)
                .param("address", req.address() != null ? req.address().trim() : null)
                .param("creditLine", credit)
                .param("userId", registeredByUserId)
                .update();

        return newId;
    }
}
