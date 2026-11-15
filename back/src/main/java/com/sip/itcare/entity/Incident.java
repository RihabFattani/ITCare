package com.sip.itcare.entity;

import com.sip.itcare.enums.Priorite;
import com.sip.itcare.enums.Statut;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String libelle;

    @Column(length = 2000)
    private String description;

    /** Cout estime de l'intervention (TND). */
    private double budget;

    /** Duree estimee de resolution (heures). */
    private int duree;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Priorite priorite;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Statut statut;

    /** LocalDateTime (et non LocalDate) pour pouvoir detecter "ouvert depuis plus de 24 h". */
    @Column(nullable = false)
    private LocalDateTime dateSignalement;

    /** Noms de fichiers : uploads/incidents/ et uploads/rapports/. */
    private String captureEcran;
    private String rapportPdf;

    /** Incident -> Client : Many-to-One (RG5 : obligatoire). */
    @ManyToOne(optional = false)
    @JoinColumn(name = "id_client")
    private Client client;

    /** Date limite de resolution (planification, calendrier, SLA). */
    private LocalDateTime dateEcheance;

    /** Incident -> User : collaborateur a qui le ticket est affecte (peut differer du createur). */
    @ManyToOne
    @JoinColumn(name = "id_assigne")
    private User assigne;

    /** Incident -> User : l'utilisateur qui a enregistre l'incident. */
    @ManyToOne(optional = false)
    @JoinColumn(name = "id_user")
    private User user;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public double getBudget() { return budget; }
    public void setBudget(double budget) { this.budget = budget; }
    public int getDuree() { return duree; }
    public void setDuree(int duree) { this.duree = duree; }
    public Priorite getPriorite() { return priorite; }
    public void setPriorite(Priorite priorite) { this.priorite = priorite; }
    public Statut getStatut() { return statut; }
    public void setStatut(Statut statut) { this.statut = statut; }
    public LocalDateTime getDateSignalement() { return dateSignalement; }
    public void setDateSignalement(LocalDateTime dateSignalement) { this.dateSignalement = dateSignalement; }
    public String getCaptureEcran() { return captureEcran; }
    public void setCaptureEcran(String captureEcran) { this.captureEcran = captureEcran; }
    public String getRapportPdf() { return rapportPdf; }
    public void setRapportPdf(String rapportPdf) { this.rapportPdf = rapportPdf; }
    public LocalDateTime getDateEcheance() { return dateEcheance; }
    public void setDateEcheance(LocalDateTime dateEcheance) { this.dateEcheance = dateEcheance; }
    public User getAssigne() { return assigne; }
    public void setAssigne(User assigne) { this.assigne = assigne; }
    public Client getClient() { return client; }
    public void setClient(Client client) { this.client = client; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}
