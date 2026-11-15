package com.sip.itcare.service;

import com.sip.itcare.enums.Priorite;
import com.sip.itcare.enums.Statut;
import com.sip.itcare.repository.IncidentRepository;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/** Donnees du tableau de bord (Admin) : par statut, par priorite et par client. */
@Service
public class StatsService {

    private final IncidentRepository incidentRepository;

    public StatsService(IncidentRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    public Map<String, Object> dashboard() {
        Map<Statut, Long> parStatut = new EnumMap<>(Statut.class);
        for (Statut s : Statut.values()) {
            parStatut.put(s, incidentRepository.countByStatut(s));
        }

        // On initialise a 0 pour que le graphique ait toujours les 3 priorites
        Map<Priorite, Long> parPriorite = new EnumMap<>(Priorite.class);
        for (Priorite p : Priorite.values()) {
            parPriorite.put(p, 0L);
        }
        for (Object[] row : incidentRepository.statsParPriorite()) {
            parPriorite.put((Priorite) row[0], (Long) row[1]);
        }

        List<Map<String, Object>> parClient = new ArrayList<>();
        for (Object[] row : incidentRepository.statsParClient()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("clientId", row[0]);
            item.put("client", row[1]);
            item.put("total", row[2]);
            parClient.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("total", incidentRepository.count());
        result.put("ouverts", parStatut.get(Statut.OUVERT));
        result.put("enCours", parStatut.get(Statut.EN_COURS));
        result.put("resolus", parStatut.get(Statut.RESOLU));
        result.put("hautePrioriteOuverts",
                incidentRepository.countByPrioriteAndStatut(Priorite.HAUTE, Statut.OUVERT));
        result.put("parStatut", parStatut);
        result.put("parPriorite", parPriorite);
        result.put("parClient", parClient); // deja trie : le client avec le plus d'incidents en premier
        return result;
    }
}
