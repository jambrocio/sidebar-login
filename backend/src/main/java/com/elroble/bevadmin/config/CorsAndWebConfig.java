package com.elroble.bevadmin.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.ArrayList;
import java.util.List;

/**
 * Configuración global de CORS para permitir peticiones seguras desde el
 * Frontend en Angular 21 PWA tanto en HTTP directo (localhost:4200) como en HTTPS
 * a través de proxies inversos como Traefik (https://localhost, https://app.bevadmin.com).
 */
@Configuration
public class CorsAndWebConfig {

    @Value("${bevadmin.security.cors.allowed-origin-patterns:http://localhost:[*],https://localhost:[*],http://127.0.0.1:[*],https://127.0.0.1:[*],https://*.bevadmin.com,https://bevadmin.com}")
    private List<String> allowedOriginPatterns;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Soporta puertos dinámicos locales mediante :[*] sin permitir sufijos de dominio arbitrarios (ej. localhost.evil.com)
        List<String> patterns = new ArrayList<>();
        for (String raw : allowedOriginPatterns) {
            String normalized = raw == null ? "" : raw.trim();
            if (normalized.isEmpty() || "*".equals(normalized)) {
                continue;
            }
            normalized = normalized
                    .replace("http://localhost*", "http://localhost:[*]")
                    .replace("https://localhost*", "https://localhost:[*]")
                    .replace("http://127.0.0.1*", "http://127.0.0.1:[*]")
                    .replace("https://127.0.0.1*", "https://127.0.0.1:[*]")
                    .replace("http://*.bevadmin.com*", "http://*.bevadmin.com")
                    .replace("https://*.bevadmin.com*", "https://*.bevadmin.com");
            if (!patterns.contains(normalized)) {
                patterns.add(normalized);
            }
        }
        for (String localPattern : List.of(
                "http://localhost:[*]",
                "https://localhost:[*]",
                "http://127.0.0.1:[*]",
                "https://127.0.0.1:[*]")) {
            if (!patterns.contains(localPattern)) {
                patterns.add(localPattern);
            }
        }

        config.setAllowedOriginPatterns(patterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization", "Link", "X-Total-Count"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
