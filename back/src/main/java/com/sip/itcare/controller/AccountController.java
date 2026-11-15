package com.sip.itcare.controller;

import com.sip.itcare.dto.PasswordChangeRequest;
import com.sip.itcare.dto.ProfileRequest;
import com.sip.itcare.entity.User;
import com.sip.itcare.exception.ApiException;
import com.sip.itcare.repository.UserRepository;
import com.sip.itcare.service.FileStorageService;
import com.sip.itcare.service.FileStorageService.FileType;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Parametres du compte : chaque utilisateur connecte gere son propre profil et son mot de passe. */
@RestController
@RequestMapping("/api/account")
public class AccountController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService storage;

    public AccountController(UserRepository userRepository, PasswordEncoder passwordEncoder,
                             FileStorageService storage) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.storage = storage;
    }

    @GetMapping
    public User me(Authentication auth) {
        return current(auth);
    }

    @PutMapping
    public User updateProfile(Authentication auth, @Valid @RequestBody ProfileRequest request) {
        User user = current(auth);
        user.setNom(request.nom().trim());
        user.setPrenom(request.prenom() == null ? null : request.prenom().trim());
        user.setTel(request.tel() == null ? null : request.tel().trim());
        return userRepository.save(user);
    }

    @PutMapping("/password")
    public Map<String, String> changePassword(Authentication auth, @Valid @RequestBody PasswordChangeRequest request) {
        User user = current(auth);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw ApiException.badRequest("Le mot de passe actuel est incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        return Map.of("message", "Mot de passe modifie");
    }

    /** Photo de profil (JPG/PNG, 2 Mo max). L'ancienne photo est supprimee physiquement. */
    @PostMapping(value = "/photo", consumes = "multipart/form-data")
    public User uploadPhoto(Authentication auth, @RequestParam("photo") MultipartFile file) {
        User user = current(auth);
        String name = storage.save(file, FileType.AVATAR);
        if (name == null) {
            throw ApiException.badRequest("Aucune image envoyee");
        }
        storage.delete(user.getPhoto(), FileType.AVATAR);
        user.setPhoto(name);
        return userRepository.save(user);
    }

    @DeleteMapping("/photo")
    public User removePhoto(Authentication auth) {
        User user = current(auth);
        storage.delete(user.getPhoto(), FileType.AVATAR);
        user.setPhoto(null);
        return userRepository.save(user);
    }

    private User current(Authentication auth) {
        return userRepository.findByEmail(auth.getName())
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable"));
    }
}
