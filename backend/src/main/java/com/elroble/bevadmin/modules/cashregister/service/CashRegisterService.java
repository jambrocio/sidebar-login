package com.elroble.bevadmin.modules.cashregister.service;

import com.elroble.bevadmin.modules.cashregister.dto.CloseCashAuditRequest;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para Arqueo y Cierre de Caja por Local Asignado.
 */
public interface CashRegisterService {

    /**
     * Lista el historial de actas de arqueo y cierre de caja del negocio activo.
     *
     * @param user usuario autenticado
     * @return lista de actas de arqueo
     */
    List<Map<String, Object>> listCashAudits(AuthenticatedUserPrincipal user);

    /**
     * Calcula la conciliación de efectivo del turno actual y registra el acta de arqueo
     * en el Local Asignado del usuario.
     *
     * @param request DTO con los montos declarados al cierre
     * @param user    cajero o responsable en sesión
     * @return resumen del arqueo registrado con su dictamen contable
     */
    Map<String, Object> closeShiftCashAudit(CloseCashAuditRequest request, AuthenticatedUserPrincipal user);
}
