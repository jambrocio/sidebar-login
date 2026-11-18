package com.auth.identity.service;

import com.auth.identity.domain.model.User;
import com.auth.identity.web.dto.CreateUserRequest;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Service interface for user identity management, status governance, and user queries.
 */
public interface UserService {

    User createUser(CreateUserRequest request, UUID registeredByUserId);

    User getUserById(UUID id);

    void lockUserAccount(UUID id, String reason);

    void unlockUserAccount(UUID id);

    List<Map<String, Object>> getAllUsersConsolidated();
}
