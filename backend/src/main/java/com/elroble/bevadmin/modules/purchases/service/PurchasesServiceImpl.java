package com.elroble.bevadmin.modules.purchases.service;

import com.elroble.bevadmin.modules.purchases.dto.RegisterPurchaseRequest;
import com.elroble.bevadmin.modules.purchases.repository.PurchasesRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Implementación imperativa y síncrona del servicio de Compras y Abastecimiento ({@link PurchasesService}).
 */
@Service
public class PurchasesServiceImpl implements PurchasesService {

    /** Repositorio síncrono de compras y abastecimiento. */
    private final PurchasesRepository purchasesRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param purchasesRepository repositorio de compras
     */
    public PurchasesServiceImpl(PurchasesRepository purchasesRepository) {
        this.purchasesRepository = purchasesRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listPurchases(AuthenticatedUserPrincipal user) {
        return purchasesRepository.findPurchasesByBusinessId(user.businessId());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> registerPurchaseOrder(RegisterPurchaseRequest request, AuthenticatedUserPrincipal user) {
        BigDecimal totalCost = request.boxCost().multiply(BigDecimal.valueOf(request.boxesQty()));
        purchasesRepository.insertPurchaseOrder(request, user, totalCost);

        return Map.of(
                "purchaseCode", request.purchaseCode(),
                "branch", user.assignedBranchName(),
                "totalCost", totalCost,
                "status", "Recibido"
        );
    }
}
