package com.elroble.bevadmin.modules.sessions.service;

import com.elroble.bevadmin.modules.sessions.dto.ActiveSessionDto;
import com.elroble.bevadmin.modules.sessions.dto.HeartbeatResponse;
import com.elroble.bevadmin.modules.sessions.repository.SessionRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación imperativa y síncrona del servicio de auditoría de sesiones ({@link SessionService}).
 */
@Service
public class SessionServiceImpl implements SessionService {

    private final SessionRepository sessionRepository;

    public SessionServiceImpl(SessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    @Override
    public List<ActiveSessionDto> listActiveSessions() {
        return sessionRepository.findAllActiveSessions();
    }

    @Override
    @Transactional
    public void recordLoginSession(
            UUID userId,
            UUID branchId,
            String username,
            String token,
            HttpServletRequest request) {

        String ip = extractClientIp(request);
        String userAgent = request != null ? request.getHeader("User-Agent") : "Unknown";
        String browser = detectBrowser(userAgent);
        String device = detectDevice(userAgent);
        LocationGeo geo = estimateLocation(ip);
        String tokenHash = hashToken(token);

        // Guarda o actualiza la sesión
        sessionRepository.createSession(
                userId,
                tokenHash,
                ip,
                userAgent,
                browser,
                device,
                geo.locationName(),
                geo.latitude(),
                geo.longitude()
        );

        // Registra evento de auditoría inmutable
        String metadata = String.format(
                "{\"ip\": \"%s\", \"browser\": \"%s\", \"device\": \"%s\", \"location\": \"%s\"}",
                ip, browser, device, geo.locationName()
        );

        sessionRepository.recordAuthAuditLog(
                userId,
                branchId,
                "USER_LOGIN_SUCCESS",
                "Inicio de sesión exitoso desde " + ip + " (" + browser + " en " + device + ") en " + geo.locationName(),
                "Seguridad",
                ip,
                metadata
        );
    }

    @Override
    @Transactional
    public HeartbeatResponse processHeartbeat(String token, HttpServletRequest request) {
        if (token == null || token.isBlank()) {
            return new HeartbeatResponse(false, true, "DISCONNECTED", "Token no proporcionado");
        }

        String tokenHash = hashToken(token);
        boolean isRevoked = sessionRepository.isSessionRevoked(tokenHash);

        if (isRevoked) {
            return new HeartbeatResponse(
                    false,
                    true,
                    "DISCONNECTED",
                    "Su sesión ha sido finalizada remotamente por un Administrador de Seguridad."
            );
        }

        // Actualiza el timestamp del último latido para mantener semáforo en 🟢 ONLINE
        sessionRepository.updateLastActivity(tokenHash);

        return new HeartbeatResponse(
                true,
                false,
                "ONLINE",
                "Latido registrado exitosamente. Sesión activa."
        );
    }

    @Override
    public boolean isTokenRevoked(String token) {
        if (token == null || token.isBlank()) {
            return true;
        }
        return sessionRepository.isSessionRevoked(hashToken(token));
    }

    @Override
    @Transactional
    public Map<String, Object> revokeSession(UUID sessionId, String adminUsername, String reason) {
        String finalReason = (reason != null && !reason.isBlank())
                ? reason
                : "Cierre forzado de sesión por Administrador (" + adminUsername + ")";

        ActiveSessionDto session = sessionRepository.findSessionById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Sesión no encontrada con ID: " + sessionId));

        int rows = sessionRepository.revokeSession(sessionId, adminUsername, finalReason);

        // Registra en la bitácora inmutable
        sessionRepository.recordAuthAuditLog(
                session.userId(),
                null,
                "SESSION_REMOTE_REVOKE",
                "El Administrador '" + adminUsername + "' cerró remotamente la sesión de '" +
                        session.username() + "' desde IP " + session.ipAddress() + ". Motivo: " + finalReason,
                "Seguridad",
                session.ipAddress(),
                "{\"sessionId\": \"" + sessionId + "\", \"revokedBy\": \"" + adminUsername + "\"}"
        );

        return Map.of(
                "success", rows > 0,
                "sessionId", sessionId,
                "message", "Sesión revocada exitosamente. El usuario será expulsado en su próximo latido.",
                "revokedReason", finalReason
        );
    }

    @Override
    @Transactional
    public Map<String, Object> lockUserAndRevokeSessions(UUID userId, String adminUsername, String reason) {
        String finalReason = (reason != null && !reason.isBlank())
                ? reason
                : "Bloqueo preventivo de seguridad ejecutado por " + adminUsername;

        // 1. Bloquea la cuenta
        sessionRepository.lockUserAccount(userId, adminUsername, finalReason);

        // 2. Revoca todas sus sesiones activas
        int sessionsRevoked = sessionRepository.revokeAllSessionsForUser(userId, adminUsername, finalReason);

        // 3. Escribe en bitácora de auditoría
        sessionRepository.recordAuthAuditLog(
                userId,
                null,
                "USER_LOCKED_BY_ADMIN",
                "Cuenta de usuario bloqueada administrativamente por '" + adminUsername +
                        "'. Se cerraron " + sessionsRevoked + " sesión(es) activa(s). Motivo: " + finalReason,
                "Seguridad",
                "127.0.0.1",
                "{\"userId\": \"" + userId + "\", \"lockedBy\": \"" + adminUsername + "\", \"sessionsRevoked\": " + sessionsRevoked + "}"
        );

        return Map.of(
                "success", true,
                "userId", userId,
                "message", "Cuenta bloqueada y todas sus sesiones han sido revocadas.",
                "sessionsRevoked", sessionsRevoked
        );
    }

    // =========================================================================
    // MÉTODOS AUXILIARES DE ANÁLISIS DE RED Y USER-AGENT
    // =========================================================================

    private String extractClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";

        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("X-Real-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        if (ip == null || ip.isEmpty() || "0:0:0:0:0:0:0:1".equals(ip) || "localhost".equalsIgnoreCase(ip)) {
            ip = "127.0.0.1";
        }
        return ip;
    }

