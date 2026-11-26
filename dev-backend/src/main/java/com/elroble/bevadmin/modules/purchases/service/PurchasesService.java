package com.elroble.bevadmin.modules.purchases.service;

import com.elroble.bevadmin.modules.purchases.dto.RegisterPurchaseRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para Compras y Abastecimiento por Local.
 */
public interface PurchasesService {

    /**
     * Lista el historial de órdenes de compra del negocio del usuario activo.
     *
     * @param user usuario autenticado
     * @return lista de órdenes de compra
     */
    List<Map<String, Object>> listPurchases(AuthenticatedUserPrincipal user);

    /**
     * Registra una nueva orden de compra en el Local Asignado del usuario calculando el costo total del lote.
     *
     * @param request DTO con los datos de la compra
     * @param user    usuario comprador en sesión
     * @return resumen de la orden registrada
     */
    Map<String, Object> registerPurchaseOrder(RegisterPurchaseRequest request, AuthenticatedUserPrincipal user);
}
