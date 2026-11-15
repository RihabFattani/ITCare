package com.sip.itcare.controller;

import com.sip.itcare.dto.AuthResponse;
import com.sip.itcare.dto.ForgotPasswordRequest;
import com.sip.itcare.dto.ResetPasswordRequest;
import com.sip.itcare.dto.LoginRequest;
import com.sip.itcare.dto.RegisterRequest;
import com.sip.itcare.entity.User;
import com.sip.itcare.service.AuthService;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

/** Endpoints publics (sans token) : login, register et activation par lien. */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService service;

    public AuthController(AuthService service) {
        this.service = service;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return service.login(request);
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        service.forgotPassword(request.email());
        return Map.of("message", "Si ce compte existe, un email de reinitialisation vient d'etre envoye.");
    }

    @PostMapping("/reset-password")
    public Map<String, String> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        service.resetPassword(request.token(), request.newPassword());
        return Map.of("message", "Mot de passe modifie. Vous pouvez vous connecter.");
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> register(@Valid @RequestBody RegisterRequest request) {
        service.register(request);
        return Map.of("message",
                "Inscription enregistree. Votre compte sera utilisable apres validation par l'administrateur.");
    }

    /** Lien recu par l'admin par email : GET /api/auth/activate?token=... */
    @GetMapping(value = "/activate", produces = MediaType.TEXT_HTML_VALUE + ";charset=UTF-8")
    public String activate(@RequestParam String token) {
        User user = service.activate(token);
        return "<html><body style='font-family:sans-serif;text-align:center;margin-top:80px'>"
                + "<h2>Compte active</h2><p>" + escape(user.getEmail()) + " peut maintenant se connecter a ITCare.</p>"
                + "</body></html>";
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
