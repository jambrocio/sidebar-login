package com.auth.identity.core.exception;

/**
 * Excepción lanzada cuando las credenciales del usuario han expirado (política de 90 días)
 * o cuando se ha establecido la bandera administrativa de cambio obligatorio de contraseña.
 *
 * <p>Es procesada por {@link GlobalExceptionHandler} para retornar un estado HTTP 403 Forbidden
 * instruyendo al cliente web a redirigir al flujo de renovación forzosa de credenciales.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public class CredentialsExpiredException extends RuntimeException {

    /**
     * Construye una nueva excepción de credenciales expiradas con el mensaje correspondiente.
     *
     * @param message Explicación del estado de caducidad o requerimiento de rotación.
     */
    public CredentialsExpiredException(String message) {
        super(message);
    }
}
