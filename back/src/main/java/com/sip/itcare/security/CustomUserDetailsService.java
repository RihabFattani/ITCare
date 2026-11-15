package com.sip.itcare.security;

import com.sip.itcare.entity.Role;
import com.sip.itcare.repository.UserRepository;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/** Charge l'utilisateur par email depuis la base : ses roles deviennent ROLE_ADMIN / ROLE_COLLABORATEUR. */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        com.sip.itcare.entity.User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur introuvable : " + email));
        List<GrantedAuthority> authorities = user.getRoles().stream()
                .map(Role::getLibelle)
                .<GrantedAuthority>map(r -> new SimpleGrantedAuthority("ROLE_" + r.name()))
                .toList();
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(authorities)
                .disabled(!user.isEnabled()) // compte non active => refuse meme avec un token valide
                .build();
    }
}
