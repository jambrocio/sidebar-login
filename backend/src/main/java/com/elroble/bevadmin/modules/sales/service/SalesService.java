package com.elroble.bevadmin.modules.sales.service;

import com.elroble.bevadmin.modules.sales.dto.EmitSaleRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para Ventas (Mayor y Menor) e Historial de Ventas por Usuario.
 */
public interface SalesService {

    /**
     * Obtiene el historial de comprobantes emitidos exclusivamente por el usuario en sesión.
     *
     * @param user usuario autenticado
     * @return lista de comprobantes emitidos por el usuario
     */
    List<Map<String, Object>> getMySalesHistory(AuthenticatedUserPrincipal user);

    /**
     * Obtiene todos los comprobantes emitidos en el negocio matriz para reportes y tableros.
     */
    List<Map<String, Object>> getAllSales(AuthenticatedUserPrincipal user);

    /**
     * Procesa y registra de forma transaccional un nuevo comprobante de venta multiproducto
     * en el Local Asignado del usuario.
     *
     * @param request DTO con los datos del comprobante y carrito de productos
     * @param user    usuario vendedor autenticado
     * @return resumen del comprobante emitido
     */
    Map<String, Object> emitSaleReceipt(EmitSaleRequest request, AuthenticatedUserPrincipal user);
}
