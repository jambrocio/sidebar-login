package com.elroble.bevadmin.common;

import com.elroble.bevadmin.common.exception.BusinessRuleException;
import com.elroble.bevadmin.common.exception.ResourceNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Manejador centralizado e imperativo de excepciones para toda la API REST.
 * <p>
 *Estandariza todas las respuestas de error utilizando {@link ProblemDetail} (RFC 9457)
 * nativo de Spring Boot 4 / Spring Framework 7, evitando bloques {@code try/catch}
 * repetitivos en los controladores y servicios.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Captura errores de validación de DTOs anotados con {@code @Valid}.
     *
     * @param ex excepción con el listado de campos inválidos
     * @return detalle del problema HTTP 400 con el mapa de campos y mensajes
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidationException(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "Uno o más campos enviados no cumplen las reglas de validación."
        );
        problem.setTitle("Error de Validación de Datos");
        problem.setType(URI.create("https://elroble.com/errors/validation-error"));

        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        err -> err.getField(),
                        err -> err.getDefaultMessage() != null ? err.getDefaultMessage() : "Valor inválido",
                        (a, b) -> a
                ));
        problem.setProperty("fieldErrors", fieldErrors);
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * Captura intentos de inicio de sesión con credenciales incorrectas o cuentas inactivas.
     *
     * @param ex excepción de credenciales inválidas
     * @return detalle del problema HTTP 401
     */
    @ExceptionHandler(BadCredentialsException.class)
    public ProblemDetail handleBadCredentials(BadCredentialsException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Credenciales de Acceso Inválidas");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * Captura intentos de inicio de sesión de usuarios con cuenta bloqueada (status = 'LOCKED' o 5 intentos fallidos).
     *
     * @param ex excepción de cuenta bloqueada
     * @return detalle del problema HTTP 423 con instrucciones en español
     */
    @ExceptionHandler(LockedException.class)
    public ProblemDetail handleLockedException(LockedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.LOCKED, ex.getMessage());
        problem.setTitle("Cuenta de Usuario Bloqueada");
        problem.setType(URI.create("https://elroble.com/errors/account-locked"));
        problem.setProperty("accountStatus", "LOCKED");
        problem.setProperty("isLocked", true);
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * Captura intentos de acceso con contraseña expirada o clave temporal de cambio obligatorio.
     *
     * @param ex excepción de contraseña vencida
     * @return detalle del problema HTTP 403 con flags para forzar la navegación al formulario de cambio de clave
     */
    @ExceptionHandler(CredentialsExpiredException.class)
    public ProblemDetail handleCredentialsExpiredException(CredentialsExpiredException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problem.setTitle("Contraseña Expirada o Temporal");
        problem.setType(URI.create("https://elroble.com/errors/password-expired"));
        problem.setProperty("passwordStatus", "Expirada");
        problem.setProperty("mustChangePassword", true);
        problem.setProperty("actionRequired", "CHANGE_PASSWORD");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * Captura intentos de acceso de cuentas inactivas (status = 'INACTIVE').
     *
     * @param ex excepción de cuenta deshabilitada
     * @return detalle del problema HTTP 403
     */
    @ExceptionHandler(DisabledException.class)
    public ProblemDetail handleDisabledException(DisabledException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problem.setTitle("Cuenta de Usuario Inactiva");
        problem.setType(URI.create("https://elroble.com/errors/account-inactive"));
        problem.setProperty("accountStatus", "INACTIVE");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * Captura rechazos de autorización por rol RBAC o por intento de operar fuera del Local Asignado.
     *
     * @param ex excepción de acceso denegado
     * @return detalle del problema HTTP 403
     */
    @ExceptionHandler(AccessDeniedException.class)
    public ProblemDetail handleAccessDenied(AccessDeniedException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.FORBIDDEN,
                "No cuenta con permisos para realizar esta acción o intenta operar fuera de su Local Asignado."
        );
        problem.setTitle("Acceso Restringido por Rol o Local Asignado");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * Captura búsquedas de recursos o registros que no existen en la base de datos.
     *
     * @param ex excepción de recurso no encontrado
     * @return detalle del problema HTTP 404
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ProblemDetail handleResourceNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Recurso No Encontrado");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * Captura incumplimientos de reglas de negocio lanzados por la capa de servicio ({@code ServiceImpl}).
     *
     * @param ex excepción de regla de negocio
     * @return detalle del problema HTTP 422
     */
    @ExceptionHandler({BusinessRuleException.class, IllegalArgumentException.class})
    public ProblemDetail handleBusinessRuleViolation(RuntimeException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Regla de Negocio No Cumplida");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
