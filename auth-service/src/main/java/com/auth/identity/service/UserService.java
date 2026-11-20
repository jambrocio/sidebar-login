package com.auth.identity.service;

import com.auth.identity.domain.model.User;
import com.auth.identity.web.dto.CreateUserRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Interfaz de servicio para la administración y gobierno de identidades de usuarios corporativos.
 *
 * <p>Provee operaciones para el aprovisionamiento de cuentas, asignación de roles RBAC,
 * vinculación de sedes autorizadas, bloqueo y desbloqueo administrativo y consulta del directorio de usuarios.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
public interface UserService {

    /**
     * Aprovisiona y registra una nueva identidad de usuario en el sistema.
     *
     * @param request Datos de la solicitud de creación con perfil, rol y sucursales.
     * @param registeredByUserId Identificador UUID del usuario administrador que realiza el registro.
     * @return Entidad {@link User} creada.
     */
    User createUser(CreateUserRequest request, UUID registeredByUserId);

    /**
     * Obtiene el detalle completo de un usuario por su identificador UUID.
     *
     * @param id Identificador UUID del usuario.
     * @return Entidad {@link User} correspondiente.
     */
    User getUserById(UUID id);

    /**
     * Bloquea administrativamente la cuenta de un usuario impidiendo futuros inicios de sesión.
     *
     * @param id Identificador UUID del usuario a bloquear.
     * @param reason Motivo o justificación del bloqueo administrativo.
     */
    void lockUserAccount(UUID id, String reason);

    /**
     * Desbloquea administrativamente la cuenta de un usuario y reinicia sus intentos fallidos.
     *
     * @param id Identificador UUID del usuario a desbloquear.
     */
    void unlockUserAccount(UUID id);

    /**
     * Consulta el directorio consolidado de todos los usuarios corporativos en el sistema.
     *
     * @return Lista de registros consolidados con sus empresas y sedes asignadas.
     */
    List<Map<String, Object>> getAllUsersConsolidated();
}
