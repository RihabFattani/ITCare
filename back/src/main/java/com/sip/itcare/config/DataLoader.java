package com.sip.itcare.config;

import com.sip.itcare.entity.Client;
import com.sip.itcare.entity.Incident;
import com.sip.itcare.entity.Role;
import com.sip.itcare.entity.User;
import com.sip.itcare.enums.Priorite;
import com.sip.itcare.enums.RoleName;
import com.sip.itcare.enums.Statut;
import com.sip.itcare.repository.ClientRepository;
import com.sip.itcare.repository.IncidentCommentRepository;
import com.sip.itcare.repository.IncidentEventRepository;
import com.sip.itcare.entity.IncidentComment;
import com.sip.itcare.entity.IncidentEvent;
import com.sip.itcare.repository.IncidentRepository;
import com.sip.itcare.repository.RoleRepository;
import com.sip.itcare.repository.UserRepository;
import com.sip.itcare.service.FileStorageService;
import com.sip.itcare.service.FileStorageService.FileType;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import javax.imageio.ImageIO;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Jeu d'essai (CDC section 5) : charge uniquement si la base est vide.
 * Comptes : admin@itcare.tn / Admin123!   collab1@itcare.tn et collab2@itcare.tn / Collab123!
 * Budget = duree x 100 TND (tarif horaire fixe).
 */
@Component
public class DataLoader implements CommandLineRunner {

    private static final double TARIF_HORAIRE = 100.0;

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final ClientRepository clientRepository;
    private final IncidentRepository incidentRepository;
    private final PasswordEncoder passwordEncoder;
    private final FileStorageService storage;
    private final IncidentCommentRepository commentRepository;
    private final IncidentEventRepository eventRepository;

    public DataLoader(RoleRepository roleRepository, UserRepository userRepository,
                      ClientRepository clientRepository, IncidentRepository incidentRepository,
                      PasswordEncoder passwordEncoder, FileStorageService storage,
                      IncidentCommentRepository commentRepository, IncidentEventRepository eventRepository) {
        this.commentRepository = commentRepository;
        this.eventRepository = eventRepository;
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.clientRepository = clientRepository;
        this.incidentRepository = incidentRepository;
        this.passwordEncoder = passwordEncoder;
        this.storage = storage;
    }

    /** Client reel du jeu d'essai (ancienNom = nom des anciennes donnees fictives, remplacees au demarrage). */
    private record Demo(String ancienNom, String nom, String activite, String adresse,
                        String tel, String email, String logo) {
    }

    private static final List<Demo> CLIENTS = List.of(
            new Demo("Banque Carthage Finance", "Amen Bank", "banque",
                    "Avenue Mohamed V, 1002 Tunis", "71 148 000", "direction.generale@amenbank.com.tn", "amen-bank.png"),
            new Demo("Clinique Les Jasmins", "Taoufik Hospitals Group", "sante",
                    "Rue de la Feuille d'Erable, Cite Les Pins, Les Berges du Lac 2, 1053 Tunis", "36 411 411",
                    "contact@taoufikhospitalsgroup.com", "taoufik-hospitals.png"),
            new Demo("Ecole Privee Ibn Khaldoun", "ESPRIT", "education",
                    "1-2 rue Andre Ampere, Pole Technologique El Ghazala, 2083 Ariana", "70 685 685",
                    "contact@esprit.tn", "esprit.png"),
            new Demo("Medina Mall", "Tunisia Mall", "commerce",
                    "Rue de l'Ile de Zembretta, Les Berges du Lac 2, Tunis", "71 968 043",
                    "contact@tunisia-mall.com", "tunisia-mall.png"),
            new Demo("Polyclinique El Manar", "Attijari Bank", "banque",
                    "24 rue Hedi Karray, Centre Urbain Nord, 1080 Tunis", "71 141 400",
                    "courrier@attijaribank.com.tn", "attijari-bank.png"),
            new Demo("Microfinance Tunis Invest", "Enda Tamweel", "banque",
                    "Rue de l'Assistance, Cite El Khadra, 1003 Tunis", "71 804 002",
                    "info@endatamweel.tn", "enda-tamweel.png"));

