package com.sip.itcare.service;

import com.sip.itcare.dto.AuthResponse;
import com.sip.itcare.dto.LoginRequest;
import com.sip.itcare.dto.RegisterRequest;
import com.sip.itcare.entity.Role;
import com.sip.itcare.entity.User;
import com.sip.itcare.enums.RoleName;
import com.sip.itcare.exception.ApiException;
import com.sip.itcare.repository.RoleRepository;
import com.sip.itcare.repository.UserRepository;
import com.sip.itcare.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;
    private final String baseUrl;
    private final String frontUrl;

    static final int MAX_ATTEMPTS = 5;
    static final int LOCK_MINUTES = 15;

    public AuthService(UserRepository userRepository, RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder, JwtService jwtService, MailService mailService,
                       @Value("${app.base-url}") String baseUrl,
                       @Value("${app.front-url:http://localhost:4200}") String frontUrl) {
        this.frontUrl = frontUrl;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
        this.baseUrl = baseUrl;
    }

    public AuthResponse login(LoginRequest req) {
        // Meme message si l'email est inconnu ou le mot de passe faux : on ne revele pas quels emails existent
        User user = userRepository.findByEmail(req.email().trim())
                .orElseThrow(() -> ApiException.unauthorized("Email ou mot de passe incorrect"));
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(LocalDateTime.now())) {
            throw new ApiException(org.springframework.http.HttpStatus.TOO_MANY_REQUESTS,
                    "Trop de tentatives echouees : compte verrouille jusqu'a "
                    + user.getLockedUntil().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm")));
        }
        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            registerFailure(user);
            throw ApiException.unauthorized("Email ou mot de passe incorrect");
        }
        if (user.getFailedAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }
        if (!user.isEnabled()) {
            throw ApiException.forbidden("Compte non active : en attente de validation par l'administrateur");
        }
        List<String> roles = user.getRoles().stream().map(r -> r.getLibelle().name()).toList();
        return new AuthResponse(jwtService.generateAccessToken(user), "Bearer", jwtService.getExpirationMs(),
                new AuthResponse.UserInfo(user.getId(), user.getEmail(), user.getNom(), user.getPrenom(), user.getPhoto(), roles));
    }

    /** Compte les echecs de connexion : verrouillage de 15 min apres 5 echecs consecutifs. */
    private void registerFailure(User user) {
        int attempts = user.getFailedAttempts() + 1;
        if (attempts >= MAX_ATTEMPTS) {
            user.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_MINUTES));
            attempts = 0;
        }
        user.setFailedAttempts(attempts);
        userRepository.save(user);
    }

    /** Mot de passe oublie : reponse identique que l'email existe ou non (pas de fuite d'information). */
    public void forgotPassword(String email) {
        userRepository.findByEmail(email.trim()).filter(User::isEnabled).ifPresent(user -> {
            String link = frontUrl + "/reset-password?token=" + jwtService.generateResetToken(user);
            mailService.sendTo(user.getEmail(), "[ITCare] Reinitialisation de votre mot de passe",
                    "Bonjour,\n\nPour choisir un nouveau mot de passe, cliquez sur ce lien (valable 1 h) :\n"
                    + link + "\n\nSi vous n'etes pas a l'origine de cette demande, ignorez ce message.\n\n"
                    + "ITCare - IT Incident & Support Management System");
        });
    }

    @Transactional
    public void resetPassword(String token, String newPassword) {
        Claims claims;
        try {
            claims = jwtService.parse(token, JwtService.RESET);
        } catch (JwtException | IllegalArgumentException e) {
            throw ApiException.badRequest("Lien invalide ou expire");
        }
        User user = userRepository.findByEmail(claims.getSubject())
                .orElseThrow(() -> ApiException.badRequest("Lien invalide ou expire"));
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }

    /** Inscription : compte COLLABORATEUR desactive + email a l'admin avec un lien d'activation. */
    @Transactional
    public User register(RegisterRequest req) {
        String email = req.email().trim();
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("Cet email est deja utilise");
        }
        Role collaborateur = roleRepository.findByLibelle(RoleName.COLLABORATEUR)
                .orElseThrow(() -> ApiException.badRequest("Role COLLABORATEUR introuvable"));
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(req.password()));
        user.setNom(req.nom());
        user.setPrenom(req.prenom());
        user.setTel(req.tel());
        user.setEnabled(false);
        user.setRoles(Set.of(collaborateur));
        user = userRepository.save(user);

        String link = baseUrl + "/api/auth/activate?token=" + jwtService.generateActivationToken(user);
        mailService.sendToAdmins("[ITCare] Nouvelle inscription a valider",
                "Bonjour,\n\n"
                + "Un nouvel utilisateur demande l'acces a ITCare :\n"
                + "  - Nom : " + user.getNom() + (user.getPrenom() != null ? " " + user.getPrenom() : "") + "\n"
                + "  - Email : " + user.getEmail() + "\n"
                + "  - Telephone : " + (user.getTel() != null ? user.getTel() : "-") + "\n\n"
                + "Pour activer ce compte, cliquez sur le lien (valable 72 h) :\n" + link + "\n\n"
                + "Vous pouvez aussi l'activer depuis la page Gestion des utilisateurs.\n\n"
                + "ITCare - IT Incident & Support Management System");
        return user;
    }

    /** Active le compte designe par le token du lien. */
    @Transactional
    public User activate(String token) {
        Claims claims;
        try {
            claims = jwtService.parse(token, JwtService.ACTIVATION);
        } catch (JwtException | IllegalArgumentException e) {
            throw ApiException.badRequest("Lien d'activation invalide ou expire");
        }
        User user = userRepository.findByEmail(claims.getSubject())
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
        user.setEnabled(true);
        return userRepository.save(user);
    }
}
