import { useState, useEffect } from 'react';

/**
 * KO Gym - Dark Mode Premium Hook
 * Sistema inteligente de tema escuro com persistência
 */

const useDarkMode = () => {
  const [darkMode, setDarkMode] = useState(() => {
    // Verificar preferência salva
    const saved = localStorage.getItem('ko-gym-dark-mode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    
    // Fallback para preferência do sistema
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Aplicar tema no DOM
  useEffect(() => {
    const root = document.documentElement;
    
    if (darkMode) {
      // Aplicar variáveis dark mode
      root.style.setProperty('--background-primary', 'var(--ko-dark-gradient-primary)');
      root.style.setProperty('--background-secondary', 'var(--ko-dark-gradient-card)');
      root.style.setProperty('--background-elevated', 'var(--ko-dark-elevated)');
      root.style.setProperty('--background-sidebar', 'var(--ko-dark-gradient-card)');
      
      root.style.setProperty('--text-primary', 'var(--ko-dark-text-primary)');
      root.style.setProperty('--text-secondary', 'var(--ko-dark-text-secondary)');
      root.style.setProperty('--text-muted', 'var(--ko-dark-text-muted)');
      
      root.style.setProperty('--border-light', 'var(--ko-dark-border-light)');
      root.style.setProperty('--border-medium', 'var(--ko-dark-border-medium)');
      root.style.setProperty('--border-strong', 'var(--ko-dark-border-strong)');
      
      root.style.setProperty('--gradient-card-bg', 'var(--ko-dark-gradient-card)');
      root.style.setProperty('--gradient-input', 'var(--ko-dark-gradient-input)');
      root.style.setProperty('--gradient-hover', 'var(--ko-dark-gradient-hover)');
      
      root.style.setProperty('--shadow-sm', 'var(--ko-dark-shadow-sm)');
      root.style.setProperty('--shadow-md', 'var(--ko-dark-shadow-md)');
      root.style.setProperty('--shadow-lg', 'var(--ko-dark-shadow-lg)');
      root.style.setProperty('--shadow-xl', 'var(--ko-dark-shadow-xl)');
      
      // Adicionar classe dark ao body
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
      
    } else {
      // Restaurar variáveis light mode (valores originais)
      root.style.setProperty('--background-primary', 'var(--gradient-page-bg)');
      root.style.setProperty('--background-secondary', 'var(--gradient-card-bg)');
      root.style.setProperty('--background-elevated', 'var(--gradient-input)');
      root.style.setProperty('--background-sidebar', 'var(--gradient-sidebar)');
      
      root.style.setProperty('--text-primary', 'var(--ko-neutral-900)');
      root.style.setProperty('--text-secondary', 'var(--ko-neutral-700)');
      root.style.setProperty('--text-muted', 'var(--ko-neutral-500)');
      
      root.style.setProperty('--border-light', 'var(--ko-neutral-200)');
      root.style.setProperty('--border-medium', 'var(--ko-neutral-300)');
      root.style.setProperty('--border-strong', 'var(--ko-neutral-400)');
      
      // Restaurar gradientes originais
      root.style.setProperty('--gradient-card-bg', 'linear-gradient(145deg, #FFFFFF 0%, #FFFBEB 100%)');
      root.style.setProperty('--gradient-input', 'linear-gradient(145deg, #FFFFFF 0%, #FFF8F1 100%)');
      root.style.setProperty('--gradient-hover', 'linear-gradient(145deg, var(--ko-orange-50) 0%, var(--ko-amber-50) 100%)');
      
      // Restaurar sombras originais
      root.style.setProperty('--shadow-sm', '0 1px 2px 0 rgba(120, 113, 108, 0.1)');
      root.style.setProperty('--shadow-md', '0 4px 6px -1px rgba(120, 113, 108, 0.1), 0 2px 4px -1px rgba(120, 113, 108, 0.06)');
      root.style.setProperty('--shadow-lg', '0 10px 15px -3px rgba(120, 113, 108, 0.1), 0 4px 6px -2px rgba(120, 113, 108, 0.05)');
      root.style.setProperty('--shadow-xl', '0 20px 25px -5px rgba(120, 113, 108, 0.1), 0 10px 10px -5px rgba(120, 113, 108, 0.04)');
      
      // Adicionar classe light ao body
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
    
    // Salvar preferência
    localStorage.setItem('ko-gym-dark-mode', JSON.stringify(darkMode));
    
    // Atualizar meta theme-color
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', darkMode ? '#1A1A1A' : '#B8651B');
    }
    
  }, [darkMode]);

  // Listener para mudança de preferência do sistema
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Apenas aplicar se não houver preferência manual salva
      const saved = localStorage.getItem('ko-gym-dark-mode');
      if (saved === null) {
        setDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const setLightMode = () => {
    setDarkMode(false);
  };

  const setDarkModeOn = () => {
    setDarkMode(true);
  };

  const resetToSystemPreference = () => {
    localStorage.removeItem('ko-gym-dark-mode');
    const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(systemPrefersDark);
  };

  return {
    darkMode,
    toggleDarkMode,
    setLightMode,
    setDarkMode: setDarkModeOn,
    resetToSystemPreference,
    isSystemDark: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  };
};

export default useDarkMode;