    /** Un incident du jeu d'essai. */
    private record Seed(String libelle, String description, Priorite priorite, int duree,
                        int client, Statut statut, int heures, boolean capture, boolean rapport) {
    }

    private static final List<Seed> SEEDS = List.of(
            new Seed("Logiciel de gestion des rendez-vous inaccessible",
                    "Les secretaires ne peuvent plus ouvrir l'application de rendez-vous : erreur 500 depuis ce matin.",
                    Priorite.HAUTE, 4, 1, Statut.OUVERT, 30, true, false),
            new Seed("Application metier inaccessible apres mise a jour",
                    "Apres la mise a jour de cette nuit, l'application de gestion des comptes affiche une page blanche.",
                    Priorite.HAUTE, 6, 0, Statut.EN_COURS, 50, true, false),
            new Seed("Plateforme pedagogique Moodle inaccessible",
                    "Les enseignants et les eleves ne peuvent plus se connecter a Moodle (timeout).",
                    Priorite.HAUTE, 3, 2, Statut.RESOLU, 120, false, true),
            new Seed("Perte d'acces a la base de donnees MySQL",
                    "Le logiciel de caisse ne se connecte plus au serveur MySQL : Access denied for user.",
                    Priorite.HAUTE, 5, 3, Statut.OUVERT, 40, true, false),
            new Seed("Synchronisation Outlook impossible",
                    "Microsoft Outlook reste bloque sur 'Synchronisation en cours' pour tout le service administratif.",
                    Priorite.MOYENNE, 2, 4, Statut.EN_COURS, 28, false, false),
            new Seed("Imprimante reseau hors ligne",
                    "L'imprimante du guichet 3 apparait hors ligne sur tous les postes.",
                    Priorite.BASSE, 1, 5, Statut.RESOLU, 200, false, false),
            new Seed("Windows Server 2019 ne demarre plus apres une coupure electrique",
                    "Le serveur de fichiers reste bloque sur l'ecran de reparation automatique.",
                    Priorite.HAUTE, 8, 3, Statut.EN_COURS, 10, true, false),
            new Seed("Connexion VPN impossible pour les agents en teletravail",
                    "Le client VPN affiche 'Authentification echouee' pour 5 agents depuis ce matin.",
                    Priorite.MOYENNE, 3, 0, Statut.OUVERT, 5, false, false),
            new Seed("Boite aux lettres Outlook pleine",
                    "Plusieurs enseignants n'ont plus la place de recevoir des emails (quota de 50 Go atteint).",
                    Priorite.BASSE, 1, 2, Statut.RESOLU, 300, false, false),
            new Seed("Sauvegarde MySQL nocturne en echec",
                    "Le script de sauvegarde de la base MySQL echoue depuis deux nuits (disque plein).",
                    Priorite.MOYENNE, 4, 5, Statut.OUVERT, 26, false, false),
            new Seed("Lenteur du Wi-Fi dans les salles de classe",
                    "Le reseau Wi-Fi sature aux heures de cours : debit inferieur a 1 Mbit/s.",
                    Priorite.MOYENNE, 3, 2, Statut.EN_COURS, 72, false, false),
            new Seed("Certificat SSL expire sur le portail patient",
                    "Le navigateur affiche 'Votre connexion n'est pas privee' sur le portail des patients.",
                    Priorite.HAUTE, 2, 1, Statut.RESOLU, 90, false, true),
            new Seed("Poste de caisse bloque par Windows Update",
                    "Le poste de caisse 2 redemarre en boucle sur la mise a jour Windows.",
                    Priorite.BASSE, 2, 3, Statut.OUVERT, 3, false, false),
            new Seed("Antivirus desactive sur plusieurs postes",
                    "La console antivirus signale 8 postes sans protection active dans plusieurs agences.",
                    Priorite.MOYENNE, 2, 4, Statut.RESOLU, 150, false, false),
            new Seed("Acces VPN refuse au service comptabilite",
                    "Le service comptabilite ne peut plus joindre le serveur de fichiers via le VPN.",
                    Priorite.HAUTE, 3, 5, Statut.EN_COURS, 60, false, false));

