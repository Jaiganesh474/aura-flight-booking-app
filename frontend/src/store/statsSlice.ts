import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../services/api';

export interface Stats {
  totalFlights: number;
  totalBookings: number;
  totalRevenue: number;
  totalUsers: number;
  totalAirlines: number;
  totalAirports: number;
  occupancyRate: number;
  cancellationsCount: number;
  trendData: Array<{ date: string; bookings: number; revenue: number }>;
  routesData: Array<{ route: string; count: number }>;
}

export interface StatsState {
  data: Stats | null;
  loading: boolean;
  error: string | null;
}

const initialState: StatsState = {
  data: null,
  loading: false,
  error: null,
};

// Async thunk to fetch dashboard statistics in real-time
export const fetchStats = createAsyncThunk('stats/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const response = await api.get('/api/admin/dashboard/stats');
    return response.data as Stats;
  } catch (err: any) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch dashboard metrics.');
  }
});

const statsSlice = createSlice({
  name: 'stats',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStats.pending, (state) => {
        state.loading = state.data === null; // Only show loader on initial fetch
        state.error = null;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.data = action.payload;
        state.loading = false;
      })
      .addCase(fetchStats.rejected, (state, action) => {
        state.error = action.payload as string;
        state.loading = false;
      });
  },
});

export default statsSlice.reducer;
