package com.example.shop.controller;

import com.example.shop.entity.Product;
import com.example.shop.entity.User;
import com.example.shop.service.ProductService;
import com.example.shop.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/user/products")
public class UserProductsController {
    private final UserService userService;
    private final ProductService productService;

    @GetMapping()
    public CompletableFuture<ResponseEntity<?>> userProducts(Principal principal,
                                                             @RequestParam(required = false) String status,
                                                             @RequestParam(required = false) String sort) {
        if (principal == null)
            return CompletableFuture.completedFuture(
                    ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Пользователь не авторизован.")));

        try {
            User user = userService.findByEmail(principal.getName())
                    .orElseThrow(() -> new UsernameNotFoundException("Пользователь не найден."));

            return productService.findAllProducts()
                    .thenApply(products -> {
                        List<Product> userProducts = products.stream()
                                .filter(product -> product.getUser() != null && product.getUser().getId().equals(user.getId()))
                                .collect(Collectors.toList());

                        if (status != null && !status.equals("all")) {
                            boolean isActive = status.equals("active");
                            userProducts = userProducts.stream()
                                    .filter(product -> product.isActive() == isActive)  // Используем статус товара
                                    .collect(Collectors.toList());
                        }

                        if (sort != null) {
                            switch (sort) {
                                case "newest":
                                    userProducts.sort((a, b) -> b.getDateOfCreated().compareTo(a.getDateOfCreated()));
                                    break;
                                case "oldest":
                                    userProducts.sort((a, b) -> a.getDateOfCreated().compareTo(b.getDateOfCreated()));
                                    break;
                                case "price-asc":
                                    userProducts.sort((a, b) -> Double.compare(a.getPrice(), b.getPrice()));
                                    break;
                                case "price-desc":
                                    userProducts.sort((a, b) -> Double.compare(b.getPrice(), a.getPrice()));
                                    break;
                            }
                        }

                        List<Map<String, Object>> responseProducts = userProducts.stream()
                                .map(this::convertToDTO)
                                .collect(Collectors.toList());

                        return ResponseEntity.ok(responseProducts);
                    });
        } catch (UsernameNotFoundException e) {
            return CompletableFuture.completedFuture(
                    ResponseEntity.status(HttpStatus.NOT_FOUND)
                            .body(Map.of("error", e.getMessage()))
            );
        } catch (Exception e) {
            e.printStackTrace();
            return CompletableFuture.completedFuture(
                    ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("error", "Ошибка при получении данных профиля: " + e.getMessage()))
            );
        }
    }

    private Map<String, Object> convertToDTO(Product product) {
        Map<String, Object> dto = new HashMap<>();
        dto.put("id", product.getId());
        dto.put("title", product.getTitle());
        dto.put("description", product.getDescription());
        dto.put("price", product.getPrice());
        dto.put("city", product.getCity());
        dto.put("status", product.isActive() ? "active" : "inactive");
        dto.put("createdAt", product.getDateOfCreated());

        return dto;
    }
}