    @Override
    public void run(String... args) {
        // Les roles doivent toujours exister
        Role admin = ensureRole(RoleName.ADMIN);
        Role collab = ensureRole(RoleName.COLLABORATEUR);

        backfillIncidents(); // echeance, assignation, historique et commentaires des anciens tickets
        refreshDemoClients(); // remplace les anciens clients fictifs par de vrais clients (idempotent)
        restoreMissingDemoFiles(); // hebergement a disque ephemere : regenere les logos/captures/rapports de demo manquants

        if (userRepository.count() > 0) {
            return; // donnees deja presentes
        }

        User u1 = user("admin@itcare.tn", "Admin123!", "Ben Salah", "Karim", "71 000 001", admin, collab);
        User u2 = user("collab1@itcare.tn", "Collab123!", "Trabelsi", "Sarra", "71 000 002", collab);
        User u3 = user("collab2@itcare.tn", "Collab123!", "Gharbi", "Mehdi", "71 000 003", collab);
        List<User> collaborateurs = List.of(u2, u3, u1);

        List<Client> clients = new ArrayList<>();
        for (Demo d : CLIENTS) {
            clients.add(clientRepository.save(applyDemo(new Client(), d)));
        }

        List<Seed> seeds = SEEDS;

        int i = 0;
        for (Seed s : seeds) {
            Incident incident = new Incident();
            incident.setLibelle(s.libelle());
            incident.setDescription(s.description());
            incident.setPriorite(s.priorite());
            incident.setDuree(s.duree());
            incident.setBudget(s.duree() * TARIF_HORAIRE); // coherent : duree x 100 TND
            incident.setStatut(s.statut());
            incident.setDateSignalement(LocalDateTime.now().minusHours(s.heures()));
            incident.setClient(clients.get(s.client()));
            incident.setUser(collaborateurs.get(i % collaborateurs.size()));
            if (s.capture()) {
                incident.setCaptureEcran(storage.saveBytes(captureEcran(s.libelle()), FileType.CAPTURE, ".png"));
            }
            if (s.rapport()) {
                incident.setRapportPdf(storage.saveBytes(rapportPdf(s), FileType.RAPPORT, ".pdf"));
            }
            incidentRepository.save(incident);
            i++;
        }
        backfillIncidents();
        System.out.println(">>> ITCare : jeu d'essai charge (3 utilisateurs, 6 clients reels, 15 incidents)");
    }

    /**
     * Sur un hebergement dont le disque est efface a chaque redemarrage (ex. Render gratuit), la base
     * (MySQL externe) conserve les noms de fichiers mais les fichiers disparaissent. On regenere ici ceux
     * du jeu d'essai (logos, captures, rapports) sous le MEME nom. Les fichiers ajoutes par les utilisateurs
     * ne peuvent pas etre restaures.
     */
    private void restoreMissingDemoFiles() {
        for (Client c : clientRepository.findAll()) {
            if (c.getPhoto() == null || storage.exists(FileType.LOGO, c.getPhoto())) {
                continue;
            }
            CLIENTS.stream().filter(d -> d.nom().equals(c.getNom())).findFirst()
                    .ifPresent(d -> storage.writeBytes(FileType.LOGO, c.getPhoto(), loadLogo(d.logo())));
        }
        for (Incident inc : incidentRepository.findAll()) {
            Seed seed = SEEDS.stream().filter(s -> s.libelle().equals(inc.getLibelle())).findFirst().orElse(null);
            if (seed == null) {
                continue;
            }
            if (inc.getCaptureEcran() != null && !storage.exists(FileType.CAPTURE, inc.getCaptureEcran())) {
                storage.writeBytes(FileType.CAPTURE, inc.getCaptureEcran(), captureEcran(seed.libelle()));
            }
            if (inc.getRapportPdf() != null && !storage.exists(FileType.RAPPORT, inc.getRapportPdf())) {
                storage.writeBytes(FileType.RAPPORT, inc.getRapportPdf(), rapportPdf(seed));
            }
        }
    }

    private Role ensureRole(RoleName name) {
        return roleRepository.findByLibelle(name).orElseGet(() -> roleRepository.save(new Role(name)));
    }

    private User user(String email, String password, String nom, String prenom, String tel, Role... roles) {
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setNom(nom);
        user.setPrenom(prenom);
        user.setTel(tel);
        user.setEnabled(true);
        user.setRoles(Set.of(roles));
        return userRepository.save(user);
    }

