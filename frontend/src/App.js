import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Payments from './pages/Payments';
import Attendance from './pages/Attendance';
import Reports from './pages/Reports';
import Inventory from './pages/Inventory';
import UserManagement from './pages/UserManagement';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import { Toaster } from './components/ui/sonner';
import './App.css';

function App() {
  const [language, setLanguage] = useState('pt');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  // Premium keyboard shortcuts and command palette
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    commands
  } = useKeyboardShortcuts();

  // PWA Service Worker Registration
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          console.log('✅ KO Gym SW registered successfully:', registration.scope);
          
          // Handle updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('🔄 New content available, reload to update');
                  // Optionally show update notification
                }
              });
            }
          });
          
        } catch (error) {
          console.error('❌ KO Gym SW registration failed:', error);
        }
      });
    }

    // Online/Offline detection
    const handleOnline = () => {
      setIsOnline(true);
      console.log('📶 KO Gym: Back online');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      console.log('📴 KO Gym: Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA Install Prompt handling
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      window.deferredPrompt = e;
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const translations = {
    pt: {
      dashboard: 'Painel',
      members: 'Membros',
      attendance: 'Presenças',
      payments: 'Pagamentos',
      inventory: 'Stock',
      reports: 'Relatórios',
      settings: 'Configurações'
    },
    en: {
      dashboard: 'Dashboard',
      members: 'Members',
      attendance: 'Attendance',
      payments: 'Payments',
      inventory: 'Inventory',
      reports: 'Reports',
      settings: 'Settings'
    }
  };

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen" style={{ background: 'var(--background-primary)' }}>
          {/* Offline Indicator */}
          {!isOnline && (
            <div 
              className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white text-center py-2 text-sm font-medium"
              style={{ backgroundColor: 'var(--ko-warning)' }}
            >
              📴 Modo Offline - Algumas funcionalidades podem estar limitadas
            </div>
          )}
          <ProtectedRoute>
            <div className="flex h-screen">
              <Sidebar 
                isOpen={sidebarOpen}
                toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                language={language}
                setLanguage={setLanguage}
                translations={translations[language]}
              />
              
              <main className={`flex-1 overflow-auto transition-all duration-300 ${
                sidebarOpen ? 'ml-64' : 'ml-16'
              }`}>
                <Routes>
                  <Route path="/" element={
                    <Dashboard language={language} translations={translations[language]} />
                  } />
                  <Route path="/members" element={
                    <Members language={language} translations={translations[language]} />
                  } />
                  <Route path="/attendance" element={
                    <Attendance language={language} translations={translations[language]} />
                  } />
                  <Route path="/payments" element={
                    <ProtectedRoute requiredRole="admin">
                      <Payments language={language} translations={translations[language]} />
                    </ProtectedRoute>
                  } />
                  <Route path="/inventory" element={
                    <Inventory language={language} translations={translations[language]} />
                  } />
                  <Route path="/reports" element={
                    <ProtectedRoute requiredRole="admin">
                      <Reports language={language} translations={translations[language]} />
                    </ProtectedRoute>
                  } />
                  {/* <Route path="/users" element={
                    <ProtectedRoute requiredRole="admin">
                      <UserManagement language={language} />
                    </ProtectedRoute>
                  } /> */}
                </Routes>
              </main>
            </div>
          </ProtectedRoute>
          <Toaster position="top-right" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
