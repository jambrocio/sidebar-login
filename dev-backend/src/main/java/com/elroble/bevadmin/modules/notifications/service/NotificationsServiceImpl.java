package com.elroble.bevadmin.modules.notifications.service;

import com.elroble.bevadmin.modules.notifications.repository.NotificationsRepository;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Implementación imperativa y síncrona del servicio de Notificaciones ({@link NotificationsService}).
 */
@Service
public class NotificationsServiceImpl implements NotificationsService {

    /** Repositorio síncrono de notificaciones. */
    private final NotificationsRepository notificationsRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param notificationsRepository repositorio de notificaciones
     */
    public NotificationsServiceImpl(NotificationsRepository notificationsRepository) {
        this.notificationsRepository = notificationsRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> listNotifications(AuthenticatedUserPrincipal user) {
        return notificationsRepository.findNotificationsByBusinessId(user.businessId());
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> markAsRead(String notificationCode, AuthenticatedUserPrincipal user) {
        notificationsRepository.markSingleNotificationAsRead(user.businessId(), notificationCode);
        return Map.of("id", notificationCode, "unread", false);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public Map<String, Object> markAllAsRead(AuthenticatedUserPrincipal user) {
        int updated = notificationsRepository.markAllNotificationsAsRead(user.businessId());
        return Map.of("updatedCount", updated);
    }
}
