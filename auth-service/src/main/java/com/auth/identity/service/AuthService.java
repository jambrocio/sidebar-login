package com.auth.identity.service;

import com.auth.identity.web.dto.ChangePasswordRequest;
import com.auth.identity.web.dto.LoginRequest;
import com.auth.identity.web.dto.LoginResponse;
import com.auth.identity.web.dto.TokenIntrospectResponse;
import jakarta.servlet.http.HttpServletRequest;

import java.util.UUID;

/**
 * Service interface for centralized authentication, token rotation, and password management.
 */
public interface AuthService {

    /**
     * Authenticates user credentials, enforces lockout and password expiration policies,
     * emits an asymmetric RS256 Access Token and a Refresh Token, and logs audit events.
     */
    LoginResponse login(LoginRequest request, HttpServletRequest httpRequest);

    /**
     * Validates a Refresh Token, rotates it, and issues a fresh RS256 Access Token.
     */
    LoginResponse refreshToken(String refreshToken, HttpServletRequest httpRequest);

    /**
     * Introspects an access token according to RFC 7662.
     */
    TokenIntrospectResponse introspectToken(String token);

    /**
     * Changes user password, resets expiration, and invalidates active sessions.
     */
    void changePassword(UUID userId, ChangePasswordRequest request, String ipAddress);

    /**
     * Logs out the user by revoking their current session.
     */
    void logout(String refreshToken, String ipAddress);
}
