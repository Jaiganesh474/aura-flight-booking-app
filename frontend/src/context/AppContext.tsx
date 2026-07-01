import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  token: string;
  createdAt?: string;
  active?: boolean;
  avatar?: string;
}

interface SearchQuery {
  source: string;
  destination: string;
  date: string;
  cabinClass: string;
}

interface AppContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  updateUserAvatar: (avatarBase64: string) => void;
  searchQuery: SearchQuery;
  setSearchQuery: (query: SearchQuery) => void;
  selectedFlightId: number | null;
  setSelectedFlightId: (id: number | null) => void;
  selectedSeats: string[];
  setSelectedSeats: React.Dispatch<React.SetStateAction<string[]>>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedFlightId, setSelectedFlightId] = useState<number | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState<SearchQuery>({
    source: '',
    destination: '',
    date: new Date().toISOString().split('T')[0],
    cabinClass: 'ECONOMY',
  });

  useEffect(() => {
    const storedUser = sessionStorage.getItem('user');
    const token = sessionStorage.getItem('token');
    if (storedUser && token) {
      try {
        const parsed = JSON.parse(storedUser);
        // Load avatar from localStorage
        const storedAvatar = localStorage.getItem(`avatar_${parsed.username}`);
        if (storedAvatar) {
          parsed.avatar = storedAvatar;
        }
        setUser(parsed);
      } catch (e) {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
      }
    }

    // Load theme from localStorage, default to light
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const activeTheme = storedTheme || 'light';
    setTheme(activeTheme);
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // 5 minutes inactivity check
  useEffect(() => {
    if (!user) return;

    let timeoutId: number;

    const resetTimer = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      // 5 minutes = 300,000 ms
      timeoutId = window.setTimeout(() => {
        logout();
        window.location.href = '/login?inactive=true';
      }, 5 * 60 * 1000);
    };

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    // Setup initial timer
    resetTimer();

    // Event listeners for reset
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  const login = (userData: User) => {
    // Load avatar if exists
    const storedAvatar = localStorage.getItem(`avatar_${userData.username}`);
    const userWithAvatar = { ...userData };
    if (storedAvatar) {
      userWithAvatar.avatar = storedAvatar;
    }
    setUser(userWithAvatar);
    sessionStorage.setItem('user', JSON.stringify(userWithAvatar));
    sessionStorage.setItem('token', userData.token);
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
  };

  const updateUserAvatar = (avatarBase64: string) => {
    if (!user) return;
    const updatedUser = { ...user, avatar: avatarBase64 };
    setUser(updatedUser);
    sessionStorage.setItem('user', JSON.stringify(updatedUser));
    localStorage.setItem(`avatar_${user.username}`, avatarBase64);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        updateUserAvatar,
        searchQuery,
        setSearchQuery,
        selectedFlightId,
        setSelectedFlightId,
        selectedSeats,
        setSelectedSeats,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
