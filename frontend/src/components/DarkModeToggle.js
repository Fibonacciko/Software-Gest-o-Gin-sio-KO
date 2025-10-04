import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

/**
 * KO Gym - Dark Mode Toggle Premium
 * Toggle elegante com animações suaves
 */

const DarkModeToggle = ({ darkMode, toggleDarkMode, size = 'md', showLabel = false }) => {
  const sizes = {
    sm: { button: 'w-8 h-8', icon: 16 },
    md: { button: 'w-10 h-10', icon: 20 },
    lg: { button: 'w-12 h-12', icon: 24 }
  };

  const currentSize = sizes[size];

  return (
    <div className="flex items-center space-x-2">
      {showLabel && (
        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Tema
        </span>
      )}
      
      <button
        onClick={toggleDarkMode}
        className={`${currentSize.button} rounded-lg flex items-center justify-center transition-all duration-300 hover:scale-105 active:scale-95`}
        style={{
          background: darkMode ? 'var(--ko-dark-gradient-card)' : 'var(--gradient-card-bg)',
          border: `1px solid ${darkMode ? 'var(--ko-dark-border-light)' : 'var(--border-light)'}`,
          boxShadow: darkMode ? 'var(--ko-dark-shadow-md)' : 'var(--shadow-md)'
        }}
        title={darkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        data-testid="dark-mode-toggle"
      >
        <div className="relative">
          {/* Icon container com animação */}
          <div 
            className="transition-all duration-500 ease-in-out"
            style={{
              opacity: darkMode ? 1 : 0,
              transform: darkMode ? 'rotate(0deg)' : 'rotate(-180deg)',
              position: darkMode ? 'static' : 'absolute',
              top: darkMode ? 'auto' : '50%',
              left: darkMode ? 'auto' : '50%',
              marginTop: darkMode ? '0' : '-10px',
              marginLeft: darkMode ? '0' : '-10px'
            }}
          >
            <Moon 
              size={currentSize.icon} 
              className="ko-text-primary" 
            />
          </div>
          
          <div 
            className="transition-all duration-500 ease-in-out"
            style={{
              opacity: darkMode ? 0 : 1,
              transform: darkMode ? 'rotate(180deg)' : 'rotate(0deg)',
              position: darkMode ? 'absolute' : 'static',
              top: darkMode ? '50%' : 'auto',
              left: darkMode ? '50%' : 'auto',
              marginTop: darkMode ? '-10px' : '0',
              marginLeft: darkMode ? '-10px' : '0'
            }}
          >
            <Sun 
              size={currentSize.icon} 
              style={{ color: 'var(--ko-amber-600)' }}
            />
          </div>
        </div>
      </button>
    </div>
  );
};

// Versão expandida com opções avançadas
export const DarkModeSelector = ({ darkMode, toggleDarkMode, resetToSystemPreference, isSystemDark }) => {
  return (
    <div 
      className="p-4 rounded-lg border"
      style={{ 
        background: 'var(--background-elevated)',
        borderColor: 'var(--border-light)'
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
          Aparência
        </h3>
        <DarkModeToggle darkMode={darkMode} toggleDarkMode={toggleDarkMode} size="sm" />
      </div>
      
      <div className="space-y-2">
        {/* Opções de tema */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => toggleDarkMode && !darkMode ? null : toggleDarkMode()}
            className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 ${
              !darkMode ? 'ko-border-primary' : ''
            }`}
            style={{
              borderColor: !darkMode ? 'var(--ko-primary-orange)' : 'var(--border-light)',
              backgroundColor: !darkMode ? 'var(--ko-orange-50)' : 'transparent'
            }}
          >
            <Sun size={16} style={{ color: 'var(--ko-amber-600)' }} />
            <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Claro</span>
          </button>
          
          <button
            onClick={() => darkMode ? null : toggleDarkMode()}
            className={`flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 ${
              darkMode ? 'ko-border-primary' : ''
            }`}
            style={{
              borderColor: darkMode ? 'var(--ko-primary-orange)' : 'var(--border-light)',
              backgroundColor: darkMode ? 'var(--ko-orange-50)' : 'transparent'
            }}
          >
            <Moon size={16} className="ko-text-primary" />
            <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Escuro</span>
          </button>
          
          <button
            onClick={resetToSystemPreference}
            className="flex flex-col items-center p-2 rounded-lg border-2 transition-all duration-200 hover:border-opacity-50"
            style={{
              borderColor: 'var(--border-light)',
              backgroundColor: 'transparent'
            }}
          >
            <Monitor size={16} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>Sistema</span>
          </button>
        </div>
        
        {/* Info sobre preferência do sistema */}
        <div className="text-xs text-center pt-2 border-t" style={{ 
          color: 'var(--text-muted)',
          borderColor: 'var(--border-light)'
        }}>
          Sistema: {isSystemDark ? 'Escuro' : 'Claro'}
        </div>
      </div>
    </div>
  );
};

export default DarkModeToggle;