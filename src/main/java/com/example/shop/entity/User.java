package com.example.shop.entity;

import com.example.shop.roles.Role;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "users")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@ToString
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;
    @Column(name = "email", unique = true)
    private String email;

    private String username;


    @Column(name = "password")
    private String password;
    @JsonFormat(pattern = "yyyy-MM-dd:mm:ss")
    @Column(name = "dateTimeOfCreated")
    private LocalDateTime dateTimeOfCreated;
    @Column(name = "active")
    private boolean active = true;

    @ElementCollection(targetClass = Role.class, fetch = FetchType.EAGER)
    @CollectionTable(name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"))
    @Enumerated(EnumType.STRING)
    private Set<Role> roles = new HashSet<>();

    @OneToMany(cascade = CascadeType.ALL,fetch = FetchType.EAGER,mappedBy = "user")
    private List<Product> products = new ArrayList<>();

    @PrePersist
    private void init() {
        dateTimeOfCreated = LocalDateTime.now();
    }
}
