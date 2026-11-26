package com.elroble.bevadmin.modules.notifications.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Repositorio síncrono de acceso a datos para el Centro de Notificaciones ({@code notificaciones_sistema}).
 */
@Repository
public class NotificationsRepository {

    /** Cliente JDBC síncrono de Spring. */
    private final JdbcClient jdbcClient;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param jdbcClient cliente JDBC conectado a PostgreSQL
     */
    public NotificationsRepository(JdbcClient jdbcClient) {
        this.jdbcClient = jdbcClient;
    }

    /**
     * Consulta todas las notificaciones operativas de la empresa matriz especificada.
     *
     * @param businessId UUID de la empresa matriz
     * @return lista de notificaciones ordenadas desde la más reciente
     */
    public List<Map<String, Object>> findNotificationsByBusinessId(UUID businessId) {
        return jdbcClient.sql("""
                SELECT codigo_notificacion AS id, titulo AS title, descripcion AS description, categoria AS category, icono AS icon,
                       tipo_notificacion AS type, no_leida AS unread, fecha_creacion AS time
                FROM notificaciones_sistema
                WHERE empresa_id = :businessId
                ORDER BY fecha_creacion DESC
                """)
                .param("businessId", businessId)
                .query()
                .listOfRows();
    }

    /**
     * Marca una notificación individual como leída ({@code no_leida = FALSE}).
     *
     * @param businessId       UUID de la empresa matriz
     * @param notificationCode código de la notificación (ej. {@code NOT-01})
     */
    public void markSingleNotificationAsRead(UUID businessId, String notificationCode) {
        jdbcClient.sql("""
                UPDATE notificaciones_sistema
                SET no_leida = FALSE
                WHERE empresa_id = :businessId AND codigo_notificacion = :code
                """)
                .param("businessId", businessId)
                .param("code", notificationCode)
                .update();
    }

    /**
     * Marca todas las notificaciones no leídas de la empresa matriz como leídas.
     *
     * @param businessId UUID de la empresa matriz
     * @return cantidad de filas actualizadas
     */
    public int markAllNotificationsAsRead(UUID businessId) {
        return jdbcClient.sql("""
                UPDATE notificaciones_sistema
                SET no_leida = FALSE
                WHERE empresa_id = :businessId AND no_leida = TRUE
                """)
                .param("businessId", businessId)
                .update();
    }
}
