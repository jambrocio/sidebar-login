package com.auth.identity.service;

import com.auth.identity.core.exception.AccountLockedException;
import com.auth.identity.core.exception.AuthenticationFailedException;
import com.auth.identity.core.exception.CredentialsExpiredException;
import com.auth.identity.core.security.AuthenticatedUserPrincipal;
import com.auth.identity.core.security.JwtTokenService;
import com.auth.identity.domain.model.MenuItemPermission;
import com.auth.identity.domain.model.User;
import com.auth.identity.domain.model.UserSession;
import com.auth.identity.repository.AuditRepository;
import com.auth.identity.repository.RbacRepository;
import com.auth.identity.repository.SessionRepository;
import com.auth.identity.repository.UserRepository;
import com.auth.identity.web.dto.ChangePasswordRequest;
import com.auth.identity.web.dto.LoginRequest;
import com.auth.identity.web.dto.LoginResponse;
import com.auth.identity.web.dto.TokenIntrospectResponse;
import com.nimbusds.jwt.JWTClaimsSet;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final RbacRepository rbacRepository;
    private final AuditRepository auditRepository;
    private final SessionService sessionService;
    private final JwtTokenService jwtTokenService;
    private final PasswordEncoder passwordEncoder;

    @Value("${auth.security.lockout.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${auth.security.password.warning-threshold-days:7}")
    private long warningThresholdDays;

    public AuthServiceImpl(
            UserRepository userRepository,
            SessionRepository sessionRepository,
            RbacRepository rbacRepository,
            AuditRepository auditRepository,
            SessionService sessionService,
            JwtTokenService jwtTokenService,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.sessionRepository = sessionRepository;
        this.rbacRepository = rbacRepository;
        this.auditRepository = auditRepository;
        this.sessionService = sessionService;
        this.jwtTokenService = jwtTokenService;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String login = request.username().trim();
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        User user = userRepository.findUserByLogin(login)
                .orElseThrow(() -> {
                    log.warn("Login attempt for non-existent identifier: {}", login);
                    auditRepository.logSecurityEvent(null, null, "LOGIN_FAILED", "User not found: " + login, "Seguridad", ip, null);
                    return new AuthenticationFailedException("Invalid credentials.");
                });

        // 1. Check account lockout policy
        if (user.isLocked() || user.failedLoginAttempts() >= maxFailedAttempts) {
            log.warn("Login blocked for locked user account: {}", user.username());
            auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "ACCOUNT_LOCKED", "Access attempt on locked account", "Seguridad", ip, null);
            throw new AccountLockedException("Your account is locked due to security policy or excessive failed login attempts. Contact an administrator.");
        }

        // 2. Check active status
        if (!user.isActive()) {
            log.warn("Login blocked for inactive user: {}", user.username());
            throw new AuthenticationFailedException("Account is currently disabled.");
        }

        // 3. Cryptographic password verification (BCrypt)
        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            userRepository.incrementFailedAttempts(user.id());
            int currentAttempts = user.failedLoginAttempts() + 1;
            log.warn("Password mismatch for user {} (failed attempts: {}/{})", user.username(), currentAttempts, maxFailedAttempts);

            auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "LOGIN_FAILED", "Bad password (attempt " + currentAttempts + ")", "Seguridad", ip, null);

            if (currentAttempts >= maxFailedAttempts) {
                throw new AccountLockedException("Maximum login attempts reached. Your account has been locked for security.");
            }
            throw new AuthenticationFailedException("Invalid credentials.");
        }

        // 4. Check password expiration policy (90 days or mandatory rotation flag)
        OffsetDateTime now = OffsetDateTime.now();
        boolean isExpired = user.passwordExpiresAt() != null && user.passwordExpiresAt().isBefore(now);
        if (user.mustChangePassword() || isExpired) {
            log.info("Credentials expired for user {}. Must change password before continuing.", user.username());
            auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "CREDENTIALS_EXPIRED", "Credentials expired or change required", "Seguridad", ip, null);
            throw new CredentialsExpiredException("Your password has expired or a mandatory reset is required. Please update your password.");
        }

        // 5. Successful authentication: reset failed attempts
        userRepository.resetFailedAttempts(user.id());

        // 6. Build principal and tokens
        AuthenticatedUserPrincipal principal = userRepository.findActivePrincipalByLoginOrEmail(login)
                .orElseThrow(() -> new AuthenticationFailedException("Failed to construct principal context."));

        String accessToken = jwtTokenService.generateAccessToken(principal);
        String refreshToken = jwtTokenService.generateOpaqueRefreshToken();

        // 7. Register session and audit
        sessionService.registerSession(user.id(), refreshToken, ip, userAgent);
        auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "LOGIN_SUCCESS", "Successful authentication", "Seguridad", ip, null);

        // 8. Calculate expiration warning
        long daysUntilExpiration = user.passwordExpiresAt() != null
                ? Math.max(0, ChronoUnit.DAYS.between(now, user.passwordExpiresAt()))
                : 90;
        boolean expiringSoon = daysUntilExpiration <= warningThresholdDays;

        // 9. Load permissions
        List<MenuItemPermission> permissions = rbacRepository.findEffectiveMenuPermissionsByUserId(user.id());

        return new LoginResponse(
                accessToken,
                jwtTokenService.getAccessTokenExpirationSeconds(),
                refreshToken,
                "Bearer",
                user.id(),
                user.userCode(),
                user.username(),
                user.email(),
                user.fullName(),
                principal.roleCode(),
                principal.roleScope(),
                principal.businessId(),
                principal.businessCode(),
                principal.assignedBranchId(),
                principal.assignedBranchName(),
                principal.authorizedBranchIds(),
                expiringSoon,
                daysUntilExpiration,
                permissions
        );
    }

    @Override
    @Transactional
    public LoginResponse refreshToken(String refreshToken, HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        String hash = jwtTokenService.hashToken(refreshToken);

        UserSession session = sessionRepository.findActiveSessionByHash(hash)
                .orElseThrow(() -> {
                    log.warn("Invalid or revoked refresh token provided from IP: {}", ip);
                    return new AuthenticationFailedException("Refresh token is invalid or has been revoked.");
                });

        User user = userRepository.findById(session.userId())
                .orElseThrow(() -> new AuthenticationFailedException("User identity not found."));

        if (!user.isActive()) {
            throw new AuthenticationFailedException("User account is inactive.");
        }

        // Invalidate old session and issue new token pair (Token Rotation)
        sessionRepository.revokeSession(session.id(), false, "Token Rotated");

        AuthenticatedUserPrincipal principal = userRepository.findActivePrincipalByLoginOrEmail(user.username())
                .orElseThrow(() -> new AuthenticationFailedException("Failed to load user principal."));

        String newAccessToken = jwtTokenService.generateAccessToken(principal);
        String newRefreshToken = jwtTokenService.generateOpaqueRefreshToken();

        sessionService.registerSession(user.id(), newRefreshToken, ip, userAgent);
        auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "TOKEN_REFRESH", "Rotated refresh token", "Seguridad", ip, null);

        long daysUntilExpiration = user.passwordExpiresAt() != null
                ? Math.max(0, ChronoUnit.DAYS.between(OffsetDateTime.now(), user.passwordExpiresAt()))
                : 90;

        List<MenuItemPermission> permissions = rbacRepository.findEffectiveMenuPermissionsByUserId(user.id());

        return new LoginResponse(
                newAccessToken,
                jwtTokenService.getAccessTokenExpirationSeconds(),
                newRefreshToken,
                "Bearer",
                user.id(),
                user.userCode(),
                user.username(),
                user.email(),
                user.fullName(),
                principal.roleCode(),
                principal.roleScope(),
                principal.businessId(),
                principal.businessCode(),
                principal.assignedBranchId(),
                principal.assignedBranchName(),
                principal.authorizedBranchIds(),
                daysUntilExpiration <= warningThresholdDays,
                daysUntilExpiration,
                permissions
        );
    }

    @Override
    public TokenIntrospectResponse introspectToken(String token) {
        Optional<JWTClaimsSet> claimsOpt = jwtTokenService.verifyToken(token);
        if (claimsOpt.isEmpty()) {
            return TokenIntrospectResponse.inactive();
        }

        JWTClaimsSet claims = claimsOpt.get();
        @SuppressWarnings("unchecked")
        List<String> branches = (List<String>) claims.getClaim("authorized_branches");

        return new TokenIntrospectResponse(
                true,
                claims.getSubject(),
                (String) claims.getClaim("user_code"),
                (String) claims.getClaim("username"),
                (String) claims.getClaim("email"),
                (String) claims.getClaim("role"),
                (String) claims.getClaim("role_scope"),
                (String) claims.getClaim("business_id"),
                (String) claims.getClaim("assigned_branch_id"),
                branches != null ? branches : Collections.emptyList(),
                claims.getExpirationTime() != null ? claims.getExpirationTime().getTime() / 1000 : null,
                claims.getIssueTime() != null ? claims.getIssueTime().getTime() / 1000 : null,
                claims.getIssuer()
        );
    }

    @Override
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationFailedException("User identity not found."));

        if (!passwordEncoder.matches(request.currentPassword(), user.passwordHash())) {
            auditRepository.logSecurityEvent(userId, user.assignedBranchId(), "PASSWORD_CHANGE_FAILED", "Current password mismatch", "Seguridad", ipAddress, null);
            throw new AuthenticationFailedException("Current password does not match.");
        }

        String newHash = passwordEncoder.encode(request.newPassword());
        userRepository.updatePassword(userId, newHash);

        // Terminate all sessions except any newly initiated one
        sessionService.revokeAllUserSessions(userId, "Password Changed");

        auditRepository.logSecurityEvent(userId, user.assignedBranchId(), "PASSWORD_CHANGED", "Password successfully renewed", "Seguridad", ipAddress, null);
        log.info("Password successfully changed for user {}", user.username());
    }

    @Override
    @Transactional
    public void logout(String refreshToken, String ipAddress) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            String hash = jwtTokenService.hashToken(refreshToken);
            sessionRepository.findActiveSessionByHash(hash).ifPresent(s -> {
                sessionRepository.revokeSession(s.id(), false, "User Logged Out");
                auditRepository.logSecurityEvent(s.userId(), null, "LOGOUT", "User session logged out", "Seguridad", ipAddress, null);
            });
        }
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
