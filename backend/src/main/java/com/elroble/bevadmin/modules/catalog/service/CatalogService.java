package com.elroble.bevadmin.modules.catalog.service;

import com.elroble.bevadmin.modules.catalog.dto.CreateBeverageRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para el Catálogo Maestro de Bebidas y Categorías.
 */
public interface CatalogService {

    /**
     * Lista las bebidas del catálogo maestro para el negocio del usuario activo.
     *
     * @param user usuario autenticado
     * @return lista de bebidas
     */
    List<Map<String, Object>> listBeverages(AuthenticatedUserPrincipal user);

    /**
     * Registra una nueva bebida calculando su estado semafórico de stock.
     *
     * @param request DTO con los datos de la bebida
     * @param user    usuario registrador en sesión
     * @return mapa con el SKU creado y su estado de stock
     */
    Map<String, Object> registerBeverage(CreateBeverageRequest request, AuthenticatedUserPrincipal user);

    /**
     * Lista las categorías de bebidas del negocio activo.
     *
     * @param user usuario autenticado
     * @return lista de categorías
     */
    List<Map<String, Object>> listCategories(AuthenticatedUserPrincipal user);

    /**
     * Registra una nueva categoría de bebidas en el negocio activo.
     */
    Map<String, Object> registerCategory(Map<String, Object> request, AuthenticatedUserPrincipal user);
}
