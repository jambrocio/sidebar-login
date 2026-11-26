package com.elroble.bevadmin.modules.roles.service;

import com.elroble.bevadmin.modules.roles.dto.CreateRoleRequest;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para la gestión de Roles y Matriz RBAC.
 */
public interface RolesService {

    /**
     * Lista todos los roles registrados con el conteo de usuarios asignados.
     *
     * @return catálogo de roles
     */
    List<Map<String, Object>> listRoles();

    /**
     * Crea un nuevo rol de seguridad.
     *
     * @param request DTO con los datos del rol
     * @return mapa con el código creado y su estado
     */
    Map<String, Object> createRole(CreateRoleRequest request);

    /**
     * Obtiene la matriz RBAC de opciones de menú para un rol específico.
     *
     * @param roleCode código del rol (ej. {@code ADMIN})
     * @return matriz de permisos del rol
     */
    List<Map<String, Object>> getRoleMenuMatrix(String roleCode);

    /**
     * Actualiza o sincroniza la matriz RBAC de permisos de menú para un rol específico.
     *
     * @param roleCode    código del rol (ej. {@code ADMIN})
     * @param permissions lista de filas con sus permisos modificados
     */
    void updateRoleMenuPermissions(String roleCode, List<Map<String, Object>> permissions);
}
