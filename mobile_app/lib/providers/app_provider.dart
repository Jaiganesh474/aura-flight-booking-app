import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppProvider with ChangeNotifier {
  Map<String, dynamic>? _user;
  Map<String, String> _searchQuery = {
    'source': '',
    'destination': '',
    'date': DateTime.now().toString().split(' ').first,
    'cabinClass': 'ECONOMY',
  };
  int? _selectedFlightId;
  List<String> _selectedSeats = [];
  bool _isDarkTheme = true;

  Map<String, dynamic>? get user => _user;
  Map<String, String> get searchQuery => _searchQuery;
  int? get selectedFlightId => _selectedFlightId;
  List<String> get selectedSeats => _selectedSeats;
  bool get isDarkTheme => _isDarkTheme;

  AppProvider() {
    _loadUserSession();
  }

  Future<void> _loadUserSession() async {
    final prefs = await SharedPreferences.getInstance();
    final username = prefs.getString('username');
    final email = prefs.getString('email');
    final token = prefs.getString('token');
    final role = prefs.getString('role');
    final avatar = prefs.getString('avatar');

    if (token != null && username != null) {
      _user = {
        'username': username,
        'email': email ?? '',
        'token': token,
        'role': role ?? 'USER',
        'avatar': avatar ?? '',
      };
      notifyListeners();
    }
  }

  Future<void> login(Map<String, dynamic> userData, String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('token', token);
    await prefs.setString('username', userData['username'] ?? '');
    await prefs.setString('email', userData['email'] ?? '');
    await prefs.setString('role', userData['role'] ?? 'USER');
    await prefs.setString('avatar', userData['avatar'] ?? '');

    _user = {
      'username': userData['username'],
      'email': userData['email'],
      'token': token,
      'role': userData['role'] ?? 'USER',
      'avatar': userData['avatar'] ?? '',
    };
    notifyListeners();
  }

  Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    _user = null;
    _selectedSeats.clear();
    _selectedFlightId = null;
    notifyListeners();
  }

  void updateSearchQuery(String source, String destination, String date, String cabinClass) {
    _searchQuery = {
      'source': source,
      'destination': destination,
      'date': date,
      'cabinClass': cabinClass,
    };
    notifyListeners();
  }

  void setSelectedFlightId(int? id) {
    _selectedFlightId = id;
    notifyListeners();
  }

  void setSelectedSeats(List<String> seats) {
    _selectedSeats = List.from(seats);
    notifyListeners();
  }

  void toggleSeat(String seatNumber) {
    if (_selectedSeats.contains(seatNumber)) {
      _selectedSeats.remove(seatNumber);
    } else {
      _selectedSeats.add(seatNumber);
    }
    notifyListeners();
  }

  void clearSelectedSeats() {
    _selectedSeats.clear();
    notifyListeners();
  }

  void toggleTheme() {
    _isDarkTheme = !_isDarkTheme;
    notifyListeners();
  }
}
