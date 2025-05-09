package com.example.shop.service;

import com.example.shop.dto.ProductDto;
import com.example.shop.entity.Product;
import com.example.shop.entity.User;
import com.example.shop.repository.ProductRepository;
import com.example.shop.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {
    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    @Value("${upload.path}")
    private String uploadPath;

    @Async
    public CompletableFuture<List<Product>> findAllProducts() {
        return CompletableFuture.completedFuture(productRepository.findAll());

    }

    @Async
    @Transactional(readOnly = true)
    public CompletableFuture<Optional<Product>> findById(Long id) {
        return CompletableFuture.completedFuture(productRepository.findById(id));
    }

    @Async
    @Transactional
    public CompletableFuture<Product> saveProductAsync(ProductDto productDto, MultipartFile file, Principal principal) {
        saveProduct(productDto, file, principal);

        return CompletableFuture.completedFuture(null);
    }


    @Transactional
    public void saveProduct(ProductDto productDto, MultipartFile file, Principal principal) {
        if (productDto == null) {
            throw new IllegalArgumentException("Product cannot be null");
        }

        Product product = new Product();
        product.setTitle(productDto.title());
        product.setDescription(productDto.description());
        product.setPrice(productDto.price());
        product.setCity(productDto.city());
        product.setUser(getUserByPrincipal(principal));
        product.setDateOfCreated(LocalDateTime.now());

        if (file != null && !file.isEmpty()) {
            try {
                byte[] imageBytes = file.getBytes();
                if (imageBytes != null && imageBytes.length > 0) {
                    log.info("Processing image of size: {} bytes, content type: {}",
                            imageBytes.length, file.getContentType());

                    product.setImage(imageBytes);
                    product.setImageContentType(file.getContentType());

                    log.info("Image set to product, byte array length: {}", imageBytes.length);
                } else {
                    log.warn("Empty image file received");
                }
            } catch (IOException e) {
                log.error("Error reading image bytes: {}", e.getMessage());
                throw new RuntimeException("Could not process image: " + e.getMessage());
            }
        } else {
            log.info("No image file uploaded for product");
        }

        try {
            Product savedProduct = productRepository.save(product);
            log.info("Product saved successfully with ID: {}, title: {}",
                    savedProduct.getId(), savedProduct.getTitle());
        } catch (Exception e) {
            log.error("Error saving product: {}", e.getMessage(), e);
            throw new RuntimeException("Could not save product: " + e.getMessage());
        }
    }


    private User getUserByPrincipal(Principal principal) {
        if (principal == null) throw new IllegalArgumentException("User must be authenticated to create a product");
        return userRepository.findByEmail(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
    }

    @Transactional
    public boolean deleteProduct(Long id, Principal principal) {
        if (id == null || principal == null) {
            throw new IllegalArgumentException("Product ID cannot be null");
        }
        log.info("DELETE DEBUG - Попытка удаления продукта с ID: {}", id);
        User user = getUserByPrincipal(principal);

        return productRepository.findById(id)
                .map(product -> {
                    if (!product.getUser().getId().equals(user.getId())) {
                        log.info("DELETE DEBUG - Пользователь {} не имеет прав на удаление продукта {}", user.getId(), id);
                        return false;
                    }

                    log.info("DELETE DEBUG - Вызов repository.deleteById({})", id);
                    productRepository.deleteProductById(id);
                    log.info("DELETE DEBUG - Вызов репозитория завершен");
                    return true;
                })
                .orElse(false);
    }

    @Transactional
    public Product updateProduct(Long id, Product updatedProduct) {
        if (id == null || updatedProduct == null) {
            throw new IllegalArgumentException("Product ID and updated product cannot be null");
        }

        return productRepository.findById(id)
                .map(existingProduct -> {
                    existingProduct.setTitle(updatedProduct.getTitle());
                    existingProduct.setDescription(updatedProduct.getDescription());
                    existingProduct.setPrice(updatedProduct.getPrice());
                    existingProduct.setCity(updatedProduct.getCity());
                    return productRepository.save(existingProduct);
                })
                .orElseThrow(() -> new RuntimeException("Product not found with id: " + id));
    }
}