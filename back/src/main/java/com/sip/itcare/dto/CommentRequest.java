package com.sip.itcare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
        @NotBlank(message = "Le commentaire est vide") @Size(max = 2000, message = "2000 caracteres maximum") String contenu) {
}
