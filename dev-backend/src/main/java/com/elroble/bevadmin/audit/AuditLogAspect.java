package com.elroble.bevadmin.audit;

import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

/**
 * Aspecto AOP transversal que intercepta cualquier método anotado con @Auditable
 * e inserta el registro de trazabilidad en la tabla auditoria_autenticacion con el
 * usuario activo y su local asignado.
 */
@Aspect
@Component
public class AuditLogAspect {

    private final JdbcClient jdbcClient;

    public AuditLogAspect(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    @AfterReturning(pointcut = "@annotation(auditable)", returning = "result")
    public void recordAuditLog(JoinPoint joinPoint, Auditable auditable, Object result) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AuthenticatedUserPrincipal user)) {
            return;
        }

        String detail = auditable.description().isBlank()
                ? "Operación ejecutada: " + auditable.eventType() + " por " + user.fullName() + " (" + user.username() + ")"
                : auditable.description();

        jdbcClient.sql("""
                INSERT INTO auditoria_autenticacion (usuario_id, sede_id, tipo_evento, detalle_accion, distintivo_modulo)
                VALUES (:userId, :branchId, :eventType, :actionDetail, :moduleBadge)
                """)
                .param("userId", user.userId())
                .param("branchId", user.assignedBranchId())
                .param("eventType", auditable.eventType())
                .param("actionDetail", detail)
                .param("moduleBadge", auditable.module())
                .update();
    }
}
