package com.elroble.bevadmin.modules.cashregister.controller;

import com.elroble.bevadmin.audit.Auditable;
import com.elroble.bevadmin.modules.cashregister.dto.CloseCashAuditRequest;
import com.elroble.bevadmin.modules.cashregister.service.CashRegisterService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono de Arqueo y Cierre de Caja por Turno y Local Asignado
 * ({@code /api/v1/cash-register/audits}).
 * <p>
 * Delega toda la lógica contable de conciliación y aislamiento de Local Asignado a {@link CashRegisterService}.
 * <p>
 * <b>Interfaz de Angular 21 que alimenta:</b> {@code CashRegisterViewComponent} ({@code /dashboard/cash-register}).
 */
@RestController
@RequestMapping("/api/v1/cash-register/audits")
@Tag(
        name = "10. Arqueo y Cierre de Caja por Local",
        description = "Conciliación financiera y cierre de turno laboral en el Local Asignado del operador."
)
public class CashRegisterController {

    /** Servicio de negocio síncrono de arqueos de caja. */
    private final CashRegisterService cashRegisterService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param cashRegisterService servicio de arqueo de caja
     */
    public CashRegisterController(CashRegisterService cashRegisterService) {
        this.cashRegisterService = cashRegisterService;
    }

    /**
     * Lista el historial de actas de arqueo y cierre de caja del negocio activo.
     *
     * @param user usuario autenticado
     * @return lista de arqueos con su diferencia y dictamen contable
     */
    @GetMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'CASH_REGISTER_AUDIT', 'VIEW')")
    @Operation(
            summary = "Listar Actas de Arqueo y Cierre de Caja",
            description = "Consulta la tabla 'cash_register_audits' devolviendo todos los cierres de turno con su estado ('Cuadre Exacto', 'Sobrante' o 'Faltante')."
    )
    @ApiResponse(responseCode = "200", description = "Historial de arqueos obtenido correctamente.")
    public List<Map<String, Object>> listCashAudits(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return cashRegisterService.listCashAudits(user);
    }

    /**
     * Registra y firma el acta de cierre de caja del turno actual en el <b>Local Asignado</b> del usuario.
     *
     * @param req  montos declarados al cierre de caja
     * @param user cajero o responsable en sesión
     * @return resultado del arqueo registrado
     */
    @PostMapping
    @PreAuthorize("@menuPermissionEvaluator.hasAccess(authentication, 'CASH_REGISTER_AUDIT', 'CREATE')")
    @Auditable(module = "Caja", eventType = "CASH_AUDIT_CLOSED")
    @Operation(
            summary = "Registrar y Firmar Arqueo de Caja de Fin de Turno (en el Local Asignado)",
            description = "Calcula el efectivo esperado (openingBalance + cashSales - expenses), lo compara contra countedCash y registra el acta en 'cash_register_audits' asociada al Local Asignado del usuario."
    )
    @ApiResponse(responseCode = "200", description = "Acta de arqueo de caja registrada exitosamente.")
    public Map<String, Object> closeShiftCashAudit(
            @Valid @RequestBody CloseCashAuditRequest req,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return cashRegisterService.closeShiftCashAudit(req, user);
    }
}
