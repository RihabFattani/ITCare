package com.sip.itcare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.multipart.MultipartFile;

/** Formulaire client envoye en multipart/form-data (FormData cote Angular). */
public record ClientForm(
        @NotBlank(message = "Le nom est obligatoire") String nom,
        String tel,
        @NotBlank(message = "L'email est obligatoire") @Email(message = "Email invalide") String email,
        String adresse,
        String activite,
        MultipartFile photo) {
}
