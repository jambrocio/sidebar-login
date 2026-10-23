package com.elroble.bevadmin.modules.roles.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.roles.dto.CreateRoleRequest;
import com.elroble.bevadmin.modules.roles.service.RolesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono de Administración de Roles y Matriz RBAC ({@code /api/v1/roles}).
 * <p>
 * Delega toda la lógica de negocio a {@link RolesService}.
 * <p>
 * <b>Interfaz de Angular 21 que alimenta:</b> {@code RolesManagementComponent} ({@code /dashboard/roles}).
 */
@RestController
@RequestMapping("/api/v1/roles")
@Tag(
        name = "05. Roles y Matriz de Permisos (RBAC)",
        description = "Creación de roles con alcance Organizacional (Negocio vs Local Asignado) y configuración de la matriz de accesos al Sidebar."
)
public class RolesController {

    /** Servicio de negocio síncrono de roles. */
    private final RolesService rolesService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param rolesService servicio de roles y matriz RBAC
     */
    public RolesController(RolesService rolesService) {
        this.rolesService = rolesService;
    }

    /**
     * Lista todos los roles registrados en el sistema incluyendo la cantidad de usuarios asignados.
     *
     * @return lista de roles con su alcance y estado
     */
    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_ROLES', 'VIEW')")
    @Operation(
            summary = "Listar todos los Roles del sistema",
            description = "Consulta la tabla 'roles' a través de la capa de servicio y calcula cuántos usuarios tienen asignado cada rol."
    )
    @ApiResponse(responseCode = "200", description = "Catálogo de roles devuelto correctamente.")
    public List<Map<String, Object>> listRoles() {
        return rolesService.listRoles();
    }

    /**
     * Crea un nuevo rol personalizado en el sistema.
     *
     * @param req datos del rol a crear
     * @return confirmación con el código del rol creado
     */
    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_ROLES', 'CREATE')")
    @Auditable(module = "Seguridad", eventType = "ROLE_CREATED")
    @Operation(
            summary = "Registrar un nuevo Rol de seguridad",
            description = "Inserta un nuevo rol en la tabla 'roles' definiendo si su alcance es Multi-Local (Negocio) o restringido al Local Asignado."
    )
    @ApiResponse(responseCode = "200", description = "Rol creado exitosamente.")
    public Map<String, Object> createRole(@Valid @RequestBody CreateRoleRequest req) {
        return rolesService.createRole(req);
    }

    /**
     * Obtiene la matriz de permisos de opciones de menú para un rol específico.
     *
     * @param roleCode código técnico del rol (ej. {@code ADMIN}, {@code SUPERVISOR}, {@code ANALYST})
     * @return filas de la matriz RBAC
     */
    @GetMapping("/{roleCode}/permissions")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_ROLES', 'VIEW')")
    @Operation(
            summary = "Obtener la Matriz RBAC de permisos de menú de un Rol",
            description = "Consulta 'role_menu_permissions' unido con 'menu_items' para devolver qué módulos puede Ver, Crear, Editar, Eliminar o Exportar el rol indicado."
    )
    @ApiResponse(responseCode = "200", description = "Matriz de permisos del rol obtenida correctamente.")
    public List<Map<String, Object>> getRoleMenuMatrix(
            @Parameter(description = "Código técnico del rol", example = "ADMIN")
            @PathVariable String roleCode) {
        return rolesService.getRoleMenuMatrix(roleCode);
    }

    /**
     * Actualiza la matriz RBAC de permisos de opciones de menú para un rol.
     *
     * @param roleCode    código del rol a modificar
     * @param permissions lista de filas de permisos
     * @return estado de la actualización
     */
    @PutMapping("/{roleCode}/permissions")
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'MGMT_ROLES', 'EDIT')")
    @Auditable(module = "Seguridad", eventType = "ROLE_PERMISSIONS_UPDATED")
    @Operation(
            summary = "Actualizar la Matriz RBAC de permisos de un Rol",
            description = "Actualiza o inserta en la tabla 'role_menu_permissions' los permisos de cada módulo de menú para el rol indicado."
    )
    @ApiResponse(responseCode = "200", description = "Matriz de permisos actualizada exitosamente.")
    public Map<String, Object> updateRolePermissions(
            @Parameter(description = "Código técnico del rol", example = "ADMIN")
            @PathVariable String roleCode,
            @RequestBody List<Map<String, Object>> permissions) {
        rolesService.updateRoleMenuPermissions(roleCode, permissions);
        return Map.of(
                "roleCode", roleCode.toUpperCase(),
                "status", "Actualizado",
                "totalUpdated", permissions != null ? permissions.size() : 0
        );
    }
}
