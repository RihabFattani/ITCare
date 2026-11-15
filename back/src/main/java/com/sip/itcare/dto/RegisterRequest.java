package com.sip.itcare.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Inscription : pas de champ "role" (un inscrit est toujours COLLABORATEUR, compte inactif). */
public record RegisterRequest(
        @NotBlank(message = "L'email est obligatoire") @Email(message = "Email invalide") String email,
        @NotBlank(message = "Le mot de passe est obligatoire")
        @Size(min = 6, message = "Le mot de passe doit contenir au moins 6 caracteres") String password,
        @NotBlank(message = "Le nom est obligatoire") String nom,
        String prenom,
        String tel) {
}
