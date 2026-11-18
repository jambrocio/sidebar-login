package com.auth.identity.core.exception;

/**
 * Exception thrown when a requested resource is not found in the persistence layer.
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
