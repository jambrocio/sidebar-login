package com.elroble.bevadmin.security;

import java.util.List;
import java.util.UUID;

/**
 * Objeto inmutable que representa el Contexto Organizacional del Usuario Autenticado
 * extraído del Token JWT en cada petición HTTP:
 * - Identidad del usuario (userId, userCode, username, fullName)
 * - Negocio Matriz al que pertenece (businessId, businessCode)
 * - Local Principal Asignado (assignedBranchId, assignedBranchName)
 * - Lista de todos sus Locales Autorizados (authorizedBranchIds)
 * - Roles y Alcance Organizacional ('Nivel Negocio (Multi-Local)' vs 'Nivel Local Asignado')
 */
public record AuthenticatedUserPrincipal(
        UUID userId,
        String userCode,
        String username,
        String fullName,
        UUID businessId,
        String businessCode,
        UUID assignedBranchId,
        String assignedBranchName,
        List<UUID> authorizedBranchIds,
        List<String> roles,
        String roleScope
) {
    public boolean isSuperAdmin() {
        return roles != null && (roles.contains("ADMIN") || roles.contains("ROLE_ADMIN"));
    }

    public boolean isBusinessAdmin() {
        return roles != null && (roles.contains("ADMIN_NEGOCIO") || roles.contains("ROLE_ADMIN_NEGOCIO"));
    }

    public boolean isAnyAdmin() {
        return isSuperAdmin() || isBusinessAdmin();
    }

    public boolean isBusinessWideScope() {
        return "Nivel Negocio (Multi-Local)".equalsIgnoreCase(roleScope)
                || "Nivel Plataforma (Superusuario)".equalsIgnoreCase(roleScope)
                || isSuperAdmin()
                || isBusinessAdmin();
    }

    public boolean isAuthorizedForBranch(UUID targetBranchId) {
        if (isSuperAdmin()) {
            return true;
        }
        if (assignedBranchId != null && assignedBranchId.equals(targetBranchId)) {
            return true;
        }
        return isBusinessWideScope() && authorizedBranchIds != null && authorizedBranchIds.contains(targetBranchId);
    }
}
