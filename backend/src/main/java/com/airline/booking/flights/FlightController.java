package com.airline.booking.flights;

import com.airline.booking.airlines.Airline;
import com.airline.booking.airlines.AirlineRepository;
import com.airline.booking.airlines.Aircraft;
import com.airline.booking.airlines.AircraftRepository;
import com.airline.booking.airports.Airport;
import com.airline.booking.airports.AirportRepository;
import com.airline.booking.common.ResourceNotFoundException;
import com.airline.booking.seats.CabinClass;
import com.airline.booking.seats.Seat;
import com.airline.booking.seats.SeatRepository;
import com.airline.booking.seats.SeatStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/flights")
@CrossOrigin(origins = "*")
public class FlightController {

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private AirlineRepository airlineRepository;

    @Autowired
    private AircraftRepository aircraftRepository;

    @Autowired
    private AirportRepository airportRepository;

    @Autowired
    private com.airline.booking.fares.CouponRepository couponRepository;

    @GetMapping("/search")
    public ResponseEntity<List<Flight>> searchFlights(
            @RequestParam(value = "source", required = false) String source,
            @RequestParam(value = "destination", required = false) String destination,
            @RequestParam(value = "date", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        
        LocalDateTime now = LocalDateTime.now();
        if (source == null || source.isBlank() || destination == null || destination.isBlank() || date == null) {
            List<Flight> all = flightRepository.findAll();
            java.util.ArrayList<Flight> active = new java.util.ArrayList<>();
            for (Flight f : all) {
                if (f.getStatus() != FlightStatus.CANCELLED && f.getDepartureTime().isAfter(now)) {
                    active.add(f);
                }
            }
            return ResponseEntity.ok(active);
        }
        
        LocalDateTime startOfDay = date.atStartOfDay();
        if (date.isEqual(now.toLocalDate()) && startOfDay.isBefore(now)) {
            startOfDay = now;
        }
        LocalDateTime endOfDay = date.atTime(LocalTime.MAX);
        List<Flight> flights = flightRepository.searchFlights(source, destination, startOfDay, endOfDay);
        
        java.util.ArrayList<Flight> active = new java.util.ArrayList<>();
        for (Flight f : flights) {
            if (f.getStatus() != FlightStatus.CANCELLED && f.getDepartureTime().isAfter(now)) {
                active.add(f);
            }
        }
        return ResponseEntity.ok(active);
    }

    @GetMapping("/details/{id}")
    public ResponseEntity<?> getFlightDetails(@PathVariable("id") Long id) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flight not found with id: " + id));
        List<Seat> seats = seatRepository.findByFlightId(id);

        Map<String, Object> response = new HashMap<>();
        response.put("flight", flight);
        response.put("seats", seats);
        return ResponseEntity.ok(response);
    }

    @GetMapping
    public ResponseEntity<List<Flight>> getAllFlights() {
        return ResponseEntity.ok(flightRepository.findAll());
    }

    @GetMapping("/airlines")
    public ResponseEntity<List<Airline>> getAllAirlines() {
        return ResponseEntity.ok(airlineRepository.findAll());
    }

    @GetMapping("/aircraft")
    public ResponseEntity<List<Aircraft>> getAllAircraft() {
        return ResponseEntity.ok(aircraftRepository.findAll());
    }

