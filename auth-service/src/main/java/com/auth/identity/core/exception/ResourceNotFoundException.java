package com.auth.identity.core.exception;

/**
 * Excepción lanzada cuando un recurso solicitado no existe en la capa de persistencia de identidad.
 *
 * <p>Es capturada por {@link GlobalExceptionHandler} y convertida en una respuesta HTTP 404 Not Found
 * con formato estándar RFC 7807 ProblemDetail.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Construye una nueva excepción de recurso no encontrado con el mensaje especificado.
     *
     * @param message Detalle del recurso inexistente o identificador buscado.
     */
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
