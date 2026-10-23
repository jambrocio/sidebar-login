package com.elroble.bevadmin.modules.notifications.controller;

import com.elroble.bevadmin.modules.notifications.service.NotificationsService;
import com.elroble.bevadmin.security.AuthenticatedUserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Controlador REST síncrono del Centro de Notificaciones ({@code /api/v1/notifications}).
 * <p>
 * Delega toda la lógica de negocio a {@link NotificationsService}.
 * <p>
 * <b>Componente de Angular 21 que alimenta:</b> {@code NotificationsSidebarComponent}.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@Tag(
        name = "11. Centro de Notificaciones",
        description = "Consulta y marcado de lectura de alertas operativas (Stock Crítico, Ventas Mayoristas, Arqueos y Cupones)."
)
public class NotificationsController {

    /** Servicio de negocio síncrono de notificaciones. */
    private final NotificationsService notificationsService;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param notificationsService servicio de notificaciones
     */
    public NotificationsController(NotificationsService notificationsService) {
        this.notificationsService = notificationsService;
    }

    /**
     * Lista todas las notificaciones del Negocio Matriz del usuario autenticado.
     *
     * @param user usuario en sesión
     * @return lista de notificaciones ordenadas de la más reciente a la más antigua
     */
    @GetMapping
    @Operation(
            summary = "Listar alertas del Centro de Notificaciones",
            description = "Consulta la tabla 'system_notifications' para el negocio del usuario activo."
    )
    @ApiResponse(responseCode = "200", description = "Bandeja de notificaciones obtenida correctamente.")
    public List<Map<String, Object>> listNotifications(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return notificationsService.listNotifications(user);
    }

    /**
     * Marca una notificación individual como leída.
     *
     * @param notificationCode código de la notificación (ej. {@code NOT-01})
     * @param user             usuario autenticado
     * @return confirmación del cambio de estado
     */
    @PatchMapping("/{notificationCode}/read")
    @Operation(
            summary = "Marcar una notificación individual como leída",
            description = "Actualiza 'is_unread = FALSE' en la tabla 'system_notifications' para el código indicado."
    )
    @ApiResponse(responseCode = "200", description = "Notificación marcada como leída.")
    public Map<String, Object> markAsRead(
            @Parameter(description = "Código de la notificación", example = "NOT-01")
            @PathVariable String notificationCode,
            @AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return notificationsService.markAsRead(notificationCode, user);
    }

    /**
     * Marca todas las notificaciones pendientes del negocio como leídas en una sola operación.
     *
     * @param user usuario autenticado
     * @return cantidad de notificaciones actualizadas
     */
    @PatchMapping("/read-all")
    @Operation(
            summary = "Marcar todas las notificaciones como leídas",
            description = "Actualiza 'is_unread = FALSE' para todas las alertas pendientes del negocio activo."
    )
    @ApiResponse(responseCode = "200", description = "Todas las notificaciones fueron marcadas como leídas.")
    public Map<String, Object> markAllAsRead(@AuthenticationPrincipal AuthenticatedUserPrincipal user) {
        return notificationsService.markAllAsRead(user);
    }
}
