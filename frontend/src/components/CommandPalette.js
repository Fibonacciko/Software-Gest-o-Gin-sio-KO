import React, { useState, useEffect, useRef } from 'react';
import { Search, Command, ArrowUp, ArrowDown, CornerDownLeft } from 'lucide-react';

/**
 * KO Gym - Command Palette Premium
 * Interface de linha de comando para navegação rápida
 */

const CommandPalette = ({ isOpen, onClose, commands }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filteredCommands, setFilteredCommands] = useState(commands);
  const inputRef = useRef(null);

  // Filtrar comandos baseado na pesquisa
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCommands(commands);
    } else {
      const filtered = commands.filter(command =>
        command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        command.key.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCommands(filtered);
    }
    setSelectedIndex(0);
  }, [searchTerm, commands]);

  // Focus no input quando abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  const executeCommand = (command) => {
    command.action();
    onClose();
    setSearchTerm('');
  };

  const getCommandIcon = (commandId) => {
    const icons = {
      dashboard: '📊',
      members: '👥', 
      attendance: '📅',
      payments: '💳',
      reports: '📈',
      inventory: '📦',
      users: '👤',
      new: '➕',
      save: '💾',
      search: '🔍',
      install: '📱',
      analytics: '🎯',
      status: '🔧',
      debug: '🐛',
      clear: '🗑️',
      refresh: '🔄'
    };
    return icons[commandId] || '⚡';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
      {/* Overlay */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      
      {/* Command Palette */}
      <div 
        className="relative w-full max-w-2xl mx-4 rounded-lg shadow-2xl"
        style={{ 
          background: 'var(--background-elevated)',
          border: '1px solid var(--ko-primary-orange)',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        {/* Header */}
        <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <Command className="w-5 h-5 mr-3 ko-text-primary" />
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            placeholder="Digite um comando ou pesquise..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-lg"
            style={{ color: 'var(--text-primary)' }}
          />
          <div className="flex items-center space-x-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--ko-neutral-100)' }}>↑↓</kbd>
            <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--ko-neutral-100)' }}>Enter</kbd>
            <kbd className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--ko-neutral-100)' }}>Esc</kbd>
          </div>
        </div>

        {/* Commands List */}
        <div className="max-h-96 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum comando encontrado</p>
              <p className="text-sm mt-1">Tente pesquisar por "dashboard", "membros", etc.</p>
            </div>
          ) : (
            <div className="py-2">
              {filteredCommands.map((command, index) => (
                <div
                  key={command.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all duration-150 ${
                    index === selectedIndex ? 'ko-text-primary' : ''
                  }`}
                  style={{
                    backgroundColor: index === selectedIndex ? 'var(--ko-orange-50)' : 'transparent'
                  }}
                  onClick={() => executeCommand(command)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="flex items-center">
                    <span className="text-xl mr-3">{getCommandIcon(command.id)}</span>
                    <div>
                      <div className="font-medium">{command.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <kbd 
                      className="px-2 py-1 text-xs rounded font-mono"
                      style={{ 
                        backgroundColor: 'var(--ko-neutral-100)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {command.key}
                    </kbd>
                    {index === selectedIndex && (
                      <CornerDownLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="px-4 py-3 border-t text-xs"
          style={{ 
            borderColor: 'var(--border-light)',
            backgroundColor: 'var(--ko-neutral-50)',
            color: 'var(--text-muted)'
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <ArrowUp className="w-3 h-3" />
                <ArrowDown className="w-3 h-3" />
                <span>para navegar</span>
              </div>
              <div className="flex items-center space-x-1">
                <CornerDownLeft className="w-3 h-3" />
                <span>para executar</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="text-xs">Esc</kbd>
                <span>para fechar</span>
              </div>
            </div>
            <div className="ko-text-primary font-medium">
              KO Gym Command Palette
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;