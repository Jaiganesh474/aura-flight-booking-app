package com.airline.booking.airlines;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AircraftRepository extends JpaRepository<Aircraft, Long> {
    List<Aircraft> findByAirlineId(Long airlineId);
    Optional<Aircraft> findByModelAndAirlineId(String model, Long airlineId);
}
