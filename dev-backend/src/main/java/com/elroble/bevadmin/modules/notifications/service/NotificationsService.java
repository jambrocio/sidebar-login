package com.elroble.bevadmin.modules.notifications.service;

import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;

import java.util.List;
import java.util.Map;

/**
 * Contrato de servicio síncrono para el Centro de Notificaciones Operativas.
 */
public interface NotificationsService {

    /**
     * Lista todas las notificaciones del negocio matriz del usuario activo.
     *
     * @param user usuario autenticado
     * @return lista de notificaciones
     */
    List<Map<String, Object>> listNotifications(AuthenticatedUserPrincipal user);

    /**
     * Marca una notificación individual como leída.
     *
     * @param notificationCode código de la notificación (ej. {@code NOT-01})
     * @param user             usuario autenticado
     * @return resumen del cambio de estado
     */
    Map<String, Object> markAsRead(String notificationCode, AuthenticatedUserPrincipal user);

    /**
     * Marca todas las notificaciones pendientes del negocio como leídas.
     *
     * @param user usuario autenticado
     * @return resumen con la cantidad de notificaciones actualizadas
     */
    Map<String, Object> markAllAsRead(AuthenticatedUserPrincipal user);
}
