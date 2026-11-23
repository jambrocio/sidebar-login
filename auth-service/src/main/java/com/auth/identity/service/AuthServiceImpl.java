package com.auth.identity.service;

import com.auth.identity.core.exception.AccountLockedException;
import com.auth.identity.core.exception.AuthenticationFailedException;
import com.auth.identity.core.exception.BusinessRuleException;
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

/**
 * Implementación del servicio centralizado de autenticación empresarial.
 *
 * <p>Aplica control estricto de políticas de seguridad:
 * <ul>
 *   <li>Bloqueo automático de cuentas tras 5 intentos fallidos consecutivos.</li>
 *   <li>Verificación criptográfica de contraseñas mediante algoritmo BCrypt.</li>
 *   <li>Expiración mandataria de contraseñas cada 90 días o bandera forzada.</li>
 *   <li>Generación de tokens asimétricos RS256 con reclamos empresariales y de sucursal.</li>
 *   <li>Rotación obligatoria de tokens de refresco y registro inmutable en auditoría.</li>
 * </ul>
 * </p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
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

    /**
     * Constructor con inyección de dependencias para los repositorios y servicios de seguridad.
     *
     * @param userRepository Repositorio de usuarios.
     * @param sessionRepository Repositorio de sesiones.
     * @param rbacRepository Repositorio de RBAC y menús.
     * @param auditRepository Repositorio de auditoría de seguridad.
     * @param sessionService Servicio de gestión de sesiones concurrentes.
     * @param jwtTokenService Servicio criptográfico de tokens JWT.
     * @param passwordEncoder Codificador de contraseñas BCrypt.
     */
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

    /**
     * Ejecuta el flujo transaccional de inicio de sesión con validación de credenciales y generación de tokens.
     *
     * @param request Solicitud de autenticación con identificador y contraseña.
     * @param httpRequest Solicitud HTTP para obtención de IP de origen y cabecera de cliente.
     * @return Respuesta con par de tokens, información de perfil y menú autorizado.
     */
    @Override
    @Transactional
    public LoginResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        String login = request.username().trim();
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");

        User user = userRepository.findUserByLogin(login)
                .orElseThrow(() -> {
                    log.warn("Intento de acceso para identificador inexistente: {}", login);
                    auditRepository.logSecurityEvent(null, null, "LOGIN_FAILED", "Usuario no encontrado: " + login, "Seguridad", ip, null);
                    return new AuthenticationFailedException("Credenciales inválidas.");
                });

        // 1. Verificar política de bloqueo de cuenta
        if (user.isLocked() || user.failedLoginAttempts() >= maxFailedAttempts) {
            log.warn("Acceso bloqueado por cuenta inhabilitada o exceso de intentos: {}", user.username());
            auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "ACCOUNT_LOCKED", "Intento de acceso a cuenta bloqueada", "Seguridad", ip, null);
            throw new AccountLockedException("Su cuenta se encuentra bloqueada por políticas de seguridad. Contacte al administrador.");
        }

        // 2. Verificar estado activo
        if (!user.isActive()) {
            log.warn("Acceso denegado a usuario inactivo: {}", user.username());
            throw new AuthenticationFailedException("La cuenta de usuario está desactivada temporalmente.");
        }

        // 3. Verificación criptográfica de contraseña (BCrypt)
        if (!passwordEncoder.matches(request.password(), user.passwordHash())) {
            userRepository.incrementFailedAttempts(user.id());
            int currentAttempts = user.failedLoginAttempts() + 1;
            log.warn("Discrepancia de contraseña para el usuario {} (intentos fallidos: {}/{})", user.username(), currentAttempts, maxFailedAttempts);

            auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "LOGIN_FAILED", "Contraseña errónea (intento " + currentAttempts + ")", "Seguridad", ip, null);

            if (currentAttempts >= maxFailedAttempts) {
                throw new AccountLockedException("Ha alcanzado el límite máximo de intentos fallidos. Su cuenta ha sido bloqueada por seguridad.");
            }
            throw new AuthenticationFailedException("Credenciales inválidas.");
        }

        // 4. Verificar política de caducidad de contraseña (90 días o rotación obligatoria)
        OffsetDateTime now = OffsetDateTime.now();
        boolean isExpired = user.passwordExpiresAt() != null && user.passwordExpiresAt().isBefore(now);
        if (user.mustChangePassword() || isExpired) {
            log.info("Credenciales vencidas para el usuario {}. Obligado a actualizar contraseña.", user.username());
            auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "CREDENTIALS_EXPIRED", "Credenciales vencidas o cambio mandatorio", "Seguridad", ip, null);
            throw new CredentialsExpiredException("Su contraseña ha caducado o requiere un cambio obligatorio. Por favor actualice su clave.");
        }

        // 5. Autenticación exitosa: reiniciar intentos fallidos
        userRepository.resetFailedAttempts(user.id());

        // 6. Construir principal y generar tokens criptográficos
        AuthenticatedUserPrincipal principal = userRepository.findActivePrincipalByLoginOrEmail(login)
                .orElseThrow(() -> new AuthenticationFailedException("Fallo al construir el contexto del principal de seguridad."));

        String accessToken = jwtTokenService.generateAccessToken(principal);
        String refreshToken = jwtTokenService.generateOpaqueRefreshToken();

        // 7. Registrar sesión activa y bitácora de auditoría
        sessionService.registerSession(user.id(), refreshToken, ip, userAgent);
        auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "LOGIN_SUCCESS", "Autenticación exitosa", "Seguridad", ip, null);

        // 8. Calcular advertencia de caducidad próxima
        long daysUntilExpiration = user.passwordExpiresAt() != null
                ? Math.max(0, ChronoUnit.DAYS.between(now, user.passwordExpiresAt()))
                : 90;
        boolean expiringSoon = daysUntilExpiration <= warningThresholdDays;

        // 9. Cargar menú dinámico de permisos efectivos
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

    /**
     * Rota el token de refresco validando la sesión activa y emite un nuevo token de acceso RS256.
     *
     * @param refreshToken Token de refresco recibido.
     * @param httpRequest Solicitud HTTP entrante.
     * @return Nueva respuesta con par de tokens renovados.
     */
    @Override
    @Transactional
    public LoginResponse refreshToken(String refreshToken, HttpServletRequest httpRequest) {
        String ip = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        String hash = jwtTokenService.hashToken(refreshToken);

        UserSession session = sessionRepository.findActiveSessionByHash(hash)
                .orElseThrow(() -> {
                    log.warn("Token de refresco inválido o revocado desde la IP: {}", ip);
                    return new AuthenticationFailedException("El token de refresco es inválido o ha sido revocado.");
                });

        User user = userRepository.findById(session.userId())
                .orElseThrow(() -> new AuthenticationFailedException("Identidad de usuario no encontrada."));

        if (!user.isActive()) {
            throw new AuthenticationFailedException("La cuenta de usuario está desactivada.");
        }

        // Invalidar la sesión previa y generar nuevo par de tokens (Rotación de Tokens)
        sessionRepository.revokeSession(session.id(), false, "Token Rotado");

        AuthenticatedUserPrincipal principal = userRepository.findActivePrincipalByLoginOrEmail(user.username())
                .orElseThrow(() -> new AuthenticationFailedException("Fallo al cargar el principal del usuario."));

        String newAccessToken = jwtTokenService.generateAccessToken(principal);
        String newRefreshToken = jwtTokenService.generateOpaqueRefreshToken();

        sessionService.registerSession(user.id(), newRefreshToken, ip, userAgent);
        auditRepository.logSecurityEvent(user.id(), user.assignedBranchId(), "TOKEN_REFRESH", "Token de refresco rotado exitosamente", "Seguridad", ip, null);

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

    /**
     * Realiza introspección RFC 7662 sobre el token de acceso provisto.
     *
     * @param token Cadena del token JWT.
     * @return Respuesta estructurada con los reclamos y vigencia del token.
     */
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

    /**
     * Cambia la contraseña del usuario previa comprobación de la contraseña actual,
     * reiniciando el ciclo de vigencia y cerrando las demás sesiones abiertas.
     *
     * @param userId Identificador UUID del usuario.
     * @param request Carga útil con la contraseña actual y la nueva.
     * @param ipAddress Dirección IP de red para la traza de seguridad.
     */
    @Override
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request, String ipAddress) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new AuthenticationFailedException("Identidad de usuario no encontrada."));

        if (!passwordEncoder.matches(request.currentPassword(), user.passwordHash())) {
            auditRepository.logSecurityEvent(userId, user.assignedBranchId(), "PASSWORD_CHANGE_FAILED", "Contraseña actual incorrecta", "Seguridad", ipAddress, null);
            throw new AuthenticationFailedException("La contraseña actual proporcionada no coincide.");
        }

        if (passwordEncoder.matches(request.newPassword(), user.passwordHash()) || request.newPassword().equals(request.currentPassword())) {
            auditRepository.logSecurityEvent(userId, user.assignedBranchId(), "PASSWORD_CHANGE_REJECTED", "Intento de reutilizar la misma contraseña activa", "Seguridad", ipAddress, null);
            throw new BusinessRuleException("La nueva contraseña no puede ser idéntica a la contraseña actual por políticas de rotación de seguridad.");
        }

        String newHash = passwordEncoder.encode(request.newPassword());
        userRepository.updatePassword(userId, newHash);

        // Terminar todas las sesiones concurrentes para forzar nuevo login
        sessionService.revokeAllUserSessions(userId, "Cambio de Contraseña");

        auditRepository.logSecurityEvent(userId, user.assignedBranchId(), "PASSWORD_CHANGED", "Contraseña actualizada satisfactoriamente", "Seguridad", ipAddress, null);
        log.info("Contraseña actualizada exitosamente para el usuario {}", user.username());
    }

    /**
     * Cierra la sesión activa revocando el token de refresco y registrando el suceso en auditoría.
     *
     * @param refreshToken Token de refresco a dar de baja.
     * @param ipAddress Dirección IP del cliente.
     */
    @Override
    @Transactional
    public void logout(String refreshToken, String ipAddress) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            String hash = jwtTokenService.hashToken(refreshToken);
            sessionRepository.findActiveSessionByHash(hash).ifPresent(s -> {
                sessionRepository.revokeSession(s.id(), false, "Cierre Voluntario de Sesión");
                auditRepository.logSecurityEvent(s.userId(), null, "LOGOUT", "Cierre de sesión de usuario registrado", "Seguridad", ipAddress, null);
            });
        }
    }

    /**
     * Extrae de forma segura la dirección IP real del cliente, considerando encabezados de proxies inversos.
     *
     * @param request Solicitud HTTP entrante.
     * @return Dirección IP del cliente.
     */
    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf != null && !xf.isBlank()) {
            return xf.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
