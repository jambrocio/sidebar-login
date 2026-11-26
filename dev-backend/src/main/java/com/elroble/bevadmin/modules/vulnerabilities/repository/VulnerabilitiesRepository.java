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
     * Lista todos los hallazgos de vulnerabilidad registrados a nivel de todo el sistema.
     *
     * @return lista de vulnerabilidades con datos del autor del reporte
     */
    public List<Map<String, Object>> findAll() {
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
                       v.solucion_aplicada AS "appliedSolution",
                       (u.nombre_completo || ' (' || u.nombre_usuario || ')') AS "reportedByUser",
                       (m.nombre_completo || ' (' || m.nombre_usuario || ')') AS "mitigatedByUser",
                       TO_CHAR(v.fecha_deteccion, 'YYYY-MM-DD HH24:MI:SS') AS "detectionDate",
                       TO_CHAR(v.fecha_mitigacion, 'YYYY-MM-DD HH24:MI:SS') AS "mitigationDate"
                FROM core.vulnerabilidades_seguridad v
                INNER JOIN auth.usuarios u ON u.id = v.reportado_por_usuario_id
                LEFT JOIN auth.usuarios m ON m.id = v.mitigado_por_usuario_id
                ORDER BY v.codigo DESC
                """)
                .query()
                .listOfRows();
    }

    /**
     * Comprueba si ya existe una vulnerabilidad registrada con el código proporcionado en el catálogo del sistema.
     *
     * @param code código del hallazgo (ej. SEC-2026-001)
     * @return {@code true} si existe duplicado, {@code false} en caso contrario
     */
    public boolean existsByCode(String code) {
        Integer count = jdbcClient.sql("""
                SELECT COUNT(1)
                FROM core.vulnerabilidades_seguridad
                WHERE UPPER(TRIM(codigo)) = :code
                """)
                .param("code", code.trim().toUpperCase())
                .query(Integer.class)
                .single();
        return count != null && count > 0;
    }

    /**
     * Inserta un nuevo registro de vulnerabilidad de sistema en la base de datos.
     *
     * @param userId UUID del usuario auditor o administrador que reporta
     * @param req    datos del hallazgo de seguridad
     */
    public void insertVulnerability(UUID userId, CreateVulnerabilityRequest req) {
        jdbcClient.sql("""
                INSERT INTO core.vulnerabilidades_seguridad (
                    codigo, titulo, categoria, severidad, estado,
                    componente_afectado, descripcion, impacto_estimado, plan_remediacion, solucion_aplicada,
                    reportado_por_usuario_id, fecha_deteccion
                ) VALUES (
                    :code, :title, :category, :severity, 'ABIERTO',
                    :affectedComponent, :description, :estimatedImpact, :remediationPlan, :appliedSolution,
                    :userId, now()
                )
                """)
                .param("code", req.code().trim().toUpperCase())
                .param("title", req.title().trim())
                .param("category", req.category().trim())
                .param("severity", req.severity().trim().toUpperCase())
                .param("affectedComponent", req.affectedComponent().trim())
                .param("description", req.description().trim())
                .param("estimatedImpact", req.estimatedImpact() != null ? req.estimatedImpact().trim() : null)
                .param("remediationPlan", req.remediationPlan().trim())
                .param("appliedSolution", req.appliedSolution() != null && !req.appliedSolution().isBlank() ? req.appliedSolution().trim() : null)
                .param("userId", userId)
                .update();
    }

    /**
     * Actualiza el estado de ciclo de vida de un hallazgo (ej. de ABIERTO a MITIGADO o EN_PROCESO).
     *
     * @param userId          UUID del usuario que ejecuta la acción
     * @param id              UUID de la vulnerabilidad
     * @param status          nuevo estado
     * @param mitigationNotes solución técnica o notas de remediación aplicadas
     * @return cantidad de filas actualizadas
     */
    public int updateStatus(UUID userId, UUID id, String status, String mitigationNotes) {
        boolean isMitigated = "MITIGADO".equalsIgnoreCase(status);
        return jdbcClient.sql("""
                UPDATE core.vulnerabilidades_seguridad
                SET estado = :status,
                    mitigado_por_usuario_id = CASE WHEN :isMitigated THEN :userId ELSE mitigado_por_usuario_id END,
                    fecha_mitigacion = CASE WHEN :isMitigated THEN now() ELSE fecha_mitigacion END,
                    solucion_aplicada = CASE 
                                            WHEN :isMitigated AND :mitigationNotes IS NOT NULL AND TRIM(:mitigationNotes) <> '' 
                                            THEN :mitigationNotes 
                                            ELSE solucion_aplicada 
                                        END,
                    fecha_modificacion = now()
                WHERE id = :id
                """)
                .param("status", status.trim().toUpperCase())
                .param("isMitigated", isMitigated)
                .param("mitigationNotes", mitigationNotes != null && !mitigationNotes.isBlank() ? mitigationNotes.trim() : null)
                .param("userId", userId)
                .param("id", id)
                .update();
    }
}
