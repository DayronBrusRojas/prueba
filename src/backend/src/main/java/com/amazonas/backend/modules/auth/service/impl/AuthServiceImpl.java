package com.amazonas.backend.modules.auth.service.impl;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.amazonas.backend.modules.auth.dto.AuthResponse;
import com.amazonas.backend.modules.auth.dto.LoginRequest;
import com.amazonas.backend.modules.auth.dto.LoginVendorRequest;
import com.amazonas.backend.modules.auth.dto.RegisterRequest;
import com.amazonas.backend.modules.auth.enums.Role;
import com.amazonas.backend.modules.auth.service.AuthService;
import com.amazonas.backend.modules.users.model.User;
import com.amazonas.backend.modules.users.repository.UserRepository;
import com.amazonas.backend.modules.vendors.model.Vendor;
import com.amazonas.backend.modules.vendors.repository.VendorRepository;
import com.amazonas.backend.security.jwt.JwtService;

import java.time.LocalDateTime;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import com.amazonas.backend.modules.auth.model.PasswordResetToken;
import com.amazonas.backend.modules.auth.repository.PasswordResetTokenRepository;
import com.amazonas.backend.modules.auth.service.EmailService;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final VendorRepository vendorRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;

    @Override
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya está registrado");
        }

        User user = new User();
        user.setNombre(request.getNombre());
        user.setEmail(request.getEmail());
        user.setTelefono(request.getTelefono());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.CLIENT);

        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getRole().name(), user.getNombre());
    }

    @Override
    public AuthResponse registerVendor(RegisterRequest request) {
        if (vendorRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("El email ya está registrado para un vendor");
        }

        Vendor vendor = new Vendor();
        vendor.setNombre(request.getNombre());
        vendor.setEmail(request.getEmail());
        vendor.setPassword(passwordEncoder.encode(request.getPassword()));
        vendor.setRole(Role.ADMIN);

        vendorRepository.save(vendor);

        String token = jwtService.generateToken(vendor.getEmail());
        return new AuthResponse(token, vendor.getEmail(), vendor.getRole().name(), vendor.getNombre());
    }

    @Override
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));

        // Verificar bloqueo temporal
        if (user.getLockUntil() != null && user.getLockUntil().isAfter(LocalDateTime.now())) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.LOCKED,
                    "Cuenta bloqueada temporalmente. Intenta nuevamente más tarde.");
        }

        // Contraseña inválida
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            // Incrementar contador de intentos
            int attempts = (user.getFailedLoginAttempts() == null) ? 0 : user.getFailedLoginAttempts();
            attempts++;
            user.setFailedLoginAttempts(attempts);

            // Si alcanzó 3 intentos, bloquear por 15 minutos
            if (attempts >= 3) {
                user.setLockUntil(LocalDateTime.now().plusMinutes(15));
            }

            userRepository.save(user);

            // Si recién se bloqueó, devolver LOCKED; si no, devolver UNAUTHORIZED
            if (attempts >= 3) {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.LOCKED,
                        "Cuenta bloqueada temporalmente tras varios intentos fallidos.");
            } else {
                throw new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.UNAUTHORIZED,
                        "Credenciales inválidas");
            }
        }

        // Login exitoso: resetear contador y desbloquear
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        userRepository.save(user);

        String token = jwtService.generateToken(user.getEmail());
        return new AuthResponse(token, user.getEmail(), user.getRole().name(), user.getNombre());
    }

    @Override
    public AuthResponse vendorLogin(LoginVendorRequest request) {
        Vendor vendor = vendorRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Vendor no encontrado"));

        if (!passwordEncoder.matches(request.getPassword(), vendor.getPassword())) {
            throw new RuntimeException("Contraseña incorrecta");
        }

        String token = jwtService.generateToken(vendor.getEmail());

        return new AuthResponse(
                token,
                vendor.getEmail(),
                vendor.getRole().name(),
                vendor.getNombre()
        );
    }

    @Override
    public Vendor getRemoteVendor(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String email = jwtService.extractUsername(token);
        return vendorRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Vendor no encontrado con el token provisto"));
    }

    @Override
    @Transactional
    public void processForgotPassword(String email) {
        String name = "";
        String userType = "";

        // Buscar primero en Users
        var userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            name = userOpt.get().getNombre();
            userType = "USER";
        } else {
            // Si no esta en Users, buscar en Vendors
            var vendorOpt = vendorRepository.findByEmail(email);
            if (vendorOpt.isPresent()) {
                name = vendorOpt.get().getNombre();
                userType = "VENDOR";
            } else {
                throw new RuntimeException("No se encontro ninguna cuenta asociada a este correo electronico.");
            }
        }

        // Eliminar token anterior si existe para este correo
        tokenRepository.findByEmail(email).ifPresent(tokenRepository::delete);

        // Generar nuevo token seguro
        String token = UUID.randomUUID().toString();
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setEmail(email);
        resetToken.setUserType(userType);
        resetToken.setExpiryDate(LocalDateTime.now().plusMinutes(15));

        tokenRepository.save(resetToken);

        // Enviar correo de recuperacion de forma real y obligatoria
        emailService.sendPasswordResetEmail(email, token, name);
    }

    @Override
    public boolean validatePasswordResetToken(String token) {
        var tokenOpt = tokenRepository.findByToken(token);
        if (tokenOpt.isEmpty()) {
            return false;
        }
        return !tokenOpt.get().isExpired();
    }

    @Override
    @Transactional
    public void updatePassword(String token, String newPassword) {
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new RuntimeException("Token de recuperacion no valido o inexistente."));

        if (resetToken.isExpired()) {
            tokenRepository.delete(resetToken);
            throw new RuntimeException("El token de recuperacion ha expirado.");
        }

        String email = resetToken.getEmail();
        String userType = resetToken.getUserType();

        if ("USER".equalsIgnoreCase(userType)) {
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Usuario asociado al token no encontrado."));
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
        } else if ("VENDOR".equalsIgnoreCase(userType)) {
            Vendor vendor = vendorRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Vendedor asociado al token no encontrado."));
            vendor.setPassword(passwordEncoder.encode(newPassword));
            vendorRepository.save(vendor);
        }

        // Eliminar el token usado
        tokenRepository.delete(resetToken);
    }
}