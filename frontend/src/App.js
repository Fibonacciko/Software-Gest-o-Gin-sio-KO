import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import '@/App.css';

// Import components and contexts
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Attendance from './pages/Attendance';
import Payments from './pages/Payments';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import UserManagement from './pages/UserManagement';
import { Toaster } from './components/ui/sonner';

function App() {
  const [language, setLanguage] = useState('pt');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const translations = {
    pt: {
      dashboard: 'Painel',
      members: 'Membros',
      attendance: 'Presenças',
      payments: 'Pagamentos',
      inventory: 'Stock',
      reports: 'Relatórios',
      users: 'Utilizadores',
      settings: 'Configurações'
    },
    en: {
      dashboard: 'Dashboard',
      members: 'Members',
      attendance: 'Attendance',
      payments: 'Payments',
      inventory: 'Inventory',
      reports: 'Reports',
      users: 'Users',
      settings: 'Settings'
    }
  };

  return (
    <div className="App min-h-screen">
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
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
                  <Route path="/users" element={
                    <ProtectedRoute requiredRole="admin">
                      <UserManagement language={language} />
                    </ProtectedRoute>
                  } />
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
