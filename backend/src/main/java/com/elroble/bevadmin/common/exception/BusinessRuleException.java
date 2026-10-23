package com.elroble.bevadmin.common.exception;

/**
 * Excepción síncrona de dominio lanzada cuando una operación infringe una regla de negocio
 * (por ejemplo, cupón vencido, stock insuficiente o RUC duplicado).
 * <p>
 * Es interceptada automáticamente por {@link com.elroble.bevadmin.common.GlobalExceptionHandler}
 * para devolver un código HTTP {@code 422 Unprocessable Entity} bajo el estándar RFC 9457.
 */
public class BusinessRuleException extends RuntimeException {

    /**
     * Crea una nueva excepción de regla de negocio con un mensaje descriptivo en español.
     *
     * @param message detalle claro de la regla de negocio incumplida
     */
    public BusinessRuleException(String message) {
        super(message);
    }
}
