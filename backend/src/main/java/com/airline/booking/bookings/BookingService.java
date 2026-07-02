package com.airline.booking.bookings;

import com.airline.booking.common.BadRequestException;
import com.airline.booking.common.ResourceNotFoundException;
import com.airline.booking.flights.Flight;
import com.airline.booking.flights.FlightRepository;
import com.airline.booking.fares.Coupon;
import com.airline.booking.fares.CouponRepository;
import com.airline.booking.passengers.Passenger;
import com.airline.booking.passengers.PassengerRepository;
import com.airline.booking.seats.Seat;
import com.airline.booking.seats.SeatRepository;
import com.airline.booking.seats.SeatStatus;
import com.airline.booking.users.User;
import com.airline.booking.users.UserRepository;
import com.airline.booking.payments.Payment;
import com.airline.booking.payments.PaymentRepository;
import com.airline.booking.payments.PaymentStatus;
import com.airline.booking.tickets.Ticket;
import com.airline.booking.tickets.TicketRepository;
import com.airline.booking.notifications.Notification;
import com.airline.booking.notifications.NotificationRepository;
import com.airline.booking.email.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private SeatRepository seatRepository;

    @Autowired
    private PassengerRepository passengerRepository;

    @Autowired
    private CouponRepository couponRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private com.airline.booking.pdf.PdfGenerationService pdfGenerationService;

    @Transactional
    public Booking createBooking(BookingRequest request, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

        Flight flight = flightRepository.findById(request.getFlightId())
                .orElseThrow(() -> new ResourceNotFoundException("Flight not found: " + request.getFlightId()));

        // Verify seats
        List<Seat> bookedSeats = new ArrayList<>();
        for (BookingRequest.PassengerDetails pd : request.getPassengers()) {
            Seat seat = seatRepository.findById(pd.getSeatId())
                    .orElseThrow(() -> new ResourceNotFoundException("Seat not found: " + pd.getSeatId()));
            if (!seat.getStatus().equals(SeatStatus.AVAILABLE)) {
                throw new BadRequestException("Seat " + seat.getSeatNumber() + " is already taken!");
            }
            bookedSeats.add(seat);
        }

        // Generate PNR (6-letter string)
        String pnr = generatePnr();

        // Calculate Fare
        BigDecimal baseSum = BigDecimal.ZERO;
        for (Seat seat : bookedSeats) {
            BigDecimal seatPrice = flight.getBaseFare().multiply(seat.getPriceMultiplier());
            baseSum = baseSum.add(seatPrice);
        }

        BigDecimal passengerCount = new BigDecimal(request.getPassengers().size());
        BigDecimal baggageFee = new BigDecimal("200.00").multiply(passengerCount); // 200 INR per head baggage fee
        BigDecimal bookingFee = new BigDecimal("150.00").multiply(passengerCount); // 150 INR per head booking fee
        BigDecimal subTotal = baseSum.add(baggageFee).add(bookingFee);

        BigDecimal discount = BigDecimal.ZERO;
        if (request.getCouponCode() != null && !request.getCouponCode().trim().isEmpty()) {
            Optional<Coupon> couponOpt = couponRepository.findByCodeAndActiveTrue(request.getCouponCode().toUpperCase());
            if (couponOpt.isPresent()) {
                Coupon coupon = couponOpt.get();
                // Enforce flight-specific coupon restrictions
                if (coupon.getRestrictedFlightId() != null && !coupon.getRestrictedFlightId().equals(flight.getId())) {
                    throw new BadRequestException("Coupon code " + coupon.getCode() + " is only applicable for flight ID " + coupon.getRestrictedFlightId());
                }
                BigDecimal rawDiscount = subTotal.multiply(coupon.getDiscountPercentage().divide(new BigDecimal("100.00"), RoundingMode.HALF_UP));
                discount = rawDiscount.min(coupon.getMaxDiscount()).setScale(2, RoundingMode.HALF_UP);
            }
        }

        BigDecimal totalFare = subTotal.subtract(discount).setScale(2, RoundingMode.HALF_UP);

        // Save Booking
        Booking booking = Booking.builder()
                .pnr(pnr)
                .user(user)
                .flight(flight)
                .status(BookingStatus.CONFIRMED)
                .totalFare(totalFare)
                .build();

        booking = bookingRepository.save(booking);

        // Process Passengers & mark seats booked
        for (int i = 0; i < request.getPassengers().size(); i++) {
            BookingRequest.PassengerDetails pd = request.getPassengers().get(i);
            Seat seat = bookedSeats.get(i);

            // Update seat status
            seat.setStatus(SeatStatus.BOOKED);
            seatRepository.save(seat);

            Passenger passenger = Passenger.builder()
                    .booking(booking)
                    .firstName(pd.getFirstName())
                    .lastName(pd.getLastName())
                    .gender(pd.getGender())
                    .passportNumber(pd.getPassportNumber())
                    .nationality(pd.getNationality())
                    .seat(seat)
                    .build();

            passenger = passengerRepository.save(passenger);
            booking.getPassengers().add(passenger);

            // Generate Ticket
            String ticketNumber = "TKT-" + Math.abs(new Random().nextLong() % 90000000L + 10000000L);
            String qrInfo = String.format("PNR: %s | Ticket: %s | Passenger: %s %s | Seat: %s | Flight: %s",
                    pnr, ticketNumber, pd.getFirstName(), pd.getLastName(), seat.getSeatNumber(), flight.getFlightNumber());
            String qrBase64 = Base64.getEncoder().encodeToString(qrInfo.getBytes(StandardCharsets.UTF_8));

            Ticket ticket = Ticket.builder()
                    .ticketNumber(ticketNumber)
                    .booking(booking)
                    .passenger(passenger)
                    .pnr(pnr)
                    .qrCodeBase64(qrBase64)
                    .build();

            ticketRepository.save(ticket);
        }

        // Save Payment
        String txnId = "TXN-" + Math.abs(new Random().nextLong() % 9000000000L + 1000000000L);
        Payment payment = Payment.builder()
                .booking(booking)
                .transactionId(txnId)
                .amount(totalFare)
                .paymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "CREDIT_CARD")
                .status(PaymentStatus.SUCCESS)
                .build();

        paymentRepository.save(payment);

        // Send notification
        String emailContent = String.format("Dear %s, Your booking for Flight %s is CONFIRMED. PNR: %s. Total Amount paid: INR %s",
                user.getUsername(), flight.getFlightNumber(), pnr, totalFare);
        Notification notification = Notification.builder()
                .user(user)
                .message(emailContent)
                .type("EMAIL")
                .status("SENT")
                .build();
        notificationRepository.save(notification);

        // Generate e-ticket and tax invoice PDFs
        byte[] ticketPdf = pdfGenerationService.generateTicketPdf(booking);
        byte[] invoicePdf = pdfGenerationService.generateInvoicePdf(booking);

        // Send confirmation email with PDF attachments
        emailService.sendBookingConfirmation(user.getEmail(), booking.getId(), ticketPdf, invoicePdf);

        return booking;
    }

    @Transactional
    public Booking cancelBooking(Long id, String username) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (!booking.getUser().getUsername().equals(username)) {
            throw new BadRequestException("Unauthorized access to booking cancellation");
        }

        if (booking.getStatus().equals(BookingStatus.CANCELLED)) {
            throw new BadRequestException("Booking is already cancelled");
        }

        LocalDateTime depTime = booking.getFlight().getDepartureTime();
        LocalDateTime now = LocalDateTime.now();

        if (now.isAfter(depTime)) {
            throw new BadRequestException("Cannot cancel a booking for a flight that has already departed.");
        }

        long hoursRemaining = java.time.Duration.between(now, depTime).toHours();

        BigDecimal totalFare = booking.getTotalFare();
        BigDecimal refundAmount = BigDecimal.ZERO;
        BigDecimal penaltyAmount = totalFare;

        if (hoursRemaining >= 24) {
            refundAmount = totalFare.multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP);
            penaltyAmount = totalFare.subtract(refundAmount);
        } else if (hoursRemaining >= 12) {
            refundAmount = totalFare.multiply(new BigDecimal("0.75")).setScale(2, RoundingMode.HALF_UP);
            penaltyAmount = totalFare.subtract(refundAmount);
        } else if (hoursRemaining >= 4) {
            refundAmount = totalFare.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
            penaltyAmount = totalFare.subtract(refundAmount);
        } else {
            refundAmount = BigDecimal.ZERO;
            penaltyAmount = totalFare;
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setRefundAmount(refundAmount);
        booking.setCancellationPenalty(penaltyAmount);

        // Free seats and cancel passengers
        for (Passenger passenger : booking.getPassengers()) {
            passenger.setStatus("CANCELLED");
            if (passenger.getSeat() != null) {
                Seat seat = passenger.getSeat();
                seat.setStatus(SeatStatus.AVAILABLE);
                seatRepository.save(seat);
                passenger.setSeat(null);
            }
            passengerRepository.save(passenger);
        }

        // Refund payment simulation
        List<Payment> payments = paymentRepository.findByBookingId(booking.getId());
        for (Payment payment : payments) {
            if (payment.getStatus().equals(PaymentStatus.SUCCESS)) {
                payment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(payment);
            }
        }

        // Notify user
        String emailContent = String.format("Dear %s, Your booking with PNR: %s has been CANCELLED. Refund of INR %s has been initiated after a cancellation charge of INR %s.",
                booking.getUser().getUsername(), booking.getPnr(), refundAmount, penaltyAmount);
        Notification notification = Notification.builder()
                .user(booking.getUser())
                .message(emailContent)
                .type("EMAIL")
                .status("SENT")
                .build();
        notificationRepository.save(notification);

        Booking saved = bookingRepository.save(booking);

        // Send Brevo cancellation email
        emailService.sendBookingCancellation(booking.getUser().getEmail(), saved.getId());

        return saved;
    }

    @Transactional
    public Booking cancelPassenger(Long id, Long passengerId, String username) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + id));

        if (!booking.getUser().getUsername().equals(username)) {
            throw new BadRequestException("Unauthorized access to booking cancellation");
        }

        if (booking.getStatus().equals(BookingStatus.CANCELLED)) {
            throw new BadRequestException("Booking is already fully cancelled");
        }

        LocalDateTime depTime = booking.getFlight().getDepartureTime();
        LocalDateTime now = LocalDateTime.now();

        if (now.isAfter(depTime)) {
            throw new BadRequestException("Cannot cancel a ticket for a flight that has already departed.");
        }

        Passenger targetPassenger = booking.getPassengers().stream()
                .filter(p -> p.getId().equals(passengerId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Passenger not found: " + passengerId));

        if ("CANCELLED".equalsIgnoreCase(targetPassenger.getStatus())) {
            throw new BadRequestException("Passenger ticket is already cancelled");
        }

        // Release passenger's seat
        if (targetPassenger.getSeat() != null) {
            Seat seat = targetPassenger.getSeat();
            seat.setStatus(SeatStatus.AVAILABLE);
            seatRepository.save(seat);
            targetPassenger.setSeat(null);
        }

        targetPassenger.setStatus("CANCELLED");
        passengerRepository.save(targetPassenger);

        // Calculate refund/penalty for this passenger's share.
        long passengerCount = booking.getPassengers().size();
        BigDecimal passengerFare = booking.getTotalFare().divide(new BigDecimal(passengerCount), 2, RoundingMode.HALF_UP);

        long hoursRemaining = java.time.Duration.between(now, depTime).toHours();
        BigDecimal refundAmount = BigDecimal.ZERO;
        BigDecimal penaltyAmount = passengerFare;

        if (hoursRemaining >= 24) {
            refundAmount = passengerFare.multiply(new BigDecimal("0.90")).setScale(2, RoundingMode.HALF_UP);
            penaltyAmount = passengerFare.subtract(refundAmount);
        } else if (hoursRemaining >= 12) {
            refundAmount = passengerFare.multiply(new BigDecimal("0.75")).setScale(2, RoundingMode.HALF_UP);
            penaltyAmount = passengerFare.subtract(refundAmount);
        } else if (hoursRemaining >= 4) {
            refundAmount = passengerFare.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP);
            penaltyAmount = passengerFare.subtract(refundAmount);
        } else {
            refundAmount = BigDecimal.ZERO;
            penaltyAmount = passengerFare;
        }

        // Accumulate refund/penalty in booking
        booking.setRefundAmount((booking.getRefundAmount() != null ? booking.getRefundAmount() : BigDecimal.ZERO).add(refundAmount));
        booking.setCancellationPenalty((booking.getCancellationPenalty() != null ? booking.getCancellationPenalty() : BigDecimal.ZERO).add(penaltyAmount));

        // Determine booking status
        long activeCount = booking.getPassengers().stream()
                .filter(p -> !"CANCELLED".equalsIgnoreCase(p.getStatus()))
                .count();

        if (activeCount == 0) {
            booking.setStatus(BookingStatus.CANCELLED);
        } else {
            booking.setStatus(BookingStatus.PARTIALLY_CANCELLED);
        }

        Booking saved = bookingRepository.save(booking);

        // Send confirmation notification
        String emailContent = String.format("Dear %s, Ticket for passenger %s %s under PNR: %s has been CANCELLED. Refund of INR %s has been initiated after a cancellation charge of INR %s.",
                booking.getUser().getUsername(), targetPassenger.getFirstName(), targetPassenger.getLastName(), booking.getPnr(), refundAmount, penaltyAmount);
        Notification notification = Notification.builder()
                .user(booking.getUser())
                .message(emailContent)
                .type("EMAIL")
                .status("SENT")
                .build();
        notificationRepository.save(notification);

        return saved;
    }

    private String generatePnr() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder sb = new StringBuilder();
        Random rnd = new Random();
        while (sb.length() < 6) {
            int index = (int) (rnd.nextFloat() * chars.length());
            sb.append(chars.charAt(index));
        }
        return sb.toString();
    }
}
