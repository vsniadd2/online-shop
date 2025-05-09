package com.example.shop.dto;

public record AuthRequest(
        String email,
        String password
) {
}
