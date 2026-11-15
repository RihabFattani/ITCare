package com.sip.itcare.service;

import com.sip.itcare.entity.Incident;
import com.sip.itcare.enums.Priorite;
import com.sip.itcare.enums.Statut;
import com.sip.itcare.repository.IncidentRepository;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Tache planifiee : chaque jour, email a l'admin listant les incidents
 * de priorite HAUTE encore au statut OUVERT depuis plus de 24 heures.
 */
@Service
public class ReminderService {

    private static final Logger log = LoggerFactory.getLogger(ReminderService.class);

    private final IncidentRepository incidentRepository;
    private final MailService mailService;

    public ReminderService(IncidentRepository incidentRepository, MailService mailService) {
        this.incidentRepository = incidentRepository;
        this.mailService = mailService;
    }

    /** Declenchee automatiquement selon app.reminder.cron (par defaut tous les jours a 08:00). */
    @Scheduled(cron = "${app.reminder.cron}", zone = "Africa/Tunis")
    public void scheduledReminder() {
        int n = sendReminder();
        log.info("Rappel quotidien : {} incident(s) HAUTE ouvert(s) depuis plus de 24 h", n);
    }

    /** Retourne le nombre d'incidents signales (aucun email si la liste est vide). */
    public int sendReminder() {
        List<Incident> late = incidentRepository.findByPrioriteAndStatutAndDateSignalementBefore(
                Priorite.HAUTE, Statut.OUVERT, LocalDateTime.now().minusHours(24));
        if (late.isEmpty()) {
            return 0;
        }
        StringBuilder body = new StringBuilder("Bonjour,\n\n")
                .append(late.size()).append(" incident(s) de priorite HAUTE sont toujours OUVERT depuis plus de 24 h :\n\n");
        for (Incident i : late) {
            long hours = Duration.between(i.getDateSignalement(), LocalDateTime.now()).toHours();
            body.append("  - #").append(i.getId()).append(" ").append(i.getLibelle())
                    .append(" | client : ").append(i.getClient().getNom())
                    .append(" | ouvert depuis ").append(hours).append(" h\n");
        }
        body.append("\nMerci de les prendre en charge.\n\nITCare - IT Incident & Support Management System");
        mailService.sendToAdmins("[ITCare] " + late.size() + " incident(s) HAUTE non pris en charge", body.toString());
        return late.size();
    }
}
