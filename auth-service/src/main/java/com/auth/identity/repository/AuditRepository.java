package com.auth.identity.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.UUID;

/**
 * Synchronous relational repository for writing immutable audit logs in {@code auth.auditoria_autenticacion}.
 */
@Repository
public class AuditRepository {

    private final JdbcClient jdbcClient;

    public AuditRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

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
