package com.elroble.bevadmin.modules.coupons.service;

import com.elroble.bevadmin.modules.coupons.dto.CreateCouponRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para la gestión de Cupones de Descuento.
 */
public interface CouponsService {

    /**
     * Lista todos los cupones de descuento del negocio del usuario activo.
     *
     * @param user usuario autenticado
     * @return lista de cupones
     */
    List<Map<String, Object>> listCoupons(AuthenticatedUserPrincipal user);

    /**
     * Crea un nuevo cupón promocional de descuento.
     *
     * @param request DTO con los datos del cupón
     * @param user    usuario creador en sesión
     * @return resumen con el código del cupón creado
     */
    Map<String, Object> createCoupon(CreateCouponRequest request, AuthenticatedUserPrincipal user);

    /**
     * Activa o pausa la vigencia de un cupón existente.
     *
     * @param code código del cupón
     * @param user usuario autenticado
     * @return resumen del cambio de estado
     */
    Map<String, Object> toggleCouponStatus(String code, AuthenticatedUserPrincipal user);
}
