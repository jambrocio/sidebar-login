package com.auth.identity.core.security;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.UUID;

/**
 * In-memory RSA 2048-bit cryptographic key provider for asymmetric token signing (RS256)
 * and JWKS (JSON Web Key Set) generation.
 */
@Component
public class KeyPairProvider {

    private static final Logger log = LoggerFactory.getLogger(KeyPairProvider.class);

    @Value("${auth.security.jwt.key-id:auth-key-v1}")
    private String keyId;

    private RSAPrivateKey privateKey;
    private RSAPublicKey publicKey;
    private RSAKey rsaJwk;

    @PostConstruct
    public void init() {
        try {
            log.info("Initializing 2048-bit RSA Key Pair for asymmetric token signing...");
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair keyPair = generator.generateKeyPair();

            this.publicKey = (RSAPublicKey) keyPair.getPublic();
            this.privateKey = (RSAPrivateKey) keyPair.getPrivate();

            this.rsaJwk = new RSAKey.Builder(this.publicKey)
                    .privateKey(this.privateKey)
                    .keyID(this.keyId != null ? this.keyId : UUID.randomUUID().toString())
                    .build();

            log.info("RSA Key Pair successfully initialized with Key ID: {}", this.rsaJwk.getKeyID());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("RSA algorithm not supported on runtime environment", e);
        }
    }

    public RSAPrivateKey getPrivateKey() {
        return privateKey;
    }

    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    public RSAKey getRsaJwk() {
        return rsaJwk;
    }

    /**
     * Returns the public JWK Set (safe to expose publicly via /.well-known/jwks.json).
     */
    public JWKSet getPublicJwkSet() {
        return new JWKSet(rsaJwk.toPublicJWK());
    }
}
