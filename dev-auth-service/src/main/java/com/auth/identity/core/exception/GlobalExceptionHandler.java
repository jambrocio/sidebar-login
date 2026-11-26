package com.auth.identity.core.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Controlador global de excepciones para la API REST del Servicio de Identidad.
 *
 * <p>Intercepta todas las anomalías y excepciones no controladas generadas en los controladores web,
 * traduciéndolas a cargas útiles uniformes y estandarizadas bajo la especificación RFC 7807 (ProblemDetail).
 * Garantiza que ningún error interno exponga trazas de pila (stacktraces) sensibles en producción.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Maneja fallos de autenticación por credenciales incorrectas o inexistentes.
     *
     * @param ex Excepción capturada {@link AuthenticationFailedException}.
     * @return Respuesta HTTP 401 con ProblemDetail estandarizado.
     */
    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ProblemDetail> handleAuthenticationFailed(AuthenticationFailedException ex) {
        log.warn("Fallo de autenticación: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Fallo de Autenticación");
        problem.setType(URI.create("urn:problem-type:authentication-failed"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    /**
     * Maneja intentos de acceso sobre cuentas de usuario bloqueadas por seguridad.
     *
     * @param ex Excepción capturada {@link AccountLockedException}.
     * @return Respuesta HTTP 423 Locked con ProblemDetail estandarizado.
     */
    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ProblemDetail> handleAccountLocked(AccountLockedException ex) {
        log.warn("Intento de acceso a cuenta bloqueada: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.LOCKED, ex.getMessage());
        problem.setTitle("Cuenta de Usuario Bloqueada");
        problem.setType(URI.create("urn:problem-type:account-locked"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.LOCKED).body(problem);
    }

    /**
     * Maneja accesos con credenciales expiradas o rotación obligatoria pendiente.
     *
     * @param ex Excepción capturada {@link CredentialsExpiredException}.
     * @return Respuesta HTTP 403 Forbidden con bandera de cambio obligatorio.
     */
    @ExceptionHandler(CredentialsExpiredException.class)
    public ResponseEntity<ProblemDetail> handleCredentialsExpired(CredentialsExpiredException ex) {
        log.info("Credenciales expiradas para el usuario: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problem.setTitle("Credenciales Expiradas");
        problem.setType(URI.create("urn:problem-type:credentials-expired"));
        problem.setProperty("mustChangePassword", true);
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    /**
     * Maneja la no existencia de recursos solicitados en la capa de datos.
     *
     * @param ex Excepción capturada {@link ResourceNotFoundException}.
     * @return Respuesta HTTP 404 Not Found con ProblemDetail.
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleResourceNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Recurso No Encontrado");
        problem.setType(URI.create("urn:problem-type:resource-not-found"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    /**
     * Maneja violaciones de reglas de negocio del dominio de identidad.
     *
     * @param ex Excepción capturada {@link BusinessRuleException}.
     * @return Respuesta HTTP 422 Unprocessable Entity.
     */
    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ProblemDetail> handleBusinessRule(BusinessRuleException ex) {
        log.warn("Violación de regla de negocio: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Violación de Regla de Negocio");
        problem.setType(URI.create("urn:problem-type:business-rule-violation"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    /**
     * Maneja errores de validación de argumentos en peticiones entrantes (@Valid).
     *
     * @param ex Excepción capturada {@link MethodArgumentNotValidException}.
     * @return Respuesta HTTP 400 Bad Request detallando los campos inválidos.
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Error de Validación de Campos");
        problem.setType(URI.create("urn:problem-type:validation-error"));
        problem.setProperty("timestamp", Instant.now());

        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        problem.setProperty("errors", errors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    /**
     * Maneja cualquier excepción imprevista en el servidor.
     *
     * @param ex Excepción genérica capturada.
     * @return Respuesta HTTP 500 Internal Server Error sin exponer detalles internos.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGenericException(Exception ex) {
        log.error("Error interno del servidor no controlado", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR,
                "Ha ocurrido un error inesperado en el servidor. Por favor, comuníquese con el administrador."
        );
        problem.setTitle("Error Interno del Servidor");
        problem.setType(URI.create("urn:problem-type:internal-server-error"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}
