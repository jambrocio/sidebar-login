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

@Service
public class SessionServiceImpl implements SessionService {

    private static final Logger log = LoggerFactory.getLogger(SessionServiceImpl.class);

    private final SessionRepository sessionRepository;
    private final JwtTokenService jwtTokenService;

    @Value("${auth.security.jwt.refresh-token-expiration-days:7}")
    private long refreshTokenExpirationDays;

    public SessionServiceImpl(SessionRepository sessionRepository, JwtTokenService jwtTokenService) {
        this.sessionRepository = sessionRepository;
        this.jwtTokenService = jwtTokenService;
    }

    @Override
    @Transactional
    public UserSession registerSession(UUID userId, String refreshToken, String ipAddress, String userAgent) {
        UUID sessionId = UUID.randomUUID();
        String hash = jwtTokenService.hashToken(refreshToken);
        OffsetDateTime expiresAt = OffsetDateTime.now().plusDays(refreshTokenExpirationDays);

        String device = resolveDeviceType(userAgent);
        String browser = resolveBrowser(userAgent);
        String location = "Lima, Peru"; // Can be expanded with GeoIP
        BigDecimal lat = new BigDecimal("-12.046374");
        BigDecimal lon = new BigDecimal("-77.042793");

        sessionRepository.createSession(
                sessionId, userId, hash, ipAddress, userAgent, device, browser, location, lat, lon, expiresAt
        );

        log.info("Registered active session {} for user {}", sessionId, userId);
        return new UserSession(
                sessionId, userId, hash, ipAddress, userAgent, device, browser, location, lat, lon,
                OffsetDateTime.now(), false, false, null, null, expiresAt, OffsetDateTime.now()
        );
    }

    @Override
    @Transactional
    public void recordHeartbeat(UUID sessionId) {
        sessionRepository.updateHeartbeat(sessionId);
    }

    @Override
    @Transactional
    public void revokeSession(UUID sessionId, boolean byAdmin, String reason) {
        log.warn("Revoking session {} (admin: {}, reason: {})", sessionId, byAdmin, reason);
        sessionRepository.revokeSession(sessionId, byAdmin, reason);
    }

    @Override
    @Transactional
    public void revokeAllUserSessions(UUID userId, String reason) {
        log.warn("Revoking all active sessions for user {} (reason: {})", userId, reason);
        sessionRepository.revokeAllUserSessions(userId, reason);
    }

    @Override
    public List<Map<String, Object>> getActiveSessions() {
        return sessionRepository.findActiveSessionsConsolidated();
    }

    private String resolveDeviceType(String ua) {
        if (ua == null) return "Unknown Device";
        if (ua.contains("Mobile") || ua.contains("Android") || ua.contains("iPhone")) return "Mobile";
        if (ua.contains("iPad") || ua.contains("Tablet")) return "Tablet";
        if (ua.contains("Windows")) return "Desktop - Windows";
        if (ua.contains("Macintosh") || ua.contains("Mac OS")) return "Desktop - macOS";
        if (ua.contains("Linux")) return "Desktop - Linux";
        return "Desktop";
    }

    private String resolveBrowser(String ua) {
        if (ua == null) return "Unknown Browser";
        if (ua.contains("Edg/")) return "Edge";
        if (ua.contains("Chrome/")) return "Chrome";
        if (ua.contains("Firefox/")) return "Firefox";
        if (ua.contains("Safari/") && !ua.contains("Chrome/")) return "Safari";
        return "Web Browser";
    }
}
