package com.sip.itcare.service;

import com.sip.itcare.exception.ApiException;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileStorageService {

    /** Les 3 types de fichiers du CDC : dossier, formats acceptes, taille max. */
    public enum FileType {
        LOGO("clients", Set.of("image/jpeg", "image/png"), 2),
        CAPTURE("incidents", Set.of("image/jpeg", "image/png"), 2),
        RAPPORT("rapports", Set.of("application/pdf"), 5),
        AVATAR("avatars", Set.of("image/jpeg", "image/png"), 2);

        public final String folder;
        public final Set<String> mimes;
        public final long maxMo;

        FileType(String folder, Set<String> mimes, long maxMo) {
            this.folder = folder;
            this.mimes = mimes;
            this.maxMo = maxMo;
        }

        public static FileType fromFolder(String folder) {
            for (FileType t : values()) {
                if (t.folder.equals(folder)) {
                    return t;
                }
            }
            throw ApiException.notFound("Type de fichier inconnu : " + folder);
        }
    }

    @Value("${app.upload-dir}")
    private String uploadDir;

    private Path root;

    /** Au demarrage : cree uploads/clients, uploads/incidents, uploads/rapports. */
    @PostConstruct
    void init() throws IOException {
        root = Paths.get(uploadDir).toAbsolutePath().normalize();
        for (FileType t : FileType.values()) {
            Files.createDirectories(root.resolve(t.folder));
        }
    }

    /**
     * Valide puis enregistre le fichier. Retourne le nom UUID (a stocker en base)
     * ou null si aucun fichier n'a ete envoye (les fichiers sont facultatifs).
     */
    public String save(MultipartFile file, FileType type) {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (file.getSize() > type.maxMo * 1024 * 1024) {
            throw ApiException.badRequest("Fichier trop volumineux : maximum " + type.maxMo + " Mo");
        }
        String mime = file.getContentType();
        if (mime == null || !type.mimes.contains(mime)) {
            throw ApiException.badRequest("Format invalide (" + mime + ") : formats acceptes = " + type.mimes);
        }
        try (InputStream in = file.getInputStream()) {
            byte[] head = in.readNBytes(4);
            if (!signatureMatches(mime, head)) {
                throw ApiException.badRequest("Le contenu du fichier ne correspond pas a son format " + mime);
            }
        } catch (IOException e) {
            throw ApiException.badRequest("Fichier illisible");
        }
        try (InputStream in = file.getInputStream()) {
            String name = UUID.randomUUID() + extensionOf(mime);
            Files.copy(in, root.resolve(type.folder).resolve(name));
            return name;
        } catch (IOException e) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "Erreur lors de l'enregistrement du fichier");
        }
    }

    /** Enregistre des octets generes par le serveur (utilise par le jeu d'essai). */
    public String saveBytes(byte[] data, FileType type, String extension) {
        try {
            String name = UUID.randomUUID() + extension;
            Files.write(root.resolve(type.folder).resolve(name), data);
            return name;
        } catch (IOException e) {
            throw new IllegalStateException("Impossible d'ecrire le fichier", e);
        }
    }

    /** Vrai si le fichier existe sur le disque (sert a restaurer les fichiers de demo apres un redemarrage). */
    public boolean exists(FileType type, String filename) {
        return filename != null && !filename.isBlank() && Files.exists(resolve(type, filename));
    }

    /** Ecrit des octets sous un nom donne (restauration des fichiers du jeu d'essai). */
    public void writeBytes(FileType type, String filename, byte[] data) {
        try {
            Files.write(resolve(type, filename), data);
        } catch (IOException e) {
            throw new IllegalStateException("Impossible d'ecrire le fichier", e);
        }
    }

    /** RG9 : suppression PHYSIQUE du fichier. Sans effet si le nom est null. */
    public void delete(String filename, FileType type) {
        if (filename == null || filename.isBlank()) {
            return;
        }
        try {
            Files.deleteIfExists(resolve(type, filename));
        } catch (IOException e) {
            throw new ApiException(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR,
                    "Impossible de supprimer le fichier " + filename);
        }
    }

    public Resource load(FileType type, String filename) {
        try {
            Path path = resolve(type, filename);
            Resource resource = new UrlResource(path.toUri());
            if (!resource.exists()) {
                throw ApiException.notFound("Fichier introuvable");
            }
            return resource;
        } catch (MalformedURLException e) {
            throw ApiException.notFound("Fichier introuvable");
        }
    }

    /** Securite : empeche les noms du type "../../secret.txt" (path traversal). */
    private Path resolve(FileType type, String filename) {
        Path dir = root.resolve(type.folder).normalize();
        Path file = dir.resolve(filename).normalize();
        if (!file.startsWith(dir)) {
            throw ApiException.badRequest("Nom de fichier invalide");
        }
        return file;
    }

    private static String extensionOf(String mime) {
        return switch (mime) {
            case "image/png" -> ".png";
            case "image/jpeg" -> ".jpg";
            default -> ".pdf";
        };
    }

    /** Verifie les premiers octets : PNG = 89 50 4E 47, JPEG = FF D8 FF, PDF = "%PDF". */
    private static boolean signatureMatches(String mime, byte[] h) {
        if (h.length < 3) {
            return false;
        }
        return switch (mime) {
            case "image/png" -> h.length >= 4 && (h[0] & 0xFF) == 0x89 && h[1] == 'P' && h[2] == 'N' && h[3] == 'G';
            case "image/jpeg" -> (h[0] & 0xFF) == 0xFF && (h[1] & 0xFF) == 0xD8 && (h[2] & 0xFF) == 0xFF;
            case "application/pdf" -> h.length >= 4 && h[0] == '%' && h[1] == 'P' && h[2] == 'D' && h[3] == 'F';
            default -> false;
        };
    }
}
