package com.auth.identity.core.exception;

/**
 * Excepción lanzada cuando una cuenta de usuario se encuentra bloqueada por superar el límite
 * máximo de intentos fallidos de autenticación o por bloqueo administrativo preventivo.
 */
public class AccountLockedException extends RuntimeException {

    /**
     * Constructor con mensaje explicativo de la causa del bloqueo.
     *
     * @param message detalle del motivo de bloqueo de la cuenta
     */
    public AccountLockedException(String message) {
        super(message);
    }
}
