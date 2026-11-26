package com.auth.identity.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Repositorio relacional sincrónico para la persistencia inmutable de eventos forenses
 * de auditoría en la tabla {@code auth.auditoria_autenticacion}.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Repository
public class AuditRepository {

    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección del cliente JDBC de Spring.
     *
     * @param jdbcClient Cliente JDBC simplificado y de alto rendimiento.
     */
    public AuditRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Inserta un nuevo registro inmutable en la bitácora forense de auditoría de seguridad.
     *
     * @param userId Identificador UUID del usuario involucrado (o null si el usuario no existía).
     * @param branchId Identificador UUID de la sucursal o sede.
     * @param eventType Tipología del suceso (ej. "LOGIN_SUCCESS", "LOGIN_FAILED", "ACCOUNT_LOCKED").
     * @param actionDetail Descripción textual concisa de la acción realizada.
     * @param moduleBadge Distintivo del módulo funcional emisor (ej. "Seguridad").
     * @param ipAddress Dirección IP de origen de la conexión de red.
     * @param metadataJson Carga complementaria en formato JSON/JSONB.
     */
    public void logSecurityEvent(
            UUID userId,
            UUID branchId,
            String eventType,
            String actionDetail,
            String moduleBadge,
            String ipAddress,
            String metadataJson
    ) {
        String sql = """
                INSERT INTO auth.auditoria_autenticacion (
                    usuario_id, sede_id, tipo_evento, detalle_accion, distintivo_modulo, direccion_ip, metadatos, fecha_creacion
                ) VALUES (
                    :userId, :branchId, :eventType, :actionDetail, :module, :ip, CAST(:metadata AS jsonb), NOW()
                )
                """;

        jdbcClient.sql(sql)
                .param("userId", userId)
                .param("branchId", branchId)
                .param("eventType", eventType)
                .param("actionDetail", actionDetail)
                .param("module", moduleBadge != null ? moduleBadge : "Seguridad")
                .param("ip", ipAddress)
                .param("metadata", metadataJson != null ? metadataJson : "{}")
                .update();
    }
}
