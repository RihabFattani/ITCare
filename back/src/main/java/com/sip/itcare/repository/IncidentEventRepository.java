package com.sip.itcare.repository;

import com.sip.itcare.entity.IncidentEvent;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentEventRepository extends JpaRepository<IncidentEvent, Long> {
    List<IncidentEvent> findByIncidentIdOrderByDateDesc(Long incidentId);
    void deleteByIncidentId(Long incidentId);
    long countByIncidentId(Long incidentId);
}
