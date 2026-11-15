package com.sip.itcare.service;

import com.sip.itcare.dto.ClientForm;
import com.sip.itcare.entity.Client;
import com.sip.itcare.exception.ApiException;
import com.sip.itcare.repository.ClientRepository;
import com.sip.itcare.repository.IncidentRepository;
import com.sip.itcare.service.FileStorageService.FileType;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientService {

    private final ClientRepository clientRepository;
    private final IncidentRepository incidentRepository;
    private final FileStorageService storage;

    public ClientService(ClientRepository clientRepository, IncidentRepository incidentRepository,
                         FileStorageService storage) {
        this.clientRepository = clientRepository;
        this.incidentRepository = incidentRepository;
        this.storage = storage;
    }

    public List<Client> search(String q, String activite) {
        return clientRepository.search(blankToNull(q), blankToNull(activite));
    }

    public Client findById(Long id) {
        return clientRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Client introuvable : " + id));
    }

    @Transactional
    public Client create(ClientForm form) {
        Client client = new Client();
        apply(client, form);
        client.setPhoto(storage.save(form.photo(), FileType.LOGO));
        return clientRepository.save(client);
    }

    @Transactional
    public Client update(Long id, ClientForm form) {
        Client client = findById(id);
        apply(client, form);
        String newPhoto = storage.save(form.photo(), FileType.LOGO);
        if (newPhoto != null) {
            storage.delete(client.getPhoto(), FileType.LOGO); // RG9 : on supprime l'ancien logo
            client.setPhoto(newPhoto);
        }
        return clientRepository.save(client);
    }

    @Transactional
    public Client removePhoto(Long id) {
        Client client = findById(id);
        storage.delete(client.getPhoto(), FileType.LOGO); // RG9
        client.setPhoto(null);
        return clientRepository.save(client);
    }

    @Transactional
    public void delete(Long id) {
        Client client = findById(id);
        // RG6 : un client lie a au moins un incident ne peut pas etre supprime
        if (incidentRepository.existsByClientId(id)) {
            throw ApiException.conflict("Suppression impossible : ce client est lie a des incidents");
        }
        storage.delete(client.getPhoto(), FileType.LOGO); // RG9
        clientRepository.delete(client);
    }

    private void apply(Client client, ClientForm form) {
        client.setNom(form.nom());
        client.setTel(form.tel());
        client.setEmail(form.email());
        client.setAdresse(form.adresse());
        client.setActivite(form.activite());
    }

    private static String blankToNull(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
}
