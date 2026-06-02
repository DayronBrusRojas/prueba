package com.amazonas.backend.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.util.List;
import org.springframework.http.HttpMethod;
import com.amazonas.backend.security.jwt.JwtFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtFilter jwtFilter;

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                // ============ CORS: Habilitado para el frontend en Netlify ============
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                
                // ============ CSRF: COMPLETAMENTE DESHABILITADO ============
                // Necesario para requests POST/PUT/DELETE sin token CSRF
                .csrf(csrf -> csrf.disable())

                // ============ Session Management: Stateless (JWT) ============
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // ============ Authorization: Rutas públicas y protegidas ============
                .authorizeHttpRequests(auth -> auth
                        // Documentación Swagger - Pública
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        
                        // ============ AUTENTICACIÓN: Ruta pública - SIN JWT REQUERIDO ============
                        .requestMatchers("/api/auth/**").permitAll()
                        
                        // Productos - Lectura pública
                        .requestMatchers(HttpMethod.GET, "/api/products", "/api/products/**").permitAll()
                        
                        // Categorías - Lectura pública
                        .requestMatchers(HttpMethod.GET, "/api/categories").permitAll()
                        
                        // Archivos - Upload público (temporal)
                        .requestMatchers("/api/admin/files/upload").permitAll()
                        
                        // Solicitudes de compra - Admin públicas
                        .requestMatchers("/api/admin/purchase-requests/**").permitAll()
                        
                        // Rutas protegidas - Requieren JWT
                        .requestMatchers("/api/purchase-requests/**").authenticated()
                        .requestMatchers("/api/budgets/**").authenticated()
                        
                        // Todo lo demás requiere autenticación
                        .anyRequest().authenticated())

                // ============ JWT Filter: Se ejecuta DESPUÉS de autorizar rutas públicas ============
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public org.springframework.web.cors.CorsConfigurationSource corsConfigurationSource() {
        org.springframework.web.cors.CorsConfiguration configuration = new org.springframework.web.cors.CorsConfiguration();
        
        // Orígenes permitidos: localhost (desarrollo) + Netlify (producción)
        configuration.setAllowedOrigins(List.of(
                "http://localhost:4200",
                "http://localhost:5173",
                "http://localhost:3000",
                "https://amazonasperu.netlify.app"));
        
        // Métodos HTTP permitidos
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        
        // Headers permitidos
        configuration.setAllowedHeaders(
                List.of("Authorization", "Content-Type", "Cache-Control", "Accept", "Origin", "X-Requested-With"));
        
        // Headers que el navegador puede leer en la respuesta
        configuration.setExposedHeaders(List.of("Authorization"));
        
        // Permitir credenciales (cookies, auth headers)
        configuration.setAllowCredentials(true);

        org.springframework.web.cors.UrlBasedCorsConfigurationSource source = 
            new org.springframework.web.cors.UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(
            AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}