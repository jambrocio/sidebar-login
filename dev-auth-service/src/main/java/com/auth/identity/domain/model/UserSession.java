package com.auth.identity.domain.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entidad de dominio inmutable que representa una sesión activa o conexión de cliente autenticado.
 *
 * <p>Mapea la tabla {@code auth.sesiones_usuario} para permitir monitoreo de concurrencia,
 * geolocalización aproximada, latidos de actividad (heartbeat) y revocación remota de accesos (Kill Session).</p>
 *
 * @param id Identificador UUID único de la sesión.
 * @param userId Identificador UUID del usuario titular de la sesión.
 * @param refreshTokenHash Resumen criptográfico seguro SHA-256 del token de refresco.
 * @param ipAddress Dirección IP de origen desde donde se estableció la sesión.
 * @param userAgent Cadena de identificación de navegador y cliente HTTP (User-Agent).
 * @param deviceType Clasificación del dispositivo (ej. "Desktop - Windows", "Mobile").
 * @param browserName Nombre o familia del navegador utilizado.
 * @param locationName Ubicación geográfica descriptiva aproximada de la conexión.
 * @param latitude Coordenada de latitud estimada.
 * @param longitude Coordenada de longitud estimada.
 * @param lastActivityAt Fecha y hora de la última interacción registrada (heartbeat).
 * @param isRevoked Indica si la sesión fue terminada/revocada.
 * @param revokedByAdmin Indica si la revocación fue realizada por un administrador de forma remota.
 * @param revocationReason Motivo justificado de la revocación de la sesión.
 * @param revocationAt Fecha y hora en que se revocó la sesión.
 * @param expiresAt Fecha y hora en que caduca la vigencia del token de refresco asociado.
 * @param createdAt Fecha y hora de creación de la sesión.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public record UserSession(
        UUID id,
        UUID userId,
        String refreshTokenHash,
        String ipAddress,
        String userAgent,
        String deviceType,
        String browserName,
        String locationName,
        BigDecimal latitude,
        BigDecimal longitude,
        OffsetDateTime lastActivityAt,
        boolean isRevoked,
        boolean revokedByAdmin,
        String revocationReason,
        OffsetDateTime revocationAt,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt
) {}
