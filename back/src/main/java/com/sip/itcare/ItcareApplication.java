package com.sip.itcare;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling // active les taches @Scheduled (rappel quotidien a l'admin)
public class ItcareApplication {

    public static void main(String[] args) {
        SpringApplication.run(ItcareApplication.class, args);
    }
}
