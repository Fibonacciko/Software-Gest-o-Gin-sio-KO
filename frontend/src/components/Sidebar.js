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
  Globe
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar, language, setLanguage, translations }) => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: Home, label: translations.dashboard },
    { path: '/members', icon: Users, label: translations.members },
    { path: '/attendance', icon: Calendar, label: translations.attendance },
    { path: '/payments', icon: CreditCard, label: translations.payments },
    { path: '/inventory', icon: Package, label: translations.inventory },
    { path: '/reports', icon: BarChart, label: translations.reports },
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
      <div className={`fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-50 ${
        isOpen ? 'w-64' : 'w-16'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          {isOpen && (
            <h1 className="text-xl font-bold text-gray-800 fade-in">
              Gestão Fitness
            </h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

        {/* Language switcher */}
        {isOpen && (
          <div className="absolute bottom-6 left-4 right-4">
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
          </div>
        )}
      </div>
    </>
  );
};

export default Sidebar;
