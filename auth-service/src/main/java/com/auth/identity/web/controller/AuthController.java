package com.auth.identity.web.controller;

import com.auth.identity.core.security.JwtTokenService;
import com.auth.identity.service.AuthService;
import com.auth.identity.web.dto.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Controlador REST principal del Proveedor de Identidad para la autenticación centralizada,
 * rotación de tokens, introspección RFC 7662 y descubrimiento JWKS RFC 7517.
 *
 * <p>Expone los puntos de enlace públicos y autenticados para el inicio de sesión,
 * renovación de tokens de acceso, cierre de sesión, renovación de contraseñas y diagnóstico de salud.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@RestController
@Tag(name = "Autenticación y Proveedor de Identidad", description = "Autenticación centralizada, emisión de tokens RS256 y descubrimiento JWKS")
public class AuthController {

    private final AuthService authService;
    private final JwtTokenService jwtTokenService;

    /**
     * Constructor con inyección del servicio de autenticación y el servicio de tokens criptográficos.
     *
     * @param authService Servicio centralizado de autenticación.
     * @param jwtTokenService Servicio criptográfico de emisión de tokens JWT y JWKS.
     */
    public AuthController(AuthService authService, JwtTokenService jwtTokenService) {
        this.authService = authService;
        this.jwtTokenService = jwtTokenService;
    }

    /**
     * Autentica credenciales corporativas y emite un par de tokens criptográficos.
     *
     * @param request Datos de la solicitud con identificador y contraseña.
     * @param httpRequest Solicitud HTTP entrante para trazabilidad de red.
     * @return {@link ResponseEntity} con {@link LoginResponse} en caso de éxito.
     */
    @PostMapping("/api/v1/auth/login")
    @Operation(
            summary = "Autenticar credenciales de usuario",
            description = "Valida el nombre de usuario o correo corporativo junto con la contraseña en texto plano, emitiendo un Token de Acceso asimétrico RS256 y un Token de Refresco opaco."
    )
    @ApiResponse(responseCode = "200", description = "Autenticación exitosa y tokens emitidos")
    @ApiResponse(responseCode = "401", description = "Credenciales incorrectas o usuario no encontrado")
    @ApiResponse(responseCode = "423", description = "Cuenta bloqueada por políticas de seguridad o exceso de intentos fallidos")
    @ApiResponse(responseCode = "403", description = "Contraseña expirada (política de 90 días) o cambio obligatorio requerido")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Rota el token de refresco y emite un nuevo token de acceso asimétrico.
     *
     * @param request Carga útil con el token de refresco vigente.
     * @param httpRequest Solicitud HTTP entrante.
     * @return {@link ResponseEntity} con nuevos tokens de acceso y refresco.
     */
    @PostMapping("/api/v1/auth/refresh")
    @Operation(
            summary = "Rotar token de refresco y emitir nuevo token de acceso",
            description = "Valida la vigencia del token de refresco, revoca la sesión previa y genera un nuevo par de credenciales criptográficas."
    )
    @ApiResponse(responseCode = "200", description = "Tokens renovados exitosamente")
    @ApiResponse(responseCode = "401", description = "Token de refresco inválido, caducado o revocado")
    public ResponseEntity<LoginResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.refreshToken(request.refreshToken(), httpRequest);
        return ResponseEntity.ok(response);
    }

    /**
     * Introspecciona un token de acceso según la especificación RFC 7662.
     *
     * @param request Solicitud con la cadena del token a evaluar.
     * @return {@link ResponseEntity} con el estado activo y metadatos del token.
     */
    @PostMapping("/api/v1/auth/introspect")
    @Operation(
            summary = "Introspección de tokens RFC 7662",
            description = "Permite a microservicios consumidores y API gateways verificar la validez, roles y reclamos del token presentado."
    )
    @ApiResponse(responseCode = "200", description = "Resultado de la introspección del token")
    public ResponseEntity<TokenIntrospectResponse> introspect(@Valid @RequestBody TokenIntrospectRequest request) {
        TokenIntrospectResponse response = authService.introspectToken(request.token());
        return ResponseEntity.ok(response);
    }

    /**
     * Expone el conjunto público de llaves criptográficas JWKS según RFC 7517.
     *
     * @return {@link ResponseEntity} con la clave pública RSA en formato JSON.
     */
    @GetMapping(value = "/.well-known/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Descubrimiento de claves públicas JWKS RFC 7517",
            description = "Expone las claves públicas RSA para que los servicios consumidores verifiquen firmas RS256 de forma local con cero latencia de red."
    )
    @ApiResponse(responseCode = "200", description = "Conjunto de claves públicas JWKS retornado exitosamente")
    public ResponseEntity<Map<String, Object>> getJwks() {
        return ResponseEntity.ok(jwtTokenService.getJwksMap());
    }

    /**
     * Cierra la sesión activa del usuario invalidando el token de refresco.
     *
     * @param request Carga opcional con el token de refresco.
     * @param httpRequest Solicitud HTTP entrante.
     * @return Mensaje confirmatorio de cierre de sesión.
     */
    @PostMapping("/api/v1/auth/logout")
    @Operation(
            summary = "Revocar sesión activa (Logout)",
            description = "Invalida el token de refresco y finaliza la sesión activa en la base de datos de identidad."
    )
    @ApiResponse(responseCode = "200", description = "Sesión cerrada correctamente")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest httpRequest
    ) {
        String token = request != null ? request.refreshToken() : null;
        authService.logout(token, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(Map.of("message", "Sesión cerrada exitosamente"));
    }

    /**
     * Actualiza la contraseña del usuario autenticado y revoca todas las sesiones previas.
     *
     * @param userIdStr Identificador UUID del usuario autenticado extraído del principal de seguridad.
     * @param request Carga con contraseña actual y nueva contraseña.
     * @param httpRequest Solicitud HTTP entrante.
     * @return Mensaje confirmatorio de actualización de contraseña.
     */
    @PostMapping("/api/v1/auth/change-password")
    @Operation(
            summary = "Renovar contraseña de usuario",
            description = "Actualiza la contraseña, reinicia la fecha de vencimiento a 90 días y revoca todas las sesiones concurrentes activas."
    )
    @ApiResponse(responseCode = "200", description = "Contraseña actualizada exitosamente")
    @ApiResponse(responseCode = "401", description = "La contraseña actual proporcionada es incorrecta")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        UUID userId = UUID.fromString(userIdStr);
        authService.changePassword(userId, request, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(Map.of("message", "Contraseña actualizada exitosamente. Por favor inicie sesión nuevamente con sus nuevas credenciales."));
    }

    /**
     * Punto de comprobación de salud del servicio de identidad.
     *
     * @return Mapa con estado operativo del servicio.
     */
    @GetMapping("/api/v1/auth/health")
    @Operation(
            summary = "Verificación de salud del servicio (Health Check)",
            description = "Sonda de disponibilidad ligera para balanceadores de carga y orquestadores de contenedores."
    )
    @ApiResponse(responseCode = "200", description = "Servicio de identidad operando con normalidad")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "service", "centralized-auth-service",
                "status", "UP",
                "timestamp", java.time.Instant.now()
        ));
    }
}
