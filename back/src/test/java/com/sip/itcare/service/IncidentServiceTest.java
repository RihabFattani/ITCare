package com.sip.itcare.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.sip.itcare.entity.Incident;
import com.sip.itcare.entity.Role;
import com.sip.itcare.entity.User;
import com.sip.itcare.enums.RoleName;
import com.sip.itcare.enums.Statut;
import com.sip.itcare.exception.ApiException;
import com.sip.itcare.repository.ClientRepository;
import com.sip.itcare.repository.IncidentCommentRepository;
import com.sip.itcare.repository.IncidentEventRepository;
import com.sip.itcare.repository.IncidentRepository;
import com.sip.itcare.repository.UserRepository;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Regles metier des incidents : cycle de vie (RG2), incident resolu non modifiable (RG7), historique. */
class IncidentServiceTest {

    private IncidentRepository incidents;
    private ActivityService activity;
    private IncidentService service;
    private UserRepository users;
    private User admin;
    private User collab;
    private User autre;

    @BeforeEach
    void setUp() {
        incidents = mock(IncidentRepository.class);
        activity = mock(ActivityService.class);
        when(incidents.save(any(Incident.class))).thenAnswer(inv -> inv.getArgument(0));
        users = mock(UserRepository.class);
        admin = user(1L, "admin@itcare.tn", RoleName.ADMIN);
        collab = user(2L, "collab@itcare.tn", RoleName.COLLABORATEUR);
        autre = user(3L, "autre@itcare.tn", RoleName.COLLABORATEUR);
        when(users.findByEmail("admin@itcare.tn")).thenReturn(Optional.of(admin));
        when(users.findByEmail("collab@itcare.tn")).thenReturn(Optional.of(collab));
        when(users.findByEmail("autre@itcare.tn")).thenReturn(Optional.of(autre));
        service = new IncidentService(incidents, mock(ClientRepository.class), users,
                mock(FileStorageService.class), activity, mock(IncidentCommentRepository.class),
                mock(IncidentEventRepository.class));
    }

    private static User user(Long id, String email, RoleName role) {
        User u = new User();
        u.setId(id);
        u.setEmail(email);
        u.setNom(email);
        u.getRoles().add(new Role(role));
        return u;
    }

    private Incident incident(Statut statut) {
        Incident i = new Incident();
        i.setId(1L);
        i.setLibelle("Serveur indisponible");
        i.setStatut(statut);
        i.setDateSignalement(LocalDateTime.now());
        i.setDuree(2);
        i.setUser(collab);
        i.setAssigne(collab);
        when(incidents.findById(1L)).thenReturn(Optional.of(i));
        return i;
    }

    @Test
    void ouvertPasseEnCoursPuisResolu() {
        Incident i = incident(Statut.OUVERT);
        assertEquals(Statut.EN_COURS, service.changeStatut(1L, Statut.EN_COURS, "admin@itcare.tn").getStatut());
        assertEquals(Statut.RESOLU, service.changeStatut(1L, Statut.RESOLU, "admin@itcare.tn").getStatut());
        assertEquals(Statut.RESOLU, i.getStatut());
    }

    @Test
    void collaborateurAssigneChangeLeStatutDeSonTicket() {
        incident(Statut.OUVERT);
        assertEquals(Statut.EN_COURS, service.changeStatut(1L, Statut.EN_COURS, "collab@itcare.tn").getStatut());
    }

    @Test
    void collaborateurNonAssigneNePeutPasChangerLeStatut() {
        incident(Statut.OUVERT);
        ApiException e = assertThrows(ApiException.class, () -> service.changeStatut(1L, Statut.EN_COURS, "autre@itcare.tn"));
        assertEquals(403, e.getStatus().value());
        verify(incidents, never()).save(any());
    }

    @Test
    void ticketReaffecteAUnAutreCollaborateur() {
        Incident i = incident(Statut.OUVERT);
        i.setAssigne(autre);
        // l'ancien assigne (createur) n'a plus la main, le nouvel assigne l'a
        assertThrows(ApiException.class, () -> service.changeStatut(1L, Statut.EN_COURS, "collab@itcare.tn"));
        assertEquals(Statut.EN_COURS, service.changeStatut(1L, Statut.EN_COURS, "autre@itcare.tn").getStatut());
    }

    @Test
    void sautDeStatutInterdit() {
        incident(Statut.OUVERT);
        ApiException e = assertThrows(ApiException.class, () -> service.changeStatut(1L, Statut.RESOLU, "admin@itcare.tn"));
        assertEquals(409, e.getStatus().value());
        verify(incidents, never()).save(any());
    }

    @Test
    void incidentResoluNeChangePlus() {
        incident(Statut.RESOLU);
        assertThrows(ApiException.class, () -> service.changeStatut(1L, Statut.EN_COURS, "admin@itcare.tn"));
    }

    @Test
    void replanificationInterditeSiResolu() {
        incident(Statut.RESOLU);
        assertThrows(ApiException.class, () -> service.reschedule(1L, LocalDateTime.now().plusDays(1), "admin@itcare.tn"));
    }

    @Test
    void replanificationEnregistreEcheanceEtHistorique() {
        Incident i = incident(Statut.EN_COURS);
        LocalDateTime nouvelle = LocalDateTime.now().plusDays(2);
        service.reschedule(1L, nouvelle, "admin@itcare.tn");
        assertEquals(nouvelle, i.getDateEcheance());
        verify(activity).log(any(), any(), org.mockito.ArgumentMatchers.eq("ECHEANCE"), any());
    }

    @Test
    void incidentInconnuRenvoie404() {
        when(incidents.findById(99L)).thenReturn(Optional.empty());
        ApiException e = assertThrows(ApiException.class, () -> service.findById(99L));
        assertEquals(404, e.getStatus().value());
    }
}
