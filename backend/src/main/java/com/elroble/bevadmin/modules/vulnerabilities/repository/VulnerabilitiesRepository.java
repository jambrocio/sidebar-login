package com.elroble.bevadmin.modules.vulnerabilities.repository;

import com.elroble.bevadmin.modules.vulnerabilities.dto.CreateVulnerabilityRequest;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio de acceso a datos síncrono para el catálogo de Vulnerabilidades de Seguridad ({@code core.vulnerabilidades_seguridad}).
 */
@Repository
public class VulnerabilitiesRepository {

    private final JdbcClient jdbcClient;

    public VulnerabilitiesRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Lista todos los hallazgos de vulnerabilidad registrados para el negocio matriz o toda la plataforma (Superusuario).
     *
     * @param businessId   UUID del negocio matriz
     * @param isSuperAdmin si el usuario en sesión es Administrador General (Superusuario)
     * @return lista de vulnerabilidades con datos del autor del reporte
     */
    public List<Map<String, Object>> findByBusinessId(UUID businessId, boolean isSuperAdmin) {
        return jdbcClient.sql("""
                SELECT v.id,
                       v.codigo AS code,
                       v.titulo AS title,
                       v.categoria AS category,
                       v.severidad AS severity,
                       v.estado AS status,
                       v.componente_afectado AS "affectedComponent",
                       v.descripcion AS description,
                       v.impacto_estimado AS "estimatedImpact",
                       v.plan_remediacion AS "remediationPlan",
                       (u.nombre_completo || ' (' || u.nombre_usuario || ')') AS "reportedByUser",
                       (m.nombre_completo || ' (' || m.nombre_usuario || ')') AS "mitigatedByUser",
                       TO_CHAR(v.fecha_deteccion, 'YYYY-MM-DD HH24:MI:SS') AS "detectionDate",
                       TO_CHAR(v.fecha_mitigacion, 'YYYY-MM-DD HH24:MI:SS') AS "mitigationDate"
                FROM core.vulnerabilidades_seguridad v
                INNER JOIN auth.usuarios u ON u.id = v.reportado_por_usuario_id
                LEFT JOIN auth.usuarios m ON m.id = v.mitigado_por_usuario_id
                WHERE (:isSuperAdmin = TRUE OR v.empresa_id = :businessId)
                ORDER BY CASE v.severidad
                            WHEN 'CRITICA' THEN 1
                            WHEN 'ALTA' THEN 2
                            WHEN 'MEDIA' THEN 3
                            WHEN 'BAJA' THEN 4
                            ELSE 5
                         END,
                         v.fecha_deteccion DESC
                """)
                .param("businessId", businessId)
                .param("isSuperAdmin", isSuperAdmin)
                .query()
                .listOfRows();
    }

    /**
     * Comprueba si ya existe una vulnerabilidad registrada con el código proporcionado dentro del negocio.
     *
     * @param businessId UUID del negocio matriz
     * @param code       código del hallazgo (ej. SEC-2026-001)
     * @return {@code true} si existe duplicado, {@code false} en caso contrario
     */
    public boolean existsByCode(UUID businessId, String code) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(1)
                FROM core.vulnerabilidades_seguridad
                WHERE empresa_id = :businessId AND UPPER(TRIM(codigo)) = :code
                """)
                .param("businessId", businessId)
                .param("code", code.trim().toUpperCase())
                .query(Integer.class)
                .single();
        return count != null && count > 0;
    }

    /**
     * Inserta un nuevo registro de vulnerabilidad en la base de datos.
     *
     * @param businessId UUID del negocio matriz
     * @param userId     UUID del usuario auditor o administrador que reporta
     * @param req        datos del hallazgo de seguridad
     */
    public void insertVulnerability(UUID businessId, UUID userId, CreateVulnerabilityRequest req) {
        jdbcClient.sql("""
                INSERT INTO core.vulnerabilidades_seguridad (
                    empresa_id, codigo, titulo, categoria, severidad, estado,
                    componente_afectado, descripcion, impacto_estimado, plan_remediacion,
                    reportado_por_usuario_id, fecha_deteccion
                ) VALUES (
                    :businessId, :code, :title, :category, :severity, 'ABIERTO',
                    :affectedComponent, :description, :estimatedImpact, :remediationPlan,
                    :userId, now()
                )
                """)
                .param("businessId", businessId)
                .param("code", req.code().trim().toUpperCase())
                .param("title", req.title().trim())
                .param("category", req.category().trim())
                .param("severity", req.severity().trim().toUpperCase())
                .param("affectedComponent", req.affectedComponent().trim())
                .param("description", req.description().trim())
                .param("estimatedImpact", req.estimatedImpact() != null ? req.estimatedImpact().trim() : null)
                .param("remediationPlan", req.remediationPlan().trim())
                .param("userId", userId)
                .update();
    }

    /**
     * Actualiza el estado de ciclo de vida de un hallazgo (ej. de ABIERTO a MITIGADO o EN_PROCESO).
     *
     * @param businessId   UUID del negocio matriz
     * @param userId       UUID del usuario que ejecuta la acción
     * @param id           UUID de la vulnerabilidad
     * @param status       nuevo estado
     * @param isSuperAdmin si el usuario es Administrador General
     */
    public int updateStatus(UUID businessId, UUID userId, UUID id, String status, boolean isSuperAdmin) {
        boolean isMitigated = "MITIGADO".equalsIgnoreCase(status);
        return jdbcClient.sql("""
                UPDATE core.vulnerabilidades_seguridad
                SET estado = :status,
                    mitigado_por_usuario_id = CASE WHEN :isMitigated THEN :userId ELSE mitigado_por_usuario_id END,
                    fecha_mitigacion = CASE WHEN :isMitigated THEN now() ELSE fecha_mitigacion END,
                    fecha_modificacion = now()
                WHERE (:isSuperAdmin = TRUE OR empresa_id = :businessId) AND id = :id
                """)
                .param("status", status.trim().toUpperCase())
                .param("isMitigated", isMitigated)
                .param("userId", userId)
                .param("businessId", businessId)
                .param("isSuperAdmin", isSuperAdmin)
                .param("id", id)
                .update();
    }
}
