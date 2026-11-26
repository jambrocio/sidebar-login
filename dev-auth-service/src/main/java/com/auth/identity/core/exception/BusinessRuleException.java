package com.auth.identity.core.exception;

/**
 * Excepción lanzada cuando una operación solicitada viola una regla de negocio del dominio de identidad.
 *
 * <p>Por ejemplo, intento de registrar un nombre de usuario o correo electrónico ya existente.
 * Es capturada por {@link GlobalExceptionHandler} y traducida a HTTP 422 Unprocessable Entity.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public class BusinessRuleException extends RuntimeException {

    /**
     * Construye una nueva excepción de regla de negocio con el mensaje descriptivo proporcionado.
     *
     * @param message Detalle del incumplimiento de la regla de negocio.
     */
    public BusinessRuleException(String message) {
        super(message);
    }
}
