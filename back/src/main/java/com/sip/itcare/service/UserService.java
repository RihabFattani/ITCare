package com.sip.itcare.service;

import com.sip.itcare.dto.UserRequest;
import com.sip.itcare.entity.Role;
import com.sip.itcare.entity.User;
import com.sip.itcare.enums.RoleName;
import com.sip.itcare.exception.ApiException;
import com.sip.itcare.repository.IncidentRepository;
import com.sip.itcare.repository.RoleRepository;
import com.sip.itcare.repository.UserRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final IncidentRepository incidentRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository,
                       IncidentRepository incidentRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.incidentRepository = incidentRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Utilisateur introuvable : " + id));
    }

    @Transactional
    public User create(UserRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw ApiException.conflict("Cet email est deja utilise");
        }
        if (req.password() == null || req.password().length() < 6) {
            throw ApiException.badRequest("Le mot de passe est obligatoire (6 caracteres minimum)");
        }
        User user = new User();
        apply(user, req);
        user.setPassword(passwordEncoder.encode(req.password())); // jamais en clair
        user.setEnabled(req.enabled() == null || req.enabled());
        return userRepository.save(user);
    }

    @Transactional
    public User update(Long id, UserRequest req) {
        User user = findById(id);
        if (!user.getEmail().equalsIgnoreCase(req.email()) && userRepository.existsByEmail(req.email())) {
            throw ApiException.conflict("Cet email est deja utilise");
        }
        apply(user, req);
        if (req.password() != null && !req.password().isBlank()) {
            if (req.password().length() < 6) {
                throw ApiException.badRequest("Le mot de passe doit contenir 6 caracteres minimum");
            }
            user.setPassword(passwordEncoder.encode(req.password()));
        }
        if (req.enabled() != null) {
            user.setEnabled(req.enabled());
        }
        return userRepository.save(user);
    }

    /** "Active les comptes" (role Admin). */
    @Transactional
    public User setEnabled(Long id, boolean enabled) {
        User user = findById(id);
        user.setEnabled(enabled);
        return userRepository.save(user);
    }

    @Transactional
    public void delete(Long id) {
        User user = findById(id);
        if (incidentRepository.existsByUserId(id)) {
            throw ApiException.conflict("Suppression impossible : cet utilisateur a enregistre des incidents");
        }
        userRepository.delete(user);
    }

    private void apply(User user, UserRequest req) {
        user.setEmail(req.email());
        user.setNom(req.nom());
        user.setPrenom(req.prenom());
        user.setTel(req.tel());
        Set<RoleName> names = (req.roles() == null || req.roles().isEmpty())
                ? Set.of(RoleName.COLLABORATEUR) : req.roles();
        Set<Role> roles = new HashSet<>();
        for (RoleName name : names) {
            roles.add(roleRepository.findByLibelle(name)
                    .orElseThrow(() -> ApiException.badRequest("Role inconnu : " + name)));
        }
        user.setRoles(roles);
    }
}
