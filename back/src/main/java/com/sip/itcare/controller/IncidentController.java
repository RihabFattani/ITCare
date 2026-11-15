package com.sip.itcare.controller;

import com.sip.itcare.dto.CommentRequest;
import com.sip.itcare.dto.IncidentForm;
import com.sip.itcare.entity.Incident;
import com.sip.itcare.entity.IncidentComment;
import com.sip.itcare.entity.IncidentEvent;
import com.sip.itcare.enums.Priorite;
import com.sip.itcare.enums.Statut;
import com.sip.itcare.service.IncidentService;
import jakarta.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {

    private final IncidentService service;

    public IncidentController(IncidentService service) {
        this.service = service;
    }

    /** GET /api/incidents?q=outlook&statut=OUVERT&priorite=HAUTE&clientId=2 */
    @GetMapping
    public List<Incident> list(@RequestParam(required = false) String q,
                               @RequestParam(required = false) Statut statut,
                               @RequestParam(required = false) Priorite priorite,
                               @RequestParam(required = false) Long clientId) {
        return service.search(q, statut, priorite, clientId);
    }

    @GetMapping("/{id}")
    public Incident get(@PathVariable Long id) {
        return service.findById(id);
    }

    /**
     * multipart/form-data : libelle, description, budget, duree, priorite, idClient, captureEcran.
     * L'utilisateur qui enregistre l'incident est celui du token JWT.
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Incident create(@Valid @ModelAttribute IncidentForm form, Authentication authentication) {
        boolean admin = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        return service.create(form, authentication.getName(), admin);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Incident update(@PathVariable Long id, @Valid @ModelAttribute IncidentForm form, Authentication authentication) {
        return service.update(id, form, authentication.getName());
    }

    /** PATCH /api/incidents/5/statut?statut=EN_COURS */
    @PatchMapping("/{id}/statut")
    public Incident changeStatut(@PathVariable Long id, @RequestParam Statut statut, Authentication authentication) {
        return service.changeStatut(id, statut, authentication.getName());
    }

    /** PATCH /api/incidents/5/echeance?value=2026-11-20T14:00 (Admin : replanification depuis le calendrier) */
    @PatchMapping("/{id}/echeance")
    public Incident reschedule(@PathVariable Long id,
                               @RequestParam("value") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime value,
                               Authentication authentication) {
        return service.reschedule(id, value, authentication.getName());
    }

    /** PATCH /api/incidents/5/assignee?userId=2 (Admin) */
    @PatchMapping("/{id}/assignee")
    public Incident assign(@PathVariable Long id, @RequestParam Long userId, Authentication authentication) {
        return service.assign(id, userId, authentication.getName());
    }

    @GetMapping("/{id}/comments")
    public List<IncidentComment> comments(@PathVariable Long id) {
        return service.comments(id);
    }

    /** Tout utilisateur connecte peut commenter. */
    @PostMapping("/{id}/comments")
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentComment addComment(@PathVariable Long id, @Valid @RequestBody CommentRequest request,
                                      Authentication authentication) {
        return service.addComment(id, request, authentication.getName());
    }

    @GetMapping("/{id}/history")
    public List<IncidentEvent> history(@PathVariable Long id) {
        return service.history(id);
    }

    /** multipart/form-data : file (PDF, 5 Mo max) */
    @PostMapping(value = "/{id}/rapport", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Incident addRapport(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return service.setRapport(id, file);
    }

    @DeleteMapping("/{id}/rapport")
    public Incident removeRapport(@PathVariable Long id) {
        return service.removeRapport(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
