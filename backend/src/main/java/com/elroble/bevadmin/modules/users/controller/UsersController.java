package com.elroble.bevadmin.modules.users.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.common.exception.BusinessRuleException;
import com.elroble.bevadmin.modules.users.dto.CreateUserWithBranchesRequest;
import com.elroble.bevadmin.modules.users.dto.UpdateUserWithBranchesRequest;
import com.elroble.bevadmin.modules.users.service.UsersService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono de Administración de Usuarios con Asignación de Negocio Matriz,
 * Local Principal y Locales Autorizados ({@code /api/v1/users}).
 * <p>
 * Delega toda la lógica transaccional y de validación a {@link UsersService}.
 * <p>
 * <b>Interfaz de Angular 21 que alimenta:</b> {@code UsersManagementComponent} ({@code /dashboard/users}).
 */
@RestController
@RequestMapping("/api/v1/users")
@Tag(
        name = "04. Usuarios y Asignación de Locales",
        description = "Registro y consulta de usuarios vinculados a su Negocio Matriz, su Local Principal de Operación y sus Locales Autorizados."
)
public class UsersController {

    /** Servicio de negocio síncrono de usuarios. */
    private final UsersService usersService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param usersService servicio de usuarios y locales
     */
    public UsersController(UsersService usersService) {
        this.usersService = usersService;
    }

    /**
     * Lista todos los usuarios junto con su Negocio Matriz, su Local Principal y su arreglo JSON
     * de Locales Autorizados.
     *
     * @return lista de usuarios enriquecida con su estructura organizacional
     */
    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_USERS', 'VIEW')")
    @Operation(
            summary = "Listar usuarios con su Negocio Matriz y Locales Autorizados",
            description = "Consulta la vista SQL 'vw_user_business_and_branches' a través de la capa de servicio. Si el usuario es Administrador General puede listar todos o filtrar por negocio; si es usuario de negocio, lista exclusivamente los de su negocio."
    )
    @ApiResponse(responseCode = "200", description = "Directorio de usuarios obtenido exitosamente.")
    public List<Map<String, Object>> listUsersWithBusinessAndBranches(
            Authentication authentication,
            @Parameter(description = "Código opcional del negocio matriz para filtrar (solo Administrador General)", example = "BIZ-001")
            @RequestParam(required = false) String businessCode) {
        String effectiveBusinessCode = businessCode;
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            if (!user.isSuperAdmin()) {
                effectiveBusinessCode = user.businessCode();
            }
        }
        return usersService.listUsersWithBusinessAndBranches(effectiveBusinessCode);
    }

    /**
     * Registra un nuevo usuario asignándole Negocio Matriz, Local Principal, Locales Autorizados y Rol.
     *
     * @param req datos del usuario, negocio y locales
     * @return confirmación con el UUID generado
     */
    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_USERS', 'CREATE')")
    @Auditable(module = "Seguridad", eventType = "USER_REGISTERED")
    @Operation(
            summary = "Registrar nuevo usuario con Negocio Matriz y Locales Autorizados",
            description = "Guarda de forma transaccional al usuario en 'users', sus locales habilitados en 'user_branches' (marcando is_primary = true para el Local Principal) y su rol en 'user_roles'."
    )
    @ApiResponse(responseCode = "200", description = "Usuario y locales asignados registrados correctamente.")
    public Map<String, Object> registerUserWithBusinessAndBranches(
            Authentication authentication,
            @Valid @RequestBody CreateUserWithBranchesRequest req) {
        CreateUserWithBranchesRequest resolved = req;
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            String targetBusinessCode = user.isSuperAdmin() && req.businessCode() != null && !req.businessCode().isBlank()
                    ? req.businessCode()
                    : user.businessCode();

            if (!user.isSuperAdmin() && ("ADMIN".equalsIgnoreCase(req.roleCode()) || req.roleCode().toUpperCase().contains("SUPERUSUARIO"))) {
                throw new BusinessRuleException("Solo el Administrador General (Superusuario) puede asignar el rol ADMIN.");
            }

            resolved = new CreateUserWithBranchesRequest(
                    req.userCode(),
                    req.fullName(),
                    req.username(),
                    req.email(),
                    req.password(),
                    req.roleCode(),
                    targetBusinessCode,
                    req.primaryBranchName(),
                    req.authorizedBranchNames(),
                    req.clientType()
            );
        }
        return usersService.registerUserWithBusinessAndBranches(resolved);
    }

    /**
     * Actualiza un usuario existente, su rol asignado en la matriz RBAC y sus locales autorizados.
     *
     * @param userId         identificador del usuario (UUID, código USR-xxx o username)
     * @param authentication datos de seguridad del usuario en sesión
     * @param req            DTO con la actualización solicitada
     * @return confirmación del usuario actualizado
     */
    @PutMapping("/{userId}")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_USERS', 'EDIT')")
    @Auditable(module = "Seguridad", eventType = "USER_UPDATED")
    @Operation(
            summary = "Actualizar usuario, rol asignado y locales autorizados",
            description = "Actualiza los datos del usuario en 'usuarios', reasigna su rol en 'usuario_roles' y sus locales habilitados en 'usuario_sedes'."
    )
    @ApiResponse(responseCode = "200", description = "Usuario y rol actualizados exitosamente.")
    public Map<String, Object> updateUserWithBusinessAndBranches(
            @Parameter(description = "UUID, código de usuario (ej. USR-431) o username (ej. rambrocio)", example = "rambrocio")
            @PathVariable String userId,
            Authentication authentication,
            @Valid @RequestBody UpdateUserWithBranchesRequest req) {
        UpdateUserWithBranchesRequest resolved = req;
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUserPrincipal user) {
            String targetBusinessCode = user.isSuperAdmin() && req.businessCode() != null && !req.businessCode().isBlank()
                    ? req.businessCode()
                    : user.businessCode();

            if (!user.isSuperAdmin() && ("ADMIN".equalsIgnoreCase(req.roleCode()) || req.roleCode().toUpperCase().contains("SUPERUSUARIO"))) {
                throw new BusinessRuleException("Solo el Administrador General (Superusuario) puede asignar el rol ADMIN.");
            }

            resolved = new UpdateUserWithBranchesRequest(
                    req.fullName(),
                    req.username(),
                    req.email(),
                    req.password(),
                    req.roleCode(),
                    targetBusinessCode,
                    req.primaryBranchName(),
                    req.authorizedBranchNames(),
                    req.clientType(),
                    req.status()
            );
        }
        return usersService.updateUserWithBusinessAndBranches(userId, resolved);
    }
}
