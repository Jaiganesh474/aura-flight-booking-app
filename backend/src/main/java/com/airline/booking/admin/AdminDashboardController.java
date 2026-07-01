package com.airline.booking.admin;

import com.airline.booking.airlines.AirlineRepository;
import com.airline.booking.airports.AirportRepository;
import com.airline.booking.bookings.Booking;
import com.airline.booking.bookings.BookingRepository;
import com.airline.booking.bookings.BookingStatus;
import com.airline.booking.flights.FlightRepository;
import com.airline.booking.users.UserRepository;
import com.airline.booking.seats.SeatRepository;
import com.airline.booking.seats.SeatStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/dashboard")
@CrossOrigin(origins = "*")
public class AdminDashboardController {

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AirlineRepository airlineRepository;

    @Autowired
    private AirportRepository airportRepository;

    @Autowired
    private SeatRepository seatRepository;

    @GetMapping("/stats")
    public ResponseEntity<?> getDashboardStats() {
        long totalFlights = flightRepository.count();
        long totalBookings = bookingRepository.count();
        long totalUsers = userRepository.count();
        long totalAirlines = airlineRepository.count();
        long totalAirports = airportRepository.count();

        // Calculate Revenue
        List<Booking> bookings = bookingRepository.findAll();
        BigDecimal totalRevenue = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                .map(Booking::getTotalFare)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Occupancy calculation
        long totalSeats = seatRepository.count();
        long bookedSeatsCount = seatRepository.findAll().stream()
                .filter(s -> s.getStatus() == SeatStatus.BOOKED)
                .count();
        double occupancyRate = totalSeats > 0 ? ((double) bookedSeatsCount / totalSeats) * 100 : 0.0;

        // Group by Date for Chart: Bookings per Day & Revenue per Day
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        Map<String, Long> bookingsPerDay = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getBookingDate().format(formatter), Collectors.counting()));

        Map<String, BigDecimal> revenuePerDay = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CONFIRMED)
                .collect(Collectors.groupingBy(b -> b.getBookingDate().format(formatter),
                        Collectors.reducing(BigDecimal.ZERO, Booking::getTotalFare, BigDecimal::add)));

        List<Map<String, Object>> trendData = new ArrayList<>();
        // Merge keys to get chronological order
        SortedSet<String> allDates = new TreeSet<>(bookingsPerDay.keySet());
        if (allDates.isEmpty()) {
            allDates.add(java.time.LocalDate.now().format(formatter));
        }
        for (String date : allDates) {
            Map<String, Object> dayStats = new HashMap<>();
            dayStats.put("date", date);
            dayStats.put("bookings", bookingsPerDay.getOrDefault(date, 0L));
            dayStats.put("revenue", revenuePerDay.getOrDefault(date, BigDecimal.ZERO));
            trendData.add(dayStats);
        }

        // Popular Routes
        Map<String, Long> routeCount = bookings.stream()
                .collect(Collectors.groupingBy(b -> b.getFlight().getSourceAirport().getCode() + " ➔ " + b.getFlight().getDestinationAirport().getCode(),
                        Collectors.counting()));
        List<Map<String, Object>> routesData = new ArrayList<>();
        routeCount.forEach((route, count) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("route", route);
            m.put("count", count);
            routesData.add(m);
        });

        // Cancellation stats
        long cancelledCount = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.CANCELLED)
                .count();

        Map<String, Object> response = new HashMap<>();
        response.put("totalFlights", totalFlights);
        response.put("totalBookings", totalBookings);
        response.put("totalRevenue", totalRevenue);
        response.put("totalUsers", totalUsers);
        response.put("totalAirlines", totalAirlines);
        response.put("totalAirports", totalAirports);
        response.put("occupancyRate", Math.round(occupancyRate * 10.0) / 10.0);
        response.put("trendData", trendData);
        response.put("routesData", routesData);
        response.put("cancellationsCount", cancelledCount);

        return ResponseEntity.ok(response);
    }
}
