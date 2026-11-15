package com.sip.itcare.repository;

import com.sip.itcare.entity.User;
import com.sip.itcare.enums.RoleName;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);

    /** Destinataires des emails (inscriptions a valider, rappels) : les admins actifs. */
    List<User> findByRoles_LibelleAndEnabledTrue(RoleName libelle);
}
