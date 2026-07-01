package com.airline.booking.email;

import com.airline.booking.bookings.Booking;
import com.airline.booking.passengers.Passenger;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${app.email.from}")
    private String fromEmail;

    @Value("${app.email.from-name}")
    private String fromName;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a 'HRS'");

    // ─── Helper ───────────────────────────────────────────────────────────────

    private void send(String to, String subject, String htmlBody) {
        sendWithAttachments(to, subject, htmlBody, null, null, null);
    }

    private void sendWithAttachments(String to, String subject, String htmlBody, byte[] ticketPdf, byte[] invoicePdf, String pnr) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, fromName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);

            if (ticketPdf != null) {
                helper.addAttachment("Ticket-" + pnr + ".pdf", new ByteArrayResource(ticketPdf));
            }
            if (invoicePdf != null) {
                helper.addAttachment("Invoice-" + pnr + ".pdf", new ByteArrayResource(invoicePdf));
            }

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("[EmailService] Failed to send email to " + to + ": " + e.getMessage());
        }
    }

    private String wrap(String content) {
        return """
            <!DOCTYPE html>
            <html><head>
            <meta charset="UTF-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <style>
              body { font-family: Arial, sans-serif; background: #ffffff; margin: 0; padding: 10px; color: #333333; }
              .sys-gen-notice { font-size: 11px; color: #444444; border-bottom: 1px solid #cccccc; padding-bottom: 8px; margin-bottom: 12px; }
              .container { max-width: 800px; margin: 0 auto; border: 1px solid #dddddd; padding: 15px; }
              .header { text-align: left; border-bottom: 2px solid #0056b3; padding-bottom: 10px; margin-bottom: 15px; }
              .header h1 { color: #0056b3; font-size: 24px; margin: 0; display: inline-block; vertical-align: middle; }
              .header-subtitle { float: right; font-size: 13px; font-weight: bold; color: #666666; margin-top: 8px; }
              .alert-banner { background: #fff3cd; border: 1px solid #ffeeba; color: #856404; padding: 10px 15px; font-size: 13px; font-weight: bold; margin-bottom: 15px; border-radius: 4px; line-height: 1.5; }
              .alert-banner-red { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 10px 15px; font-size: 13px; font-weight: bold; margin-bottom: 15px; border-radius: 4px; line-height: 1.5; }
              .section-title { font-size: 14px; font-weight: bold; color: #0056b3; margin: 15px 0 6px 0; border-bottom: 1px solid #0056b3; padding-bottom: 3px; }
              .info-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              .info-table td { border: 1px solid #dddddd; padding: 8px; font-size: 12px; }
              .info-label { background: #f8f9fa; font-weight: bold; width: 20%; color: #444444; }
              .info-value { width: 30%; color: #000000; }
              .highlight { color: #d97706; font-weight: bold; }
              .details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              .details-table th { background: #e9ecef; border: 1px solid #dddddd; padding: 8px; font-size: 12px; font-weight: bold; text-align: left; color: #333; }
              .details-table td { border: 1px solid #dddddd; padding: 8px; font-size: 12px; }
              .btn { display: inline-block; background: #0056b3; color: white; padding: 8px 18px; border-radius: 4px; text-decoration: none; font-size: 13px; font-weight: bold; margin: 10px 0; }
              .footer-section { margin-top: 25px; border-top: 1px solid #eeeeee; padding-top: 15px; }
              .footer-title { font-size: 13px; font-weight: bold; color: #0056b3; margin-bottom: 5px; }
              .footer-list { font-size: 11px; color: #555555; line-height: 1.6; margin: 0 0 15px 0; padding-left: 20px; }
              .eco-friendly { color: #28a745; font-size: 12px; font-weight: bold; margin: 15px 0; text-align: center; }
              .signature { font-size: 12px; color: #444444; margin-top: 15px; line-height: 1.5; }
            </style>
            </head><body>
            <div class="sys-gen-notice">
              This is a system generated mail. Please do not reply to this email ID. For Aura Travel Agencies related queries use customer care contacts below.
            </div>
            <div class="container">
              <div class="header">
                <h1>AURA TRAVEL AGENCIES</h1>
                <div class="header-subtitle">Aura Airways Booking</div>
                <div style="clear:both;"></div>
              </div>
            """ + content + """
            </div>
            </body></html>
            """;
    }

    // ─── Welcome Email ─────────────────────────────────────────────────────────

    @Async
    public void sendWelcomeEmail(String to, String username) {
        String content = """
            <h2 style="font-size: 16px; margin: 0 0 10px 0;">Welcome aboard, %s! 🎉</h2>
            <p style="font-size:13px; line-height:1.5;">Your Aura Airways account has been created successfully. You're all set to book your next adventure.</p>
            <table class="info-table">
              <tr>
                <td class="info-label">Username</td>
                <td class="info-value">%s</td>
                <td class="info-label">Email</td>
                <td class="info-value">%s</td>
              </tr>
            </table>
            <p style="font-size:13px; line-height:1.5;">Start exploring flights and enjoy seamless booking experiences with Aura Travel Agencies.</p>
            <a href="%s" class="btn">Book Your First Flight →</a>
            """.formatted(username, username, to, frontendUrl);
        send(to, "Welcome to Aura Airways — Account Created", wrap(content));
    }

    // ─── Booking Confirmation ──────────────────────────────────────────────────

    @Async
    public void sendBookingConfirmation(String to, Booking booking, byte[] ticketPdf, byte[] invoicePdf) {
        String passengerRows = "";
        int idx = 1;
        for (Passenger p : booking.getPassengers()) {
            String seat = p.getSeat() != null ? p.getSeat().getSeatNumber() : "—";
            String cls  = p.getSeat() != null ? p.getSeat().getCabinClass().name() : "—";
            passengerRows += """
                <tr>
                  <td>%d</td>
                  <td>%s %s</td>
                  <td>%s</td>
                  <td>CNF</td>
                  <td>%s / %s</td>
                </tr>
                """.formatted(idx++, p.getFirstName(), p.getLastName(), p.getGender(), seat, cls);
        }

        String dep = booking.getFlight().getDepartureTime().format(DT_FMT);
        String arr = booking.getFlight().getArrivalTime().format(DT_FMT);

        // Tax Audit Detailing calculations
        BigDecimal totalFare = booking.getTotalFare();
        BigDecimal gstRate = new BigDecimal("0.18");
        BigDecimal convenienceFee = new BigDecimal("150.00");
        BigDecimal baseFarePlusBooking = totalFare.subtract(convenienceFee).divide(BigDecimal.ONE.add(gstRate), 2, RoundingMode.HALF_UP);
        BigDecimal totalGst = baseFarePlusBooking.add(convenienceFee).multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal baseFare = totalFare.subtract(convenienceFee).subtract(totalGst).setScale(2, RoundingMode.HALF_UP);
        BigDecimal cgst = totalGst.divide(new BigDecimal("2.0"), 2, RoundingMode.HALF_UP);
        BigDecimal sgst = totalGst.subtract(cgst);

        String content = """
            <div class="alert-banner">
              ⚠️ IMPORTANT TRAVEL ADVISORY: Please complete your web check-in 24 hours prior to departure. Double-dose Vaccination Certificate or a negative RT-PCR report may be requested by local state authorities upon arrival.
            </div>

            <p style="font-size:13px; line-height:1.5;">Dear Customer, Thank you for using Aura Travel Agencies' online flight reservation facility. Your booking details are indicated below.</p>
            
            <div class="section-title">Ticket Confirmation</div>
            <table class="info-table">
              <tr>
                <td class="info-label">PNR No.:</td>
                <td class="info-value highlight">%s</td>
                <td class="info-label">Flight No / Name:</td>
                <td class="info-value">%s - %s</td>
              </tr>
              <tr>
                <td class="info-label">From:</td>
                <td class="info-value">%s (%s)</td>
                <td class="info-label">To:</td>
                <td class="info-value">%s (%s)</td>
              </tr>
              <tr>
                <td class="info-label">Departure Date/Time:</td>
                <td class="info-value">%s</td>
                <td class="info-label">Arrival Date/Time:</td>
                <td class="info-value">%s</td>
              </tr>
              <tr>
                <td class="info-label">Class of Travel:</td>
                <td class="info-value">%s</td>
                <td class="info-label">Total Pax Count:</td>
                <td class="info-value">%d</td>
              </tr>
            </table>

            <div class="section-title">Passenger Details</div>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Sl. No.</th>
                  <th>Name</th>
                  <th>Gender</th>
                  <th>Status</th>
                  <th>Seat / Cabin</th>
                </tr>
              </thead>
              <tbody>
                %s
              </tbody>
            </table>

            <div class="section-title">Fare Details & Tax Audit Breakdown (Inclusive of GST)</div>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Fare Component</th>
                  <th style="text-align: right;">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Base Fare & Allied Charges</td>
                  <td style="text-align: right;">₹%s</td>
                </tr>
                <tr>
                  <td>Convenience Fee</td>
                  <td style="text-align: right;">₹%s</td>
                </tr>
                <tr>
                  <td>Central GST (CGST 9%%)</td>
                  <td style="text-align: right;">₹%s</td>
                </tr>
                <tr>
                  <td>State GST (SGST 9%%)</td>
                  <td style="text-align: right;">₹%s</td>
                </tr>
                <tr style="font-weight: bold; background: #e9ecef;">
                  <td>Total Fare (Paid)</td>
                  <td style="text-align: right; color: #d97706;">₹%s</td>
                </tr>
              </tbody>
            </table>

            <div class="eco-friendly">
              🌱 Please don't print unless extremely necessary. Save paper, save trees.
            </div>

            <div class="footer-section">
              <div class="footer-title">Must Read</div>
              <ul class="footer-list">
                <li>You must carry a valid photo identification card (Passport, Aadhaar, PAN, Voter ID) in original during journey.</li>
                <li>Please report to the check-in counters at least 2 hours before the scheduled departure of domestic flights.</li>
                <li>Free baggage allowance details are printed on your attached e-ticket PDF.</li>
              </ul>

              <div class="footer-title">How To</div>
              <ul class="footer-list">
                <li>To cancel your booking or change details, please visit the <a href="%s/my-trips">My Trips</a> portal.</li>
                <li>Please refer to airline baggage policy for excess weight charges.</li>
              </ul>

              <div class="footer-title">Customer Care</div>
              <ul class="footer-list">
                <li>For any assistance, please write to us at support@auratravels.com or call our toll free support line.</li>
              </ul>
            </div>

            <div class="signature">
              Warm Regards,<br>
              <strong>Customer Care</strong><br>
              Aura Travel Agencies
            </div>
            """.formatted(
                booking.getPnr(),
                booking.getFlight().getAirline().getName(), booking.getFlight().getFlightNumber(),
                booking.getFlight().getSourceAirport().getCity(), booking.getFlight().getSourceAirport().getCode(),
                booking.getFlight().getDestinationAirport().getCity(), booking.getFlight().getDestinationAirport().getCode(),
                dep, arr,
                booking.getPassengers().isEmpty() ? "—" : booking.getPassengers().get(0).getSeat().getCabinClass().name(),
                booking.getPassengers().size(),
                passengerRows,
                baseFare,
                convenienceFee,
                cgst,
                sgst,
                totalFare,
                frontendUrl
        );

        sendWithAttachments(to, "✈ Booking Confirmed — PNR: " + booking.getPnr(), wrap(content), ticketPdf, invoicePdf, booking.getPnr());
    }

    // ─── Booking Cancellation ──────────────────────────────────────────────────

    @Async
    public void sendBookingCancellation(String to, Booking booking) {
        String dep = booking.getFlight().getDepartureTime().format(DT_FMT);
        String arr = booking.getFlight().getArrivalTime().format(DT_FMT);

        String content = """
            <div class="alert-banner-red">
              🔴 CANCELLATION NOTICE: Your booking under PNR %s has been successfully cancelled.
            </div>

            <p style="font-size:13px; line-height:1.5;">Dear Customer, We confirm that your booking with Aura Travel Agencies has been cancelled as per your request. The refund breakdown is outlined below.</p>

            <div class="section-title">Cancellation Summary</div>
            <table class="info-table">
              <tr>
                <td class="info-label">PNR No.:</td>
                <td class="info-value highlight">%s</td>
                <td class="info-label">Flight Details:</td>
                <td class="info-value">%s - %s</td>
              </tr>
              <tr>
                <td class="info-label">From:</td>
                <td class="info-value">%s</td>
                <td class="info-label">To:</td>
                <td class="info-value">%s</td>
              </tr>
              <tr>
                <td class="info-label">Original Departure:</td>
                <td class="info-value">%s</td>
                <td class="info-label">Original Arrival:</td>
                <td class="info-value">%s</td>
              </tr>
            </table>

            <div class="section-title">Refund & Penalty Detailing</div>
            <table class="details-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align: right;">Amount (INR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Paid Amount</td>
                  <td style="text-align: right;">₹%s</td>
                </tr>
                <tr>
                  <td style="color: #dc3545; font-weight: bold;">Cancellation Charges / Penalty</td>
                  <td style="text-align: right; color: #dc3545; font-weight: bold;">₹%s</td>
                </tr>
                <tr style="font-weight: bold; background: #e9ecef; color: #28a745;">
                  <td>Net Refund Initiated</td>
                  <td style="text-align: right;">₹%s</td>
                </tr>
              </tbody>
            </table>

            <p style="font-size:12px; color:#555555; line-height:1.5;">
              The refund amount will be credited back to your original payment method within 5-7 business days depending on your bank's processing cycles.
            </p>

            <div class="footer-section">
              <div class="footer-title">Customer Care Support</div>
              <ul class="footer-list">
                <li>If you did not initiate this cancellation or if you require any help, contact us immediately at support@auratravels.com.</li>
              </ul>
            </div>

            <div class="signature">
              Warm Regards,<br>
              <strong>Customer Care</strong><br>
              Aura Travel Agencies
            </div>
            """.formatted(
                booking.getPnr(),
                booking.getPnr(),
                booking.getFlight().getAirline().getName(), booking.getFlight().getFlightNumber(),
                booking.getFlight().getSourceAirport().getCity(), booking.getFlight().getDestinationAirport().getCity(),
                dep, arr,
                booking.getTotalFare(),
                booking.getCancellationPenalty() != null ? booking.getCancellationPenalty() : "0.00",
                booking.getRefundAmount() != null ? booking.getRefundAmount() : "0.00"
        );

        send(to, "Booking Cancelled — PNR: " + booking.getPnr(), wrap(content));
    }

    // ─── Password Reset ────────────────────────────────────────────────────────

    @Async
    public void sendPasswordResetEmail(String to, String username, String resetToken) {
        String resetUrl = frontendUrl + "/reset-password?token=" + resetToken;
        String content = """
            <h2 style="font-size: 16px; margin: 0 0 10px 0;">Reset Your Password 🔐</h2>
            <p style="font-size:13px; line-height:1.5;">Hi <strong>%s</strong>, we received a request to reset your Aura Airways account password.</p>
            <p style="font-size:13px; line-height:1.5;">Click the button below to create a new password. This link is valid for <strong>1 hour</strong>.</p>
            <a href="%s" class="btn">Reset My Password →</a>
            <p style="font-size:11px;color:#666666;">Or copy this link into your browser:<br>%s</p>
            """.formatted(username, resetUrl, resetUrl);
        send(to, "Reset Your Aura Airways Password", wrap(content));
    }
}
