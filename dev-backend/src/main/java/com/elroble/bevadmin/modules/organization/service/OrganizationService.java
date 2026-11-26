package com.elroble.bevadmin.modules.organization.service;

import com.elroble.bevadmin.modules.organization.dto.CreateBranchRequest;
import com.elroble.bevadmin.modules.organization.dto.CreateBusinessRequest;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para la gestión de Negocios Matriz y Locales.
 */
public interface OrganizationService {

    /**
     * Obtiene el catálogo completo de Negocios Matriz.
     *
     * @return lista de negocios matriz
     */
    List<Map<String, Object>> listBusinesses();

    /**
     * Registra un nuevo Negocio Matriz validando sus datos fiscales.
     *
     * @param request DTO con los datos del negocio matriz
     * @return resumen con el código creado y su estado
     */
    Map<String, Object> createBusiness(CreateBusinessRequest request);

    /**
     * Habilita o deshabilita un Negocio Matriz por su código.
     *
     * @param code   código del negocio matriz
     * @param active {@code true} para habilitar, {@code false} para deshabilitar
     * @return resumen con el código y el nuevo estado
     */
    Map<String, Object> updateBusinessStatus(String code, boolean active);

    /**
     * Habilita o deshabilita un Local o Sucursal por su código.
     *
     * @param code   código del local o sucursal
     * @param active {@code true} para habilitar, {@code false} para deshabilitar
     * @return resumen con el código y el nuevo estado
     */
    Map<String, Object> updateBranchStatus(String code, boolean active);

    /**
     * Lista los locales/sucursales filtrando opcionalmente por el código del Negocio Matriz.
     *
     * @param businessCode código opcional del negocio matriz (ej. {@code BIZ-001})
     * @return lista de locales y almacenes
     */
    List<Map<String, Object>> listBranches(String businessCode);

    /**
     * Registra un nuevo Local o Sucursal vinculado a un Negocio Matriz.
     *
     * @param request DTO con los datos del local o sucursal
     * @return resumen con el código creado y su estado
     */
    Map<String, Object> createBranch(CreateBranchRequest request);
}
