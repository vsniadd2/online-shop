package com.example.shop.dto;

public record ProductDto(
        String title,
        String description,
        double price,
        String city,
        String imageFilename

){}