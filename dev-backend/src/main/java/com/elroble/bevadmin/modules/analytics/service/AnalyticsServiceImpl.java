package com.elroble.bevadmin.modules.analytics.service;

import com.elroble.bevadmin.modules.analytics.repository.AnalyticsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * Implementación síncrona del servicio de analítica para toma de decisiones ({@link AnalyticsService}).
 */
@Service
public class AnalyticsServiceImpl implements AnalyticsService {

    private final AnalyticsRepository analyticsRepository;

    public AnalyticsServiceImpl(AnalyticsRepository analyticsRepository) {
        this.analyticsRepository = analyticsRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getDecisionDashboard(String businessCode, int days) {
        int safeDays = Math.max(1, Math.min(days, 365));
        return analyticsRepository.getDecisionDashboard(businessCode, safeDays);
    }
}
