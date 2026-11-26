package com.elroble.bevadmin.modules.coupons.service;

import com.elroble.bevadmin.common.exception.BusinessRuleException;
import com.elroble.bevadmin.modules.coupons.dto.CreateCouponRequest;
import com.elroble.bevadmin.modules.coupons.repository.CouponsRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Implementación imperativa y síncrona del servicio de Cupones de Descuento ({@link CouponsService}).
 */
@Service
public class CouponsServiceImpl implements CouponsService {

    /** Repositorio síncrono de cupones promocionales. */
    private final CouponsRepository couponsRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param couponsRepository repositorio de cupones
     */
    public CouponsServiceImpl(CouponsRepository couponsRepository) {
        this.couponsRepository = couponsRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listCoupons(AuthenticatedUserPrincipal user) {
        return couponsRepository.findCouponsByBusinessId(user.businessId());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> createCoupon(CreateCouponRequest request, AuthenticatedUserPrincipal user) {
        String cleanCode = request.code().trim().toUpperCase();
        if (couponsRepository.existsByCode(cleanCode)) {
            throw new BusinessRuleException(
                    "El código de cupón '" + cleanCode + "' ya se encuentra registrado en la base de datos. " +
                    "Los códigos de cupón deben ser únicos e irrepetibles."
            );
        }
        couponsRepository.insertCoupon(user.businessId(), user.userId(), request);
        return Map.of("code", cleanCode, "active", true);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> toggleCouponStatus(String code, AuthenticatedUserPrincipal user) {
        couponsRepository.toggleCouponStatus(user.businessId(), code);
        return Map.of("code", code.toUpperCase(), "status", "Actualizado");
    }
}
