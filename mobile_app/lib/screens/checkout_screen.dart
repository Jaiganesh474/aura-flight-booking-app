import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/app_provider.dart';
import '../services/api_service.dart';
import 'success_screen.dart';

class CheckoutScreen extends StatefulWidget {
  const CheckoutScreen({Key? key}) : super(key: key);

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  final List<TextEditingController> _nameControllers = [];
  final List<TextEditingController> _ageControllers = [];
  final _couponController = TextEditingController();
  
  double _discount = 0.0;
  bool _isBooking = false;
  String? _couponError;
  String? _couponSuccess;

  @override
  void initState() {
    super.initState();
    final seatsCount = Provider.of<AppProvider>(context, listen: false).selectedSeats.length;
    for (int i = 0; i < seatsCount; i++) {
      _nameControllers.add(TextEditingController());
      _ageControllers.add(TextEditingController());
    }
  }

  Future<void> _applyCoupon() async {
    final code = _couponController.text.trim();
    if (code.isEmpty) return;

    try {
      final response = await ApiService.get('/api/coupons');
      if (response.statusCode == 200) {
        final List<dynamic> coupons = jsonDecode(response.body);
        final matched = coupons.firstWhere(
          (c) => c['code'].toString().toUpperCase() == code.toUpperCase() && c['active'] == true,
          orElse: () => null,
        );

        if (matched != null) {
          setState(() {
            _discount = (matched['discountPercentage'] as num).toDouble();
            _couponSuccess = '🎉 Coupon applied: ${matched['discountPercentage']}% off!';
            _couponError = null;
          });
        } else {
          setState(() {
            _couponError = 'Invalid or expired coupon code.';
            _couponSuccess = null;
            _discount = 0.0;
          });
        }
      }
    } catch (e) {
      setState(() {
        _couponError = 'Failed to check coupon codes.';
      });
    }
  }

  Future<void> _handlePaymentAndBooking() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isBooking = true);

    final provider = Provider.of<AppProvider>(context, listen: false);
    final flightId = provider.selectedFlightId;
    final seats = provider.selectedSeats;
    
    List<Map<String, dynamic>> passengers = [];
    for (int i = 0; i < seats.length; i++) {
      passengers.add({
        'name': _nameControllers[i].text.trim(),
        'age': int.parse(_ageControllers[i].text.trim()),
        'gender': 'Male', // Default gender
        'seatNumber': seats[i],
      });
    }

    try {
      final response = await ApiService.post('/api/bookings', {
        'flightId': flightId,
        'passengers': passengers,
        'couponCode': _couponController.text.trim().isNotEmpty ? _couponController.text.trim().toUpperCase() : null,
      });

      if (response.statusCode == 200 || response.statusCode == 201) {
        final bookingData = jsonDecode(response.body);
        provider.clearSelectedSeats();
        Navigator.pushAndRemoveUntil(
          context,
          MaterialPageRoute(builder: (_) => SuccessScreen(booking: bookingData)),
          (route) => route.isFirst,
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('⚠️ Seat lock/booking failed. Seat may have been booked.')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('⚠️ Network error during checkout.')),
      );
    } finally {
      setState(() => _isBooking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final primaryAmber = const Color(0xFFF59E0B);
    final currencyFormatter = NumberFormat.simpleCurrency(locale: 'en_IN', decimalDigits: 0);

    double baseTotal = provider.selectedSeats.length * 5200.0; // Mock average fare
    double discountVal = baseTotal * (_discount / 100.0);
    double finalTotal = baseTotal - discountVal;

    return Scaffold(
      appBar: AppBar(title: const Text('Checkout Details')),
      body: _isBooking
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Locking seats and processing transaction details...', style: TextStyle(color: Colors.grey)),
                ],
              ),
            )
          : Form(
              key: _formKey,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text('Passenger Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 16),
                    ...List.generate(provider.selectedSeats.length, (index) {
                      return Card(
                        color: const Color(0xFF1E293B),
                        margin: const EdgeInsets.symmetric(vertical: 8),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Passenger ${index + 1} (Seat: ${provider.selectedSeats[index]})', style: TextStyle(color: primaryAmber, fontWeight: FontWeight.bold)),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _nameControllers[index],
                                style: const TextStyle(color: Colors.white),
                                decoration: const InputDecoration(labelText: 'Full Name', prefixIcon: Icon(Icons.person_outline)),
                                validator: (val) => val == null || val.isEmpty ? 'Enter full name' : null,
                              ),
                              const SizedBox(height: 12),
                              TextFormField(
                                controller: _ageControllers[index],
                                style: const TextStyle(color: Colors.white),
                                keyboardType: TextInputType.number,
                                decoration: const InputDecoration(labelText: 'Age', prefixIcon: Icon(Icons.cake_outlined)),
                                validator: (val) => val == null || val.isEmpty ? 'Enter age' : null,
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 24),
                    const Text('Coupons', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _couponController,
                            style: const TextStyle(color: Colors.white),
                            decoration: InputDecoration(
                              hintText: 'PROMO15',
                              errorText: _couponError,
                              helperText: _couponSuccess,
                              helperStyle: const TextStyle(color: Colors.greenAccent),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          onPressed: _applyCoupon,
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                          child: const Text('Apply'),
                        )
                      ],
                    ),
                    const SizedBox(height: 32),
                    Card(
                      color: const Color(0xFF0F172A),
                      child: Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                const Text('Fare Summary', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                Text('${provider.selectedSeats.length} Ticket(s)'),
                              ],
                            ),
                            const Divider(height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                const Text('Base Total'),
                                Text(currencyFormatter.format(baseTotal)),
                              ],
                            ),
                            if (_discount > 0) ...[
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.between,
                                children: [
                                  const Text('Discount Applied', style: TextStyle(color: Colors.greenAccent)),
                                  Text('-${currencyFormatter.format(discountVal)}', style: const TextStyle(color: Colors.greenAccent)),
                                ],
                              ),
                            ],
                            const Divider(height: 24),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.between,
                              children: [
                                const Text('Grand Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                Text(currencyFormatter.format(finalTotal), style: TextStyle(color: primaryAmber, fontSize: 20, fontWeight: FontWeight.bold)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton(
                      onPressed: _handlePaymentAndBooking,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: primaryAmber,
                        foregroundColor: const Color(0xFF020617),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Pay & Book Tickets', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    )
                  ],
                ),
              ),
            ),
    );
  }
}
