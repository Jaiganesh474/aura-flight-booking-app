package com.airline.booking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class AirlineBookingApplication {
    public static void main(String[] args) {
        // Load .env file programmatically
        try {
            java.io.File envFile = new java.io.File(".env");
            if (envFile.exists()) {
                java.nio.file.Files.lines(envFile.toPath())
                    .filter(line -> line != null && !line.trim().isEmpty() && !line.trim().startsWith("#") && line.contains("="))
                    .forEach(line -> {
                        int index = line.indexOf('=');
                        String key = line.substring(0, index).trim();
                        String value = line.substring(index + 1).trim();
                        System.setProperty(key, value);
                    });
            }
        } catch (Exception e) {
            System.err.println("Could not load .env file: " + e.getMessage());
        }
        SpringApplication.run(AirlineBookingApplication.class, args);
    }
}
