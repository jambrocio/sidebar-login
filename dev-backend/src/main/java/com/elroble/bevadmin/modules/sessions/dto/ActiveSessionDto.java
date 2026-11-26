package com.elroble.bevadmin.modules.sessions.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * DTO enriquecido para la auditoría de conexiones y sesiones de usuario.
 * <p>
 * Representa una fila de la vista analítica {@code vw_user_active_sessions},
 * conteniendo metadatos de red (IP, User-Agent, Navegador, SO),
 * geolocalización aproximada, estado semaforizado (🟢, 🟡, 🔴)
 * y banderas de control de revocación remota para el Administrador.
 */
@Schema(description = "Registro de sesión activa de usuario con semaforización, IP y geolocalización.")
public record ActiveSessionDto(

        @Schema(description = "Identificador único UUID de la sesión.", example = "a1111111-1111-1111-1111-111111111111")
        UUID sessionId,

        @Schema(description = "Identificador único UUID del usuario.", example = "c8949826-b481-42cb-b1b7-a3e9c60e0a01")
        UUID userId,

        @Schema(description = "Código de negocio del usuario.", example = "USR-001")
        String userCode,

        @Schema(description = "Nombre de usuario o login corporativo.", example = "agarcia")
        String username,

        @Schema(description = "Nombre y apellidos completos del colaborador.", example = "Ana García")
        String fullName,

        @Schema(description = "Correo electrónico institucional.", example = "ana.garcia@empresa.com")
        String email,

        @Schema(description = "Estado actual de la cuenta en el sistema (ACTIVE, LOCKED, INACTIVE).", example = "ACTIVE")
        String userStatus,

        @Schema(description = "Código del rol asignado (ADMIN, CAJERO, SUPERVISOR, AUDITOR).", example = "ADMIN")
        String roleCode,

        @Schema(description = "Nombre descriptivo del rol.", example = "Administrador General")
        String roleName,

        @Schema(description = "Código de la sede o local de conexión.", example = "BR-CENTRAL")
        String branchCode,

        @Schema(description = "Nombre de la sede física asignada.", example = "Sede Central Mayorista")
        String branchName,

        @Schema(description = "Razón social del negocio matriz.", example = "Distribuidora El Roble")
        String businessName,

        @Schema(description = "Dirección IP del cliente que originó la conexión.", example = "190.236.12.84")
        String ipAddress,

        @Schema(description = "Nombre y versión detectada del navegador.", example = "Google Chrome 122")
        String browserName,

        @Schema(description = "Tipo de dispositivo y sistema operativo.", example = "Desktop - Windows 11")
        String deviceType,

        @Schema(description = "Cadena User-Agent completa de la petición HTTP.", example = "Mozilla/5.0...")
        String userAgent,

        @Schema(description = "Ubicación geográfica aproximada o sede de red.", example = "Lima, Perú (Sede Central Matriz)")
        String locationName,

        @Schema(description = "Latitud geográfica estimada para mapa.", example = "-12.046374")
        BigDecimal latitude,

        @Schema(description = "Longitud geográfica estimada para mapa.", example = "-77.042793")
        BigDecimal longitude,

        @Schema(description = "Fecha y hora exacta en que se inició la sesión.")
        OffsetDateTime loginAt,

        @Schema(description = "Fecha y hora del último latido o interacción registrada.")
        OffsetDateTime lastActivityAt,

        @Schema(description = "Fecha y hora límite de validez de la sesión.")
        OffsetDateTime expiresAt,

        @Schema(description = "Indica si la sesión ha sido revocada.", example = "false")
        boolean isRevoked,

        @Schema(description = "Indica si fue revocada forzosamente por un Administrador.", example = "false")
        boolean revokedByAdmin,

        @Schema(description = "Motivo de revocación administrativa.", example = "Infiltrado sospechoso")
        String revokedReason,

        @Schema(description = "Fecha y hora en que se revocó la sesión.")
        OffsetDateTime revokedAt,

        @Schema(description = "Estado de conexión semaforizado (ONLINE, IDLE, DISCONNECTED).", example = "ONLINE")
        String connectionStatus,

        @Schema(description = "Emoji semáforo de estado visual para interfaz gráfica (🟢, 🟡, 🔴).", example = "🟢")
        String semaphoreIndicator
) {}
