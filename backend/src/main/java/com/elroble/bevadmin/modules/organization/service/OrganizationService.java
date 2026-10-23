package com.elroble.bevadmin.modules.organization.service;

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
     * Lista los locales/sucursales filtrando opcionalmente por el código del Negocio Matriz.
     *
     * @param businessCode código opcional del negocio matriz (ej. {@code BIZ-001})
     * @return lista de locales y almacenes
     */
    List<Map<String, Object>> listBranches(String businessCode);
}
