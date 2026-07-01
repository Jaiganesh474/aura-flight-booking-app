package com.airline.booking.fares;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/coupons")
@CrossOrigin(origins = "*")
public class CouponController {

    @Autowired
    private CouponRepository couponRepository;

    // Public endpoint: Fetch all active global coupons
    @GetMapping
    public ResponseEntity<List<Coupon>> getActiveGlobalCoupons() {
        List<Coupon> activeCoupons = couponRepository.findAll().stream()
                .filter(c -> c.getActive() != null && c.getActive())
                .collect(Collectors.toList());
        return ResponseEntity.ok(activeCoupons);
    }

    // Admin endpoint: Fetch all coupons
    @GetMapping("/admin")
    @PreAuthorize("hasRole('AIRLINE_ADMIN')")
    public ResponseEntity<List<Coupon>> getAllCoupons() {
        return ResponseEntity.ok(couponRepository.findAll());
    }

    // Admin endpoint: Create coupon
    @PostMapping
    @PreAuthorize("hasRole('AIRLINE_ADMIN')")
    public ResponseEntity<?> createCoupon(@RequestBody Coupon coupon) {
        if (coupon.getCode() == null || coupon.getCode().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Coupon code is required."));
        }
        
        // Clean coupon code to uppercase
        coupon.setCode(coupon.getCode().trim().toUpperCase());

        // Check if code already exists
        Optional<Coupon> existing = couponRepository.findAll().stream()
                .filter(c -> c.getCode().equalsIgnoreCase(coupon.getCode()))
                .findFirst();
        if (existing.isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Coupon code already exists."));
        }

        if (coupon.getDiscountPercentage() == null || coupon.getDiscountPercentage().compareTo(BigDecimal.ZERO) <= 0) {
            return ResponseEntity.badRequest().body(Map.of("message", "Discount percentage must be greater than 0."));
        }

        // Strict limit enforcement: Flight-restricted coupons cannot exceed 5% discount
        if (coupon.getRestrictedFlightId() != null) {
            if (coupon.getDiscountPercentage().compareTo(new BigDecimal("5.00")) > 0) {
                return ResponseEntity.badRequest().body(Map.of("message", "Flight-specific coupons cannot exceed a 5% discount."));
            }
        }

        if (coupon.getMaxDiscount() == null) {
            coupon.setMaxDiscount(new BigDecimal("5000.00")); // default limit
        }
        if (coupon.getActive() == null) {
            coupon.setActive(true);
        }

        Coupon saved = couponRepository.save(coupon);
        return ResponseEntity.ok(saved);
    }

    // Admin endpoint: Delete coupon
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('AIRLINE_ADMIN')")
    public ResponseEntity<?> deleteCoupon(@PathVariable("id") Long id) {
        if (!couponRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        couponRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Coupon deleted successfully."));
    }
}
