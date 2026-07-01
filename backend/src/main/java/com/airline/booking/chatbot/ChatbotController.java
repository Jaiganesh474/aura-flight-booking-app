package com.airline.booking.chatbot;

import com.airline.booking.flights.Flight;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*")
public class ChatbotController {

    @Autowired
    private ChatbotService chatbotService;

    @PostMapping("/chat")
    public ResponseEntity<?> chat(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Message is empty");
        }
        Map<String, Object> reply = chatbotService.getChatReply(message);
        return ResponseEntity.ok(reply);
    }

    @PostMapping("/smart-search")
    public ResponseEntity<List<Flight>> smartSearch(@RequestBody Map<String, String> request) {
        String message = request.get("message");
        if (message == null || message.trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        List<Flight> matches = chatbotService.parseSmartSearch(message);
        return ResponseEntity.ok(matches);
    }

    @Autowired
    private GeminiService geminiService;

    @GetMapping("/search-airport")
    public ResponseEntity<?> searchAirport(@RequestParam("query") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Query is empty");
        }
        
        Optional<String> jsonResult = geminiService.searchAirportDetails(query);
        if (jsonResult.isPresent()) {
            String responseText = jsonResult.get().trim();
            int firstBrack = responseText.indexOf('[');
            int lastBrack = responseText.lastIndexOf(']');
            if (firstBrack != -1 && lastBrack != -1 && lastBrack > firstBrack) {
                responseText = responseText.substring(firstBrack, lastBrack + 1);
                return ResponseEntity.ok()
                        .header("Content-Type", "application/json")
                        .body(responseText);
            }
        }
        
        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body("[]");
    }

    @GetMapping("/search-airline")
    public ResponseEntity<?> searchAirline(@RequestParam("query") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Query is empty");
        }
        Optional<String> jsonResult = geminiService.searchAirlineDetails(query);
        if (jsonResult.isPresent()) {
            String responseText = jsonResult.get().trim();
            int firstBrack = responseText.indexOf('[');
            int lastBrack = responseText.lastIndexOf(']');
            if (firstBrack != -1 && lastBrack != -1 && lastBrack > firstBrack) {
                responseText = responseText.substring(firstBrack, lastBrack + 1);
                return ResponseEntity.ok()
                        .header("Content-Type", "application/json")
                        .body(responseText);
            }
        }
        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body("[]");
    }

    @GetMapping("/search-aircraft")
    public ResponseEntity<?> searchAircraft(@RequestParam("query") String query) {
        if (query == null || query.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Query is empty");
        }
        Optional<String> jsonResult = geminiService.searchAircraftDetails(query);
        if (jsonResult.isPresent()) {
            String responseText = jsonResult.get().trim();
            int firstBrack = responseText.indexOf('[');
            int lastBrack = responseText.lastIndexOf(']');
            if (firstBrack != -1 && lastBrack != -1 && lastBrack > firstBrack) {
                responseText = responseText.substring(firstBrack, lastBrack + 1);
                return ResponseEntity.ok()
                        .header("Content-Type", "application/json")
                        .body(responseText);
            }
        }
        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body("[]");
    }
}
