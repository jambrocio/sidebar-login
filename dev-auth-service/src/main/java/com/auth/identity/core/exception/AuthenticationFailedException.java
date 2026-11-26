package com.auth.identity.core.exception;

/**
 * Excepción lanzada cuando la autenticación de un usuario falla debido a credenciales inválidas.
 *
 * <p>Esta excepción es capturada por {@link GlobalExceptionHandler} y transformada
 * en una respuesta HTTP 401 Unauthorized estructurada bajo el estándar RFC 7807.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public class AuthenticationFailedException extends RuntimeException {

    /**
     * Construye una nueva excepción de fallo de autenticación con el mensaje detallado especificado.
     *
     * @param message Mensaje descriptivo de la causa del fallo de autenticación.
     */
    public AuthenticationFailedException(String message) {
        super(message);
    }
}
