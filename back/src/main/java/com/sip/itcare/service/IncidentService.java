package com.sip.itcare.service;

import com.sip.itcare.dto.CommentRequest;
import com.sip.itcare.dto.IncidentForm;
import com.sip.itcare.entity.Client;
import com.sip.itcare.entity.Incident;
import com.sip.itcare.entity.IncidentComment;
import com.sip.itcare.entity.IncidentEvent;
import com.sip.itcare.entity.User;
import com.sip.itcare.enums.Priorite;
import com.sip.itcare.enums.Statut;
import com.sip.itcare.exception.ApiException;
import com.sip.itcare.repository.ClientRepository;
import com.sip.itcare.repository.IncidentCommentRepository;
import com.sip.itcare.repository.IncidentEventRepository;
import com.sip.itcare.repository.IncidentRepository;
import com.sip.itcare.repository.UserRepository;
import com.sip.itcare.service.FileStorageService.FileType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class IncidentService {

    private final IncidentRepository incidentRepository;
    private final ClientRepository clientRepository;
    private final UserRepository userRepository;
    private final FileStorageService storage;
    private final ActivityService activity;
    private final IncidentCommentRepository commentRepository;
    private final IncidentEventRepository eventRepository;

    public IncidentService(IncidentRepository incidentRepository, ClientRepository clientRepository,
                           UserRepository userRepository, FileStorageService storage, ActivityService activity,
                           IncidentCommentRepository commentRepository, IncidentEventRepository eventRepository) {
        this.activity = activity;
        this.commentRepository = commentRepository;
        this.eventRepository = eventRepository;
        this.incidentRepository = incidentRepository;
        this.clientRepository = clientRepository;
        this.userRepository = userRepository;
        this.storage = storage;
    }

    public List<Incident> search(String q, Statut statut, Priorite priorite, Long clientId) {
        String query = (q == null || q.isBlank()) ? null : q.trim();
        return incidentRepository.search(query, statut, priorite, clientId);
    }

    public Incident findById(Long id) {
        return incidentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Incident introuvable : " + id));
    }

    /** RG1 : statut OUVERT + date de signalement = maintenant. RG5 : client obligatoire et existant. */
    @Transactional
    public Incident create(IncidentForm form, String userEmail, boolean admin) {
        Incident incident = new Incident();
        applyFields(incident, form);
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> ApiException.unauthorized("Utilisateur connecte introuvable"));
        incident.setUser(user);
        // Seul l'Admin peut affecter le ticket a quelqu'un d'autre ; sinon il est pour le createur
        User assigne = user;
        if (admin && form.idAssigne() != null) {
            assigne = userRepository.findById(form.idAssigne())
                    .orElseThrow(() -> ApiException.badRequest("Utilisateur introuvable : " + form.idAssigne()));
        }
        incident.setAssigne(assigne);
        incident.setStatut(Statut.OUVERT);
        incident.setDateSignalement(LocalDateTime.now());
        incident.setDateEcheance(form.dateEcheance() != null && admin ? form.dateEcheance()
                : incident.getDateSignalement().plusHours(incident.getDuree()));
        incident.setCaptureEcran(storage.save(form.captureEcran(), FileType.CAPTURE));
        Incident saved = incidentRepository.save(incident);
        activity.log(saved, user, "CREATION", "Ticket cree et affecte a " + nom(assigne));
        activity.notify(assigne, user, "Nouveau ticket affecte : " + saved.getLibelle(), "/incidents/" + saved.getId());
        return saved;
    }

    /** Modification reservee a l'Admin (controle par la securite plus tard). RG7 : interdit si RESOLU. */
    @Transactional
    public Incident update(Long id, IncidentForm form, String actorEmail) {
        Incident incident = findById(id);
        checkNotResolved(incident);
        User actor = userByEmail(actorEmail);
        applyFields(incident, form);
        if (form.dateEcheance() != null && !form.dateEcheance().equals(incident.getDateEcheance())) {
            incident.setDateEcheance(form.dateEcheance());
            activity.log(incident, actor, "ECHEANCE", "Echeance fixee au " + fmt(form.dateEcheance()));
        }
        if (form.idAssigne() != null
                && (incident.getAssigne() == null || !incident.getAssigne().getId().equals(form.idAssigne()))) {
            applyAssignee(incident, form.idAssigne(), actor);
        }
        activity.log(incident, actor, "MODIFICATION", "Ticket modifie");
        String newCapture = storage.save(form.captureEcran(), FileType.CAPTURE);
        if (newCapture != null) {
            storage.delete(incident.getCaptureEcran(), FileType.CAPTURE); // RG9
            incident.setCaptureEcran(newCapture);
        }
        return incidentRepository.save(incident);
    }

    /**
     * RG2 : OUVERT -> EN_COURS -> RESOLU uniquement, sans retour en arriere ni saut.
     * RG8 (seul l'Admin) sera applique dans la couche securite.
     */
    @Transactional
    public Incident changeStatut(Long id, Statut nouveau, String actorEmail) {
        Incident incident = findById(id);
        User actor = userByEmail(actorEmail);
        if (actor == null) {
            throw ApiException.unauthorized("Utilisateur connecte introuvable");
        }
        // Admin : tous les tickets. Collaborateur : uniquement les tickets qui lui sont affectes
        User responsable = incident.getAssigne() != null ? incident.getAssigne() : incident.getUser();
        boolean admin = actor.getRoles().stream().anyMatch(r -> r.getLibelle() == com.sip.itcare.enums.RoleName.ADMIN);
        if (!admin && !actor.getId().equals(responsable.getId())) {
            throw ApiException.forbidden("Seul le collaborateur assigne a ce ticket (ou un admin) peut changer son statut");
        }
        Statut actuel = incident.getStatut();
        Statut attendu = switch (actuel) {
            case OUVERT -> Statut.EN_COURS;
            case EN_COURS -> Statut.RESOLU;
            case RESOLU -> null;
        };
        if (attendu == null) {
            throw ApiException.conflict("Incident deja RESOLU : le statut ne peut plus changer");
        }
        if (nouveau != attendu) {
            throw ApiException.conflict("Transition interdite " + actuel + " -> " + nouveau
                    + " (transition autorisee : " + actuel + " -> " + attendu + ")");
        }
        incident.setStatut(nouveau);
        Incident saved = incidentRepository.save(incident);
        activity.log(saved, actor, "STATUT", libelleStatut(actuel) + " -> " + libelleStatut(nouveau));
        String msg = "Ticket \"" + saved.getLibelle() + "\" : " + libelleStatut(nouveau);
        activity.notify(saved.getAssigne(), actor, msg, "/incidents/" + saved.getId());
        activity.notify(saved.getUser(), actor, msg, "/incidents/" + saved.getId());
        return saved;
    }

    /** Replanification (calendrier) : Admin uniquement, interdit si le ticket est RESOLU (RG7). */
    @Transactional
    public Incident reschedule(Long id, LocalDateTime echeance, String actorEmail) {
        Incident incident = findById(id);
        checkNotResolved(incident);
        incident.setDateEcheance(echeance);
        Incident saved = incidentRepository.save(incident);
        User actor = userByEmail(actorEmail);
        activity.log(saved, actor, "ECHEANCE", "Echeance deplacee au " + fmt(echeance));
        activity.notify(saved.getAssigne(), actor, "Echeance modifiee (" + fmt(echeance) + ") : " + saved.getLibelle(),
                "/incidents/" + saved.getId());
        return saved;
    }

    @Transactional
    public Incident assign(Long id, Long userId, String actorEmail) {
        Incident incident = findById(id);
        checkNotResolved(incident);
        applyAssignee(incident, userId, userByEmail(actorEmail));
        return incidentRepository.save(incident);
    }

    @Transactional
    public IncidentComment addComment(Long id, CommentRequest req, String authorEmail) {
        Incident incident = findById(id);
        User author = userByEmail(authorEmail);
        IncidentComment c = new IncidentComment();
        c.setIncident(incident);
        c.setAuteur(author);
        c.setContenu(req.contenu().trim());
        IncidentComment saved = commentRepository.save(c);
        activity.log(incident, author, "COMMENTAIRE", "Nouveau commentaire");
        String msg = nom(author) + " a commente : " + incident.getLibelle();
        activity.notify(incident.getAssigne(), author, msg, "/incidents/" + id);
        activity.notify(incident.getUser(), author, msg, "/incidents/" + id);
        return saved;
    }

    public List<IncidentComment> comments(Long id) {
        findById(id);
        return commentRepository.findByIncidentIdOrderByDateAsc(id);
    }

    public List<IncidentEvent> history(Long id) {
        findById(id);
        return eventRepository.findByIncidentIdOrderByDateDesc(id);
    }

    private void applyAssignee(Incident incident, Long userId, User actor) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.badRequest("Utilisateur introuvable : " + userId));
        if (!target.isEnabled()) {
            throw ApiException.badRequest("Ce compte n'est pas active");
        }
        incident.setAssigne(target);
        activity.log(incident, actor, "ASSIGNATION", "Affecte a " + nom(target));
        activity.notify(target, actor, "Ticket affecte : " + incident.getLibelle(), "/incidents/" + incident.getId());
    }

    private User userByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }

    private static String nom(User u) {
        return u == null ? "-" : ((u.getPrenom() == null ? "" : u.getPrenom() + " ") + u.getNom()).trim();
    }

    private static String fmt(LocalDateTime d) {
        return d.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"));
    }

    private static String libelleStatut(Statut s) {
        return switch (s) {
            case OUVERT -> "Ouvert";
            case EN_COURS -> "En cours";
            case RESOLU -> "Resolu";
        };
    }

    /**
     * Rapport PDF : ajoute par l'Admin sur un incident RESOLU (Fig.2).
     * C'est la seule modification possible apres RESOLU (exception a RG7).
     */
    @Transactional
    public Incident setRapport(Long id, MultipartFile file) {
        Incident incident = findById(id);
        if (incident.getStatut() != Statut.RESOLU) {
            throw ApiException.conflict("Le rapport d'intervention ne peut etre ajoute qu'a un incident RESOLU");
        }
        String name = storage.save(file, FileType.RAPPORT);
        if (name == null) {
            throw ApiException.badRequest("Aucun fichier PDF recu");
        }
        storage.delete(incident.getRapportPdf(), FileType.RAPPORT); // RG9
        incident.setRapportPdf(name);
        return incidentRepository.save(incident);
    }

    @Transactional
    public Incident removeRapport(Long id) {
        Incident incident = findById(id);
        storage.delete(incident.getRapportPdf(), FileType.RAPPORT); // RG9
        incident.setRapportPdf(null);
        return incidentRepository.save(incident);
    }

    @Transactional
    public void delete(Long id) {
        Incident incident = findById(id);
        storage.delete(incident.getCaptureEcran(), FileType.CAPTURE); // RG9
        storage.delete(incident.getRapportPdf(), FileType.RAPPORT);
        commentRepository.deleteByIncidentId(id);
        eventRepository.deleteByIncidentId(id);
        incidentRepository.delete(incident);
    }

    private void applyFields(Incident incident, IncidentForm form) {
        Client client = clientRepository.findById(form.idClient())
                .orElseThrow(() -> ApiException.badRequest("Client introuvable : " + form.idClient())); // RG5
        incident.setLibelle(form.libelle());
        incident.setDescription(form.description());
        incident.setBudget(form.budget());
        incident.setDuree(form.duree());
        incident.setPriorite(form.priorite());
        incident.setClient(client);
    }

    private void checkNotResolved(Incident incident) {
        if (incident.getStatut() == Statut.RESOLU) { // RG7
            throw ApiException.conflict("Un incident RESOLU n'est plus modifiable");
        }
    }
}
