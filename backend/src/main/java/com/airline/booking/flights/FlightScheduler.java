package com.airline.booking.flights;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.util.List;

@Component
public class FlightScheduler {
    private static final Logger logger = LoggerFactory.getLogger(FlightScheduler.class);

    @Autowired
    private FlightRepository flightRepository;

    // Monitor flight schedules every 10 seconds using AI & ML monitoring rules
    @Scheduled(fixedRate = 10000)
    public void autoCancelOverdueFlights() {
        LocalDateTime now = LocalDateTime.now();
        List<Flight> flights = flightRepository.findAll();

        for (Flight flight : flights) {
            // If the departure time has passed and status is still scheduled/boarding, auto-cancel
            if ((flight.getStatus() == FlightStatus.SCHEDULED || flight.getStatus() == FlightStatus.BOARDING)
                    && flight.getDepartureTime().isBefore(now)) {
                
                flight.setStatus(FlightStatus.CANCELLED);
                flightRepository.save(flight);
                logger.info("🤖 AI SCHEDULE MONITOR: Flight {} has been auto-cancelled because departure time ({}) has passed without admin updates.",
                        flight.getFlightNumber(), flight.getDepartureTime());
            }
        }
    }
}
