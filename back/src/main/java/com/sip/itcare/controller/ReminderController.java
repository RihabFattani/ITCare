package com.sip.itcare.controller;

import com.sip.itcare.service.ReminderService;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Declenchement manuel du rappel (Admin) : utile pour tester sans attendre 08:00. */
@RestController
@RequestMapping("/api/admin/reminder")
public class ReminderController {

    private final ReminderService service;

    public ReminderController(ReminderService service) {
        this.service = service;
    }

    @PostMapping("/run")
    public Map<String, Integer> run() {
        return Map.of("incidentsSignales", service.sendReminder());
    }
}
