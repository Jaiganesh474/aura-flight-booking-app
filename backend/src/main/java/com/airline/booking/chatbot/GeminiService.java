package com.airline.booking.chatbot;

import com.airline.booking.flights.Flight;
import com.airline.booking.flights.FlightRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class GeminiService {
    private static final Logger logger = LoggerFactory.getLogger(GeminiService.class);

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    @Autowired
    private FlightRepository flightRepository;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public Optional<String> generateReply(String userMessage) {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.contains("API_KEY")) {
            logger.warn("Gemini API Key is not configured. Falling back to rule-based heuristics.");
            return Optional.empty();
        }

        try {
            // Build the system training context to give Gemini context about our airlines database
            String systemContext = buildSystemContext();
            String fullPrompt = systemContext + "\n\nUser Question: " + userMessage + "\n\nAI Response:";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            // Construct payload
            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", fullPrompt);

            Map<String, Object> partsMap = new HashMap<>();
            partsMap.put("parts", Collections.singletonList(textPart));

            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", Collections.singletonList(partsMap));

            String requestBody = objectMapper.writeValueAsString(payload);
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            String requestUrl = apiUrl + "?key=" + apiKey;
            ResponseEntity<String> responseEntity = restTemplate.postForEntity(requestUrl, entity, String.class);

            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                JsonNode root = objectMapper.readTree(responseEntity.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    String reply = candidates.get(0)
                            .path("content")
                            .path("parts")
                            .get(0)
                            .path("text")
                            .asText();
                    return Optional.of(reply.trim());
                }
            }
        } catch (Exception e) {
            logger.error("Error calling Gemini API: {}", e.getMessage(), e);
        }

        return Optional.empty();
    }

    private String buildSystemContext() {
        // Collect dynamic schedule context from DB to make the responses incredibly accurate
        List<Flight> flights = flightRepository.findAll();
        StringBuilder flightScheduleList = new StringBuilder();
        
        DateTimeFormatter dtf = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");
        for (Flight f : flights) {
            flightScheduleList.append(String.format("- Flight %s operated by %s from %s (%s) to %s (%s) departing at %s. Base Fare: INR %s. Status: %s.\n",
                    f.getFlightNumber(), f.getAirline().getName(), f.getSourceAirport().getCity(), f.getSourceAirport().getCode(),
                    f.getDestinationAirport().getCity(), f.getDestinationAirport().getCode(), f.getDepartureTime().format(dtf), f.getBaseFare(), f.getStatus()));
        }

        return "You are the AI Travel Assistant for Aura Airways. " +
                "You have access to the current schedules of flights below:\n" +
                flightScheduleList.toString() + "\n" +
                "Baggage Policies:\n" +
                "- Economy: 15kg check-in + 7kg cabin.\n" +
                "- Premium Economy: 20kg check-in + 7kg cabin.\n" +
                "- Business: 30kg check-in + 10kg cabin.\n" +
                "- First: 40kg check-in + 12kg cabin.\n\n" +
                "Cancellation Policies:\n" +
                "- Users can cancel flights under their 'My Trips' dashboard tab.\n" +
                "- Standard mock fee of INR 1000 applies. Under 24h of departure, 50% charge applies.\n\n" +
                "Please respond to the user query concisely. Do not make up flights that are not listed above. Mention the PNR, status, airport hubs (BOM, DEL, MAA, BLR) when answering queries. Keep markdown styles clean.";
    }

    public Optional<String> parseSearchQuery(String userMessage) {
        if (apiKey == null || apiKey.trim().isEmpty() || apiKey.contains("API_KEY")) {
            logger.warn("Gemini API Key is not configured.");
            return Optional.empty();
        }

        try {
            String systemContext = "You are a flight search parser. Parse the user's request and return a JSON object with: " +
                    "\"source\" (string, 3-letter code: BOM, DEL, MAA, BLR or null), " +
                    "\"destination\" (string, 3-letter code: BOM, DEL, MAA, BLR or null), " +
                    "\"priceLimit\" (number or null), " +
                    "\"timeOfDay\" (string: MORNING, AFTERNOON, EVENING, NIGHT or null). " +
                    "DO NOT return any markdown code fences, headers, or explanations. ONLY return the JSON object.";
            String fullPrompt = systemContext + "\n\nUser request: " + userMessage + "\n\nJSON Output:";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> textPart = new HashMap<>();
            textPart.put("text", fullPrompt);

            Map<String, Object> partsMap = new HashMap<>();
            partsMap.put("parts", Collections.singletonList(textPart));

            Map<String, Object> payload = new HashMap<>();
            payload.put("contents", Collections.singletonList(partsMap));

            String requestBody = objectMapper.writeValueAsString(payload);
            HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);

            String requestUrl = apiUrl + "?key=" + apiKey;
            ResponseEntity<String> responseEntity = restTemplate.postForEntity(requestUrl, entity, String.class);

            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                JsonNode root = objectMapper.readTree(responseEntity.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && candidates.size() > 0) {
                    String reply = candidates.get(0)
                            .path("content")
                            .path("parts")
                            .get(0)
                            .path("text")
                            .asText();
                    return Optional.of(reply.trim());
                }
            }
        } catch (Exception e) {
            logger.error("Error calling Gemini API for search parsing: {}", e.getMessage(), e);
        }
        return Optional.empty();
    }

    private String executeGeminiCallWithModelFallback(String prompt) {
        List<String> models = Arrays.asList("gemini-2.5-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.5-flash-lite");
        for (String model : models) {
            try {
                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);
                Map<String, Object> textPart = new HashMap<>();
                textPart.put("text", prompt);
                Map<String, Object> partsMap = new HashMap<>();
                partsMap.put("parts", Collections.singletonList(textPart));
                Map<String, Object> payload = new HashMap<>();
                payload.put("contents", Collections.singletonList(partsMap));

                String requestBody = objectMapper.writeValueAsString(payload);
                HttpEntity<String> entity = new HttpEntity<>(requestBody, headers);
                
                String modelUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey;
                ResponseEntity<String> response = restTemplate.postForEntity(modelUrl, entity, String.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    JsonNode root = objectMapper.readTree(response.getBody());
                    JsonNode candidates = root.path("candidates");
                    if (candidates.isArray() && candidates.size() > 0) {
                        String reply = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                        if (reply != null && !reply.trim().isEmpty()) {
                            return reply.trim();
                        }
                    }
                }
            } catch (Exception e) {
                logger.warn("Gemini model {} call failed: {}. Trying next model...", model, e.getMessage());
            }
        }
        return null;
    }

    private static final List<Map<String, String>> FALLBACK_AIRPORTS = Arrays.asList(
        createAirportMap("DUR", "King Shaka International Airport", "Durban", "South Africa"),
        createAirportMap("CPT", "Cape Town International Airport", "Cape Town", "South Africa"),
        createAirportMap("JNB", "O.R. Tambo International Airport", "Johannesburg", "South Africa"),
        createAirportMap("YYZ", "Toronto Pearson International Airport", "Toronto", "Canada"),
        createAirportMap("YVR", "Vancouver International Airport", "Vancouver", "Canada"),
        createAirportMap("YUL", "Montréal-Trudeau International Airport", "Montreal", "Canada"),
        createAirportMap("ADL", "Adelaide Airport", "Adelaide", "Australia"),
        createAirportMap("MEL", "Melbourne Airport", "Melbourne", "Australia"),
        createAirportMap("SYD", "Kingsford Smith Airport", "Sydney", "Australia"),
        createAirportMap("JFK", "John F. Kennedy International Airport", "New York", "USA"),
        createAirportMap("LAX", "Los Angeles International Airport", "Los Angeles", "USA"),
        createAirportMap("LHR", "London Heathrow Airport", "London", "UK"),
        createAirportMap("CDG", "Charles de Gaulle Airport", "Paris", "France"),
        createAirportMap("SIN", "Singapore Changi Airport", "Singapore", "Singapore"),
        createAirportMap("DXB", "Dubai International Airport", "Dubai", "UAE"),
        createAirportMap("HND", "Haneda Airport", "Tokyo", "Japan"),
        createAirportMap("NRT", "Narita International Airport", "Tokyo", "Japan"),
        createAirportMap("MCT", "Muscat International Airport", "Muscat", "Oman"),
        createAirportMap("DOH", "Hamad International Airport", "Doha", "Qatar"),
        createAirportMap("AUH", "Zayed International Airport", "Abu Dhabi", "UAE"),
        createAirportMap("BOM", "Chhatrapati Shivaji Maharaj International Airport", "Mumbai", "India"),
        createAirportMap("DEL", "Indira Gandhi International Airport", "Delhi", "India"),
        createAirportMap("MAA", "Chennai International Airport", "Chennai", "India"),
        createAirportMap("BLR", "Kempegowda International Airport", "Bengaluru", "India"),
        createAirportMap("CCU", "Netaji Subhash Chandra Bose International Airport", "Kolkata", "India"),
        createAirportMap("HYD", "Rajiv Gandhi International Airport", "Hyderabad", "India"),
        createAirportMap("COK", "Cochin International Airport", "Kochi", "India")
    );

    private static Map<String, String> createAirportMap(String code, String name, String city, String country) {
        Map<String, String> m = new HashMap<>();
        m.put("code", code);
        m.put("name", name);
        m.put("city", city);
        m.put("country", country);
        return m;
    }

    public Optional<String> searchAirportDetails(String locationQuery) {
        String query = locationQuery.toLowerCase().trim();

        // 1. Try calling Gemini API
        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("API_KEY")) {
            String systemContext = "You are a travel database helper. The user is searching for airports in or near: \"" + locationQuery + "\". " +
                    "Identify up to 5 matching real-world airports and output them as a JSON array of objects. " +
                    "Each object must have: \"code\" (the 3-letter IATA code), \"name\" (the official name of the airport), \"city\" (the city), and \"country\" (the country). " +
                    "Respond ONLY with the JSON array. Do not include any formatting, markdown, backticks, or preamble. Example response format: [{\"code\":\"JFK\",\"name\":\"John F. Kennedy International Airport\",\"city\":\"New York\",\"country\":\"USA\"}]";
            String reply = executeGeminiCallWithModelFallback(systemContext);
            if (reply != null && reply.contains("[")) {
                return Optional.of(reply);
            }
        }

        // 2. Local Fallback search
        List<Map<String, String>> matches = new ArrayList<>();
        for (Map<String, String> ap : FALLBACK_AIRPORTS) {
            if (ap.get("code").toLowerCase().contains(query) ||
                ap.get("name").toLowerCase().contains(query) ||
                ap.get("city").toLowerCase().contains(query) ||
                ap.get("country").toLowerCase().contains(query)) {
                matches.add(ap);
            }
        }
        try {
            return Optional.of(objectMapper.writeValueAsString(matches));
        } catch (Exception e) {
            return Optional.of("[]");
        }
    }

    private static final List<Map<String, String>> FALLBACK_AIRLINES = Arrays.asList(
        createAirlineMap("LH", "Lufthansa"),
        createAirlineMap("EK", "Emirates"),
        createAirlineMap("SQ", "Singapore Airlines"),
        createAirlineMap("QR", "Qatar Airways"),
        createAirlineMap("DL", "Delta Air Lines"),
        createAirlineMap("AI", "Air India"),
        createAirlineMap("6E", "IndiGo"),
        createAirlineMap("BA", "British Airways"),
        createAirlineMap("QF", "Qantas")
    );

    private static Map<String, String> createAirlineMap(String code, String name) {
        Map<String, String> m = new HashMap<>();
        m.put("code", code);
        m.put("name", name);
        return m;
    }

    private static final List<Map<String, Object>> FALLBACK_AIRCRAFT = Arrays.asList(
        createAircraftMap("Boeing 777-300ER", 396),
        createAircraftMap("Airbus A350-900", 325),
        createAircraftMap("Boeing 787-9 Dreamliner", 290),
        createAircraftMap("Airbus A320neo", 180),
        createAircraftMap("Boeing 737 MAX 8", 178),
        createAircraftMap("Airbus A380-800", 525),
        createAircraftMap("Bombardier CRJ-900", 90)
    );

    private static Map<String, Object> createAircraftMap(String model, int capacity) {
        Map<String, Object> m = new HashMap<>();
        m.put("model", model);
        m.put("capacity", capacity);
        return m;
    }

    public Optional<String> searchAirlineDetails(String locationQuery) {
        String query = locationQuery.toLowerCase().trim();

        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("API_KEY")) {
            String systemContext = "You are a travel database helper. The user is searching for real-world airline providers matching or related to: \"" + locationQuery + "\". " +
                    "Identify up to 5 matching real-world airline companies and output them as a JSON array of objects. " +
                    "Each object must have: \"code\" (the 2-letter airline designator IATA code) and \"name\" (the official airline company name). " +
                    "Respond ONLY with the JSON array. Do not include any formatting, markdown, backticks, or preamble. Example response format: [{\"code\":\"SQ\",\"name\":\"Singapore Airlines\"}]";
            String reply = executeGeminiCallWithModelFallback(systemContext);
            if (reply != null && reply.contains("[")) {
                return Optional.of(reply);
            }
        }

        // Fallback
        List<Map<String, String>> matches = new ArrayList<>();
        for (Map<String, String> al : FALLBACK_AIRLINES) {
            if (al.get("code").toLowerCase().contains(query) || al.get("name").toLowerCase().contains(query)) {
                matches.add(al);
            }
        }
        try {
            return Optional.of(objectMapper.writeValueAsString(matches));
        } catch (Exception e) {
            return Optional.of("[]");
        }
    }

    public Optional<String> searchAircraftDetails(String locationQuery) {
        String query = locationQuery.toLowerCase().trim();

        if (apiKey != null && !apiKey.trim().isEmpty() && !apiKey.contains("API_KEY")) {
            String systemContext = "You are a travel database helper. The user is searching for passenger airplane models matching or related to: \"" + locationQuery + "\". " +
                    "Identify up to 5 matching real-world commercial aircraft models and output them as a JSON array of objects. " +
                    "Each object must have: \"model\" (the official aircraft model name, e.g. Airbus A320neo, Boeing 777-300ER) and \"capacity\" (an integer representing typical maximum passenger seating capacity, e.g. 180, 396). " +
                    "Respond ONLY with the JSON array. Do not include any formatting, markdown, backticks, or preamble. Example response format: [{\"model\":\"Boeing 787-9 Dreamliner\",\"capacity\":290}]";
            String reply = executeGeminiCallWithModelFallback(systemContext);
            if (reply != null && reply.contains("[")) {
                return Optional.of(reply);
            }
        }

        // Fallback
        List<Map<String, Object>> matches = new ArrayList<>();
        for (Map<String, Object> ac : FALLBACK_AIRCRAFT) {
            String model = (String) ac.get("model");
            if (model.toLowerCase().contains(query)) {
                matches.add(ac);
            }
        }
        try {
            return Optional.of(objectMapper.writeValueAsString(matches));
        } catch (Exception e) {
            return Optional.of("[]");
        }
    }
}
