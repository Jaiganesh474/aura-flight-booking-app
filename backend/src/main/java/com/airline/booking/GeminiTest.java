package com.airline.booking;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class GeminiTest {
    public static void main(String[] args) throws Exception {
        String apiKey = System.getenv("GEMINI_API_KEY") != null ? System.getenv("GEMINI_API_KEY") : System.getProperty("GEMINI_API_KEY");
        String apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
        String locationQuery = "edinburgh";
        
        String systemContext = "You are a travel database helper. The user is searching for airports in or near: \"" + locationQuery + "\". " +
                "Identify up to 5 matching real-world airports and output them as a JSON array of objects. " +
                "Each object must have: \"code\" (the 3-letter IATA code), \"name\" (the official name of the airport), \"city\" (the city), and \"country\" (the country). " +
                "Respond ONLY with the JSON array. Do not include any formatting, markdown, backticks, or preamble. Example response format: [{\"code\":\"JFK\",\"name\":\"John F. Kennedy International Airport\",\"city\":\"New York\",\"country\":\"USA\"}]";

        String payload = "{\"contents\":[{\"parts\":[{\"text\":\"" + systemContext.replace("\"", "\\\"").replace("\n", "\\n") + "\"}]}]}";
        
        URL url = new URL(apiUrl + "?key=" + apiKey);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        
        try (OutputStream os = conn.getOutputStream()) {
            os.write(payload.getBytes("utf-8"));
        }
        
        int status = conn.getResponseCode();
        System.out.println("Response Status: " + status);
        
        BufferedReader br = new BufferedReader(new InputStreamReader(
            status >= 200 && status < 300 ? conn.getInputStream() : conn.getErrorStream(), "utf-8"
        ));
        StringBuilder response = new StringBuilder();
        String line;
        while ((line = br.readLine()) != null) {
            response.append(line);
        }
        System.out.println("Response: " + response.toString());
    }
}
