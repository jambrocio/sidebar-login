package com.auth.identity.core.exception;

/**
 * Exception thrown when a domain business rule is violated.
 */
public class BusinessRuleException extends RuntimeException {
    public BusinessRuleException(String message) {
        super(message);
    }
}
