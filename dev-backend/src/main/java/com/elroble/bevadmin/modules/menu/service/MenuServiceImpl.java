package com.elroble.bevadmin.modules.menu.service;

import com.elroble.bevadmin.modules.menu.repository.MenuRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Implementación imperativa y síncrona del servicio de navegación del menú lateral ({@link MenuService}).
 */
@Service
public class MenuServiceImpl implements MenuService {

    /** Repositorio síncrono de menú y permisos RBAC. */
    private final MenuRepository menuRepository;

    /**
     * Constructor con inyección de dependencias.
     *
     * @param menuRepository repositorio de menú
     */
    public MenuServiceImpl(MenuRepository menuRepository) {
        this.menuRepository = menuRepository;
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getNavigationMenuForUser(UUID userId) {
        return menuRepository.findEffectiveMenuByUserId(userId);
    }
}
