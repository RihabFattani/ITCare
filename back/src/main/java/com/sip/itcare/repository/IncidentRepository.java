package com.sip.itcare.repository;

import com.sip.itcare.entity.Incident;
import com.sip.itcare.enums.Priorite;
import com.sip.itcare.enums.Statut;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface IncidentRepository extends JpaRepository<Incident, Long> {

    boolean existsByClientId(Long clientId); // RG6
    boolean existsByUserId(Long userId);

    long countByStatut(Statut statut);
    long countByPrioriteAndStatut(Priorite priorite, Statut statut);

    /** Pour la tache planifiee (etape securite) : HAUTE + OUVERT depuis plus de 24 h. */
    List<Incident> findByPrioriteAndStatutAndDateSignalementBefore(
            Priorite priorite, Statut statut, LocalDateTime limite);

    @Query("""
            select i from Incident i
            where (:q is null or lower(i.libelle) like lower(concat('%', :q, '%')))
              and (:statut is null or i.statut = :statut)
              and (:priorite is null or i.priorite = :priorite)
              and (:clientId is null or i.client.id = :clientId)
            order by i.dateSignalement desc
            """)
    List<Incident> search(@Param("q") String q,
                          @Param("statut") Statut statut,
                          @Param("priorite") Priorite priorite,
                          @Param("clientId") Long clientId);

    @Query("select i.priorite, count(i) from Incident i group by i.priorite")
    List<Object[]> statsParPriorite();

    @Query("""
            select i.client.id, i.client.nom, count(i) from Incident i
            group by i.client.id, i.client.nom
            order by count(i) desc
            """)
    List<Object[]> statsParClient();
}
