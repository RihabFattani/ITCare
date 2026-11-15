package com.sip.itcare.dto;

import java.util.List;

/** Reponse du login : le token a stocker cote Angular + les infos utiles au menu (roles). */
public record AuthResponse(String token, String tokenType, long expiresIn, UserInfo user) {

    public record UserInfo(Long id, String email, String nom, String prenom, String photo, List<String> roles) {
    }
}
