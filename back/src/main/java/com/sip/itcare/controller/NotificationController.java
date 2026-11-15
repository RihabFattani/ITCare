package com.sip.itcare.controller;

import com.sip.itcare.entity.Notification;
import com.sip.itcare.exception.ApiException;
import com.sip.itcare.repository.NotificationRepository;
import com.sip.itcare.repository.UserRepository;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/** Notifications de l'utilisateur connecte (cloche de la barre du haut). */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationRepository notifications;
    private final UserRepository users;

    public NotificationController(NotificationRepository notifications, UserRepository users) {
        this.notifications = notifications;
        this.users = users;
    }

    @GetMapping
    public List<Notification> mine(Authentication auth) {
        return notifications.findTop30ByUserIdOrderByDateDesc(userId(auth));
    }

    @PatchMapping("/{id}/read")
    public Notification read(@PathVariable Long id, Authentication auth) {
        Notification n = notifications.findById(id).orElseThrow(() -> ApiException.notFound("Notification introuvable"));
        if (!n.getUser().getId().equals(userId(auth))) {
            throw ApiException.forbidden("Acces refuse");
        }
        n.setLu(true);
        return notifications.save(n);
    }

    @PostMapping("/read-all")
    @Transactional
    public Map<String, Integer> readAll(Authentication auth) {
        return Map.of("updated", notifications.markAllRead(userId(auth)));
    }

    private Long userId(Authentication auth) {
        return users.findByEmail(auth.getName()).orElseThrow(() -> ApiException.unauthorized("Utilisateur introuvable")).getId();
    }
}
