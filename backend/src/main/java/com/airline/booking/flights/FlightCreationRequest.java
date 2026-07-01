package com.airline.booking.flights;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class FlightCreationRequest {
    private String flightNumber;
    private Long airlineId;
    private Long aircraftId;
    private String sourceAirportCode;
    private String destinationAirportCode;
    private String departureTime; // ISO-8601 string
    private String arrivalTime; // ISO-8601 string
    private BigDecimal baseFare;
    private Integer durationMinutes;
    private String couponCode;
    private BigDecimal couponDiscount; // discount percentage up to 5%
    
    // Dynamic Airport registration metadata
    private String sourceAirportName;
    private String sourceAirportCity;
    private String sourceAirportCountry;
    private String destinationAirportName;
    private String destinationAirportCity;
    private String destinationAirportCountry;

    // Dynamic Airline/Aircraft registration metadata
    private String airlineCode;
    private String airlineName;
    private String aircraftModel;
    private Integer aircraftCapacity;
}
