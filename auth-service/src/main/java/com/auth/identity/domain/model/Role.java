package com.auth.identity.domain.model;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entidad de dominio inmutable que representa un rol de seguridad bajo el esquema de control RBAC.
 *
 * <p>Mapea la tabla {@code rbac.roles} y define el nombre, código y nivel de alcance
 * jerárquico que determina la visibilidad y autorizaciones en el sistema.</p>
 *
 * @param id Identificador UUID único del rol.
 * @param code Código de negocio del rol (ej. "ADMIN", "SUPERVISOR", "ANALYST", "AUDITOR").
 * @param name Nombre descriptivo formal del rol.
 * @param description Resumen del propósito operativo y responsabilidades del rol.
 * @param scope Alcance operativo asignado (ej. "Nivel Negocio (Multi-Local)", "Nivel Local Asignado").
 * @param isSystem Indica si es un rol base inmutable del sistema que no puede eliminarse.
 * @param active Estado de habilitación del rol.
 * @param createdAt Fecha y hora de registro en el sistema.
 * @param updatedAt Fecha y hora de última actualización del registro.
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public record Role(
        UUID id,
        String code,
        String name,
        String description,
        String scope,
        boolean isSystem,
        boolean active,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
