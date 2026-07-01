import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/app_provider.dart';
import '../services/api_service.dart';
import 'seat_selection_screen.dart';

class FlightResultsScreen extends StatefulWidget {
  const FlightResultsScreen({Key? key}) : super(key: key);

  @override
  State<FlightResultsScreen> createState() => _FlightResultsScreenState();
}

class _FlightResultsScreenState extends State<FlightResultsScreen> {
  List<dynamic> _flights = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _searchFlights();
  }

  Future<void> _searchFlights() async {
    final query = Provider.of<AppProvider>(context, listen: false).searchQuery;
    final url = '/api/flights/search?source=${query['source']}&destination=${query['destination']}&date=${query['date']}&cabinClass=${query['cabinClass']}';

    try {
      final response = await ApiService.get(url);
      if (response.statusCode == 200) {
        setState(() {
          _flights = jsonDecode(response.body);
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'Failed to load matching flights.';
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
    final currencyFormatter = NumberFormat.simpleCurrency(locale: 'en_IN', decimalDigits: 0);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Available Flights', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(child: Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent)))
              : _flights.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.flight_takeoff, size: 72, color: Colors.grey[700]),
                          const SizedBox(height: 16),
                          const Text('No flights found matching your query.', style: TextStyle(color: Colors.grey, fontSize: 16)),
                        ],
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _flights.length,
                      itemBuilder: (context, index) {
                        final flight = _flights[index];
                        final departure = DateTime.parse(flight['departureTime']);
                        final fare = flight['baseFare'] ?? 0.0;
                        
                        return Card(
                          margin: const EdgeInsets.symmetric(vertical: 10),
                          color: const Color(0xFF1E293B),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                          child: InkWell(
                            onTap: () {
                              Provider.of<AppProvider>(context, listen: false).setSelectedFlightId(flight['id']);
                              Navigator.push(
                                context,
                                MaterialPageRoute(builder: (_) => const SeatSelectionScreen()),
                              );
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Padding(
                              padding: const EdgeInsets.all(20),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.between,
                                    children: [
                                      Text(
                                        flight['airlineName'] ?? 'Aura Express',
                                        style: TextStyle(color: primaryAmber, fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
                                      Text(
                                        flight['flightNumber'] ?? 'AU-000',
                                        style: const TextStyle(color: Colors.grey, fontSize: 13),
                                      ),
                                    ],
                                  ),
                                  const Divider(height: 28, color: Colors.white12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.between,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            flight['sourceAirport']['code'] ?? '',
                                            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                                          ),
                                          Text(
                                            flight['sourceAirport']['city'] ?? '',
                                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                                          ),
                                        ],
                                      ),
                                      const Icon(Icons.flight_takeoff, color: Colors.amber, size: 32),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            flight['destinationAirport']['code'] ?? '',
                                            style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                                          ),
                                          Text(
                                            flight['destinationAirport']['city'] ?? '',
                                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 20),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.between,
                                    children: [
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text('DEPARTURE TIME', style: TextStyle(color: Colors.grey, fontSize: 10)),
                                          Text(
                                            DateFormat('dd MMM · hh:mm a').format(departure),
                                            style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                                          ),
                                        ],
                                      ),
                                      Text(
                                        currencyFormatter.format(fare),
                                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.black),
                                      ),
                                    ],
                                  )
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
    );
  }
}
