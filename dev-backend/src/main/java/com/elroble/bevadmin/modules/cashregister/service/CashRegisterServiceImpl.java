package com.elroble.bevadmin.modules.cashregister.service;

import com.elroble.bevadmin.modules.cashregister.dto.CloseCashAuditRequest;
import com.elroble.bevadmin.modules.cashregister.repository.CashRegisterRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Implementación imperativa y síncrona del servicio de Arqueo y Cierre de Caja ({@link CashRegisterService}).
 */
@Service
public class CashRegisterServiceImpl implements CashRegisterService {

    /** Repositorio síncrono de arqueos de caja. */
    private final CashRegisterRepository cashRegisterRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param cashRegisterRepository repositorio de arqueos de caja
     */
    public CashRegisterServiceImpl(CashRegisterRepository cashRegisterRepository) {
        this.cashRegisterRepository = cashRegisterRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listCashAudits(AuthenticatedUserPrincipal user) {
        return cashRegisterRepository.findCashAuditsByBusinessId(user.businessId());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> closeShiftCashAudit(CloseCashAuditRequest request, AuthenticatedUserPrincipal user) {
        // Regla de negocio: Efectivo Esperado = Fondo Inicial + Ventas en Efectivo - Gastos Caja Chica
        BigDecimal expectedCash = request.openingBalance()
                .add(request.cashSales())
                .subtract(request.expenses());

        BigDecimal difference = request.countedCash().subtract(expectedCash);
        String auditStatus = difference.compareTo(BigDecimal.ZERO) == 0
                ? "Cuadre Exacto"
                : (difference.compareTo(BigDecimal.ZERO) > 0 ? "Sobrante" : "Faltante");

        cashRegisterRepository.insertCashAudit(request, user, expectedCash, difference, auditStatus);

        return Map.of(
                "auditCode", request.auditCode(),
                "branch", user.assignedBranchName(),
                "expectedCash", expectedCash,
                "countedCash", request.countedCash(),
                "difference", difference,
                "status", auditStatus
        );
    }
}
