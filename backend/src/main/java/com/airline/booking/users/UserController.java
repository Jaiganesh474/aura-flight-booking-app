package com.airline.booking.users;

import com.airline.booking.common.BadRequestException;
import com.airline.booking.common.ResourceNotFoundException;
import com.airline.booking.bookings.Booking;
import com.airline.booking.bookings.BookingRepository;
import com.airline.booking.payments.Payment;
import com.airline.booking.payments.PaymentRepository;
import com.airline.booking.tickets.Ticket;
import com.airline.booking.tickets.TicketRepository;
import com.airline.booking.passengers.Passenger;
import com.airline.booking.passengers.TravellerProfileRepository;
import com.airline.booking.seats.Seat;
import com.airline.booking.seats.SeatRepository;
import com.airline.booking.seats.SeatStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Autowired
    private TravellerProfileRepository travellerProfileRepository;

    @Autowired
    private PasswordEncoder encoder;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentication.getName()));
        
        Map<String, Object> response = new HashMap<>();
        response.put("id", user.getId());
        response.put("username", user.getUsername());
        response.put("email", user.getEmail());
        response.put("phone", user.getPhone());
        response.put("role", user.getRole().name());
        response.put("active", user.isActive());
        response.put("createdAt", user.getCreatedAt() != null ? user.getCreatedAt() : java.time.LocalDateTime.now());
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> body, Authentication authentication) {
        String currentPassword = body.get("currentPassword");
        String newPassword = body.get("newPassword");

        if (currentPassword == null || newPassword == null || newPassword.isBlank()) {
            throw new BadRequestException("Current password and new password are required.");
        }

        if (newPassword.length() < 6) {
            throw new BadRequestException("New password must be at least 6 characters.");
        }

        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentication.getName()));

        if (!encoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Incorrect current password.");
        }

        user.setPassword(encoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }

    @PostMapping("/deactivate")
    public ResponseEntity<?> deactivateAccount(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentication.getName()));

        user.setActive(false);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Account deactivated successfully."));
    }

    @DeleteMapping("/delete")
    @Transactional
    public ResponseEntity<?> deleteAccount(Authentication authentication) {
        User user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentication.getName()));

        // 1. Fetch user's bookings and clean them up
        List<Booking> bookings = bookingRepository.findByUserId(user.getId());
        for (Booking booking : bookings) {
            // Restore seat statuses to AVAILABLE
            for (Passenger passenger : booking.getPassengers()) {
                if (passenger.getSeat() != null) {
                    Seat seat = passenger.getSeat();
                    seat.setStatus(SeatStatus.AVAILABLE);
                    seatRepository.save(seat);
                }
            }

            // Delete associated tickets
            List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
            ticketRepository.deleteAll(tickets);

            // Delete associated payments
            List<Payment> payments = paymentRepository.findByBookingId(booking.getId());
            paymentRepository.deleteAll(payments);

            // Delete the booking itself (cascade deletes passengers)
            bookingRepository.delete(booking);
        }

        // 2. Delete all traveller profiles
        travellerProfileRepository.deleteByUserId(user.getId());

        // 3. Delete password reset tokens
        passwordResetTokenRepository.deleteByUser(user);

        // 4. Finally delete the user account
        userRepository.delete(user);

        return ResponseEntity.ok(Map.of("message", "Account deleted successfully."));
    }
}
