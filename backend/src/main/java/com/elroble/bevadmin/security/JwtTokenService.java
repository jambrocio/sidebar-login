package com.elroble.bevadmin.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Servicio encargado de generar y validar tokens JWT firmados con HMAC-SHA256,
 * embebiendo el Negocio Matriz, el Local Principal Asignado, los Locales Autorizados
 * y el Alcance Organizacional del rol.
 */
@Service
public class JwtTokenService {

    @Value("${bevadmin.security.jwt.secret}")
    private String jwtSecret;

    @Value("${bevadmin.security.jwt.access-token-expiration-minutes:30}")
    private long expirationMinutes;

    public String generateAccessToken(AuthenticatedUserPrincipal user) {
        try {
            Instant now = Instant.now();
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(user.userId().toString())
                    .claim("userCode", user.userCode())
                    .claim("username", user.username())
                    .claim("fullName", user.fullName())
                    .claim("businessId", user.businessId().toString())
                    .claim("businessCode", user.businessCode())
                    .claim("assignedBranchId", user.assignedBranchId().toString())
                    .claim("assignedBranchName", user.assignedBranchName())
                    .claim("authorizedBranchIds", user.authorizedBranchIds().stream().map(UUID::toString).toList())
                    .claim("roles", user.roles())
                    .claim("roleScope", user.roleScope())
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                    .build();

            SignedJWT signedJWT = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            signedJWT.sign(new MACSigner(jwtSecret.getBytes(StandardCharsets.UTF_8)));
            return signedJWT.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Error al firmar el token JWT", e);
        }
    }

    public Optional<AuthenticatedUserPrincipal> parseAndValidateToken(String token) {
        try {
            SignedJWT signedJWT = SignedJWT.parse(token);
            boolean validSignature = signedJWT.verify(new MACVerifier(jwtSecret.getBytes(StandardCharsets.UTF_8)));
            if (!validSignature) {
                return Optional.empty();
            }

            JWTClaimsSet claims = signedJWT.getJWTClaimsSet();
            if (claims.getExpirationTime() == null || claims.getExpirationTime().before(new Date())) {
                return Optional.empty();
            }

            List<UUID> authorizedBranches = claims.getStringListClaim("authorizedBranchIds")
                    .stream()
                    .map(UUID::fromString)
                    .toList();

            AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal(
                    UUID.fromString(claims.getSubject()),
                    claims.getStringClaim("userCode"),
                    claims.getStringClaim("username"),
                    claims.getStringClaim("fullName"),
                    UUID.fromString(claims.getStringClaim("businessId")),
                    claims.getStringClaim("businessCode"),
                    UUID.fromString(claims.getStringClaim("assignedBranchId")),
                    claims.getStringClaim("assignedBranchName"),
                    authorizedBranches,
                    claims.getStringListClaim("roles"),
                    claims.getStringClaim("roleScope")
            );
            return Optional.of(principal);
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}
