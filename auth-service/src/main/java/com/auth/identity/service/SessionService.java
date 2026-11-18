package com.auth.identity.service;

import com.auth.identity.domain.model.UserSession;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service interface for concurrent session governance, heartbeat maintenance, and Kill Session.
 */
public interface SessionService {

    UserSession registerSession(UUID userId, String refreshToken, String ipAddress, String userAgent);

    void recordHeartbeat(UUID sessionId);

    void revokeSession(UUID sessionId, boolean byAdmin, String reason);

    void revokeAllUserSessions(UUID userId, String reason);

    List<Map<String, Object>> getActiveSessions();
}
