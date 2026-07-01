import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MyTripsScreen extends StatefulWidget {
  const MyTripsScreen({Key? key}) : super(key: key);

  @override
  State<MyTripsScreen> createState() => _MyTripsScreenState();
}

class _MyTripsScreenState extends State<MyTripsScreen> {
  List<dynamic> _bookings = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchBookings();
  }

  Future<void> _fetchBookings() async {
    try {
      final response = await ApiService.get('/api/bookings/my-bookings');
      if (response.statusCode == 200) {
        setState(() {
          _bookings = jsonDecode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'Failed to load bookings.';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Network connection failed.';
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final primaryAmber = const Color(0xFFF59E0B);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Booked Flights', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(child: Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent)))
              : _bookings.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.airplane_ticket_outlined, size: 72, color: Colors.grey[700]),
                          const SizedBox(height: 16),
                          const Text('No bookings found.', style: TextStyle(color: Colors.grey, fontSize: 16)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _bookings.length,
                      itemBuilder: (context, index) {
                        final booking = _bookings[index];
                        final flight = booking['flight'];
                        final passengers = booking['passengers'] as List<dynamic>? ?? [];
                        
                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 8),
                          color: const Color(0xFF1E293B),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.between,
                                  children: [
                                    Text(
                                      'PNR: ${booking['pnr'] ?? 'N/A'}',
                                      style: TextStyle(color: primaryAmber, fontWeight: FontWeight.bold),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: booking['status'] == 'CONFIRMED'
                                            ? Colors.green.withOpacity(0.15)
                                            : Colors.orange.withOpacity(0.15),
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        booking['status'] ?? 'PENDING',
                                        style: TextStyle(
                                          color: booking['status'] == 'CONFIRMED'
                                              ? Colors.greenAccent
                                              : Colors.orangeAccent,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(height: 24, color: Colors.white12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          flight['sourceAirport']['code'] ?? '',
                                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                        Text(
                                          flight['sourceAirport']['city'] ?? '',
                                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                    const Icon(Icons.flight_takeoff, color: Colors.grey, size: 28),
                                    Column(
                                      crossAxisAlignment: CrossAxisAlignment.end,
                                      children: [
                                        Text(
                                          flight['destinationAirport']['code'] ?? '',
                                          style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.white),
                                        ),
                                        Text(
                                          flight['destinationAirport']['city'] ?? '',
                                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                const Divider(height: 24, color: Colors.white12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Flight: ${flight['flightNumber'] ?? ''}',
                                      style: const TextStyle(color: Colors.white, fontSize: 13),
                                    ),
                                    Text(
                                      'Passengers: ${passengers.length}',
                                      style: const TextStyle(color: Colors.white, fontSize: 13),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
