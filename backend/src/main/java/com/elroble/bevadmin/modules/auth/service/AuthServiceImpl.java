package com.elroble.bevadmin.modules.auth.service;

import com.elroble.bevadmin.common.exception.BusinessRuleException;
import com.elroble.bevadmin.modules.auth.dto.ChangePasswordRequest;
import com.elroble.bevadmin.modules.auth.dto.LoginRequest;
import com.elroble.bevadmin.modules.auth.dto.LoginResponse;
import com.elroble.bevadmin.modules.auth.repository.AuthRepository;
import com.elroble.bevadmin.modules.sessions.service.SessionService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import com.elroble.bevadmin.security.JwtTokenService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.CredentialsExpiredException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

/**
 * Implementación imperativa y síncrona del servicio de Autenticación ({@link AuthService}).
 * <p>
 * Aplica de forma secuencial y predecible:
 * <ul>
 *   <li>Comprobación de existencia de usuario.</li>
 *   <li>Bloqueo de cuentas por estado {@code LOCKED} o exceso de intentos fallidos (máximo 5).</li>
 *   <li>Validación de cuentas inactivas ({@code INACTIVE}).</li>
 *   <li>Verificación criptográfica de contraseña (BCrypt).</li>
 *   <li>Expiración obligatoria de contraseña (rotación cada 90 días o cambio obligatorio) mediante {@link CredentialsExpiredException}.</li>
 *   <li>Advertencia preventiva para contraseñas próximas a expirar (7 días o menos).</li>
 *   <li>Renovación de contraseñas y desbloqueo transaccional.</li>
 * </ul>
 */
@Service
public class AuthServiceImpl implements AuthService {

    /** Máximo de intentos fallidos permitidos antes del bloqueo automático de cuenta. */
    private static final int MAX_FAILED_ATTEMPTS = 5;

    /** Umbral de días para alertar que una contraseña está próxima a vencer. */
    private static final int WARNING_THRESHOLD_DAYS = 7;

    /** Repositorio síncrono de usuarios y contexto organizacional. */
    private final AuthRepository authRepository;

    /** Servicio criptográfico emisor de tokens JWT. */
    private final JwtTokenService jwtTokenService;

    /** Codificador seguro de contraseñas con BCrypt. */
    private final PasswordEncoder passwordEncoder;

