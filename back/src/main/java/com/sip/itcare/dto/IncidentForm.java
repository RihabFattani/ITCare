package com.sip.itcare.dto;

import com.sip.itcare.enums.Priorite;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.LocalDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.multipart.MultipartFile;

/**
 * Formulaire incident (multipart/form-data).
 * RG4 : budget >= 0 et duree > 0.  RG5 : idClient obligatoire.
 * Le statut, la date et l'utilisateur ne sont PAS dans le formulaire : le serveur les determine
 * (RG1 ; l'utilisateur est celui du token JWT).
 */
public record IncidentForm(
        @NotBlank(message = "Le libelle est obligatoire") String libelle,
        String description,
        @NotNull(message = "Le budget est obligatoire") @PositiveOrZero(message = "Le budget doit etre >= 0") Double budget,
        @NotNull(message = "La duree est obligatoire") @Positive(message = "La duree doit etre > 0") Integer duree,
        @NotNull(message = "La priorite est obligatoire (BASSE, MOYENNE, HAUTE)") Priorite priorite,
        @NotNull(message = "Le client est obligatoire") Long idClient,
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateEcheance,
        Long idAssigne,
        MultipartFile captureEcran) {
}
