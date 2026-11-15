package com.sip.itcare.repository;

import com.sip.itcare.entity.Role;
import com.sip.itcare.enums.RoleName;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByLibelle(RoleName libelle);
}
