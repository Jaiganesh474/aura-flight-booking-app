package com.airline.booking.pdf;

import com.airline.booking.bookings.Booking;
import com.airline.booking.passengers.Passenger;
import com.airline.booking.seats.Seat;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.format.DateTimeFormatter;

@Service
public class PdfGenerationService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    public byte[] generateTicketPdf(Booking booking) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 54, 36);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Font styles
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, Color.DARK_GRAY);
            Font sectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(15, 23, 42));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.GRAY);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font highlightFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(217, 119, 6));

            // Header Banner
            PdfPTable headerTable = new PdfPTable(1);
            headerTable.setWidthPercentage(100);
            PdfPCell headerCell = new PdfPCell(new Paragraph("AURA TRAVEL AGENCIES - BOARDING PASS / TICKET", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Color.WHITE)));
            headerCell.setBackgroundColor(new Color(15, 23, 42));
            headerCell.setPadding(15);
            headerCell.setHorizontalAlignment(Element.ALIGN_CENTER);
            headerCell.setBorder(Rectangle.NO_BORDER);
            headerTable.addCell(headerCell);
            document.add(headerTable);

            document.add(new Paragraph(" ")); // Spacer

            // PNR & Flight Summary Table
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setSpacingBefore(10);
            infoTable.setSpacingAfter(15);

            addCell(infoTable, "PNR (Booking Reference):", labelFont);
            addCell(infoTable, booking.getPnr(), highlightFont);

            addCell(infoTable, "Flight Number:", labelFont);
            addCell(infoTable, booking.getFlight().getAirline().getName() + " - " + booking.getFlight().getFlightNumber(), valueFont);

            addCell(infoTable, "Route:", labelFont);
            addCell(infoTable, booking.getFlight().getSourceAirport().getCity() + " (" + booking.getFlight().getSourceAirport().getCode() + ") -> " +
                    booking.getFlight().getDestinationAirport().getCity() + " (" + booking.getFlight().getDestinationAirport().getCode() + ")", valueFont);

            addCell(infoTable, "Departure Time:", labelFont);
            addCell(infoTable, booking.getFlight().getDepartureTime().format(DATE_FMT), valueFont);

            addCell(infoTable, "Arrival Time:", labelFont);
            addCell(infoTable, booking.getFlight().getArrivalTime().format(DATE_FMT), valueFont);

            document.add(infoTable);

            // Passenger details section
            Paragraph passHeader = new Paragraph("Passenger & Seat Details", sectionTitleFont);
            passHeader.setSpacingAfter(10);
            document.add(passHeader);

            PdfPTable passTable = new PdfPTable(4);
            passTable.setWidthPercentage(100);
            passTable.setSpacingAfter(20);

            // Set Column Widths
            passTable.setWidths(new float[]{1f, 3f, 2f, 2f});

            // Table Headers
            addHeaderCell(passTable, "Sl No.");
            addHeaderCell(passTable, "Passenger Name");
            addHeaderCell(passTable, "Gender/Nationality");
            addHeaderCell(passTable, "Seat No & Class");

            int idx = 1;
            for (Passenger p : booking.getPassengers()) {
                String seatNum = p.getSeat() != null ? p.getSeat().getSeatNumber() : "N/A";
                String cabinClass = p.getSeat() != null ? p.getSeat().getCabinClass().name() : "N/A";
                String genderNationality = p.getGender() + " / " + (p.getNationality() != null ? p.getNationality() : "IN");

                passTable.addCell(new Paragraph(String.valueOf(idx++), valueFont));
                passTable.addCell(new Paragraph(p.getFirstName() + " " + p.getLastName(), valueFont));
                passTable.addCell(new Paragraph(genderNationality, valueFont));
                passTable.addCell(new Paragraph(seatNum + " (" + cabinClass + ")", valueFont));
            }
            document.add(passTable);

            // Important Instructions
            Paragraph instHeader = new Paragraph("Must Read & Terms of Travel", sectionTitleFont);
            instHeader.setSpacingAfter(8);
            document.add(instHeader);

            List list = new List(List.UNORDERED);
            list.add(new ListItem("Please bring a valid Government-issued ID card along with this ticket printout or digital copy.", valueFont));
            list.add(new ListItem("Check-in counters close 45 minutes prior to domestic departures and 60 minutes for international departures.", valueFont));
            list.add(new ListItem("Standard check-in baggage limit is 15 KG per passenger unless specified otherwise.", valueFont));
            list.add(new ListItem("Please check airport terminals and gates on flight departure day.", valueFont));
            document.add(list);

            document.add(new Paragraph(" "));
            Paragraph ecoMsg = new Paragraph("Please don't print unless extremely necessary. Save trees, support green travel.", FontFactory.getFont(FontFactory.HELVETICA, 9, Font.BOLDITALIC, new Color(16, 185, 129)));
            ecoMsg.setAlignment(Element.ALIGN_CENTER);
            document.add(ecoMsg);

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return out.toByteArray();
    }

    public byte[] generateInvoicePdf(Booking booking) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Document document = new Document(PageSize.A4, 36, 36, 54, 36);

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Font styles
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, new Color(15, 23, 42));
            Font sectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(15, 23, 42));
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.BLACK);
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);

            // Header/Logo
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setSpacingAfter(20);

            PdfPCell logoCell = new PdfPCell(new Paragraph("AURA TRAVEL AGENCIES", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(15, 23, 42))));
            logoCell.setBorder(Rectangle.NO_BORDER);
            headerTable.addCell(logoCell);

            PdfPCell invCell = new PdfPCell(new Paragraph("TAX INVOICE / RECEIPT", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(217, 119, 6))));
            invCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            invCell.setBorder(Rectangle.NO_BORDER);
            headerTable.addCell(invCell);

            document.add(headerTable);

            // Invoice Meta Table
            PdfPTable metaTable = new PdfPTable(2);
            metaTable.setWidthPercentage(100);
            metaTable.setSpacingAfter(20);

            addCell(metaTable, "Invoice Number: INV-" + booking.getPnr() + "-" + (1000 + booking.getId()), regularFont);
            addCell(metaTable, "Invoice Date: " + booking.getFlight().getDepartureTime().toLocalDate().toString(), regularFont);
            addCell(metaTable, "Transaction ID: TXN-" + booking.getPnr(), regularFont);
            addCell(metaTable, "Billing Entity: Aura Travel Agencies Pvt Ltd.", regularFont);
            addCell(metaTable, "Customer Name: " + booking.getUser().getUsername(), regularFont);
            addCell(metaTable, "Customer Email: " + booking.getUser().getEmail(), regularFont);

            document.add(metaTable);

            // Tax Audit Detail Table
            Paragraph taxHeader = new Paragraph("Detailed Tax Audit & Fare Breakdown", sectionTitleFont);
            taxHeader.setSpacingAfter(10);
            document.add(taxHeader);

            PdfPTable taxTable = new PdfPTable(2);
            taxTable.setWidthPercentage(100);
            taxTable.setSpacingAfter(20);

            // Math calculations for tax breakdown
            BigDecimal totalPaid = booking.getTotalFare();
            BigDecimal gstRate = new BigDecimal("0.18"); // 18% GST (CGST 9% + SGST 9%)
            BigDecimal convenienceFee = new BigDecimal("150.00");
            BigDecimal baseFarePlusBooking = totalPaid.subtract(convenienceFee).divide(BigDecimal.ONE.add(gstRate), 2, RoundingMode.HALF_UP);
            BigDecimal totalGst = baseFarePlusBooking.add(convenienceFee).multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
            
            // Adjust base to make breakdown match exactly
            BigDecimal baseFare = totalPaid.subtract(convenienceFee).subtract(totalGst).setScale(2, RoundingMode.HALF_UP);
            BigDecimal cgst = totalGst.divide(new BigDecimal("2.0"), 2, RoundingMode.HALF_UP);
            BigDecimal sgst = totalGst.subtract(cgst);

            addCellWithAlignment(taxTable, "Base Fare & Allied Charges", regularFont, Element.ALIGN_LEFT);
            addCellWithAlignment(taxTable, "INR " + baseFare.toString(), regularFont, Element.ALIGN_RIGHT);

            addCellWithAlignment(taxTable, "Convenience Fee (incl. processing)", regularFont, Element.ALIGN_LEFT);
            addCellWithAlignment(taxTable, "INR " + convenienceFee.toString(), regularFont, Element.ALIGN_RIGHT);

            addCellWithAlignment(taxTable, "CGST (9%)", regularFont, Element.ALIGN_LEFT);
            addCellWithAlignment(taxTable, "INR " + cgst.toString(), regularFont, Element.ALIGN_RIGHT);

            addCellWithAlignment(taxTable, "SGST (9%)", regularFont, Element.ALIGN_LEFT);
            addCellWithAlignment(taxTable, "INR " + sgst.toString(), regularFont, Element.ALIGN_RIGHT);

            // Add border line before total
            PdfPCell totalLabel = new PdfPCell(new Paragraph("Total Paid Amount (Inclusive of GST)", boldFont));
            totalLabel.setBorder(Rectangle.TOP);
            totalLabel.setPaddingTop(8);
            taxTable.addCell(totalLabel);

            PdfPCell totalVal = new PdfPCell(new Paragraph("INR " + totalPaid.toString(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11, new Color(217, 119, 6))));
            totalVal.setBorder(Rectangle.TOP);
            totalVal.setPaddingTop(8);
            totalVal.setHorizontalAlignment(Element.ALIGN_RIGHT);
            taxTable.addCell(totalVal);

            document.add(taxTable);

            // Tax Declarations
            Paragraph declaration = new Paragraph("Declarations & Tax Audit Information:\n" +
                    "1. Aura Travel Agencies is registered under the GST Act. GSTIN: 29AABCA1234F1Z0.\n" +
                    "2. This document is a computer-generated invoice and does not require physical signature.\n" +
                    "3. For cancellation policies, please refer to the booking terms in the email / portal.", labelFont);
            declaration.setSpacingAfter(15);
            document.add(declaration);

            document.close();
        } catch (Exception e) {
            e.printStackTrace();
        }

        return out.toByteArray();
    }

    private void addCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(4);
        table.addCell(cell);
    }

    private void addCellWithAlignment(PdfPTable table, String text, Font font, int alignment) {
        PdfPCell cell = new PdfPCell(new Paragraph(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(6);
        cell.setHorizontalAlignment(alignment);
        table.addCell(cell);
    }

    private void addHeaderCell(PdfPTable table, String text) {
        Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE);
        PdfPCell cell = new PdfPCell(new Paragraph(text, headerFont));
        cell.setBackgroundColor(new Color(15, 23, 42));
        cell.setPadding(6);
        table.addCell(cell);
    }
}
