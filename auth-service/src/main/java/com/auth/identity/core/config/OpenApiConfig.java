package com.auth.identity.core.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * OpenAPI 3.1 & Swagger interactive documentation configuration.
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("Centralized Identity & Access Management API")
                        .description("Centralized Identity Provider (IdP / IAM) REST API for single sign-on (SSO), asymmetric RS256 token issuance, RBAC governance, and user sessions.")
                        .version("1.0.0")
                        .contact(new Contact().name("Security Architecture Team").email("security@enterprise.internal")))
                .servers(List.of(
                        new Server().url("/").description("Current Server Instance")
                ))
                .components(new Components()
                        .addSecuritySchemes("BearerAuth", new SecurityScheme()
                                .name("BearerAuth")
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Asymmetric RS256 JWT Access Token")))
                .addSecurityItem(new SecurityRequirement().addList("BearerAuth"));
    }
}
