package com.auth.identity.core.security;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.crypto.RSASSAVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.text.ParseException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Servicio criptográfico de emisión, firma y validación de tokens JWT bajo algoritmo asimétrico RS256.
 *
 * <p>Responsable de generar tokens de acceso estructurados con los reclamos (claims) corporativos del usuario,
 * validar firmas contra la llave pública, emitir tokens opacos de refresco de alta entropía y calcular
 * sus hashes criptográficos seguros en SHA-256 para almacenamiento protegido.</p>
 *
 * @author Equipo de Arquitectura e Identidad
 * @version 1.0
 */
@Service
public class JwtTokenService {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenService.class);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final KeyPairProvider keyPairProvider;

    @Value("${auth.security.jwt.issuer:https://auth.enterprise.internal}")
    private String issuer;

    @Value("${auth.security.jwt.access-token-expiration-minutes:30}")
    private long accessTokenExpirationMinutes;

    /**
     * Constructor con inyección de dependencias del proveedor criptográfico de llaves RSA.
     *
     * @param keyPairProvider Proveedor de llaves asimétricas RSA.
     */
    public JwtTokenService(KeyPairProvider keyPairProvider) {
        this.keyPairProvider = keyPairProvider;
    }

    /**
     * Emite un token de acceso firmado con algoritmo asimétrico RS256 conteniendo la identidad y alcance del usuario.
     *
     * @param principal Identidad del usuario autenticado y su contexto corporativo.
     * @return Cadena JWT compacta y firmada digitalmente.
     * @throws IllegalStateException Si ocurre un fallo en el proceso de firmado criptográfico.
     */
    public String generateAccessToken(AuthenticatedUserPrincipal principal) {
        Instant now = Instant.now();
        Instant expiresAt = now.plus(accessTokenExpirationMinutes, ChronoUnit.MINUTES);

        List<String> branchStrings = principal.authorizedBranchIds() != null
                ? principal.authorizedBranchIds().stream().map(UUID::toString).toList()
                : Collections.emptyList();

        JWTClaimsSet claimsSet = new JWTClaimsSet.Builder()
                .issuer(issuer)
                .subject(principal.id().toString())
                .issueTime(Date.from(now))
                .expirationTime(Date.from(expiresAt))
                .jwtID(UUID.randomUUID().toString())
                .claim("user_code", principal.userCode())
                .claim("username", principal.username())
                .claim("email", principal.email())
                .claim("full_name", principal.fullName())
                .claim("role", principal.roleCode())
                .claim("role_scope", principal.roleScope())
                .claim("business_id", principal.businessId() != null ? principal.businessId().toString() : null)
                .claim("business_code", principal.businessCode())
                .claim("assigned_branch_id", principal.assignedBranchId() != null ? principal.assignedBranchId().toString() : null)
                .claim("assigned_branch_name", principal.assignedBranchName())
                .claim("authorized_branches", branchStrings)
                .build();

        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.RS256)
                .keyID(keyPairProvider.getRsaJwk().getKeyID())
                .build();

        SignedJWT signedJWT = new SignedJWT(header, claimsSet);

        try {
            RSASSASigner signer = new RSASSASigner(keyPairProvider.getPrivateKey());
            signedJWT.sign(signer);
            return signedJWT.serialize();
        } catch (JOSEException e) {
            log.error("Fallo al firmar el JWT con la llave privada RSA", e);
            throw new IllegalStateException("Error criptográfico de firma de token", e);
        }
    }

    /**
     * Verifica la validez criptográfica de la firma digital y la caducidad temporal de un token de acceso.
     *
     * @param token Cadena JWT serializada recibida en el encabezado de autorización.
     * @return {@link Optional} con el conjunto de reclamos decodificados si el token es íntegro y válido.
     */
    public Optional<JWTClaimsSet> verifyToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            RSASSAVerifier verifier = new RSASSAVerifier(keyPairProvider.getPublicKey());

            if (!signedJWT.verify(verifier)) {
                log.warn("Fallo de verificación de firma en token JWT");
                return Optional.empty();
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            Date expiration = claims.getExpirationTime();
            if (expiration == null || expiration.before(new Date())) {
                log.warn("El token JWT ha expirado temporalmente");
                return Optional.empty();
            }

            return Optional.of(claims);
        } catch (ParseException | JOSEException e) {
            log.warn("Formato o carga útil inválida en token JWT: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Genera un token de refresco opaco con alta entropía mediante {@link SecureRandom}.
     *
     * @return Cadena segura en Base64 URL-safe de 64 bytes criptográficos aleatorios.
     */
    public String generateOpaqueRefreshToken() {
        byte[] randomBytes = new byte[64];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    /**
     * Calcula el resumen criptográfico SHA-256 en formato hexadecimal de un token de refresco.
     *
     * @param token Token opaco en texto plano.
     * @return Hash SHA-256 en formato hexadecimal de 64 caracteres.
     */
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("El algoritmo de digest SHA-256 no está disponible", e);
        }
    }

    /**
     * Exporta el mapa JSON representativo del conjunto de claves públicas (JWKS).
     *
     * @return Estructura {@link Map} compatible con RFC 7517 lista para serializarse en JSON.
     */
    public Map<String, Object> getJwksMap() {
        return keyPairProvider.getPublicJwkSet().toJSONObject();
    }

    /**
     * Retorna el tiempo total de expiración configurado para los tokens de acceso en segundos.
     *
     * @return Segundos de validez de cada token de acceso emitido.
     */
    public long getAccessTokenExpirationSeconds() {
        return accessTokenExpirationMinutes * 60;
    }
}
