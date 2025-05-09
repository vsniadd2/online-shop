package com.example.shop.controller;

import com.example.shop.dto.AuthRequest;
import com.example.shop.dto.RegistrationRequest;
import com.example.shop.entity.User;
import com.example.shop.service.MyUserDetailsService;
import com.example.shop.service.UserService;
import com.example.shop.util.JwtTokenUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
@Slf4j
public class AuthController {
    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final MyUserDetailsService myUserDetailsService;
    private final JwtTokenUtils jwtTokenUtils;

    @PostMapping("/registration")
    public ResponseEntity<?> registrationUser(@RequestBody RegistrationRequest request) {
        try {
            userService.createUser(request);
            return ResponseEntity.ok(Map.of(
                    "message", "User register",
                    "success", true)
            );
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getMessage(),
                    "success", false)
            );
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody AuthRequest request) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(request.email(), request.password()));
            User user = userService.findByEmail(request.email())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found!"));
            UserDetails userDetails = myUserDetailsService.loadUserByUsername(request.email());
            String token = jwtTokenUtils.generateToken(userDetails);
            log.debug("Generated token for user{}", request.email());
            return ResponseEntity.ok().body(Map.of(
                    "success", true,
                    "message", "Login successful",
                    "token", token,
                    "user", Map.of(
                            "id", user.getId(),
                            "email", user.getEmail()
                    )
            ));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid credentials"));
        } catch (Exception e) {
            log.error("Login error: ", e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> profile(Principal principal) {
        try {
            if (principal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Пользователь не авторизован"));
            }

            User user = userService.findByEmail(principal.getName())
                    .orElseThrow(() -> new UsernameNotFoundException("Пользователь не найден"));

            Map<String, Object> profileData = new HashMap<>();
            profileData.put("id", user.getId());
            profileData.put("email", user.getEmail());
            profileData.put("name", user.getUsername());
            profileData.put("registrationDate", user.getDateTimeOfCreated());
            profileData.put("status", "active");


            return ResponseEntity.ok(profileData);

        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Ошибка при получении данных профиля: " + e.getMessage()));
        }
    }


}