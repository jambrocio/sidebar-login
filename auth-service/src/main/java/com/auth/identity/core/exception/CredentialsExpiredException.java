package com.auth.identity.core.exception;

/**
 * Exception thrown when user credentials have expired or mandatory rotation is flagged.
 */
public class CredentialsExpiredException extends RuntimeException {
    public CredentialsExpiredException(String message) {
        super(message);
    }
}
