package com.sip.itcare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Changement de son propre mot de passe : l'ancien est exige. */
public record PasswordChangeRequest(
        @NotBlank(message = "Le mot de passe actuel est obligatoire") String currentPassword,
        @NotBlank(message = "Le nouveau mot de passe est obligatoire")
        @Size(min = 6, message = "Le nouveau mot de passe doit contenir au moins 6 caracteres") String newPassword) {
}
