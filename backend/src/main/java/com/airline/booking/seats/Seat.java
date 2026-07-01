package com.airline.booking.seats;

import com.airline.booking.flights.Flight;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Entity
@Table(name = "seats")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Seat {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "flight_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "seats", "payments"})
    private Flight flight;

    @Column(name = "seat_number", nullable = false)
    private String seatNumber; // e.g. 1A, 25C

    @Enumerated(EnumType.STRING)
    @Column(name = "cabin_class", nullable = false)
    private CabinClass cabinClass;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SeatStatus status;

    @Column(name = "price_multiplier", nullable = false)
    private BigDecimal priceMultiplier; // e.g. 1.0, 1.5, 2.5
}
