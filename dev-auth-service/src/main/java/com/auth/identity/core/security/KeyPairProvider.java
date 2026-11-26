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
 * Proveedor criptográfico de pares de llaves asimétricas RSA de 2048 bits para la firma de tokens RS256
 * y generación del conjunto público JWKS (JSON Web Key Set - RFC 7517).
 *
 * <p>Inicializa en el ciclo de vida del contenedor Spring un par de llaves criptográficas robustas
 * utilizadas para firmar digitalmente los tokens JWT y exponer la llave pública a los microservicios
 * consumidores a través del endpoint {@code /.well-known/jwks.json}.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Component
public class KeyPairProvider {

    private static final Logger log = LoggerFactory.getLogger(KeyPairProvider.class);

    @Value("${auth.security.jwt.key-id:auth-key-v1}")
    private String keyId;

    private RSAPrivateKey privateKey;
    private RSAPublicKey publicKey;
    private RSAKey rsaJwk;

    /**
     * Inicializa el par de llaves RSA de 2048 bits durante el arranque del servicio.
     *
     * @throws IllegalStateException Si el algoritmo RSA no se encuentra soportado por la JVM.
     */
    @PostConstruct
    public void init() {
        try {
            log.info("Inicializando par de llaves RSA de 2048 bits para firma asimétrica de tokens...");
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            KeyPair keyPair = generator.generateKeyPair();

            this.publicKey = (RSAPublicKey) keyPair.getPublic();
            this.privateKey = (RSAPrivateKey) keyPair.getPrivate();

            this.rsaJwk = new RSAKey.Builder(this.publicKey)
                    .privateKey(this.privateKey)
                    .keyID(this.keyId != null ? this.keyId : UUID.randomUUID().toString())
                    .build();

            log.info("Par de llaves RSA inicializado exitosamente con Key ID: {}", this.rsaJwk.getKeyID());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("El algoritmo RSA no está disponible en el entorno de ejecución", e);
        }
    }

    /**
     * Obtiene la llave privada RSA utilizada exclusivamente para firmar digitalmente los tokens de acceso.
     *
     * @return Llave privada RSA.
     */
    public RSAPrivateKey getPrivateKey() {
        return privateKey;
    }

    /**
     * Obtiene la llave pública RSA para la verificación matemática de las firmas de tokens.
     *
     * @return Llave pública RSA.
     */
    public RSAPublicKey getPublicKey() {
        return publicKey;
    }

    /**
     * Obtiene el objeto RSAKey representativo según la especificación RFC 7517.
     *
     * @return Clave JWK con metadatos asociados.
     */
    public RSAKey getRsaJwk() {
        return rsaJwk;
    }

    /**
     * Retorna el conjunto público JWK Set seguro para ser expuesto públicamente a clientes y gateways.
     *
     * @return Colección {@link JWKSet} que contiene únicamente la clave pública.
     */
    public JWKSet getPublicJwkSet() {
        return new JWKSet(rsaJwk.toPublicJWK());
    }
}
