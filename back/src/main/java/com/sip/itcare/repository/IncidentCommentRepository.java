package com.sip.itcare.repository;

import com.sip.itcare.entity.IncidentComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentCommentRepository extends JpaRepository<IncidentComment, Long> {
    List<IncidentComment> findByIncidentIdOrderByDateAsc(Long incidentId);
    void deleteByIncidentId(Long incidentId);
    long countByIncidentId(Long incidentId);
}
