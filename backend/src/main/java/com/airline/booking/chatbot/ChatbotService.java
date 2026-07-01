package com.airline.booking.chatbot;

import com.airline.booking.flights.Flight;
import com.airline.booking.flights.FlightRepository;
import com.airline.booking.flights.FlightStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ChatbotService {

    @Autowired
    private FlightRepository flightRepository;

    @Autowired
    private GeminiService geminiService;

    private static final Map<String, String> CITY_TO_CODE = new HashMap<>();

    static {
        CITY_TO_CODE.put("mumbai", "BOM");
        CITY_TO_CODE.put("bombay", "BOM");
        CITY_TO_CODE.put("delhi", "DEL");
        CITY_TO_CODE.put("new delhi", "DEL");
        CITY_TO_CODE.put("chennai", "MAA");
        CITY_TO_CODE.put("madras", "MAA");
        CITY_TO_CODE.put("bengaluru", "BLR");
        CITY_TO_CODE.put("bangalore", "BLR");
    }

    public List<Flight> parseSmartSearch(String text) {
        // Try calling Gemini first for dynamic AI NLP parsing
        Optional<String> parsedJson = geminiService.parseSearchQuery(text);
        if (parsedJson.isPresent()) {
            try {
                String jsonStr = parsedJson.get().trim();
                // Clean markdown wrappers if returned
                if (jsonStr.contains("```json")) {
                    jsonStr = jsonStr.substring(jsonStr.indexOf("```json") + 7);
                    jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf("```"));
                } else if (jsonStr.contains("```")) {
                    jsonStr = jsonStr.substring(jsonStr.indexOf("```") + 3);
                    jsonStr = jsonStr.substring(0, jsonStr.lastIndexOf("```"));
                }
                jsonStr = jsonStr.trim();
                
                com.fasterxml.jackson.databind.JsonNode node = new com.fasterxml.jackson.databind.ObjectMapper().readTree(jsonStr);
                
                String source = node.has("source") && !node.get("source").isNull() ? node.get("source").asText() : null;
                String destination = node.has("destination") && !node.get("destination").isNull() ? node.get("destination").asText() : null;
                BigDecimal priceLimit = node.has("priceLimit") && !node.get("priceLimit").isNull() ? new BigDecimal(node.get("priceLimit").asText()) : null;
                String timeOfDay = node.has("timeOfDay") && !node.get("timeOfDay").isNull() ? node.get("timeOfDay").asText() : null;

                String sourceCode = getAirportCode(source);
                String destCode = getAirportCode(destination);

                List<Flight> matches = filterFlights(sourceCode, destCode, priceLimit, timeOfDay);
                if (!matches.isEmpty()) {
                    return matches;
                }
            } catch (Exception e) {
                System.err.println("Failed to parse Gemini NLP response: " + parsedJson.get() + " Error: " + e.getMessage());
            }
        }

        // Rule-based heuristic fallback:
        String query = text.toLowerCase();

        // 1. Identify Source & Destination
        String source = null;
        String destination = null;

        if (query.contains(" to ")) {
            int toIdx = query.indexOf(" to ");
            String beforeTo = query.substring(0, toIdx).trim();
            String afterTo = query.substring(toIdx + 4).trim();
            
            // Extract source from the last word of beforeTo (resolves origin cities like 'chennai' or 'delhi')
            String[] beforeWords = beforeTo.split("\\s+");
            if (beforeWords.length > 0) {
                String sourceWord = beforeWords[beforeWords.length - 1];
                source = getAirportCode(sourceWord);
            }

            // Extract destination from the first word of afterTo (resolves destination cities like 'mumbai')
            String[] afterWords = afterTo.split("\\s+");
            if (afterWords.length > 0) {
                String destWord = afterWords[0];
                destination = getAirportCode(destWord);
            }
        } else {
            // Fallback keywords matching if no explicit "to" keyword
            for (String city : CITY_TO_CODE.keySet()) {
                if (query.contains("from " + city) || query.contains("out of " + city) || query.contains("leaving " + city)) {
                    source = CITY_TO_CODE.get(city);
                }
                if (query.contains("to " + city) || query.contains("into " + city) || query.contains("towards " + city)) {
                    destination = CITY_TO_CODE.get(city);
                }
            }
        }

        // 2. Identify Price Limits
        BigDecimal priceLimit = null;
        Pattern pricePattern = Pattern.compile("(under|below|less than|budget|within|rs|inr|₹)\\s*(\\d+)");
        Matcher priceMatcher = pricePattern.matcher(query);
        if (priceMatcher.find()) {
            priceLimit = new BigDecimal(priceMatcher.group(2));
        }

        // 3. Identify Time of Day
        String timeOfDay = null;
        if (query.contains("morning")) {
            timeOfDay = "MORNING";
        } else if (query.contains("afternoon")) {
            timeOfDay = "AFTERNOON";
        } else if (query.contains("evening")) {
            timeOfDay = "EVENING";
        } else if (query.contains("night")) {
            timeOfDay = "NIGHT";
        }

        // If no filter parameters are extracted but search text is present, fallback to general keyword matching
        if (source == null && destination == null && priceLimit == null && timeOfDay == null && !text.trim().isEmpty()) {
            return filterFlightsByKeyword(text);
        }

        return filterFlights(source, destination, priceLimit, timeOfDay);
    }

    private List<Flight> filterFlightsByKeyword(String keyword) {
        String kw = keyword.toLowerCase().trim();
        List<Flight> allFlights = flightRepository.findAll();
        List<Flight> matches = new ArrayList<>();

        for (Flight f : allFlights) {
            if (f.getStatus().equals(FlightStatus.CANCELLED)) continue;
            if (f.getDepartureTime().isBefore(java.time.LocalDateTime.now())) continue;

            boolean matchesSource = f.getSourceAirport().getCity().toLowerCase().contains(kw) || 
                                    f.getSourceAirport().getCode().toLowerCase().contains(kw);
            
            boolean matchesDest = f.getDestinationAirport().getCity().toLowerCase().contains(kw) || 
                                  f.getDestinationAirport().getCode().toLowerCase().contains(kw);

            boolean matchesFlightNo = f.getFlightNumber().toLowerCase().contains(kw);

            if (matchesSource || matchesDest || matchesFlightNo) {
                matches.add(f);
            }
        }
        return matches;
    }

    private List<Flight> filterFlights(String source, String destination, BigDecimal priceLimit, String timeOfDay) {
        List<Flight> allFlights = flightRepository.findAll();
        List<Flight> matches = new ArrayList<>();

        for (Flight f : allFlights) {
            if (f.getStatus().equals(FlightStatus.CANCELLED)) continue;
            if (f.getDepartureTime().isBefore(java.time.LocalDateTime.now())) continue;

            // Filter Source
            if (source != null && !source.isBlank() && !f.getSourceAirport().getCode().equalsIgnoreCase(source)) {
                continue;
            }
            // Filter Dest
            if (destination != null && !destination.isBlank() && !f.getDestinationAirport().getCode().equalsIgnoreCase(destination)) {
                continue;
            }
            // Filter Price
            if (priceLimit != null && f.getBaseFare().compareTo(priceLimit) > 0) {
                continue;
            }
            // Filter Time
            if (timeOfDay != null && !timeOfDay.isBlank()) {
                LocalTime departureTime = f.getDepartureTime().toLocalTime();
                boolean timeMatch = false;
                switch (timeOfDay.toUpperCase()) {
                    case "MORNING":
                        timeMatch = departureTime.isAfter(LocalTime.of(5, 59)) && departureTime.isBefore(LocalTime.of(12, 0));
                        break;
                    case "AFTERNOON":
                        timeMatch = departureTime.isAfter(LocalTime.of(11, 59)) && departureTime.isBefore(LocalTime.of(17, 0));
                        break;
                    case "EVENING":
                        timeMatch = departureTime.isAfter(LocalTime.of(16, 59)) && departureTime.isBefore(LocalTime.of(21, 0));
                        break;
                    case "NIGHT":
                        timeMatch = departureTime.isAfter(LocalTime.of(20, 59)) || departureTime.isBefore(LocalTime.of(6, 0));
                        break;
                }
                if (!timeMatch) continue;
            }

            matches.add(f);
        }
        return matches;
    }

    public Map<String, Object> getChatReply(String message) {
        Map<String, Object> response = new HashMap<>();

        // First attempt calling Gemini LLM
        Optional<String> geminiReply = geminiService.generateReply(message);
        if (geminiReply.isPresent()) {
            response.put("reply", geminiReply.get());
            
            // Supplement with a recommended flight search if query contains cities
            String msg = message.toLowerCase();
            boolean containsCity = false;
            for (String city : CITY_TO_CODE.keySet()) {
                if (msg.contains(city)) {
                    containsCity = true;
                    break;
                }
            }
            if (containsCity) {
                List<Flight> flights = parseSmartSearch(message);
                if (!flights.isEmpty()) {
                    response.put("flights", flights);
                }
            }
            return response;
        }

        // Fallback to Rule-based heuristics if Gemini API key not provided or offline
        String msg = message.toLowerCase();

        if (msg.contains("baggage") || msg.contains("luggage")) {
            response.put("reply", "🎒 **Baggage Rules Summary (Rule Engine Fallback)**:\n\n- **Economy Class**: 15kg check-in baggage + 7kg cabin bag.\n- **Premium Economy**: 20kg check-in + 7kg cabin bag.\n- **Business Class**: 30kg check-in + 10kg cabin bag.\n- **First Class**: 40kg check-in + 12kg cabin bag.\n\n*Additional weight is charged at ₹500 per kg at the check-in counter.*");
            return response;
        }

        if (msg.contains("cancel") || msg.contains("refund")) {
            response.put("reply", "✈️ **Cancellation Policy (Rule Engine Fallback)**:\n\nYou can cancel any booking under your **My Trips** tab. Full refunds are processed for cancellations made 24 hours prior to departure, subject to a standard mock transaction charge of ₹1,000. Under 24 hours, cancellations incur a fee of 50% of the total base fare. Refunds take 2-3 business days to reflect in your invoice history.");
            return response;
        }

        if (msg.contains("cheapest") || msg.contains("suggest") || msg.contains("recommend")) {
            List<Flight> flights = flightRepository.findAll();
            // Filter only upcoming/present flights
            flights.removeIf(f -> f.getDepartureTime().isBefore(java.time.LocalDateTime.now()) || f.getStatus().equals(FlightStatus.CANCELLED));
            flights.sort(Comparator.comparing(Flight::getBaseFare));
            
            if (!flights.isEmpty()) {
                Flight cheapest = flights.get(0);
                response.put("reply", "Cheapest Flight Found : I recommend Flight " + cheapest.getFlightNumber() + " (" + cheapest.getAirline().getName() + ") flying from " + cheapest.getSourceAirport().getCity() + " to " + cheapest.getDestinationAirport().getCity() + " at INR " + cheapest.getBaseFare() + " departing on " + cheapest.getDepartureTime().toLocalDate() + ".");
                response.put("recommendedFlightId", cheapest.getId());
                return response;
            }
        }

        if (msg.contains("hello") || msg.contains("hi") || msg.contains("hey")) {
            response.put("reply", "👋 Hello! I am your AI Travel Assistant. I can help you search flights, understand baggage allowances, cancel flights, or recommend cheap travel alternatives. How can I help you today?");
            return response;
        }

        boolean containsCity = false;
        for (String city : CITY_TO_CODE.keySet()) {
            if (msg.contains(city)) {
                containsCity = true;
                break;
            }
        }

        if (containsCity) {
            List<Flight> smartFlights = parseSmartSearch(message);
            if (!smartFlights.isEmpty()) {
                StringBuilder sb = new StringBuilder();
                sb.append("🔍 **Smart Search Results (Rule Engine Fallback)**:\n\n");
                for (Flight f : smartFlights) {
                    sb.append("- Flight **").append(f.getFlightNumber()).append("** (").append(f.getAirline().getName()).append(") from ").append(f.getSourceAirport().getCity()).append(" to ").append(f.getDestinationAirport().getCity()).append(" @ **INR ").append(f.getBaseFare()).append("**\n");
                }
                response.put("reply", sb.toString());
                response.put("flights", smartFlights);
                return response;
            } else {
                response.put("reply", "I scanned the flight schedules for that route, but couldn't find matches. Try broadening your budget or checking another time of day!");
                return response;
            }
        }

        response.put("reply", "I am not sure I understood that request. You can try asking:\n- 'What is the baggage limit?'\n- 'Show me the cheapest flight available.'\n- 'I need a flight from Chennai to Mumbai under 6000.'\n- 'How do I cancel my booking?'");
        return response;
    }

    private String getAirportCode(String rawCity) {
        if (rawCity == null) return null;
        String city = rawCity.toLowerCase().trim();
        for (String key : CITY_TO_CODE.keySet()) {
            if (city.contains(key)) {
                return CITY_TO_CODE.get(key);
            }
        }
        String upper = city.toUpperCase();
        if (CITY_TO_CODE.values().contains(upper)) {
            return upper;
        }
        return null;
    }

    private String m2_group(String rawVal) {
        if (rawVal == null) return null;
        String clean = rawVal.split("\\s+(under|below|less|on|tomorrow|rs|inr|₹|morning|afternoon|evening|night)")[0];
        return clean.trim();
    }
}
