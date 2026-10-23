package com.elroble.bevadmin.modules.menu.controller;

import com.elroble.bevadmin.modules.menu.service.MenuService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono de Navegación Dinámica del Menú Lateral ({@code /api/v1/menu}).
 * <p>
 * Delega la consulta de permisos a {@link MenuService}, reemplazando el archivo estático
 * {@code frontend/json/sidebar-menu.json}.
 * <p>
 * <b>Componente de Angular 21 que alimenta:</b> {@code SidebarComponent} (Menú lateral de 4 niveles).
 */
@RestController
@RequestMapping("/api/v1/menu")
@Tag(
        name = "02. Menú Lateral Dinámico (RBAC)",
        description = "Resolución dinámica del árbol de opciones de menú de hasta 4 niveles según el Rol y Excepciones del usuario."
)
public class MenuController {

    /** Servicio de negocio síncrono para el menú lateral. */
    private final MenuService menuService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param menuService servicio de navegación del menú
     */
    public MenuController(MenuService menuService) {
        this.menuService = menuService;
    }

    /**
     * Obtiene el listado jerárquico de opciones de menú visibles y autorizadas para el usuario en sesión.
     *
     * @param user usuario autenticado extraído del token JWT
     * @return lista de opciones de menú con sus permisos efectivos ({@code canView}, {@code canCreate}, etc.)
     */
    @GetMapping("/my-navigation")
    @Operation(
            summary = "Obtener el árbol de menú permitido para el usuario activo",
            description = "Invoca la función SQL 'fn_get_user_effective_menu(user_id)' a través de la capa de servicio y devuelve las opciones de menú visibles para construir el SidebarComponent en Angular 21."
    )
    @ApiResponse(responseCode = "200", description = "Catálogo de opciones de menú devuelto exitosamente.")
    public List<Map<String, Object>> getMyNavigationMenu(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return menuService.getNavigationMenuForUser(user.userId());
    }
}
