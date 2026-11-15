package com.sip.itcare.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "users") // "user" est un mot reserve en SQL
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** L'email sert d'identifiant de connexion. */
    @Column(nullable = false, unique = true)
    private String email;

    /** Jamais renvoye dans le JSON (WRITE_ONLY) : on peut l'ecrire mais pas le lire. */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false)
    private String password;

    private String tel;
    private String nom;
    private String prenom;

    /** Securite : tentatives de connexion echouees consecutives et fin de verrouillage. */
    @JsonIgnore
    private int failedAttempts;
    @JsonIgnore
    private java.time.LocalDateTime lockedUntil;

    /** Nom du fichier de la photo de profil (dossier uploads/avatars), facultatif. */
    private String photo;

    /** Compte active par l'Admin (utile pour la registration, etape securite). */
    @Column(nullable = false)
    private boolean enabled = true;

    /** User <-> Role : Many-to-Many. EAGER car Spring Security aura besoin des roles. */
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<Role> roles = new HashSet<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getTel() { return tel; }
    public void setTel(String tel) { this.tel = tel; }
    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }
    public String getPrenom() { return prenom; }
    public void setPrenom(String prenom) { this.prenom = prenom; }
    public String getPhoto() { return photo; }
    public void setPhoto(String photo) { this.photo = photo; }
    public int getFailedAttempts() { return failedAttempts; }
    public void setFailedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; }
    public java.time.LocalDateTime getLockedUntil() { return lockedUntil; }
    public void setLockedUntil(java.time.LocalDateTime lockedUntil) { this.lockedUntil = lockedUntil; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public Set<Role> getRoles() { return roles; }
    public void setRoles(Set<Role> roles) { this.roles = roles; }
}
