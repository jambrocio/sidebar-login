package com.elroble.bevadmin.modules.suppliers.repository;

import com.elroble.bevadmin.modules.suppliers.dto.CreateSupplierRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para Proveedores Comerciales ({@code compras.proveedores})
 * con aislamiento multi-tenant por Negocio Matriz ({@code empresa_id}).
 */
@Repository
public class SuppliersRepository {

    private final JdbcClient jdbcClient;

    public SuppliersRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta los proveedores pertenecientes a un negocio específico.
     */
    public List<Map<String, Object>> findSuppliersByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT p.id,
                       p.codigo_proveedor AS "supplierCode",
                       p.tipo_documento AS "documentType",
                       p.numero_documento AS "documentNumber",
                       p.razon_social AS "legalName",
                       p.nombre_comercial AS "commercialName",
                       p.contacto_nombre AS "contactName",
                       p.correo_electronico AS email,
                       p.telefono AS phone,
                       p.direccion AS address,
                       p.categoria_rubro AS "rubroCategory",
                       p.activo AS active,
                       b.codigo AS "businessCode",
                       b.razon_social AS "businessName",
                       p.fecha_creacion AS "createdAt",
                       COALESCE(u.nombre_completo, 'Sistema') AS "registeredBy"
                FROM compras.proveedores p
                INNER JOIN core.empresas b ON b.id = p.empresa_id
                LEFT JOIN auth.usuarios u ON u.id = p.registrado_por_usuario_id
                WHERE p.empresa_id = :businessId
                ORDER BY p.fecha_creacion DESC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    /**
     * Consulta todos los proveedores registrados en la plataforma (vista Superusuario).
     */
    public List<Map<String, Object>> findAllSuppliers() {
        return jdbcClient.sql("""
                SELECT p.id,
                       p.codigo_proveedor AS "supplierCode",
                       p.tipo_documento AS "documentType",
                       p.numero_documento AS "documentNumber",
                       p.razon_social AS "legalName",
                       p.nombre_comercial AS "commercialName",
                       p.contacto_nombre AS "contactName",
                       p.correo_electronico AS email,
                       p.telefono AS phone,
                       p.direccion AS address,
                       p.categoria_rubro AS "rubroCategory",
                       p.activo AS active,
                       b.codigo AS "businessCode",
                       b.razon_social AS "businessName",
                       p.fecha_creacion AS "createdAt",
                       COALESCE(u.nombre_completo, 'Sistema') AS "registeredBy"
                FROM compras.proveedores p
                INNER JOIN core.empresas b ON b.id = p.empresa_id
                LEFT JOIN auth.usuarios u ON u.id = p.registrado_por_usuario_id
                ORDER BY b.codigo ASC, p.fecha_creacion DESC
                """)
                .query()
                .listOfRows();
    }

    /**
     * Resuelve el UUID del negocio a partir de su código único (ej. 'BIZ-003').
     */
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

    /**
     * Verifica si un número de documento ya está registrado para el negocio dado.
     */
    public boolean existsByDocumentInBusiness(UUID businessId, String documentNumber) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(1) FROM compras.proveedores
                WHERE empresa_id = :businessId AND numero_documento = :documentNumber
                """)
                .param("businessId", businessId)
                .param("documentNumber", documentNumber.trim())
                .query(Integer.class)
                .single();
        return count != null && count > 0;
    }

    /**
     * Genera el siguiente código correlativo de proveedor para el negocio (ej. 'PRV-004').
     */
    public String findNextSupplierCode(UUID businessId) {
        Integer maxCode = jdbcClient.sql("""
                SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_proveedor FROM '[0-9]+') AS INT)), 0) + 1
                FROM compras.proveedores
                WHERE empresa_id = :businessId
                """)
                .param("businessId", businessId)
                .query(Integer.class)
                .single();
        return String.format("PRV-%03d", maxCode != null ? maxCode : 1);
    }

    /**
     * Inserta un nuevo proveedor en {@code compras.proveedores}.
     */
    public UUID insertSupplier(UUID businessId, UUID registeredByUserId, String supplierCode, CreateSupplierRequest req) {
        UUID newId = UUID.randomUUID();
        String commName = req.commercialName() != null && !req.commercialName().isBlank()
                ? req.commercialName().trim()
                : req.legalName().trim();

        jdbcClient.sql("""
                INSERT INTO compras.proveedores (
                    id, empresa_id, codigo_proveedor, tipo_documento, numero_documento,
                    razon_social, nombre_comercial, contacto_nombre, correo_electronico,
                    telefono, direccion, categoria_rubro, activo, registrado_por_usuario_id
                ) VALUES (
                    :id, :businessId, :supplierCode, :docType, :docNumber,
                    :legalName, :commercialName, :contactName, :email,
                    :phone, :address, :rubroCategory, true, :registeredByUserId
                )
                """)
                .param("id", newId)
                .param("businessId", businessId)
                .param("supplierCode", supplierCode)
                .param("docType", req.documentType().trim())
                .param("docNumber", req.documentNumber().trim())
                .param("legalName", req.legalName().trim())
                .param("commercialName", commName)
                .param("contactName", req.contactName() != null ? req.contactName().trim() : null)
                .param("email", req.email() != null ? req.email().trim() : null)
                .param("phone", req.phone() != null ? req.phone().trim() : null)
                .param("address", req.address() != null ? req.address().trim() : null)
                .param("rubroCategory", req.rubroCategory() != null ? req.rubroCategory().trim() : "Bebidas y Licores")
                .param("registeredByUserId", registeredByUserId)
                .update();

        return newId;
    }

    /**
     * Actualiza el estado operativo de un proveedor (Activo / Inactivo).
     */
    public int updateSupplierStatus(UUID businessId, UUID supplierId, boolean active, boolean isSuperAdmin) {
        String sql = isSuperAdmin
                ? "UPDATE compras.proveedores SET activo = :active, fecha_modificacion = now() WHERE id = :id"
                : "UPDATE compras.proveedores SET activo = :active, fecha_modificacion = now() WHERE id = :id AND empresa_id = :businessId";

        var client = jdbcClient.sql(sql)
                .param("active", active)
                .param("id", supplierId);

        if (!isSuperAdmin) {
            client = client.param("businessId", businessId);
        }

        return client.update();
    }
}
