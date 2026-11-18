package com.auth.identity;

import com.auth.identity.core.security.JwtTokenService;
import com.auth.identity.core.security.KeyPairProvider;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class IdentityApplicationTests {

    @Test
    void testKeyPairAndJwksGeneration() {
        KeyPairProvider keyPairProvider = new KeyPairProvider();
        keyPairProvider.init();

        assertNotNull(keyPairProvider.getPublicKey(), "Public key must be generated");
        assertNotNull(keyPairProvider.getPrivateKey(), "Private key must be generated");
        assertNotNull(keyPairProvider.getRsaJwk(), "RSA JWK must not be null");

        JwtTokenService tokenService = new JwtTokenService(keyPairProvider);
        Map<String, Object> jwks = tokenService.getJwksMap();

        assertNotNull(jwks, "JWKS map must not be null");
        assertTrue(jwks.containsKey("keys"), "JWKS must contain 'keys' array");

        String token = tokenService.generateOpaqueRefreshToken();
        assertNotNull(token);
        assertEquals(64, tokenService.hashToken(token).length(), "SHA-256 hash must be 64 hex characters");
    }
}
