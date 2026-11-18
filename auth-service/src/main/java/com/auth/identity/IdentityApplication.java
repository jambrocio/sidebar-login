package com.auth.identity;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Main entry point for the Centralized Identity and Access Management (IAM / IdP) Service.
 * <p>
 * Provides centralized authentication, cryptographic asymmetric token issuance (RS256 / JWKS),
 * RBAC authorization, session monitoring, and user lifecycle management.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class IdentityApplication {

    public static void main(String[] args) {
        SpringApplication.run(IdentityApplication.class, args);
    }
}
