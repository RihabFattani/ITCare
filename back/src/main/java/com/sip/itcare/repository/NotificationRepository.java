package com.sip.itcare.repository;

import com.sip.itcare.entity.Notification;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findTop30ByUserIdOrderByDateDesc(Long userId);

    @Modifying
    @Query("update Notification n set n.lu = true where n.user.id = :userId and n.lu = false")
    int markAllRead(@Param("userId") Long userId);
}
