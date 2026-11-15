package com.sip.itcare.controller;

import com.sip.itcare.service.FileStorageService;
import com.sip.itcare.service.FileStorageService.FileType;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * GET /api/files/{clients|incidents|rapports}/{nomDuFichier}
 * - images : affichees dans la page (<img src="...">)
 * - PDF : ouvert dans le navigateur, ou telecharge avec ?download=true
 */
@RestController
@RequestMapping("/api/files")
public class FileController {

    private final FileStorageService storage;

    public FileController(FileStorageService storage) {
        this.storage = storage;
    }

    @GetMapping("/{folder}/{filename:.+}")
    public ResponseEntity<Resource> get(@PathVariable String folder, @PathVariable String filename,
                                        @RequestParam(defaultValue = "false") boolean download) {
        Resource resource = storage.load(FileType.fromFolder(folder), filename);
        ContentDisposition disposition = (download ? ContentDisposition.attachment() : ContentDisposition.inline())
                .filename(filename).build();
        return ResponseEntity.ok()
                .contentType(mediaTypeOf(filename))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .body(resource);
    }

    private static MediaType mediaTypeOf(String filename) {
        String name = filename.toLowerCase();
        if (name.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
            return MediaType.IMAGE_JPEG;
        }
        if (name.endsWith(".pdf")) {
            return MediaType.APPLICATION_PDF;
        }
        return MediaType.APPLICATION_OCTET_STREAM;
    }
}
