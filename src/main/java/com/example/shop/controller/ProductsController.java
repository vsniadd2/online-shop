package com.example.shop.controller;

import com.example.shop.dto.ProductDto;
import com.example.shop.entity.Product;
import com.example.shop.service.ProductService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.security.Principal;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/products")
@Slf4j
public class ProductsController {
    private final ProductService productService;

    @GetMapping
    public CompletableFuture<ResponseEntity<?>> indexProducts() {
        return productService.findAllProducts()
                .thenApply(products -> {
                    if (products.isEmpty()) return ResponseEntity.noContent().build();
                    return ResponseEntity.ok().body(products);
                }).exceptionally(e -> ResponseEntity.internalServerError().body(Map.of("error", "Error fetching products: " + e.getMessage())));
    }

    @GetMapping("/image/{id}")
    public CompletableFuture<ResponseEntity<Object>> getProductImage(@PathVariable Long id) {
        if (id == null || id <= 0) {
            return CompletableFuture.completedFuture(
                    ResponseEntity.badRequest().body(Map.of("error", "Invalid product ID"))
            );
        }

        CompletableFuture<ResponseEntity<Object>> result = new CompletableFuture<>();

        productService.findById(id).whenComplete((optionalProduct, exception) -> {
            if (exception != null) {
                result.complete(
                        ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .contentType(MediaType.APPLICATION_JSON)
                                .body(Map.of("error", "Error fetching image: " + exception.getMessage()))
                );
                return;
            }

            if (optionalProduct.isEmpty()) {
                result.complete(ResponseEntity.notFound().build());
                return;
            }

            Product product = optionalProduct.get();
            if (product.getImage() == null) {
                result.complete(ResponseEntity.notFound().build());
                return;
            }

            String contentType = product.getImageContentType();
            if (contentType == null || contentType.isBlank()) {
                contentType = "application/octet-stream";
            }

            try {
                result.complete(
                        ResponseEntity.ok()
                                .contentType(MediaType.parseMediaType(contentType))
                                .body(product.getImage())
                );
            } catch (Exception e) {

                result.complete(
                        ResponseEntity.ok()
                                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                                .body(product.getImage())
                );
            }
        });

        return result;
    }

    @PostMapping(value = "/add", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CompletableFuture<ResponseEntity<Map<String, String>>> addProduct(
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam("price") double price,
            @RequestParam("city") String city,
            @RequestParam(value = "image", required = false) MultipartFile image,
            Principal principal
    ) {
        log.debug("Received product data - title: {}, price: {}, city: {}, image: {}",
                title, price, city, image != null ? image.getOriginalFilename() : "none");

        ProductDto productDto = new ProductDto(title, description, price, city, null);
        return productService.saveProductAsync(productDto, image, principal)
                .thenApply(saved -> ResponseEntity.ok(Map.of("message", "Product added successfully")))
                .exceptionally(e -> {
                    log.error("Error adding product", e);
                    return ResponseEntity.internalServerError().body(Map.of("error", "Error adding product: " + e.getCause().getMessage()));
                });
    }

    @GetMapping("/{id}")
    public CompletableFuture<ResponseEntity<Product>> productInfo(@PathVariable Long id) {
        return productService.findById(id)
                .thenApply(optProduct -> optProduct
                        .map(product -> ResponseEntity.ok().body(product))
                        .orElse(ResponseEntity.notFound().build()))
                .exceptionally(e -> ResponseEntity.internalServerError().body((Product) Map.of("error", "Error: " + e.getMessage())));
    }

    @PutMapping("/{id}")
    public CompletableFuture<ResponseEntity<?>> editProduct(@PathVariable Long id, @RequestBody ProductDto productDto, Principal principal) {
        if (principal == null) {
            return CompletableFuture.completedFuture(
                    ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not authenticated.")));
        }

        return productService.findById(id)
                .thenCompose(optProduct -> {
                    try {
                        Product currentProduct = optProduct.orElseThrow(() -> new IllegalArgumentException("Product not found."));

                        if (!currentProduct.getUser().getEmail().equals(principal.getName())) {
                            return CompletableFuture.completedFuture(
                                    ResponseEntity.status(HttpStatus.FORBIDDEN)
                                            .body(Map.of("error", "You can't edit a product that isn't yours.")));
                        }

                        currentProduct.setId(id);
                        currentProduct.setUser(currentProduct.getUser());
                        currentProduct.setDescription(productDto.description());
                        currentProduct.setPrice(productDto.price());
                        currentProduct.setCity(productDto.city());
                        currentProduct.setTitle(productDto.title());

                        Product savedUpdatedProduct = productService.updateProduct(id, currentProduct);

                        return CompletableFuture.completedFuture(ResponseEntity.ok().body(savedUpdatedProduct));
                    } catch (IllegalArgumentException e) {
                        return CompletableFuture.completedFuture(
                                ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getMessage())));
                    }
                })
                .exceptionally(e -> {
                    if (e.getCause() instanceof IllegalArgumentException) {
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", e.getCause().getMessage()));
                    }
                    return ResponseEntity.internalServerError().body(Map.of("error", "Failed to update product: " + e.getMessage()));
                });
    }

    @DeleteMapping("/delete/{id}")
    public CompletableFuture<ResponseEntity<?>> deleteProduct(@PathVariable Long id, Principal principal) {
        log.debug("user:{} удаляет товар.", principal != null ? principal.getName() : "anonymous");
        return CompletableFuture.supplyAsync(() -> {
            try {
                boolean deleted = productService.deleteProduct(id, principal);
                if (deleted)
                    return ResponseEntity.ok(Map.of("message", "product successfully removed"));
                else {
                    if (productService.findById(id).join().isPresent())
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("message", "You do not have access to delete."));
                    else
                        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                                .body(Map.of("message", "ad not found"));
                }
            } catch (Exception e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ошибка при удалении: " + e.getMessage()));
            }
        });
    }
}