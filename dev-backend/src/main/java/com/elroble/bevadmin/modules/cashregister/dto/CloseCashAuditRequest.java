package com.elroble.bevadmin.modules.cashregister.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

/**
 * DTO de entrada para declarar y firmar el cierre de caja de un turno laboral.
 *
 * @param auditCode      código correlativo del acta de arqueo (ej. {@code ARQ-2026-015})
 * @param shiftName      turno laboral liquidado (ej. {@code Turno Tarde (16:00 - 23:00)})
 * @param openingBalance fondo fijo inicial con el que se abrió la caja
 * @param cashSales      total cobrado en efectivo durante el turno
 * @param digitalSales   total cobrado por medios digitales (Transferencia, Yape/Plin, POS)
 * @param expenses       egresos o gastos menores pagados por caja chica
 * @param countedCash    efectivo físico real contado en billetes y monedas al cierre
 */
@Schema(description = "Datos declarados por el cajero al realizar el Arqueo de Caja de final de turno")
public record CloseCashAuditRequest(
        @Schema(description = "Código único del acta de arqueo", example = "ARQ-2026-015")
        @NotBlank String auditCode,

        @Schema(description = "Horario o turno laboral que se cierra", example = "Turno Tarde (16:00 - 23:00)")
        @NotBlank String shiftName,

        @Schema(description = "Fondo inicial de apertura de caja", example = "200.00")
        BigDecimal openingBalance,

        @Schema(description = "Ventas cobradas en efectivo en el turno", example = "1450.00")
        BigDecimal cashSales,

        @Schema(description = "Ventas cobradas por medios digitales", example = "890.00")
        BigDecimal digitalSales,

        @Schema(description = "Gastos menores pagados por caja chica", example = "50.00")
        BigDecimal expenses,

        @Schema(description = "Efectivo físico real contado en gaveta", example = "1600.00")
        BigDecimal countedCash
) {}
