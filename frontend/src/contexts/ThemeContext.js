import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    
    // Apply theme to document
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.body.style.background = 'linear-gradient(135deg, #000000 0%, #1a1a1a 25%, #f97316 50%, #1a1a1a 75%, #000000 100%)';
      document.body.style.backgroundSize = '400% 400%';
      document.body.style.animation = 'gradientShift 15s ease infinite';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.background = 'linear-gradient(135deg, #ffffff 0%, #fef3e2 25%, #f97316 50%, #fef3e2 75%, #ffffff 100%)';
      document.body.style.backgroundSize = '400% 400%';
      document.body.style.animation = 'gradientShift 15s ease infinite';
    }
  }, [isDark]);

  useEffect(() => {
    // Add CSS animation for gradient movement
    const style = document.createElement('style');
    style.textContent = `
      @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        25% { background-position: 100% 50%; }
        50% { background-position: 100% 100%; }
        75% { background-position: 0% 100%; }
        100% { background-position: 0% 50%; }
      }
      
      body {
        min-height: 100vh;
        transition: all 0.3s ease;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  const value = {
    isDark,
    toggleTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};