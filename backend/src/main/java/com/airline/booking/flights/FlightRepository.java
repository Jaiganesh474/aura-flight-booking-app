package com.airline.booking.flights;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FlightRepository extends JpaRepository<Flight, Long> {
    @Query("SELECT f FROM Flight f WHERE f.sourceAirport.code = :source " +
           "AND f.destinationAirport.code = :dest " +
           "AND f.departureTime >= :startOfDay AND f.departureTime <= :endOfDay")
    List<Flight> searchFlights(@Param("source") String source, 
                               @Param("dest") String dest, 
                               @Param("startOfDay") LocalDateTime startOfDay, 
                               @Param("endOfDay") LocalDateTime endOfDay);
}
