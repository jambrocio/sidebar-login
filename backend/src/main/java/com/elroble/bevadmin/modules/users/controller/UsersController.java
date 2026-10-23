package com.elroble.bevadmin.modules.users.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.users.dto.CreateUserWithBranchesRequest;
import com.elroble.bevadmin.modules.users.service.UsersService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
            description = "Consulta la vista SQL 'vw_user_business_and_branches' a través de la capa de servicio para devolver cada usuario con su Negocio Matriz, su Local Principal y sus Locales Autorizados."
    )
    @ApiResponse(responseCode = "200", description = "Directorio de usuarios obtenido exitosamente.")
    public List<Map<String, Object>> listUsersWithBusinessAndBranches() {
        return usersService.listUsersWithBusinessAndBranches();
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
            @Valid @RequestBody CreateUserWithBranchesRequest req) {
        return usersService.registerUserWithBusinessAndBranches(req);
    }
}
