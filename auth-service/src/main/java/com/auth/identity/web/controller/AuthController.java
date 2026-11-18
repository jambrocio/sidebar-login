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
 * Primary identity provider endpoints for authentication, token rotation,
 * RFC 7662 introspection, and RFC 7517 JWKS discovery.
 */
@RestController
@Tag(name = "Authentication & Identity Provider", description = "Centralized authentication, RS256 token issuance, and JWKS discovery")
public class AuthController {

    private final AuthService authService;
    private final JwtTokenService jwtTokenService;

    public AuthController(AuthService authService, JwtTokenService jwtTokenService) {
        this.authService = authService;
        this.jwtTokenService = jwtTokenService;
    }

    @PostMapping("/api/v1/auth/login")
    @Operation(summary = "Authenticate user credentials", description = "Validates username/email and password, issuing an asymmetric RS256 Access Token and a Refresh Token.")
    @ApiResponse(responseCode = "200", description = "Successfully authenticated")
    @ApiResponse(responseCode = "401", description = "Invalid credentials")
    @ApiResponse(responseCode = "423", description = "Account locked due to excessive failed attempts")
    @ApiResponse(responseCode = "403", description = "Password expired or mandatory change required")
    public ResponseEntity<LoginResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.login(request, httpRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/v1/auth/refresh")
    @Operation(summary = "Rotate refresh token and issue new access token", description = "Validates active refresh token, revokes it, and issues a new token pair.")
    @ApiResponse(responseCode = "200", description = "Successfully refreshed")
    @ApiResponse(responseCode = "401", description = "Invalid or revoked refresh token")
    public ResponseEntity<LoginResponse> refresh(
            @Valid @RequestBody RefreshTokenRequest request,
            HttpServletRequest httpRequest
    ) {
        LoginResponse response = authService.refreshToken(request.refreshToken(), httpRequest);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/v1/auth/introspect")
    @Operation(summary = "RFC 7662 Token Introspection", description = "Enables consumer applications and API gateways to query token status, roles, and claims.")
    public ResponseEntity<TokenIntrospectResponse> introspect(@Valid @RequestBody TokenIntrospectRequest request) {
        TokenIntrospectResponse response = authService.introspectToken(request.token());
        return ResponseEntity.ok(response);
    }

    @GetMapping(value = "/.well-known/jwks.json", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(summary = "RFC 7517 JSON Web Key Set (JWKS)", description = "Exposes public RSA keys allowing consumer apps to verify RS256 signatures with zero network roundtrips.")
    public ResponseEntity<Map<String, Object>> getJwks() {
        return ResponseEntity.ok(jwtTokenService.getJwksMap());
    }

    @PostMapping("/api/v1/auth/logout")
    @Operation(summary = "Revoke user session", description = "Invalidates the refresh token and closes active session in database.")
    public ResponseEntity<Map<String, String>> logout(
            @RequestBody(required = false) RefreshTokenRequest request,
            HttpServletRequest httpRequest
    ) {
        String token = request != null ? request.refreshToken() : null;
        authService.logout(token, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(Map.of("message", "Successfully logged out"));
    }

    @PostMapping("/api/v1/auth/change-password")
    @Operation(summary = "Renew password", description = "Updates password, resets lockout and expiration, and terminates all active sessions.")
    public ResponseEntity<Map<String, String>> changePassword(
            @AuthenticationPrincipal String userIdStr,
            @Valid @RequestBody ChangePasswordRequest request,
            HttpServletRequest httpRequest
    ) {
        UUID userId = UUID.fromString(userIdStr);
        authService.changePassword(userId, request, httpRequest.getRemoteAddr());
        return ResponseEntity.ok(Map.of("message", "Password successfully changed. Please log in again with your new credentials."));
    }

    @GetMapping("/api/v1/auth/health")
    @Operation(summary = "Identity service health check", description = "Lightweight status probe for load balancers and orchestrators.")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "service", "centralized-auth-service",
                "status", "UP",
                "timestamp", java.time.Instant.now()
        ));
    }
}
