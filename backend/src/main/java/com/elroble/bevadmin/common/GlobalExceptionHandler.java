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
     * Captura errores cuando el cuerpo de la solicitud JSON está malformado o es ilegible.
     */
    @ExceptionHandler(org.springframework.http.converter.HttpMessageNotReadableException.class)
    public ProblemDetail handleMessageNotReadable(org.springframework.http.converter.HttpMessageNotReadableException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST,
                "El cuerpo de la solicitud JSON es inválido o no pudo ser deserializado."
        );
        problem.setTitle("Solicitud JSON Malformada");
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
    /**
     * Captura violaciones de integridad de base de datos (claves duplicadas, RUC o código ya existente).
     *
     * @param ex excepción de violación de integridad
     * @return detalle del problema HTTP 409 Conflict
     */
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ProblemDetail handleDataIntegrityViolation(org.springframework.dao.DataIntegrityViolationException ex) {
        String msg = (ex.getMessage() != null) ? ex.getMessage() : "";
        String detailMessage = "El registro no pudo guardarse porque ya existe un registro duplicado en la base de datos.";
        if (msg.contains("empresas_codigo_key")) {
            detailMessage = "El código del negocio ya se encuentra registrado. Utilice un código diferente (ej. BIZ-004).";
        } else if (msg.contains("empresas_identificacion_fiscal_key")) {
            detailMessage = "El RUC ingresado ya pertenece a otra empresa registrada en el sistema.";
        } else if (msg.contains("sedes_codigo_key")) {
            detailMessage = "El código del local ya se encuentra registrado en el sistema.";
        } else if (msg.contains("sedes_empresa_id_nombre_key")) {
            detailMessage = "Ya existe un local con ese nombre dentro del mismo negocio matriz.";
        } else if (msg.contains("usuarios_codigo_usuario_key")) {
            detailMessage = "El código de usuario ya se encuentra registrado en el sistema.";
        } else if (msg.contains("usuarios_nombre_usuario_key")) {
            detailMessage = "El nombre de usuario (username) ya se encuentra registrado en el sistema.";
        } else if (msg.contains("usuarios_correo_electronico_key")) {
            detailMessage = "El correo electrónico institucional ya se encuentra registrado para otro usuario.";
        }

        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, detailMessage);
        problem.setTitle("Conflicto de Datos Duplicados");
        problem.setType(URI.create("https://elroble.com/errors/duplicate-key"));
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }

    /**
     * Captura cualquier excepción no controlada en el servidor.
     *
     * @param ex excepción inesperada
     * @return detalle del problema HTTP 500
     */
    @ExceptionHandler(Exception.class)
    public ProblemDetail handleGenericException(Exception ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Ocurrió un error inesperado en el servidor: " + (ex.getMessage() != null ? ex.getMessage() : "Error interno")
        );
        problem.setTitle("Error Interno del Servidor");
        problem.setProperty("timestamp", Instant.now());
        return problem;
    }
}
