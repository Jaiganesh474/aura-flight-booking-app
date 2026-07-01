import 'dart:ui' show ImageFilter;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_provider.dart';
import 'flight_results_screen.dart';
import 'login_screen.dart';
import 'my_trips_screen.dart';
import 'profile_screen.dart';
import 'chatbot_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _sourceController = TextEditingController();
  final _destinationController = TextEditingController();
  String _selectedCabin = 'ECONOMY';
  DateTime _selectedDate = DateTime.now();

  @override
  Widget build(BuildContext context) {
    final provider = Provider.of<AppProvider>(context);
    final user = provider.user;
    final primaryAmber = const Color(0xFFF59E0B);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Aura Airways', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: 1)),
        actions: [
          IconButton(
            icon: const Icon(Icons.auto_awesome, color: Color(0xFFF59E0B)),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ChatbotScreen()),
              );
            },
          ),
          if (user == null)
            IconButton(
              icon: const Icon(Icons.login),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              },
            )
          else
            GestureDetector(
              onTap: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ProfileScreen()),
                );
              },
              child: const Padding(
                padding: EdgeInsets.symmetric(horizontal: 16.0),
                child: CircleAvatar(
                  radius: 16,
                  backgroundColor: Color(0xFFF59E0B),
                  child: Icon(Icons.person, size: 16, color: Color(0xFF020617)),
                ),
              ),
            ),
        ],
      ),
      drawer: Drawer(
        backgroundColor: const Color(0xFF0F172A),
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            DrawerHeader(
              decoration: const BoxDecoration(color: Color(0xFF020617)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const Icon(Icons.flight, color: Color(0xFFF59E0B), size: 48),
                  const SizedBox(height: 12),
                  Text(
                    user != null ? 'Welcome, ${user['username']}' : 'Aura Airways Mobile',
                    style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.search, color: Colors.grey),
              title: const Text('Book Flights', style: TextStyle(color: Colors.white)),
              onTap: () => Navigator.pop(context),
            ),
            if (user != null) ...[
              ListTile(
                leading: const Icon(Icons.airplane_ticket_outlined, color: Colors.grey),
                title: const Text('My Booked Trips', style: TextStyle(color: Colors.white)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MyTripsScreen()),
                  );
                },
              ),
              ListTile(
                leading: const Icon(Icons.person_outline, color: Colors.grey),
                title: const Text('Profile Settings', style: TextStyle(color: Colors.white)),
                onTap: () {
                  Navigator.pop(context);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ProfileScreen()),
                  );
                },
              ),
            ],
            ListTile(
              leading: const Icon(Icons.auto_awesome, color: Color(0xFFF59E0B)),
              title: const Text('Aura AI Chatbot', style: TextStyle(color: Colors.white)),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ChatbotScreen()),
                );
              },
            ),
          ],
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Hero card banner
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [primaryAmber.withOpacity(0.15), Colors.transparent],
                ),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: primaryAmber.withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Discover Your Next Flight', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Colors.white)),
                  const SizedBox(height: 6),
                  Text('Get modern recommendations and premium services instantly.', style: TextStyle(color: Colors.grey[400], fontSize: 13)),
                ],
              ),
            ),
            const SizedBox(height: 28),
            // Search card inputs
            Tilt3DCard(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF1E293B).withOpacity(0.4),
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Colors.white12),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.4),
                          blurRadius: 24,
                          offset: const Offset(0, 12),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        TextField(
                          controller: _sourceController,
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Origin City / Code',
                            prefixIcon: Icon(Icons.flight_takeoff),
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _destinationController,
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Destination City / Code',
                            prefixIcon: Icon(Icons.flight_land),
                          ),
                        ),
                        const SizedBox(height: 16),
                        // Date picker field
                        InkWell(
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _selectedDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 365)),
                            );
                            if (picked != null) {
                              setState(() => _selectedDate = picked);
                            }
                          },
                          child: InputDecorator(
                            decoration: const InputDecoration(
                              labelText: 'Departure Date',
                              prefixIcon: Icon(Icons.calendar_today_outlined),
                            ),
                            child: Text(
                              '${_selectedDate.day}/${_selectedDate.month}/${_selectedDate.year}',
                              style: const TextStyle(color: Colors.white),
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                        // Cabin class dropdown
                        DropdownButtonFormField<String>(
                          value: _selectedCabin,
                          dropdownColor: const Color(0xFF1E293B),
                          decoration: const InputDecoration(
                            labelText: 'Cabin Class',
                            prefixIcon: Icon(Icons.airline_seat_recline_extra),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'ECONOMY', child: Text('Economy Class')),
                            DropdownMenuItem(value: 'PREMIUM_ECONOMY', child: Text('Premium Economy')),
                            DropdownMenuItem(value: 'BUSINESS', child: Text('Business Class')),
                            DropdownMenuItem(value: 'FIRST', child: Text('First Class')),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedCabin = val);
                          },
                        ),
                        const SizedBox(height: 28),
                        ElevatedButton(
                          onPressed: () {
                            provider.updateSearchQuery(
                              _sourceController.text.trim(),
                              _destinationController.text.trim(),
                              _selectedDate.toString().split(' ').first,
                              _selectedCabin,
                            );
                            Navigator.push(
                              context,
                              MaterialPageRoute(builder: (_) => const FlightResultsScreen()),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: primaryAmber,
                            foregroundColor: const Color(0xFF020617),
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                          child: const Text('Search Flight Routes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                        )
                      ],
                    ),
                  ),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}

class Tilt3DCard extends StatefulWidget {
  final Widget child;
  const Tilt3DCard({Key? key, required this.child}) : super(key: key);

  @override
  State<Tilt3DCard> createState() => _Tilt3DCardState();
}

class _Tilt3DCardState extends State<Tilt3DCard> {
  double _rotateX = 0.0;
  double _rotateY = 0.0;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: (details) {
        setState(() {
          _rotateY += details.delta.dx * 0.002;
          _rotateX -= details.delta.dy * 0.002;
          _rotateX = _rotateX.clamp(-0.15, 0.15);
          _rotateY = _rotateY.clamp(-0.15, 0.15);
        });
      },
      onPanEnd: (_) {
        setState(() {
          _rotateX = 0.0;
          _rotateY = 0.0;
        });
      },
      child: Transform(
        transform: Matrix4.identity()
          ..setEntry(3, 2, 0.001) // Perspective depth
          ..rotateX(_rotateX)
          ..rotateY(_rotateY),
        alignment: FractionalOffset.center,
        child: widget.child,
      ),
    );
  }
}
