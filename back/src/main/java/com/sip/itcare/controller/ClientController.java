package com.sip.itcare.controller;

import com.sip.itcare.dto.ClientForm;
import com.sip.itcare.entity.Client;
import com.sip.itcare.service.ClientService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/clients")
public class ClientController {

    private final ClientService service;

    public ClientController(ClientService service) {
        this.service = service;
    }

    /** GET /api/clients?q=banque&activite=sante  (recherche par nom + filtre par activite) */
    @GetMapping
    public List<Client> list(@RequestParam(required = false) String q,
                             @RequestParam(required = false) String activite) {
        return service.search(q, activite);
    }

    @GetMapping("/{id}")
    public Client get(@PathVariable Long id) {
        return service.findById(id);
    }

    /** multipart/form-data : nom, tel, email, adresse, activite, photo (fichier facultatif) */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public Client create(@Valid @ModelAttribute ClientForm form) {
        return service.create(form);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public Client update(@PathVariable Long id, @Valid @ModelAttribute ClientForm form) {
        return service.update(id, form);
    }

    @DeleteMapping("/{id}/photo")
    public Client removePhoto(@PathVariable Long id) {
        return service.removePhoto(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
