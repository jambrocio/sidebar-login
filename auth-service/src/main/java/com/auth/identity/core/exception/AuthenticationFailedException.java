package com.auth.identity.core.exception;

/**
 * Exception thrown when authentication fails due to invalid credentials.
 */
public class AuthenticationFailedException extends RuntimeException {
    public AuthenticationFailedException(String message) {
        super(message);
    }
}
