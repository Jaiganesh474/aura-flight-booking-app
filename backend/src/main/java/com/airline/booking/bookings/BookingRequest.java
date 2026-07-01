package com.airline.booking.bookings;

import lombok.Data;
import java.util.List;

@Data
public class BookingRequest {
    private Long flightId;
    private List<PassengerDetails> passengers;
    private String couponCode;
    private String paymentMethod;

    @Data
    public static class PassengerDetails {
        private String firstName;
        private String lastName;
        private String gender;
        private String passportNumber;
        private String nationality;
        private Long seatId;
    }
}