    /** Complete les tickets existants (idempotent) : echeance, assigne, historique, quelques commentaires. */
    private void backfillIncidents() {
        List<Incident> all = incidentRepository.findAll();
        int[] jours = {-1, 0, 1, 2, 3, 5};
        for (Incident i : all) {
            boolean changed = false;
            if (i.getDateEcheance() == null) {
                if (i.getStatut() == Statut.RESOLU) {
                    i.setDateEcheance(i.getDateSignalement().plusHours(i.getDuree()));
                } else {
                    int n = (int) (i.getId() % jours.length);
                    i.setDateEcheance(LocalDateTime.now().plusDays(jours[n]).withHour(9 + (int) (i.getId() % 8)).withMinute(0).withSecond(0).withNano(0));
                }
                changed = true;
            }
            if (i.getAssigne() == null) {
                i.setAssigne(i.getUser());
                changed = true;
            }
            if (changed) {
                incidentRepository.save(i);
            }
            if (eventRepository.countByIncidentId(i.getId()) == 0) {
                event(i, i.getUser(), "CREATION", "Ticket cree", i.getDateSignalement());
                if (i.getStatut() != Statut.OUVERT) {
                    event(i, i.getAssigne(), "STATUT", "Ouvert -> En cours", i.getDateSignalement().plusHours(1));
                }
                if (i.getStatut() == Statut.RESOLU) {
                    event(i, i.getAssigne(), "STATUT", "En cours -> Resolu", i.getDateSignalement().plusHours(Math.max(1, i.getDuree())));
                }
            }
        }
        if (commentRepository.count() == 0 && !all.isEmpty()) {
            User admin = userRepository.findByEmail("admin@itcare.tn").orElse(null);
            String[] textes = {
                "J'ai contacte le client : il confirme que le probleme est apparu ce matin.",
                "Merci, je prends la main et je vous tiens au courant dans la journee.",
                "Cause probable identifiee, je prepare la correction avant l'echeance."};
            for (int k = 0; k < Math.min(3, all.size()); k++) {
                Incident i = all.get(k);
                comment(i, k % 2 == 0 ? i.getAssigne() : admin, textes[k], LocalDateTime.now().minusHours(3 - k));
            }
        }
    }

    private void event(Incident i, User auteur, String type, String detail, LocalDateTime date) {
        IncidentEvent e = new IncidentEvent();
        e.setIncident(i);
        e.setAuteur(auteur);
        e.setType(type);
        e.setDetail(detail);
        e.setDate(date);
        eventRepository.save(e);
    }

    private void comment(Incident i, User auteur, String texte, LocalDateTime date) {
        if (auteur == null) {
            return;
        }
        IncidentComment c = new IncidentComment();
        c.setIncident(i);
        c.setAuteur(auteur);
        c.setContenu(texte);
        c.setDate(date);
        commentRepository.save(c);
    }

    private Client applyDemo(Client c, Demo d) {
        c.setNom(d.nom());
        c.setActivite(d.activite());
        c.setAdresse(d.adresse());
        c.setTel(d.tel());
        c.setEmail(d.email());
        c.setPhoto(storage.saveBytes(loadLogo(d.logo()), FileType.LOGO, ".png"));
        return c;
    }

    /** Met a jour les anciens clients fictifs (meme ordre, memes incidents) avec les vrais clients. */
    private void refreshDemoClients() {
        for (Demo d : CLIENTS) {
            clientRepository.findAll().stream()
                    .filter(c -> d.ancienNom().equals(c.getNom()))
                    .findFirst()
                    .ifPresent(c -> {
                        String ancienLogo = c.getPhoto();
                        clientRepository.save(applyDemo(c, d));
                        if (ancienLogo != null) {
                            storage.delete(ancienLogo, FileType.LOGO);
                        }
                    });
        }
    }

