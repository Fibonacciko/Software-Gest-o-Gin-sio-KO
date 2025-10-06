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
        <div className="flex items-center justify-between p-4 border-b border-orange-200/50 dark:border-orange-700/50">
          {isOpen ? (
            <div className="flex items-center space-x-3 fade-in">
              <img 
                src="/logo-ko.png" 
                alt="Ginásio KO" 
                className="h-8 w-auto"
              />
              <h1 className="text-xl font-bold text-gray-800 dark:text-orange-100">
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
            className={`p-2 rounded-lg hover:bg-orange-100/50 dark:hover:bg-orange-800/50 text-gray-700 dark:text-orange-200 transition-colors ${isOpen ? 'ml-auto' : 'absolute right-4'}`}
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
                        ? 'bg-orange-100/80 dark:bg-orange-800/80 text-orange-700 dark:text-orange-200 border-r-2 border-orange-500' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-orange-50/50 dark:hover:bg-orange-900/30'
                    }`}
                    data-testid={`nav-${item.path.replace('/', '') || 'dashboard'}`}
                  >
                    <Icon 
                      size={20} 
                      className={`transition-colors ${
                        isActive ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400'
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
            <div className="p-3 bg-orange-50/80 dark:bg-orange-900/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-800 rounded-full flex items-center justify-center">
                  {user?.role === 'admin' ? 
                    <Shield size={16} className="text-orange-600 dark:text-orange-400" /> : 
                    <User size={16} className="text-orange-600 dark:text-orange-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-orange-100 truncate">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-orange-300">
                    {user?.role === 'admin' ? 'Administrador' : 'Staff'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Theme Toggle */}
            <div className="flex items-center justify-between p-3 bg-orange-50/80 dark:bg-orange-900/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center">
                {isDark ? <Moon size={16} className="text-orange-600 dark:text-orange-400 mr-2" /> : <Sun size={16} className="text-orange-600 dark:text-orange-400 mr-2" />}
                <span className="text-sm text-gray-600 dark:text-orange-300">
                  {isDark ? 'Modo Escuro' : 'Modo Claro'}
                </span>
              </div>
              <button
                onClick={toggleTheme}
                className="p-1 rounded-full bg-orange-200 dark:bg-orange-700 text-orange-700 dark:text-orange-300 hover:bg-orange-300 dark:hover:bg-orange-600 transition-colors"
                data-testid="theme-toggle"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
            
            {/* Language switcher */}
            <div className="flex items-center justify-between p-3 bg-orange-50/80 dark:bg-orange-900/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center">
                <Globe size={16} className="text-orange-600 dark:text-orange-400 mr-2" />
                <span className="text-sm text-gray-600 dark:text-orange-300">Idioma</span>
              </div>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-sm border-none bg-transparent focus:outline-none cursor-pointer text-gray-700 dark:text-orange-200"
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
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 dark:border-red-700"
              data-testid="logout-btn"
            >
              <LogOut size={16} className="mr-2" />
              Terminar Sessão
            </Button>
          </div>
        )}
        
        {/* Collapsed Theme Toggle */}
        {!isOpen && (
          <div className="absolute bottom-6 left-0 right-0 px-2">
            <button
              onClick={toggleTheme}
              className="w-full p-3 rounded-lg bg-orange-100/50 dark:bg-orange-800/50 hover:bg-orange-200/50 dark:hover:bg-orange-700/50 text-orange-600 dark:text-orange-400 transition-colors"
              data-testid="theme-toggle-collapsed"
              title={isDark ? 'Modo Claro' : 'Modo Escuro'}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
