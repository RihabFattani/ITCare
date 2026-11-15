package com.sip.itcare.dto;

import jakarta.validation.constraints.NotBlank;

/** Modification de son propre profil (l'email, identifiant de connexion, n'est pas modifiable). */
public record ProfileRequest(
        @NotBlank(message = "Le nom est obligatoire") String nom,
        String prenom,
        String tel) {
}