    @PostMapping
    @PreAuthorize("hasRole('AIRLINE_ADMIN')")
    public ResponseEntity<Flight> createFlight(@RequestBody FlightCreationRequest req) {
        Airline airline;
        if (req.getAirlineId() != null) {
            airline = airlineRepository.findById(req.getAirlineId())
                    .orElseThrow(() -> new ResourceNotFoundException("Airline not found"));
        } else {
            String code = req.getAirlineCode() != null && !req.getAirlineCode().isBlank() ? req.getAirlineCode().trim().toUpperCase() : "UA";
            String name = req.getAirlineName() != null && !req.getAirlineName().isBlank() ? req.getAirlineName().trim() : "Unknown Airline";
            airline = airlineRepository.findByCode(code)
                    .orElseGet(() -> {
                        Airline newAl = Airline.builder().code(code).name(name).build();
                        return airlineRepository.save(newAl);
                    });
        }

        Aircraft aircraft;
        if (req.getAircraftId() != null) {
            aircraft = aircraftRepository.findById(req.getAircraftId())
                    .orElseThrow(() -> new ResourceNotFoundException("Aircraft not found"));
        } else {
            String model = req.getAircraftModel() != null && !req.getAircraftModel().isBlank() ? req.getAircraftModel().trim() : "Boeing 737";
            Integer capacity = req.getAircraftCapacity() != null ? req.getAircraftCapacity() : 180;
            aircraft = aircraftRepository.findByModelAndAirlineId(model, airline.getId())
                    .orElseGet(() -> {
                        Aircraft newAc = Aircraft.builder().model(model).capacity(capacity).airline(airline).build();
                        return aircraftRepository.save(newAc);
                    });
        }
        Airport source = airportRepository.findById(req.getSourceAirportCode())
                .orElseGet(() -> {
                    Airport newAp = Airport.builder()
                            .code(req.getSourceAirportCode().trim().toUpperCase())
                            .name(req.getSourceAirportName() != null && !req.getSourceAirportName().isBlank() ? req.getSourceAirportName() : req.getSourceAirportCode() + " International Airport")
                            .city(req.getSourceAirportCity() != null && !req.getSourceAirportCity().isBlank() ? req.getSourceAirportCity() : "Unknown City")
                            .country(req.getSourceAirportCountry() != null && !req.getSourceAirportCountry().isBlank() ? req.getSourceAirportCountry() : "Unknown Country")
                            .timezone("UTC")
                            .terminalInfo("Terminal 1")
                            .build();
                    return airportRepository.save(newAp);
                });

        Airport dest = airportRepository.findById(req.getDestinationAirportCode())
                .orElseGet(() -> {
                    Airport newAp = Airport.builder()
                            .code(req.getDestinationAirportCode().trim().toUpperCase())
                            .name(req.getDestinationAirportName() != null && !req.getDestinationAirportName().isBlank() ? req.getDestinationAirportName() : req.getDestinationAirportCode() + " International Airport")
                            .city(req.getDestinationAirportCity() != null && !req.getDestinationAirportCity().isBlank() ? req.getDestinationAirportCity() : "Unknown City")
                            .country(req.getDestinationAirportCountry() != null && !req.getDestinationAirportCountry().isBlank() ? req.getDestinationAirportCountry() : "Unknown Country")
                            .timezone("UTC")
                            .terminalInfo("Terminal 1")
                            .build();
                    return airportRepository.save(newAp);
                });

        Flight flight = Flight.builder()
                .flightNumber(req.getFlightNumber())
                .airline(airline)
                .aircraft(aircraft)
                .sourceAirport(source)
                .destinationAirport(dest)
                .departureTime(LocalDateTime.parse(req.getDepartureTime()))
                .arrivalTime(LocalDateTime.parse(req.getArrivalTime()))
                .status(FlightStatus.SCHEDULED)
                .baseFare(req.getBaseFare())
                .durationMinutes(req.getDurationMinutes())
                .build();

        Flight savedFlight = flightRepository.save(flight);
        
        // Auto-populate seats for booking
        generateSeatsForFlight(savedFlight);

        // Handle inline flight coupon creation/linking
        if (req.getCouponCode() != null && !req.getCouponCode().trim().isEmpty()) {
            String code = req.getCouponCode().trim().toUpperCase();
            BigDecimal discount = req.getCouponDiscount();
            if (discount == null) {
                discount = new BigDecimal("5.00"); // Default 5%
            }
            if (discount.compareTo(new BigDecimal("5.00")) > 0) {
                throw new RuntimeException("Flight-restricted coupons cannot exceed a 5% discount.");
            }
            
            Optional<com.airline.booking.fares.Coupon> existingCoupon = couponRepository.findAll().stream()
                    .filter(c -> c.getCode().equalsIgnoreCase(code))
                    .findFirst();

            if (existingCoupon.isPresent()) {
                com.airline.booking.fares.Coupon coupon = existingCoupon.get();
                coupon.setRestrictedFlightId(savedFlight.getId());
                if (discount.compareTo(new BigDecimal("5.00")) <= 0) {
                    coupon.setDiscountPercentage(discount);
                }
                couponRepository.save(coupon);
            } else {
                com.airline.booking.fares.Coupon coupon = com.airline.booking.fares.Coupon.builder()
                        .code(code)
                        .discountPercentage(discount)
                        .maxDiscount(new BigDecimal("1000.00"))
                        .active(true)
                        .restrictedFlightId(savedFlight.getId())
                        .build();
                couponRepository.save(coupon);
            }
        }

        return ResponseEntity.ok(savedFlight);
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('AIRLINE_ADMIN')")
    public ResponseEntity<Flight> updateFlightStatus(@PathVariable("id") Long id, @RequestParam("status") String status) {
        Flight flight = flightRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Flight not found"));
        flight.setStatus(FlightStatus.valueOf(status.toUpperCase()));
        return ResponseEntity.ok(flightRepository.save(flight));
    }

    private void generateSeatsForFlight(Flight flight) {
        List<Seat> seats = new ArrayList<>();
        // Row 1 to 2: Business Class
        for (int row = 1; row <= 2; row++) {
            for (char col : new char[]{'A', 'B', 'E', 'F'}) {
                seats.add(Seat.builder()
                        .flight(flight)
                        .seatNumber(row + "" + col)
                        .cabinClass(CabinClass.BUSINESS)
                        .status(SeatStatus.AVAILABLE)
                        .priceMultiplier(new BigDecimal("2.50"))
                        .build());
            }
        }
        // Row 3 to 4: Premium Economy
        for (int row = 3; row <= 4; row++) {
            for (char col : new char[]{'A', 'B', 'C', 'D', 'E', 'F'}) {
                seats.add(Seat.builder()
                        .flight(flight)
                        .seatNumber(row + "" + col)
                        .cabinClass(CabinClass.PREMIUM_ECONOMY)
                        .status(SeatStatus.AVAILABLE)
                        .priceMultiplier(new BigDecimal("1.50"))
                        .build());
            }
        }
        // Row 5 to 24: Economy
        for (int row = 5; row <= 24; row++) {
            for (char col : new char[]{'A', 'B', 'C', 'D', 'E', 'F'}) {
                seats.add(Seat.builder()
                        .flight(flight)
                        .seatNumber(row + "" + col)
                        .cabinClass(CabinClass.ECONOMY)
                        .status(SeatStatus.AVAILABLE)
                        .priceMultiplier(new BigDecimal("1.00"))
                        .build());
            }
        }
        seatRepository.saveAll(seats);
    }
}
