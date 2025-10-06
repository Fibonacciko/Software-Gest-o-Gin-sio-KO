import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const useWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [attendanceEvents, setAttendanceEvents] = useState([]);
  const [systemAlerts, setSystemAlerts] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    // Get backend URL and create WebSocket connection
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
    const wsUrl = backendUrl.replace('/api', '/ws');
    
    console.log('🔌 Connecting to WebSocket:', wsUrl);
    
    const newSocket = io(wsUrl, {
      auth: {
        token: localStorage.getItem('token') // JWT token for auth
      },
      transports: ['websocket', 'polling'],
      upgrade: true
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected:', newSocket.id);
      setIsConnected(true);
      
      // Join relevant rooms
      newSocket.emit('join_dashboard');
      newSocket.emit('join_attendance');
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connection_success', (data) => {
      console.log('🎉 WebSocket authenticated:', data);
    });

    newSocket.on('connection_error', (data) => {
      console.error('🚫 WebSocket auth failed:', data);
    });

    // Data events
    newSocket.on('dashboard_update', (stats) => {
      console.log('📊 Dashboard update received:', stats);
      setDashboardStats(stats);
    });

    newSocket.on('attendance_update', (event) => {
      console.log('👤 Attendance update:', event);
      setAttendanceEvents(prev => [event, ...prev].slice(0, 20)); // Keep last 20
    });

    newSocket.on('payment_update', (event) => {
      console.log('💰 Payment update:', event);
      // Handle payment events
    });

    newSocket.on('member_count_update', (data) => {
      console.log('👥 Member count update:', data);
      // Handle member count updates
    });

    newSocket.on('system_alert', (alert) => {
      console.log('🚨 System alert:', alert);
      setSystemAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep last 10
    });

    newSocket.on('occupancy_update', (data) => {
      console.log('📍 Occupancy update:', data);
      // Handle occupancy updates
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up WebSocket connection');
      newSocket.disconnect();
    };
  }, []);

  // Helper functions
  const requestMemberCount = () => {
    if (socket && isConnected) {
      socket.emit('request_member_count');
    }
  };

  const joinRoom = (room) => {
    if (socket && isConnected) {
      socket.emit(`join_${room}`);
    }
  };

  const leaveRoom = (room) => {
    if (socket && isConnected) {
      socket.emit(`leave_${room}`);
    }
  };

  return {
    socket,
    isConnected,
    dashboardStats,
    attendanceEvents,
    systemAlerts,
    requestMemberCount,
    joinRoom,
    leaveRoom
  };
};

export default useWebSocket;