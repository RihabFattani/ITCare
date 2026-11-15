package com.sip.itcare.config;

import com.sip.itcare.security.JwtAuthFilter;
import com.sip.itcare.security.JwtService;
import java.util.List;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Securite de l'API (section 3 du CDC) : JWT sans session, droits par role.
 *
 *  Ressource               | ADMIN                     | COLLABORATEUR
 *  ------------------------+---------------------------+--------------------
 *  Utilisateurs / roles    | CRUD + activation         | aucun acces
 *  Clients                 | CRUD                      | consulter, ajouter
 *  Incidents               | CRUD + statut + rapport   | consulter, ajouter
 *  Statistiques            | consulter                 | aucun acces
 *  Fichiers                | authentifie (tous les roles)
 */
@Configuration
public class SecurityConfig {

    /** BCrypt : les mots de passe sont stockes haches, jamais en clair. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService,
                                           UserDetailsService userDetailsService) throws Exception {
        http
            .csrf(csrf -> csrf.disable()) // inutile : pas de cookie de session, le token est dans l'en-tete
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e
                .authenticationEntryPoint((req, res, ex) ->
                        writeError(res, HttpStatus.UNAUTHORIZED, "Authentification requise ou token invalide"))
                .accessDeniedHandler((req, res, ex) ->
                        writeError(res, HttpStatus.FORBIDDEN, "Acces refuse : droits insuffisants")))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()                 // login, register, activate
                // Page interne /error : sans cela une erreur 400/404 serait masquee par un 401 trompeur
                .requestMatchers("/error").permitAll()
                .requestMatchers("/api/users/**", "/api/roles/**",
                                 "/api/stats/**", "/api/admin/**").hasRole("ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/clients/**", "/api/incidents/**").authenticated()
                // changement de statut : Admin ou collaborateur auquel le ticket est affecte (controle dans le service)
                .requestMatchers(HttpMethod.PATCH, "/api/incidents/*/statut").authenticated()
                .requestMatchers(HttpMethod.POST, "/api/clients", "/api/incidents", "/api/incidents/*/comments").authenticated()
                // tout le reste sur clients / incidents (PUT, PATCH, DELETE, rapport PDF) : Admin
                .requestMatchers("/api/clients/**", "/api/incidents/**").hasRole("ADMIN")
                .requestMatchers("/api/files/**").authenticated()
                .anyRequest().authenticated())
            .addFilterBefore(new JwtAuthFilter(jwtService, userDetailsService),
                    UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /** Autorise le front Angular (ng serve sur le port 4200) a appeler l'API. */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of("http://localhost:4200"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    private static void writeError(jakarta.servlet.http.HttpServletResponse res, HttpStatus status, String message)
            throws java.io.IOException {
        res.setStatus(status.value());
        res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write("{\"status\":" + status.value() + ",\"message\":\"" + message + "\"}");
    }
}
