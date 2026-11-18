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
 * Global REST exception handler mapping exceptions to standardized RFC 7807 ProblemDetail payloads.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AuthenticationFailedException.class)
    public ResponseEntity<ProblemDetail> handleAuthenticationFailed(AuthenticationFailedException ex) {
        log.warn("Authentication failed: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
        problem.setTitle("Authentication Failed");
        problem.setType(URI.create("urn:problem-type:authentication-failed"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(problem);
    }

    @ExceptionHandler(AccountLockedException.class)
    public ResponseEntity<ProblemDetail> handleAccountLocked(AccountLockedException ex) {
        log.warn("Account locked access attempt: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.LOCKED, ex.getMessage());
        problem.setTitle("Account Locked");
        problem.setType(URI.create("urn:problem-type:account-locked"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.LOCKED).body(problem);
    }

    @ExceptionHandler(CredentialsExpiredException.class)
    public ResponseEntity<ProblemDetail> handleCredentialsExpired(CredentialsExpiredException ex) {
        log.info("Credentials expired for user: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
        problem.setTitle("Credentials Expired");
        problem.setType(URI.create("urn:problem-type:credentials-expired"));
        problem.setProperty("mustChangePassword", true);
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(problem);
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ProblemDetail> handleResourceNotFound(ResourceNotFoundException ex) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setTitle("Resource Not Found");
        problem.setType(URI.create("urn:problem-type:resource-not-found"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(BusinessRuleException.class)
    public ResponseEntity<ProblemDetail> handleBusinessRule(BusinessRuleException ex) {
        log.warn("Business rule violation: {}", ex.getMessage());
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
        problem.setTitle("Business Rule Violation");
        problem.setType(URI.create("urn:problem-type:business-rule-violation"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).body(problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex) {
        ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problem.setTitle("Validation Error");
        problem.setType(URI.create("urn:problem-type:validation-error"));
        problem.setProperty("timestamp", Instant.now());

        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        problem.setProperty("errors", errors);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleGenericException(Exception ex) {
        log.error("Unhandled internal server error", ex);
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected server error occurred.");
        problem.setTitle("Internal Server Error");
        problem.setType(URI.create("urn:problem-type:internal-server-error"));
        problem.setProperty("timestamp", Instant.now());
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(problem);
    }
}
