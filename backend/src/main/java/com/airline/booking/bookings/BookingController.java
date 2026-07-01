package com.airline.booking.bookings;

import com.airline.booking.common.ResourceNotFoundException;
import com.airline.booking.tickets.Ticket;
import com.airline.booking.tickets.TicketRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import com.airline.booking.users.User;
import com.airline.booking.users.UserRepository;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private UserRepository userRepository;

    @PostMapping
    public ResponseEntity<?> createBooking(@RequestBody BookingRequest request, Authentication authentication) {
        String username = authentication.getName();
        Booking booking = bookingService.createBooking(request, username);
        return ResponseEntity.ok(booking);
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<?> cancelBooking(@PathVariable("id") Long id, Authentication authentication) {
        String username = authentication.getName();
        Booking booking = bookingService.cancelBooking(id, username);
        return ResponseEntity.ok(booking);
    }

    @PostMapping("/{id}/cancel-passenger/{passengerId}")
    public ResponseEntity<?> cancelPassenger(@PathVariable("id") Long id, @PathVariable("passengerId") Long passengerId, Authentication authentication) {
        String username = authentication.getName();
        Booking booking = bookingService.cancelPassenger(id, passengerId, username);
        return ResponseEntity.ok(booking);
    }

    @GetMapping("/my-trips")
    public ResponseEntity<?> getMyTrips(Authentication authentication) {
        String username = authentication.getName();
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        List<Booking> bookings = bookingRepository.findByUserId(user.getId());
        return ResponseEntity.ok(bookings);
    }

    @GetMapping("/details/{id}")
    public ResponseEntity<?> getBookingDetails(@PathVariable("id") Long id, Authentication authentication) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (!booking.getUser().getUsername().equals(authentication.getName())) {
            return ResponseEntity.status(403).body("Access Denied");
        }

        List<Ticket> tickets = ticketRepository.findByBookingId(booking.getId());
        Map<String, Object> response = new HashMap<>();
        response.put("booking", booking);
        response.put("tickets", tickets);
        return ResponseEntity.ok(response);
    }
}
