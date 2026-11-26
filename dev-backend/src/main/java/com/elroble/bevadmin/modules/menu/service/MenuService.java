package com.elroble.bevadmin.modules.menu.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrato de servicio síncrono para la navegación dinámica del menú lateral (RBAC).
 */
public interface MenuService {

    /**
     * Obtiene el árbol de opciones de menú permitidas y visibles para un usuario específico.
     *
     * @param userId identificador UUID del usuario en sesión
     * @return lista de opciones de menú con sus permisos efectivos
     */
    List<Map<String, Object>> getNavigationMenuForUser(UUID userId);
}
