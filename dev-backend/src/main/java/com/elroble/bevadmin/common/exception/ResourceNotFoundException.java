package com.elroble.bevadmin.common.exception;

/**
 * Excepción síncrona lanzada cuando no se encuentra un registro solicitado en la base de datos
 * (por ejemplo, un Negocio Matriz, un Local, un Rol o un Producto SKU inexistente).
 * <p>
 * Es interceptada automáticamente por {@link com.elroble.bevadmin.common.GlobalExceptionHandler}
 * para devolver un código HTTP {@code 404 Not Found} bajo el estándar RFC 9457.
 */
public class ResourceNotFoundException extends RuntimeException {

    /**
     * Crea una excepción indicando qué recurso y con qué identificador no fue encontrado.
     *
     * @param resourceName nombre de la entidad buscada (ej. {@code "Negocio Matriz"})
     * @param identifier   código o identificador buscado (ej. {@code "BIZ-099"})
     */
    public ResourceNotFoundException(String resourceName, Object identifier) {
        super(String.format("%s con identificador '%s' no fue encontrado en el sistema.", resourceName, identifier));
    }
}
