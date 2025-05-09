package com.example.shop.dto;

public record RegistrationRequest (
        String username,
        String email,
        String password
){}
