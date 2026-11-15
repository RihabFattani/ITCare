package com.sip.itcare.service;

import com.sip.itcare.entity.Incident;
import com.sip.itcare.entity.IncidentEvent;
import com.sip.itcare.entity.Notification;
import com.sip.itcare.entity.User;
import com.sip.itcare.repository.IncidentEventRepository;
import com.sip.itcare.repository.NotificationRepository;
import org.springframework.stereotype.Service;

/** Historique des tickets et notifications internes. */
@Service
public class ActivityService {

    private final IncidentEventRepository events;
    private final NotificationRepository notifications;

    public ActivityService(IncidentEventRepository events, NotificationRepository notifications) {
        this.events = events;
        this.notifications = notifications;
    }

    public void log(Incident incident, User auteur, String type, String detail) {
        IncidentEvent e = new IncidentEvent();
        e.setIncident(incident);
        e.setAuteur(auteur);
        e.setType(type);
        e.setDetail(detail);
        events.save(e);
    }

    /** Notifie un utilisateur (ignore si null ou si c'est l'auteur de l'action). */
    public void notify(User destinataire, User auteur, String message, String lien) {
        if (destinataire == null || (auteur != null && destinataire.getId().equals(auteur.getId()))) {
            return;
        }
        Notification n = new Notification();
        n.setUser(destinataire);
        n.setMessage(message);
        n.setLien(lien);
        notifications.save(n);
    }
}
