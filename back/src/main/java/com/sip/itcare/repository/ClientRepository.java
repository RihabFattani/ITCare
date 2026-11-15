package com.sip.itcare.repository;

import com.sip.itcare.entity.Client;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ClientRepository extends JpaRepository<Client, Long> {

    /** Recherche par nom + filtre par activite (les parametres null sont ignores). */
    @Query("""
            select c from Client c
            where (:q is null or lower(c.nom) like lower(concat('%', :q, '%')))
              and (:activite is null or lower(c.activite) = lower(:activite))
            order by c.nom
            """)
    List<Client> search(@Param("q") String q, @Param("activite") String activite);
}
