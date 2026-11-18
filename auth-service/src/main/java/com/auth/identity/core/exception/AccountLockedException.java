package com.auth.identity.core.exception;

/**
 * Exception thrown when an account is locked due to consecutive failed attempts or admin intervention.
 */
public class AccountLockedException extends RuntimeException {
    public AccountLockedException(String message) {
        super(message);
    }
}
