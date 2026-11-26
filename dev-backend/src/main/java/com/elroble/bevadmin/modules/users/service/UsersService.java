package com.elroble.bevadmin.modules.users.service;

import com.elroble.bevadmin.modules.users.dto.CreateUserWithBranchesRequest;
import com.elroble.bevadmin.modules.users.dto.UpdateUserWithBranchesRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Contrato de servicio síncrono para la gestión de Usuarios y Asignación de Locales.
 */
public interface UsersService {

    /**
     * Lista todos los usuarios junto con su Negocio Matriz, su Local Principal y sus Locales Autorizados,
     * permitiendo filtrar opcionalmente por Negocio Matriz.
     *
     * @param businessCode código del negocio para filtrar (opcional)
     * @return lista de usuarios enriquecida
     */
    List<Map<String, Object>> listUsersWithBusinessAndBranches(String businessCode);

    /**
     * Lista todos los usuarios sin filtro.
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

    /**
     * Actualiza un usuario existente, su rol asignado en RBAC y sus locales autorizados.
     *
     * @param identifier UUID, código de usuario o username
     * @param request    DTO con los datos actualizados
     * @return resumen de la actualización
     */
    Map<String, Object> updateUserWithBusinessAndBranches(String identifier, UpdateUserWithBranchesRequest request);

    /**
     * Restablece la contraseña de un usuario a la clave estándar por default ('Cotic2026#').
     *
     * @param identifier UUID, código de usuario o username
     * @return resumen con el resultado del reseteo y la contraseña asignada
     */
    Map<String, Object> resetPasswordToDefault(String identifier);

    /**
     * Valida si un usuario pertenece al negocio indicado (para usuarios que no sean Superadmin).
     *
     * @param identifier UUID, código de usuario o username
     * @param businessId UUID del negocio matriz
     */
    void validateUserBelongsToBusiness(String identifier, UUID businessId);
}
