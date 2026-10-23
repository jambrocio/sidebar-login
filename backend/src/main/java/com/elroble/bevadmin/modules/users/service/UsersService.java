package com.elroble.bevadmin.modules.users.service;

import com.elroble.bevadmin.modules.users.dto.CreateUserWithBranchesRequest;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para la gestión de Usuarios y Asignación de Locales.
 */
public interface UsersService {

    /**
     * Lista todos los usuarios junto con su Negocio Matriz, su Local Principal y sus Locales Autorizados.
     *
     * @return lista de usuarios enriquecida
     */
    List<Map<String, Object>> listUsersWithBusinessAndBranches();

    /**
     * Registra un nuevo usuario de forma transaccional asignándole Negocio Matriz, Local Principal,
     * Locales Autorizados y Rol RBAC.
     *
     * @param request DTO con los datos del usuario y locales
     * @return resumen con el UUID y código del usuario registrado
     */
    Map<String, Object> registerUserWithBusinessAndBranches(CreateUserWithBranchesRequest request);
}
