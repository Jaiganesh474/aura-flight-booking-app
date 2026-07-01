package com.airline.booking.passengers;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TravellerProfileRepository extends JpaRepository<TravellerProfile, Long> {
    List<TravellerProfile> findByUserId(Long userId);
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.transaction.annotation.Transactional
    void deleteByUserId(Long userId);
}
