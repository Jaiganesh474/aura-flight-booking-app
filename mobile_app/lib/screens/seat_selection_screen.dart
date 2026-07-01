import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/app_provider.dart';
import '../services/api_service.dart';
import 'checkout_screen.dart';

class SeatSelectionScreen extends StatefulWidget {
  const SeatSelectionScreen({Key? key}) : super(key: key);

  @override
  State<SeatSelectionScreen> createState() => _SeatSelectionScreenState();
}

class _SeatSelectionScreenState extends State<SeatSelectionScreen> {
  Map<String, dynamic>? _flightDetails;
  List<dynamic> _seats = [];
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _fetchSeats();
  }

  Future<void> _fetchSeats() async {
    final flightId = Provider.of<AppProvider>(context, listen: false).selectedFlightId;
    try {
      final response = await ApiService.get('/api/flights/details/$flightId');
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _flightDetails = data['flight'];
          _seats = data['seats'];
          _isLoading = false;
        });
      } else {
        setState(() {
          _errorMessage = 'Failed to load aircraft seat details.';
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
    final provider = Provider.of<AppProvider>(context);
    final primaryAmber = const Color(0xFFF59E0B);
    final currencyFormatter = NumberFormat.simpleCurrency(locale: 'en_IN', decimalDigits: 0);

    // Group seats by rows
    Map<int, List<dynamic>> rowSeats = {};
    for (var seat in _seats) {
      // Extract number from seat code e.g. "12A" -> 12
      final match = RegExp(r'^(\d+)([A-F])$').firstMatch(seat['seatNumber']);
      if (match != null) {
        int row = int.parse(match.group(1)!);
        rowSeats.putIfAbsent(row, () => []).add(seat);
      }
    }

    // Sort rows and seats
    final sortedRows = rowSeats.keys.toList()..sort();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Choose Seats', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _errorMessage != null
              ? Center(child: Text(_errorMessage!, style: const TextStyle(color: Colors.redAccent)))
              : Column(
                  children: [
                    Expanded(
                      child: SingleChildScrollView(
                        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                        child: Column(
                          children: [
                            // Legend indicator
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                              children: [
                                _buildLegendItem('Available', Colors.grey[700]!),
                                _buildLegendItem('Booked', Colors.red[900]!),
                                _buildLegendItem('Selected', primaryAmber),
                              ],
                            ),
                            const SizedBox(height: 36),
                            // Cabin Graphic
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E293B),
                                borderRadius: BorderRadius.circular(24),
                                border: Border.all(color: Colors.white12),
                              ),
                              child: Column(
                                children: sortedRows.map((rowNum) {
                                  final seatsInRow = rowSeats[rowNum]!;
                                  // Sort by seat code letter (A, B, C, D, E, F)
                                  seatsInRow.sort((a, b) => a['seatNumber'].compareTo(b['seatNumber']));
                                  
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 6),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        // Left Group (A, B, C)
                                        ...seatsInRow.take(3).map((seat) => _buildSeatButton(seat, provider)),
                                        // Aisle Spacer
                                        Container(
                                          width: 32,
                                          alignment: Alignment.center,
                                          child: Text(
                                            '$rowNum',
                                            style: const TextStyle(color: Colors.grey, fontSize: 12, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                        // Right Group (D, E, F)
                                        ...seatsInRow.skip(3).map((seat) => _buildSeatButton(seat, provider)),
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    // Sticky Footer
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: const BoxDecoration(
                        color: Color(0xFF0F172A),
                        border: Border(top: BorderSide(color: Colors.white12)),
                      ),
                      child: SafeArea(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('SELECTED SEATS', style: TextStyle(color: Colors.grey, fontSize: 11)),
                                    Text(
                                      provider.selectedSeats.isEmpty ? 'None' : provider.selectedSeats.join(', '),
                                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
                                    ),
                                  ],
                                ),
                                Text(
                                  currencyFormatter.format(provider.selectedSeats.length * (_flightDetails?['baseFare'] ?? 0.0)),
                                  style: TextStyle(color: primaryAmber, fontSize: 24, fontWeight: FontWeight.black),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              onPressed: provider.selectedSeats.isEmpty
                                  ? null
                                  : () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(builder: (_) => const CheckoutScreen()),
                                      );
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: primaryAmber,
                                disabledBackgroundColor: Colors.grey[800],
                                foregroundColor: const Color(0xFF020617),
                                padding: const EdgeInsets.symmetric(vertical: 16),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                              child: const Text('Proceed to Checkout', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(width: 14, height: 14, decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(4))),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
      ],
    );
  }

  Widget _buildSeatButton(dynamic seat, AppProvider provider) {
    final number = seat['seatNumber'];
    final isBooked = seat['status'] == 'BOOKED';
    final isSelected = provider.selectedSeats.contains(number);
    final primaryAmber = const Color(0xFFF59E0B);

    Color color = Colors.grey[750]!;
    if (isBooked) color = Colors.red[900]!;
    if (isSelected) color = primaryAmber;

    return GestureDetector(
      onTap: isBooked ? null : () => provider.toggleSeat(number),
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        width: 38,
        height: 38,
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: isSelected ? Colors.white54 : Colors.transparent),
        ),
        alignment: Alignment.center,
        child: Text(
          number,
          style: TextStyle(
            color: isSelected ? const Color(0xFF020617) : (isBooked ? Colors.white38 : Colors.white70),
            fontSize: 11,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }
}
extension on Colors {
  static Color get grey750 => const Color(0xFF334155);
}
