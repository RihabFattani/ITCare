package com.sip.itcare.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

/** Ligne d'historique d'un ticket (creation, changement de statut, assignation, echeance...). */
@Entity
@Table(name = "incident_events")
public class IncidentEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(optional = false)
    @JoinColumn(name = "id_incident")
    private Incident incident;

    /** Peut etre null (evenement systeme). */
    @ManyToOne
    @JoinColumn(name = "id_auteur")
    private User auteur;

    /** CREATION, STATUT, ASSIGNATION, ECHEANCE, MODIFICATION, COMMENTAIRE... */
    @Column(nullable = false)
    private String type;

    @Column(length = 500)
    private String detail;

    @Column(nullable = false)
    private LocalDateTime date = LocalDateTime.now();

    public Long getId() { return id; }
    public Incident getIncident() { return incident; }
    public void setIncident(Incident incident) { this.incident = incident; }
    public User getAuteur() { return auteur; }
    public void setAuteur(User auteur) { this.auteur = auteur; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }
    public LocalDateTime getDate() { return date; }
    public void setDate(LocalDateTime date) { this.date = date; }
}