    private String detectBrowser(String userAgent) {
        if (userAgent == null) return "Navegador Desconocido";
        String ua = userAgent.toLowerCase();

        if (ua.contains("headless") || ua.contains("tor")) return "Tor Browser / Headless";
        if (ua.contains("edg/")) return "Microsoft Edge 123";
        if (ua.contains("chrome/") && !ua.contains("edg")) return "Google Chrome 122";
        if (ua.contains("firefox/")) return "Mozilla Firefox 125";
        if (ua.contains("safari/") && !ua.contains("chrome")) return "Apple Safari 17.4";
        if (ua.contains("opr/") || ua.contains("opera/")) return "Opera 108";
        return "Navegador Web Estándar";
    }

    private String detectDevice(String userAgent) {
        if (userAgent == null) return "Dispositivo Desconocido";
        String ua = userAgent.toLowerCase();

        if (ua.contains("windows nt 10.0")) return "Desktop - Windows 11 / 10";
        if (ua.contains("macintosh") || ua.contains("mac os x")) return "Laptop - macOS Sonoma";
        if (ua.contains("android")) return "Mobile - Android 14";
        if (ua.contains("iphone") || ua.contains("ipad")) return "Mobile - Apple iOS 17";
        if (ua.contains("linux")) return "Desktop - Linux";
        return "Dispositivo Desktop";
    }

    private LocationGeo estimateLocation(String ip) {
        if (ip == null || ip.startsWith("127.0.") || ip.equals("localhost") || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
            return new LocationGeo("Lima, Perú (Red Local / Sede Central)", new BigDecimal("-12.046374"), new BigDecimal("-77.042793"));
        }
        if (ip.startsWith("190.236")) {
            return new LocationGeo("Lima, Perú (Sede Central Matriz)", new BigDecimal("-12.046374"), new BigDecimal("-77.042793"));
        }
        if (ip.startsWith("200.48")) {
            return new LocationGeo("Arequipa, Perú (Sede Yanahuara)", new BigDecimal("-16.398890"), new BigDecimal("-71.535000"));
        }
        if (ip.startsWith("181.65")) {
            return new LocationGeo("Trujillo, Perú (Sede Centro)", new BigDecimal("-8.111670"), new BigDecimal("-79.028600"));
        }
        // IP foránea desconocida
        return new LocationGeo("Ubicación No Reconocida (" + ip + ")", new BigDecimal("59.934280"), new BigDecimal("30.335099"));
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(token.hashCode());
        }
    }

    private record LocationGeo(String locationName, BigDecimal latitude, BigDecimal longitude) {}
}
