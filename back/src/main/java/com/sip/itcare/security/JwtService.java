package com.sip.itcare.security;

import com.sip.itcare.entity.Role;
import com.sip.itcare.entity.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.List;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Cree et verifie les tokens JWT (signes HMAC-SHA256 avec app.jwt.secret).
 * Deux types de tokens, distingues par le claim "typ" :
 *  - "access"     : envoye par le front dans l'en-tete Authorization: Bearer ...
 *  - "activation" : place dans le lien de l'email envoye a l'admin (validite 72 h)
 * Un token d'activation ne peut donc jamais servir a s'authentifier, et inversement.
 */
@Service
public class JwtService {

    public static final String ACCESS = "access";
    public static final String ACTIVATION = "activation";
    public static final String RESET = "reset";
    private static final long RESET_VALIDITY_MS = 3600L * 1000;
    private static final long ACTIVATION_VALIDITY_MS = 72L * 3600 * 1000;

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    public String generateAccessToken(User user) {
        List<String> roles = user.getRoles().stream().map(Role::getLibelle).map(Enum::name).toList();
        return build(user.getEmail(), ACCESS, expirationMs)
                .claim("roles", roles)
                .compact();
    }

    public String generateActivationToken(User user) {
        return build(user.getEmail(), ACTIVATION, ACTIVATION_VALIDITY_MS).compact();
    }

    /** Lien "mot de passe oublie" : valable 1 h, ne sert qu'a reinitialiser le mot de passe. */
    public String generateResetToken(User user) {
        return build(user.getEmail(), RESET, RESET_VALIDITY_MS).compact();
    }

    /** Verifie la signature, l'expiration et le type. Leve JwtException si invalide. */
    public Claims parse(String token, String expectedType) {
        Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
        if (!expectedType.equals(claims.get("typ", String.class))) {
            throw new JwtException("Type de token invalide");
        }
        return claims;
    }

    public long getExpirationMs() {
        return expirationMs;
    }

    private io.jsonwebtoken.JwtBuilder build(String subject, String type, long validityMs) {
        Date now = new Date();
        return Jwts.builder()
                .subject(subject)
                .claim("typ", type)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + validityMs))
                .signWith(key);
    }
}
