package com.airline.booking.authentication;

import com.airline.booking.common.BadRequestException;
import com.airline.booking.email.EmailService;
import com.airline.booking.security.JwtUtils;
import com.airline.booking.security.UserDetailsImpl;
import com.airline.booking.users.*;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*", maxAge = 3600)
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private EmailService emailService;

    // ─── Login ────────────────────────────────────────────────────────────────

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(loginRequest.getUsername());

        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        String role = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_PASSENGER");

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("Error: User not found."));

        return ResponseEntity.ok(AuthResponse.builder()
                .token(jwt)
                .id(userDetails.getId())
                .username(userDetails.getUsername())
                .email(userDetails.getEmail())
                .role(role)
                .createdAt(user.getCreatedAt() != null ? user.getCreatedAt() : java.time.LocalDateTime.now())
                .active(user.isActive())
                .build());
    }

    // ─── Register ─────────────────────────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            throw new BadRequestException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            throw new BadRequestException("Error: Email is already in use!");
        }

        Role userRole = Role.ROLE_PASSENGER;
        if (signUpRequest.getRole() != null) {
            switch (signUpRequest.getRole().toUpperCase()) {
                case "ADMIN", "ROLE_AIRLINE_ADMIN":
                    userRole = Role.ROLE_AIRLINE_ADMIN;
                    break;
                case "SUPER_ADMIN", "ROLE_SUPER_ADMIN":
                    userRole = Role.ROLE_SUPER_ADMIN;
                    break;
                default:
                    userRole = Role.ROLE_PASSENGER;
            }
        }

        User user = User.builder()
                .username(signUpRequest.getUsername())
                .email(signUpRequest.getEmail())
                .password(encoder.encode(signUpRequest.getPassword()))
                .role(userRole)
                .phone(signUpRequest.getPhone())
                .build();

        userRepository.save(user);

        // Send welcome email asynchronously
        emailService.sendWelcomeEmail(user.getEmail(), user.getUsername());

        return ResponseEntity.ok("User registered successfully!");
    }

    // ─── Forgot Password ──────────────────────────────────────────────────────

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            throw new BadRequestException("Email is required.");
        }

        // Always return success to avoid user enumeration attacks
        userRepository.findByEmail(email).ifPresent(user -> {
            // Delete any old tokens for this user
            passwordResetTokenRepository.deleteByUser(user);

            // Create new token
            PasswordResetToken resetToken = PasswordResetToken.create(user);
            passwordResetTokenRepository.save(resetToken);

            // Send email asynchronously
            emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), resetToken.getToken());
        });

        return ResponseEntity.ok(Map.of("message",
                "If an account with that email exists, a password reset link has been sent."));
    }

    // ─── Reset Password ───────────────────────────────────────────────────────

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        String newPassword = body.get("password");

        if (token == null || token.isBlank() || newPassword == null || newPassword.isBlank()) {
            throw new BadRequestException("Token and new password are required.");
        }

        if (newPassword.length() < 6) {
            throw new BadRequestException("Password must be at least 6 characters.");
        }

        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Invalid or expired password reset link."));

        if (resetToken.isUsed()) {
            throw new BadRequestException("This reset link has already been used. Please request a new one.");
        }

        if (resetToken.isExpired()) {
            throw new BadRequestException("This reset link has expired (valid for 1 hour). Please request a new one.");
        }

        User user = resetToken.getUser();
        user.setPassword(encoder.encode(newPassword));
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in with your new password."));
    }
}
