package com.sip.itcare.service;

import com.sip.itcare.entity.User;
import com.sip.itcare.enums.RoleName;
import com.sip.itcare.repository.UserRepository;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Envoi des emails aux administrateurs.
 * - SMTP configure (spring.mail.host) : vrai envoi.
 * - Sinon : le contenu est affiche dans la console (mode developpement).
 * Un echec d'envoi est journalise mais ne fait JAMAIS echouer l'operation metier
 * (ex. : l'inscription reste enregistree, l'admin peut activer le compte depuis l'application).
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final UserRepository userRepository;
    private final String from;

    public MailService(ObjectProvider<JavaMailSender> mailSender, UserRepository userRepository,
                       @Value("${app.mail-from}") String from) {
        this.mailSender = mailSender;
        this.userRepository = userRepository;
        this.from = from;
    }

    /** Envoie un email a une adresse. Sans SMTP, le contenu est affiche dans la console (mode dev). */
    public boolean sendTo(String to, String subject, String body) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.info("SMTP non configure - email simule\n  A : {}\n  Sujet : {}\n{}", to, subject, body);
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            return true;
        } catch (Exception e) {
            log.error("Echec d'envoi de l'email '{}' : {}", subject, e.getMessage());
            return false;
        }
    }

    /** Envoie un email a tous les admins actifs. Retourne true si l'envoi SMTP a reussi. */
    public boolean sendToAdmins(String subject, String body) {
        List<String> to = userRepository.findByRoles_LibelleAndEnabledTrue(RoleName.ADMIN)
                .stream().map(User::getEmail).toList();
        if (to.isEmpty()) {
            log.warn("Aucun admin actif : email '{}' non envoye", subject);
            return false;
        }
        JavaMailSender sender = mailSender.getIfAvailable();
        if (sender == null) {
            log.info("SMTP non configure - email simule\n  A : {}\n  Sujet : {}\n{}", to, subject, body);
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to.toArray(new String[0]));
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            return true;
        } catch (Exception e) {
            log.error("Echec d'envoi de l'email '{}' : {}", subject, e.getMessage());
            return false;
        }
    }
}
