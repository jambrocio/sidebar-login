package com.elroble.bevadmin.modules.analytics.service;

import java.util.Map;

/**
 * Servicio síncrono de analítica ejecutiva para la toma de decisiones.
 */
public interface AnalyticsService {

    /**
     * Obtiene los indicadores, tendencias y alertas consolidadas para el Dashboard de Toma de Decisiones.
     *
     * @param businessCode código del negocio matriz o {@code ALL}
     * @param days         ventana temporal en días
     * @return mapa con KPIs, tendencia diaria, rendimiento por local, top productos y stock crítico
     */
    Map<String, Object> getDecisionDashboard(String businessCode, int days);
}
