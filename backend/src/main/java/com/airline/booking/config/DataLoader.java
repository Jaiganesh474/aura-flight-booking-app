package com.airline.booking.config;

import com.airline.booking.airlines.Airline;
import com.airline.booking.airlines.AirlineRepository;
import com.airline.booking.airlines.Aircraft;
import com.airline.booking.airlines.AircraftRepository;
import com.airline.booking.airports.Airport;
import com.airline.booking.airports.AirportRepository;
import com.airline.booking.flights.Flight;
import com.airline.booking.flights.FlightRepository;
import com.airline.booking.flights.FlightStatus;
import com.airline.booking.seats.CabinClass;
import com.airline.booking.seats.Seat;
import com.airline.booking.seats.SeatRepository;
import com.airline.booking.seats.SeatStatus;
import com.airline.booking.users.Role;
import com.airline.booking.users.User;
import com.airline.booking.users.UserRepository;
import com.airline.booking.fares.Coupon;
import com.airline.booking.fares.CouponRepository;
import com.airline.booking.bookings.BookingRepository;
import com.airline.booking.payments.PaymentRepository;
import com.airline.booking.tickets.TicketRepository;
import com.airline.booking.passengers.PassengerRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AirportRepository airportRepository;

    @Autowired
    private AirlineRepository airlineRepository;

    @Autowired
    private AircraftRepository aircraftRepository;

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private PassengerRepository passengerRepository;

    @Autowired
    private PasswordEncoder encoder;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Drop unique constraint on seat_id in passengers table if it exists (remnant from legacy @OneToOne seat mapping)
        try {
            // Find foreign key constraint name on seat_id
            List<String> fkNames = jdbcTemplate.queryForList(
                "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE " +
                "WHERE TABLE_SCHEMA = 'airlinedb' AND TABLE_NAME = 'passengers' AND COLUMN_NAME = 'seat_id' " +
                "AND REFERENCED_TABLE_NAME IS NOT NULL", String.class
            );
            
            for (String fkName : fkNames) {
                try {
                    jdbcTemplate.execute("ALTER TABLE passengers DROP FOREIGN KEY " + fkName);
                    System.out.println("Dropped foreign key: " + fkName);
                } catch (Exception ex) {
                    System.out.println("Failed to drop foreign key: " + fkName + " - " + ex.getMessage());
                }
            }

            // Now drop the unique index
            try {
                jdbcTemplate.execute("ALTER TABLE passengers DROP INDEX UK_njyquhfa2vq87ks2w6dp9vok2");
                System.out.println("Successfully dropped unique index UK_njyquhfa2vq87ks2w6dp9vok2");
            } catch (Exception ex) {
                System.out.println("Note: Unique index UK_njyquhfa2vq87ks2w6dp9vok2 not found or already dropped: " + ex.getMessage());
            }

            // Re-create the foreign key constraint (non-unique)
            try {
                jdbcTemplate.execute("ALTER TABLE passengers ADD CONSTRAINT FK_passenger_seat FOREIGN KEY (seat_id) REFERENCES seats(id)");
                System.out.println("Successfully re-created foreign key constraint FK_passenger_seat");
            } catch (Exception ex) {
                System.out.println("Note: Could not re-create foreign key: " + ex.getMessage());
            }
        } catch (Exception e) {
            System.out.println("Migration failed: " + e.getMessage());
        }

        // Alter table column status to handle PARTIALLY_CANCELLED
        try {
            jdbcTemplate.execute("ALTER TABLE bookings MODIFY COLUMN status VARCHAR(50)");
            System.out.println("Successfully modified bookings.status to VARCHAR(50)");
        } catch (Exception e) {
            System.out.println("Note: Could not modify bookings.status: " + e.getMessage());
        }

        try {
            jdbcTemplate.execute("ALTER TABLE passengers MODIFY COLUMN status VARCHAR(50)");
            System.out.println("Successfully modified passengers.status to VARCHAR(50)");
        } catch (Exception e) {
            System.out.println("Note: Could not modify passengers.status: " + e.getMessage());
        }

        // Migration fix: Ensure all existing users are set to active = true (defaulted to false by Jpa ddl update)
        userRepository.findAll().forEach(u -> {
            if (!u.isActive()) {
                u.setActive(true);
                userRepository.save(u);
            }
        });

        seedUsers();
        seedAirports();
        seedAirlinesAndAircraft();
        seedCoupons();
        seedFlightsAndSeats();
    }

    private void seedUsers() {
        if (!userRepository.existsByUsername("passenger")) {
            User passenger = User.builder()
                    .username("passenger")
                    .password(encoder.encode("password"))
                    .email("passenger@airline.com")
                    .role(Role.ROLE_PASSENGER)
                    .phone("+919876543210")
                    .build();
            userRepository.save(passenger);
        }

        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .password(encoder.encode("password"))
                    .email("admin@airline.com")
                    .role(Role.ROLE_AIRLINE_ADMIN)
                    .phone("+919876543211")
                    .build();
            userRepository.save(admin);
        }

        // Handle superadmin seed / migration safely
        userRepository.findByEmail("super@airline.com").ifPresentOrElse(
            existingSuper -> {
                existingSuper.setUsername("jaiganesh07");
                existingSuper.setPassword(encoder.encode("123456"));
                existingSuper.setRole(Role.ROLE_AIRLINE_ADMIN);
                userRepository.save(existingSuper);
            },
            () -> {
                if (!userRepository.existsByUsername("jaiganesh07")) {
                    User superAdmin = User.builder()
                            .username("jaiganesh07")
                            .password(encoder.encode("123456"))
                            .email("super@airline.com")
                            .role(Role.ROLE_AIRLINE_ADMIN)
                            .phone("+919876543212")
                            .build();
                    userRepository.save(superAdmin);
                }
            }
        );
    }

    private void seedAirports() {
        if (airportRepository.count() == 0) {
            Airport bom = Airport.builder()
                    .code("BOM")
                    .name("Chhatrapati Shivaji Maharaj International Airport")
                    .city("Mumbai")
                    .country("India")
                    .timezone("IST")
                    .terminalInfo("Terminal 2")
                    .build();
            airportRepository.save(bom);

            Airport del = Airport.builder()
                    .code("DEL")
                    .name("Indira Gandhi International Airport")
                    .city("Delhi")
                    .country("India")
                    .timezone("IST")
                    .terminalInfo("Terminal 3")
                    .build();
            airportRepository.save(del);

            Airport maa = Airport.builder()
                    .code("MAA")
                    .name("Chennai International Airport")
                    .city("Chennai")
                    .country("India")
                    .timezone("IST")
                    .terminalInfo("Terminal 1")
                    .build();
            airportRepository.save(maa);

            Airport blr = Airport.builder()
                    .code("BLR")
                    .name("Kempegowda International Airport")
                    .city("Bengaluru")
                    .country("India")
                    .timezone("IST")
                    .terminalInfo("Terminal 2")
                    .build();
            airportRepository.save(blr);

            Airport jfk = Airport.builder().code("JFK").name("John F. Kennedy International Airport").city("New York").country("USA").timezone("EST").terminalInfo("Terminal 4").build();
            airportRepository.save(jfk);

            Airport lhr = Airport.builder().code("LHR").name("London Heathrow Airport").city("London").country("UK").timezone("GMT").terminalInfo("Terminal 5").build();
            airportRepository.save(lhr);

            Airport cdg = Airport.builder().code("CDG").name("Charles de Gaulle Airport").city("Paris").country("France").timezone("CET").terminalInfo("Terminal 2E").build();
            airportRepository.save(cdg);

            Airport sin = Airport.builder().code("SIN").name("Singapore Changi Airport").city("Singapore").country("Singapore").timezone("SGT").terminalInfo("Terminal 3").build();
            airportRepository.save(sin);

            Airport dxb = Airport.builder().code("DXB").name("Dubai International Airport").city("Dubai").country("UAE").timezone("GST").terminalInfo("Terminal 3").build();
            airportRepository.save(dxb);

            Airport hnd = Airport.builder().code("HND").name("Haneda Airport").city("Tokyo").country("Japan").timezone("JST").terminalInfo("Terminal 3").build();
            airportRepository.save(hnd);

            Airport syd = Airport.builder().code("SYD").name("Sydney Airport").city("Sydney").country("Australia").timezone("AEST").terminalInfo("Terminal 1").build();
            airportRepository.save(syd);

            Airport fra = Airport.builder().code("FRA").name("Frankfurt Airport").city("Frankfurt").country("Germany").timezone("CET").terminalInfo("Terminal 1").build();
            airportRepository.save(fra);

            Airport icn = Airport.builder().code("ICN").name("Incheon International Airport").city("Seoul").country("South Korea").timezone("KST").terminalInfo("Terminal 2").build();
            airportRepository.save(icn);

            Airport lax = Airport.builder().code("LAX").name("Los Angeles International Airport").city("Los Angeles").country("USA").timezone("PST").terminalInfo("Tom Bradley International").build();
            airportRepository.save(lax);
        }
    }

    private void seedAirlinesAndAircraft() {
        if (airlineRepository.count() == 0) {
            Airline airIndia = Airline.builder().code("AI").name("Air India").logoUrl("https://upload.wikimedia.org/wikipedia/commons/e/ea/Air_India_Logo.svg").build();
            Airline indigo = Airline.builder().code("6E").name("IndiGo").logoUrl("https://upload.wikimedia.org/wikipedia/commons/b/b3/IndiGo_logo.svg").build();
            Airline akasa = Airline.builder().code("QP").name("Akasa Air").logoUrl("https://upload.wikimedia.org/wikipedia/commons/e/e6/Akasa_Air_logo.svg").build();
            Airline vistara = Airline.builder().code("UK").name("Vistara").logoUrl("https://upload.wikimedia.org/wikipedia/commons/9/91/Vistara_logo.svg").build();
            Airline spicejet = Airline.builder().code("SG").name("SpiceJet").logoUrl("https://upload.wikimedia.org/wikipedia/commons/8/87/SpiceJet_logo.png").build();
            Airline gofirst = Airline.builder().code("G8").name("GoFirst").logoUrl("https://upload.wikimedia.org/wikipedia/commons/e/ec/Go_First_Logo.svg").build();

            airlineRepository.save(airIndia);
            airlineRepository.save(indigo);
            airlineRepository.save(akasa);
            airlineRepository.save(vistara);
            airlineRepository.save(spicejet);
            airlineRepository.save(gofirst);

            Aircraft a320 = Aircraft.builder().model("Airbus A320").capacity(180).airline(indigo).build();
            Aircraft b737 = Aircraft.builder().model("Boeing 737 Max").capacity(189).airline(akasa).build();
            Aircraft b787 = Aircraft.builder().model("Boeing 787 Dreamliner").capacity(256).airline(airIndia).build();
            Aircraft b737uk = Aircraft.builder().model("Boeing 737-800").capacity(168).airline(vistara).build();
            Aircraft b737sg = Aircraft.builder().model("Boeing 737-900").capacity(189).airline(spicejet).build();
            Aircraft a320g8 = Aircraft.builder().model("Airbus A320neo").capacity(180).airline(gofirst).build();

            aircraftRepository.save(a320);
            aircraftRepository.save(b737);
            aircraftRepository.save(b787);
            aircraftRepository.save(b737uk);
            aircraftRepository.save(b737sg);
            aircraftRepository.save(a320g8);
        }
    }

    private void seedCoupons() {
        if (couponRepository.count() == 0) {
            Coupon fly20 = Coupon.builder().code("FLY20").discountPercentage(new BigDecimal("20.00")).maxDiscount(new BigDecimal("1500.00")).active(true).build();
            Coupon super50 = Coupon.builder().code("SUPER50").discountPercentage(new BigDecimal("50.00")).maxDiscount(new BigDecimal("3000.00")).active(true).build();
            Coupon fest10 = Coupon.builder().code("FEST10").discountPercentage(new BigDecimal("10.00")).maxDiscount(new BigDecimal("800.00")).active(true).build();
            
            couponRepository.save(fly20);
            couponRepository.save(super50);
            couponRepository.save(fest10);
        }
    }

    private void seedFlightsAndSeats() {
        if (flightRepository.count() > 0) {
            return; // Already seeded, preserve user data across restarts
        }
        // Clear all legacy test bookings, seats, and flights to seed fresh active schedules for the current calendar week
        paymentRepository.deleteAllInBatch();
        ticketRepository.deleteAllInBatch();
        passengerRepository.deleteAllInBatch();
        bookingRepository.deleteAllInBatch();
        seatRepository.deleteAllInBatch();
        flightRepository.deleteAllInBatch();

        bookingRepository.flush();
        seatRepository.flush();
        flightRepository.flush();

        Airport bom = airportRepository.findById("BOM").orElse(null);
            Airport del = airportRepository.findById("DEL").orElse(null);
            Airport maa = airportRepository.findById("MAA").orElse(null);
            Airport blr = airportRepository.findById("BLR").orElse(null);

            Airline indigo = airlineRepository.findByCode("6E").orElse(null);
            Airline airIndia = airlineRepository.findByCode("AI").orElse(null);
            Airline akasa = airlineRepository.findByCode("QP").orElse(null);

            Aircraft a320 = aircraftRepository.findByAirlineId(indigo.getId()).get(0);
            Aircraft b787 = aircraftRepository.findByAirlineId(airIndia.getId()).get(0);
            Aircraft b737 = aircraftRepository.findByAirlineId(akasa.getId()).get(0);

            // Generate flights for the next 7 days
            for (int i = 0; i < 7; i++) {
                LocalDateTime tomorrowBase = LocalDateTime.now().plusDays(i);
                
                // Flight 1: MAA -> BOM (Morning)
                Flight f1 = Flight.builder()
                        .flightNumber("6E-10" + i)
                        .airline(indigo)
                        .aircraft(a320)
                        .sourceAirport(maa)
                        .destinationAirport(bom)
                        .departureTime(tomorrowBase.withHour(8).withMinute(0).withSecond(0))
                        .arrivalTime(tomorrowBase.withHour(10).withMinute(15).withSecond(0))
                        .status(FlightStatus.SCHEDULED)
                        .baseFare(new BigDecimal("5200.00"))
                        .durationMinutes(135)
                        .build();
                flightRepository.save(f1);
                generateSeatsForFlight(f1);

                // Flight 2: BOM -> DEL (Evening)
                Flight f2 = Flight.builder()
                        .flightNumber("AI-20" + i)
                        .airline(airIndia)
                        .aircraft(b787)
                        .sourceAirport(bom)
                        .destinationAirport(del)
                        .departureTime(tomorrowBase.withHour(18).withMinute(30).withSecond(0))
                        .arrivalTime(tomorrowBase.withHour(20).withMinute(45).withSecond(0))
                        .status(FlightStatus.SCHEDULED)
                        .baseFare(new BigDecimal("6500.00"))
                        .durationMinutes(135)
                        .build();
                flightRepository.save(f2);
                generateSeatsForFlight(f2);

                // Flight 3: DEL -> MAA (Night)
                Flight f3 = Flight.builder()
                        .flightNumber("QP-30" + i)
                        .airline(akasa)
                        .aircraft(b737)
                        .sourceAirport(del)
                        .destinationAirport(maa)
                        .departureTime(tomorrowBase.withHour(22).withMinute(15).withSecond(0))
                        .arrivalTime(tomorrowBase.withHour(1).withMinute(0).withSecond(0).plusDays(1))
                        .status(FlightStatus.SCHEDULED)
                        .baseFare(new BigDecimal("4800.00"))
                        .durationMinutes(165)
                        .build();
                flightRepository.save(f3);
                generateSeatsForFlight(f3);

                // Flight 4: BLR -> BOM (Afternoon)
                Flight f4 = Flight.builder()
                        .flightNumber("6E-40" + i)
                        .airline(indigo)
                        .aircraft(a320)
                        .sourceAirport(blr)
                        .destinationAirport(bom)
                        .departureTime(tomorrowBase.withHour(13).withMinute(45).withSecond(0))
                        .arrivalTime(tomorrowBase.withHour(15).withMinute(30).withSecond(0))
                        .status(FlightStatus.SCHEDULED)
                        .baseFare(new BigDecimal("3500.00"))
                        .durationMinutes(105)
                        .build();
                flightRepository.save(f4);
                generateSeatsForFlight(f4);
            }
    }

    private void generateSeatsForFlight(Flight flight) {
        List<Seat> seats = new ArrayList<>();
        // Row 1 to 2: Business Class (Rows 1-2, Seats A, B, E, F)
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

        // Row 3 to 4: Premium Economy Class (Rows 3-4, Seats A, B, C, D, E, F)
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

        // Row 5 to 24: Economy Class (Rows 5-24, Seats A, B, C, D, E, F)
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
