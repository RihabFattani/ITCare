package com.sip.itcare.dto;

import com.sip.itcare.enums.RoleName;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.util.Set;

/** Corps JSON pour creer / modifier un utilisateur (reserve a l'Admin). */
public record UserRequest(
        @NotBlank(message = "L'email est obligatoire") @Email(message = "Email invalide") String email,
        String password, // obligatoire a la creation, optionnel a la modification
        String tel,
        @NotBlank(message = "Le nom est obligatoire") String nom,
        String prenom,
        Set<RoleName> roles,
        Boolean enabled) {
}
