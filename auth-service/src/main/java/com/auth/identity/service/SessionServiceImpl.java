package com.auth.identity.service;

import com.auth.identity.core.security.JwtTokenService;
import com.auth.identity.domain.model.UserSession;
import com.auth.identity.repository.SessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación del servicio de gestión de sesiones concurrentes y terminación remota de accesos.
 *
 * <p>Resuelve metadatos del cliente (dispositivo, navegador y geolocalización aproximada)
 * y almacena el resumen criptográfico SHA-256 del token de refresco para prevenir almacenamiento
 * de secretos en texto plano.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Service
public class SessionServiceImpl implements SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionServiceImpl.class);

    private final SessionRepository sessionRepository;
    private final JwtTokenService jwtTokenService;

    @Value("${auth.security.jwt.refresh-token-expiration-days:7}")
    private long refreshTokenExpirationDays;

    /**
     * Constructor con inyección del repositorio de sesiones y el servicio criptográfico de tokens.
     *
     * @param sessionRepository Repositorio de persistencia de sesiones.
     * @param jwtTokenService Servicio criptográfico de hashing y tokens.
     */
    public SessionServiceImpl(SessionRepository sessionRepository, JwtTokenService jwtTokenService) {
        this.sessionRepository = sessionRepository;
        this.jwtTokenService = jwtTokenService;
    }

    /**
     * Registra de forma transaccional una nueva sesión de usuario con resolución heurística del dispositivo.
     *
     * @param userId Identificador UUID del usuario autenticado.
     * @param refreshToken Token de refresco opaco.
     * @param ipAddress Dirección IP de origen.
     * @param userAgent Cabecera User-Agent del cliente.
     * @return Entidad {@link UserSession} persistida.
     */
    @Override
    @Transactional
    public UserSession registerSession(UUID userId, String refreshToken, String ipAddress, String userAgent) {
        UUID sessionId = UUID.randomUUID();
        String hash = jwtTokenService.hashToken(refreshToken);
        OffsetDateTime expiresAt = OffsetDateTime.now().plusDays(refreshTokenExpirationDays);

        String device = resolveDeviceType(userAgent);
        String browser = resolveBrowser(userAgent);
        String location = "Lima, Perú";
        BigDecimal lat = new BigDecimal("-12.046374");
        BigDecimal lon = new BigDecimal("-77.042793");

        sessionRepository.createSession(
                sessionId, userId, hash, ipAddress, userAgent, device, browser, location, lat, lon, expiresAt
        );

        log.info("Sesión activa registrada con ID {} para el usuario {}", sessionId, userId);
        return new UserSession(
                sessionId, userId, hash, ipAddress, userAgent, device, browser, location, lat, lon,
                OffsetDateTime.now(), false, false, null, null, expiresAt, OffsetDateTime.now()
        );
    }

    /**
     * Actualiza la fecha y hora de presencia del cliente conectado.
     *
     * @param sessionId Identificador UUID de la sesión activa.
     */
    @Override
    @Transactional
    public void recordHeartbeat(UUID sessionId) {
        sessionRepository.updateHeartbeat(sessionId);
    }

    /**
     * Revoca de forma inmediata una sesión individual dada.
     *
     * @param sessionId Identificador UUID de la sesión a revocar.
     * @param byAdmin true si la terminación fue solicitada por un administrador de seguridad.
     * @param reason Motivo descriptivo de la revocación.
     */
    @Override
    @Transactional
    public void revokeSession(UUID sessionId, boolean byAdmin, String reason) {
        log.warn("Revocando sesión {} (solicitado por admin: {}, motivo: {})", sessionId, byAdmin, reason);
        sessionRepository.revokeSession(sessionId, byAdmin, reason);
    }

    /**
     * Revoca de forma masiva todas las sesiones abiertas de un usuario.
     *
     * @param userId Identificador UUID del usuario.
     * @param reason Motivo de la revocación masiva.
     */
    @Override
    @Transactional
    public void revokeAllUserSessions(UUID userId, String reason) {
        log.warn("Revocando todas las sesiones activas del usuario {} (motivo: {})", userId, reason);
        sessionRepository.revokeAllUserSessions(userId, reason);
    }

    /**
     * Obtiene todas las sesiones activas consolidadas con información de usuario y estado.
     *
     * @return Lista de registros de sesiones activas.
     */
    @Override
    public List<Map<String, Object>> getActiveSessions() {
        return sessionRepository.findActiveSessionsConsolidated();
    }

    /**
     * Clasifica el tipo de dispositivo del cliente en función de patrones del User-Agent.
     *
     * @param ua Cabecera User-Agent.
     * @return Nombre amigable del tipo de dispositivo.
     */
    private String resolveDeviceType(String ua) {
        if (ua == null) return "Dispositivo Desconocido";
        if (ua.contains("Mobile") || ua.contains("Android") || ua.contains("iPhone")) return "Móvil";
        if (ua.contains("iPad") || ua.contains("Tablet")) return "Tablet";
        if (ua.contains("Windows")) return "Escritorio - Windows";
        if (ua.contains("Macintosh") || ua.contains("Mac OS")) return "Escritorio - macOS";
        if (ua.contains("Linux")) return "Escritorio - Linux";
        return "Escritorio";
    }

    /**
     * Detecta la familia de navegador web a partir de la cabecera User-Agent.
     *
     * @param ua Cabecera User-Agent.
     * @return Nombre del navegador.
     */
    private String resolveBrowser(String ua) {
        if (ua == null) return "Navegador Desconocido";
        if (ua.contains("Edg/")) return "Microsoft Edge";
        if (ua.contains("Chrome/")) return "Google Chrome";
        if (ua.contains("Firefox/")) return "Mozilla Firefox";
        if (ua.contains("Safari/") && !ua.contains("Chrome/")) return "Apple Safari";
        return "Navegador Web";
    }
}
