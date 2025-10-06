import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  Calendar, 
  CreditCard, 
  Package, 
  BarChart, 
  Settings,
  Menu,
  X,
  Globe,
  LogOut,
  Shield,
  User,
  Sun,
  Moon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from './ui/button';

const Sidebar = ({ isOpen, toggleSidebar, language, setLanguage, translations }) => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const menuItems = [
    { path: '/', icon: Home, label: translations.dashboard },
    { path: '/members', icon: Users, label: translations.members },
    { path: '/attendance', icon: Calendar, label: translations.attendance },
    ...(isAdmin() ? [{ path: '/payments', icon: CreditCard, label: translations.payments }] : []),
    { path: '/inventory', icon: Package, label: translations.inventory },
    ...(isAdmin() ? [{ path: '/reports', icon: BarChart, label: translations.reports }] : []),
    ...(isAdmin() ? [{ path: '/users', icon: Shield, label: translations.users }] : []),
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 lg:hidden z-40"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full bg-gradient-to-b from-white/95 to-orange-50/95 dark:from-black/95 dark:to-orange-900/95 backdrop-blur-sm shadow-lg transition-all duration-300 z-50 ${
        isOpen ? 'w-64' : 'w-16'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {isOpen ? (
            <div className="flex items-center space-x-3 fade-in">
              <img 
                src="/logo-ko.png" 
                alt="Ginásio KO" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-gray-800">
                Ginásio KO
              </h1>
            </div>
          ) : (
            <div className="flex justify-center w-full">
              <img 
                src="/logo-ko.png" 
                alt="Ginásio KO" 
                className="h-8 w-auto"
              />
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${isOpen ? 'ml-auto' : 'absolute right-4'}`}
            data-testid="sidebar-toggle"
          >
            {isOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-6 px-3">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-3 rounded-lg transition-all duration-200 group ${
                      isActive 
                        ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
                  >
                    <Icon 
                      size={20} 
                      className={`transition-colors ${
                        isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                      }`} 
                    />
                    {isOpen && (
                      <span className="ml-3 font-medium fade-in">
                        {item.label}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info & Controls */}
        {isOpen && (
          <div className="absolute bottom-6 left-4 right-4 space-y-3">
            {/* User Info */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  {user?.role === 'admin' ? 
                    <Shield size={16} className="text-blue-600" /> : 
                    <User size={16} className="text-blue-600" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.role === 'admin' ? 'Administrador' : 'Staff'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Language switcher */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Globe size={16} className="text-gray-500 mr-2" />
                <span className="text-sm text-gray-600">Idioma</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm border-none bg-transparent focus:outline-none cursor-pointer"
                data-testid="language-selector"
              >
                <option value="pt">PT</option>
                <option value="en">EN</option>
              </select>
            </div>
            
            {/* Logout Button */}
            <Button
              onClick={logout}
              variant="outline"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              data-testid="logout-btn"
            >
              <LogOut size={16} className="mr-2" />
              Terminar Sessão
            </Button>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
