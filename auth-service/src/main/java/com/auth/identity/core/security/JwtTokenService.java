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
 * Enterprise cryptographic token service using asymmetric RS256 signatures,
 * RFC 7517 JWKS generation, and secure refresh token hashing.
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

    public JwtTokenService(KeyPairProvider keyPairProvider) {
        this.keyPairProvider = keyPairProvider;
    }

    /**
     * Issues an asymmetric RS256 Signed JWT containing the user identity, roles, and enterprise scope.
     *
     * @param principal authenticated user principal
     * @return serialized compact JWT string
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
            log.error("Failed to sign JWT with private key", e);
            throw new IllegalStateException("Cryptographic signing error", e);
        }
    }

    /**
     * Verifies the cryptographic signature and expiration of an access token.
     *
     * @param token compact serialized JWT
     * @return {@link Optional} containing parsed claims if valid and not expired
     */
    public Optional<JWTClaimsSet> verifyToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            RSASSAVerifier verifier = new RSASSAVerifier(keyPairProvider.getPublicKey());

            if (!signedJWT.verify(verifier)) {
                log.warn("JWT signature verification failed");
                return Optional.empty();
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            Date expiration = claims.getExpirationTime();
            if (expiration == null || expiration.before(new Date())) {
                log.warn("JWT has expired");
                return Optional.empty();
            }

            return Optional.of(claims);
        } catch (ParseException | JOSEException e) {
            log.warn("Invalid JWT format or cryptographic payload: {}", e.getMessage());
            return Optional.empty();
        }
    }

    /**
     * Generates a high-entropy cryptographically random Refresh Token.
     */
    public String generateOpaqueRefreshToken() {
        byte[] randomBytes = new byte[64];
        SECURE_RANDOM.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    /**
     * Computes the SHA-256 hash of a Refresh Token to store securely in the database.
     */
    public String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest unavailable", e);
        }
    }

    /**
     * Exports the public JSON Web Key Set (JWKS) format map.
     */
    public Map<String, Object> getJwksMap() {
        return keyPairProvider.getPublicJwkSet().toJSONObject();
    }

    public long getAccessTokenExpirationSeconds() {
        return accessTokenExpirationMinutes * 60;
    }
}
