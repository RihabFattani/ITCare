package com.sip.itcare.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sip.itcare.dto.LoginRequest;
import com.sip.itcare.entity.User;
import com.sip.itcare.exception.ApiException;
import com.sip.itcare.repository.RoleRepository;
import com.sip.itcare.repository.UserRepository;
import com.sip.itcare.security.JwtService;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/** Securite des comptes : verrouillage apres echecs, reinitialisation du mot de passe. */
class AuthServiceTest {

    private final PasswordEncoder encoder = new BCryptPasswordEncoder();
    private UserRepository users;
    private MailService mail;
    private JwtService jwt;
    private AuthService service;
    private User user;

    @BeforeEach
    void setUp() {
        users = mock(UserRepository.class);
        mail = mock(MailService.class);
        jwt = new JwtService("test-secret-key-test-secret-key-test-secret-key-0123456789", 60_000);
        service = new AuthService(users, mock(RoleRepository.class), encoder, jwt, mail,
                "http://localhost:8081", "http://localhost:4200");
        user = new User();
        user.setEmail("collab@itcare.tn");
        user.setPassword(encoder.encode("Collab123!"));
        user.setNom("Test");
        user.setEnabled(true);
        when(users.findByEmail("collab@itcare.tn")).thenReturn(Optional.of(user));
    }

    @Test
    void mauvaisMotDePasseIncrementeLesEchecs() {
        assertThrows(ApiException.class, () -> service.login(new LoginRequest("collab@itcare.tn", "faux")));
        assertEquals(1, user.getFailedAttempts());
    }

    @Test
    void compteVerrouilleApresCinqEchecs() {
        for (int i = 0; i < AuthService.MAX_ATTEMPTS; i++) {
            assertThrows(ApiException.class, () -> service.login(new LoginRequest("collab@itcare.tn", "faux")));
        }
        assertNotNull(user.getLockedUntil());
        // meme avec le bon mot de passe, le compte reste verrouille
        ApiException e = assertThrows(ApiException.class,
                () -> service.login(new LoginRequest("collab@itcare.tn", "Collab123!")));
        assertEquals(429, e.getStatus().value());
    }

    @Test
    void connexionReussieRemetLesEchecsAZero() {
        user.setFailedAttempts(3);
        service.login(new LoginRequest("collab@itcare.tn", "Collab123!"));
        assertEquals(0, user.getFailedAttempts());
        assertNull(user.getLockedUntil());
    }

    @Test
    void verrouillageExpire() {
        user.setLockedUntil(LocalDateTime.now().minusMinutes(1));
        service.login(new LoginRequest("collab@itcare.tn", "Collab123!"));
        assertNull(user.getLockedUntil());
    }

    @Test
    void motDePasseOublieNeRevelePasLesEmailsInconnus() {
        when(users.findByEmail("inconnu@itcare.tn")).thenReturn(Optional.empty());
        service.forgotPassword("inconnu@itcare.tn");
        verify(mail, never()).sendTo(any(), any(), any());
    }

    @Test
    void reinitialisationAvecLienValide() {
        String token = jwt.generateResetToken(user);
        service.resetPassword(token, "Nouveau123!");
        assertEquals(true, encoder.matches("Nouveau123!", user.getPassword()));
    }

    @Test
    void unTokenDAccesNePeutPasReinitialiserLeMotDePasse() {
        String accessToken = jwt.generateAccessToken(user);
        assertThrows(ApiException.class, () -> service.resetPassword(accessToken, "Nouveau123!"));
    }
}
