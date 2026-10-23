package com.elroble.bevadmin.security;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Guardia que garantiza el cumplimiento de la regla de negocio de Local Asignado:
 * - Si el usuario tiene alcance 'Nivel Local Asignado', todas sus ventas, compras
 *   y arqueos de caja se registran obligatoriamente en su assignedBranchId.
 * - Si tiene alcance 'Nivel Negocio (Multi-Local)', valida que el local solicitado
 *   esté dentro de sus locales autorizados (user_branches).
 */
@Component("branchAccessGuard")
public class BranchAccessGuard {

    public UUID resolveEffectiveBranchId(AuthenticatedUserPrincipal user, UUID requestedBranchId) {
        if (requestedBranchId == null || !user.isBusinessWideScope()) {
            return user.assignedBranchId();
        }
        if (!user.isAuthorizedForBranch(requestedBranchId)) {
            throw new AccessDeniedException(
                    "El usuario " + user.username() + " no está autorizado para operar en el local especificado."
            );
        }
        return requestedBranchId;
    }
}