    private byte[] loadLogo(String file) {
        try (var in = getClass().getResourceAsStream("/seed/logos/" + file)) {
            if (in == null) {
                throw new IllegalStateException("Logo introuvable : " + file);
            }
            return in.readAllBytes();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    // ---------- Generation des fichiers d'exemple ----------

    /** Logo : un cercle colore avec les initiales du client. */
    private byte[] logo(String nom, Color color) {
        BufferedImage img = new BufferedImage(200, 200, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setColor(color);
        g.fillOval(0, 0, 200, 200);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 72));
        String initials = initials(nom);
        int w = g.getFontMetrics().stringWidth(initials);
        g.drawString(initials, (200 - w) / 2, 118);
        g.dispose();
        return toPng(img);
    }

    /** Fausse capture d'ecran : une fenetre d'erreur avec le titre de l'incident. */
    private byte[] captureEcran(String libelle) {
        BufferedImage img = new BufferedImage(640, 360, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);
        g.setColor(new Color(0x2B579A));
        g.fillRect(0, 0, 640, 360);
        g.setColor(Color.WHITE);
        g.fillRect(60, 60, 520, 240);
        g.setColor(new Color(0xC42B1C));
        g.fillRect(60, 60, 520, 34);
        g.setColor(Color.WHITE);
        g.setFont(new Font("SansSerif", Font.BOLD, 16));
        g.drawString("Erreur systeme", 72, 83);
        g.setColor(Color.DARK_GRAY);
        g.setFont(new Font("SansSerif", Font.PLAIN, 15));
        g.drawString(ascii(libelle).length() > 60 ? ascii(libelle).substring(0, 60) : ascii(libelle), 80, 150);
        g.drawString("Code d'erreur : 0x80070005", 80, 185);
        g.drawString("Contactez votre administrateur.", 80, 215);
        g.setColor(new Color(0xE1E1E1));
        g.fillRect(460, 250, 100, 30);
        g.setColor(Color.BLACK);
        g.drawString("OK", 500, 271);
        g.dispose();
        return toPng(img);
    }

    /** Rapport d'intervention : un PDF d'une page ecrit a la main (ASCII uniquement). */
    private byte[] rapportPdf(Seed s) {
        String[] lines = {
                "RAPPORT D'INTERVENTION - ITCare",
                "Incident : " + ascii(s.libelle()),
                "Priorite : " + s.priorite() + "    Duree : " + s.duree() + " h    Cout : "
                        + (int) (s.duree() * TARIF_HORAIRE) + " TND",
                "Statut final : RESOLU",
                "Intervention terminee, service retabli et verifie avec le client."
        };
        StringBuilder text = new StringBuilder("BT /F1 13 Tf 50 780 Td 20 TL\n");
        for (String line : lines) {
            text.append("(").append(line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")).append(") Tj T*\n");
        }
        text.append("ET");
        String content = text.toString();

        String[] objects = {
                "<< /Type /Catalog /Pages 2 0 R >>",
                "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
                "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R "
                        + "/Resources << /Font << /F1 4 0 R >> >> >>",
                "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
                "<< /Length " + content.length() + " >>\nstream\n" + content + "\nendstream"
        };
        StringBuilder pdf = new StringBuilder("%PDF-1.4\n");
        int[] offsets = new int[objects.length];
        for (int n = 0; n < objects.length; n++) {
            offsets[n] = pdf.length();
            pdf.append(n + 1).append(" 0 obj\n").append(objects[n]).append("\nendobj\n");
        }
        int xref = pdf.length();
        pdf.append("xref\n0 ").append(objects.length + 1).append("\n0000000000 65535 f \n");
        for (int offset : offsets) {
            pdf.append(String.format("%010d 00000 n \n", offset));
        }
        pdf.append("trailer\n<< /Size ").append(objects.length + 1).append(" /Root 1 0 R >>\n")
                .append("startxref\n").append(xref).append("\n%%EOF");
        return pdf.toString().getBytes(StandardCharsets.ISO_8859_1);
    }

    private static byte[] toPng(BufferedImage img) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(img, "png", out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String initials(String nom) {
        StringBuilder sb = new StringBuilder();
        for (String word : ascii(nom).split("\\s+")) {
            if (word.length() > 3 && sb.length() < 2) {
                sb.append(Character.toUpperCase(word.charAt(0)));
            }
        }
        return sb.length() == 0 ? "IT" : sb.toString();
    }

    /** Retire les accents pour rester en ASCII (PDF et polices). */
    private static String ascii(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
    }
}