    /** Servicio de auditoría de red y control de sesiones activas. */
    private final SessionService sessionService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param authRepository  repositorio de autenticación
     * @param jwtTokenService servicio generador de tokens JWT
     * @param passwordEncoder codificador BCrypt de contraseñas
     * @param sessionService  servicio de auditoría y sesiones de usuario
     */
    public AuthServiceImpl(
            AuthRepository authRepository,
            JwtTokenService jwtTokenService,
            PasswordEncoder passwordEncoder,
            SessionService sessionService) {
        this.authRepository = authRepository;
        this.jwtTokenService = jwtTokenService;
        this.passwordEncoder = passwordEncoder;
        this.sessionService = sessionService;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public LoginResponse authenticate(LoginRequest request) {
        return authenticate(request, null);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public LoginResponse authenticate(LoginRequest request, HttpServletRequest httpRequest) {
        // 1. Busca el registro de seguridad del usuario
        AuthRepository.UserSecurityRecord secRecord = authRepository
                .findSecurityRecordByLogin(request.username())
                .orElseThrow(() -> new BadCredentialsException("Credenciales inválidas o cuenta no registrada."));

        // 2. Comprueba si la cuenta está bloqueada administrativamente o por intentos fallidos
        if ("LOCKED".equalsIgnoreCase(secRecord.status()) || secRecord.failedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
            throw new LockedException("La cuenta de usuario se encuentra bloqueada por motivos de seguridad " +
                    "(exceso de intentos fallidos o bloqueo administrativo). Por favor comuníquese con el administrador.");
        }

        // 3. Comprueba si la cuenta está inactiva o pendiente
        if ("INACTIVE".equalsIgnoreCase(secRecord.status())) {
            throw new DisabledException("La cuenta de usuario se encuentra inactiva en el sistema.");
        }

        // 4. Valida exclusivamente mediante verificación criptográfica BCrypt (sin comparaciones en texto plano ni claves maestras)
        boolean passwordMatches = secRecord.passwordHash() != null
                && secRecord.passwordHash().startsWith("$2")
                && passwordEncoder.matches(request.password(), secRecord.passwordHash());

        if (!passwordMatches) {
            int currentAttempts = authRepository.recordFailedLoginAttempt(secRecord.id());
            if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
                throw new LockedException("Su cuenta ha sido bloqueada tras " + MAX_FAILED_ATTEMPTS +
                        " intentos fallidos consecutivos. Contacte con el área de soporte.");
            }
            int remaining = MAX_FAILED_ATTEMPTS - currentAttempts;
            throw new BadCredentialsException("Contraseña incorrecta. Le restan " + remaining +
                    " intento(s) antes del bloqueo automático de su cuenta.");
        }

        // 5. Evalúa el estado de vigencia y expiración de la contraseña
        OffsetDateTime expiresAt = secRecord.passwordExpiresAt() != null
                ? secRecord.passwordExpiresAt()
                : OffsetDateTime.now().plusDays(90);

        long daysUntilExpiration = ChronoUnit.DAYS.between(LocalDate.now(), expiresAt.toLocalDate());
        boolean isExpiredOrMustChange = secRecord.mustChangePassword() || daysUntilExpiration < 0;

        // Si la contraseña expiró o es de cambio obligatorio (Clave Temporal / Expirada):
        // Se lanza CredentialsExpiredException para obligar al usuario a renovarla en el modal
        if (isExpiredOrMustChange) {
            throw new CredentialsExpiredException("Su contraseña ha expirado o requiere cambio obligatorio " +
                    "según la política de seguridad corporativa (90 días). Debe renovar su clave para poder ingresar.");
        }

        // Determina el estado de vigencia para el retorno
        String passwordStatus = (daysUntilExpiration <= WARNING_THRESHOLD_DAYS)
                ? "Por Expirar"
                : "Vigente";

        // 6. Registro de autenticación exitosa (restablece intentos fallidos a 0 y actualiza timestamp)
        authRepository.recordSuccessfulLogin(secRecord.id());

        // 7. Recupera el contexto multi-local del usuario para construir el token JWT
        AuthenticatedUserPrincipal principal = authRepository
                .findActiveUserByLoginOrEmail(secRecord.username())
                .orElseThrow(() -> new BadCredentialsException("No fue posible cargar el perfil organizacional del usuario."));

        String accessToken = jwtTokenService.generateAccessToken(principal);

        // 8. Registra la sesión activa con auditoría de red (IP, User-Agent, Ubicación)
        sessionService.recordLoginSession(
                principal.userId(),
                principal.assignedBranchId(),
                principal.username(),
                accessToken,
                httpRequest
        );

        return new LoginResponse(
                accessToken,
                principal,
                passwordStatus,
                (int) daysUntilExpiration,
                expiresAt.toLocalDate().toString(),
                false
        );
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public LoginResponse changePassword(ChangePasswordRequest request) {
        AuthRepository.UserSecurityRecord secRecord = authRepository
                .findSecurityRecordByLogin(request.username())
                .orElseThrow(() -> new BadCredentialsException("Usuario no encontrado o credenciales inválidas."));

        if ("LOCKED".equalsIgnoreCase(secRecord.status()) || secRecord.failedLoginAttempts() >= MAX_FAILED_ATTEMPTS) {
            throw new LockedException("La cuenta de usuario se encuentra bloqueada por motivos de seguridad. Contacte con el administrador.");
        }

        if ("INACTIVE".equalsIgnoreCase(secRecord.status())) {
            throw new DisabledException("La cuenta de usuario se encuentra inactiva en el sistema.");
        }

        // Valida exclusivamente contra el hash BCrypt almacenado
        boolean matches = secRecord.passwordHash() != null
                && secRecord.passwordHash().startsWith("$2")
                && passwordEncoder.matches(request.currentPassword(), secRecord.passwordHash());

        if (!matches) {
            int currentAttempts = authRepository.recordFailedLoginAttempt(secRecord.id());
            if (currentAttempts >= MAX_FAILED_ATTEMPTS) {
                throw new LockedException("Su cuenta ha sido bloqueada tras " + MAX_FAILED_ATTEMPTS +
                        " intentos fallidos consecutivos. Contacte con el área de soporte.");
            }
            throw new BadCredentialsException("La contraseña actual proporcionada es incorrecta.");
        }

        if (request.newPassword().equals(request.currentPassword())
                || passwordEncoder.matches(request.newPassword(), secRecord.passwordHash())) {
            throw new BusinessRuleException("La nueva contraseña debe ser diferente a la contraseña actual.");
        }

        // Revoca todas las sesiones activas previas antes de emitir la nueva credencial (OWASP A07)
        sessionService.revokeAllSessionsOnPasswordChange(secRecord.id());

        // Genera el nuevo hash BCrypt, extiende la vigencia 90 días y guarda en BD
        String newHash = passwordEncoder.encode(request.newPassword());
        authRepository.updatePasswordHash(secRecord.id(), newHash);

        // Recupera el contexto de seguridad actualizado para auto-iniciar sesión
        AuthenticatedUserPrincipal principal = authRepository
                .findActiveUserByLoginOrEmail(secRecord.username())
                .orElseThrow(() -> new BadCredentialsException("Error recuperando la sesión tras el cambio de clave."));

        String accessToken = jwtTokenService.generateAccessToken(principal);

        // Registra la nueva sesión activa con auditoría de red
        sessionService.recordLoginSession(
                principal.userId(),
                principal.assignedBranchId(),
                principal.username(),
                accessToken,
                null
        );

        return new LoginResponse(
                accessToken,
                principal,
                "Vigente",
                90,
                LocalDate.now().plusDays(90).toString(),
                false
        );
    }
}
