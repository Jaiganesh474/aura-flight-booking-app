package com.airline.booking.passengers;

import com.airline.booking.common.BadRequestException;
import com.airline.booking.common.ResourceNotFoundException;
import com.airline.booking.users.User;
import com.airline.booking.users.UserRepository;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/passengers/profiles")
@CrossOrigin(origins = "*")
public class PassengerController {

    @Autowired
    private TravellerProfileRepository profileRepository;

    @Autowired
    private UserRepository userRepository;

    // ─── GET all profiles for current user ───────────────────────────────────

    @GetMapping
    public ResponseEntity<List<TravellerProfile>> getMyProfiles(Authentication authentication) {
        User user = getUser(authentication);
        return ResponseEntity.ok(profileRepository.findByUserId(user.getId()));
    }

    // ─── POST — create new profile ────────────────────────────────────────────

    @PostMapping
    public ResponseEntity<TravellerProfile> createProfile(@RequestBody TravellerProfile profile, Authentication authentication) {
        User user = getUser(authentication);
        profile.setUser(user);
        return ResponseEntity.ok(profileRepository.save(profile));
    }

    // ─── PUT — update existing profile ───────────────────────────────────────

    @PutMapping("/{id}")
    public ResponseEntity<TravellerProfile> updateProfile(
            @PathVariable Long id,
            @RequestBody TravellerProfile updated,
            Authentication authentication) {

        User user = getUser(authentication);
        TravellerProfile existing = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Traveller profile not found: " + id));

        if (!existing.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("You do not own this profile.");
        }

        existing.setFirstName(updated.getFirstName());
        existing.setLastName(updated.getLastName());
        existing.setGender(updated.getGender());
        existing.setPassportNumber(updated.getPassportNumber());
        existing.setNationality(updated.getNationality());

        return ResponseEntity.ok(profileRepository.save(existing));
    }

    // ─── DELETE — remove profile ──────────────────────────────────────────────

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProfile(@PathVariable Long id, Authentication authentication) {
        User user = getUser(authentication);
        TravellerProfile existing = profileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Traveller profile not found: " + id));

        if (!existing.getUser().getId().equals(user.getId())) {
            throw new BadRequestException("You do not own this profile.");
        }

        profileRepository.delete(existing);
        return ResponseEntity.ok(Map.of("message", "Profile deleted successfully."));
    }

    // ─── Helper ───────────────────────────────────────────────────────────────

    private User getUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentication.getName()));
    }
}
