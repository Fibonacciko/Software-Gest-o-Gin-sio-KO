import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * KO Gym - Sistema de Atalhos de Teclado Premium
 * Navegação rápida e produtividade aprimorada
 */

const useKeyboardShortcuts = () => {
  const navigate = useNavigate();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  
  // Access to dark mode from global context (we'll use DOM method for simplicity)
  const isDarkMode = document.body.classList.contains('dark-mode');

  // Atalhos disponíveis
  const shortcuts = {
    // Navegação
    'ctrl+d': () => navigate('/dashboard'),
    'ctrl+m': () => navigate('/members'),
    'ctrl+a': () => navigate('/attendance'),
    'ctrl+p': () => navigate('/payments'),
    'ctrl+r': () => navigate('/reports'),
    'ctrl+i': () => navigate('/inventory'),
    'ctrl+u': () => navigate('/users'),
    
    // Funcionalidades
    'ctrl+k': () => openCommandPalette(),
    'ctrl+shift+k': () => toggleSearchMode(),
    'ctrl+n': () => createNew(),
    'ctrl+s': () => quickSave(),
    'ctrl+f': () => focusSearch(),
    'escape': () => closeModals(),
    
    // Desenvolvimento/Debug
    'ctrl+shift+d': () => toggleDebugMode(),
    'ctrl+shift+c': () => clearCache(),
    'ctrl+shift+r': () => forceRefresh(),
    
    // Dark Mode
    'ctrl+shift+t': () => toggleTheme(),
    
    // PWA
    'ctrl+shift+i': () => showInstallPrompt(),
    'ctrl+shift+o': () => toggleOfflineMode(),
    
    // Analytics
    'ctrl+shift+a': () => showAnalytics(),
    'ctrl+shift+s': () => showSystemStatus()
  };

  const openCommandPalette = useCallback(() => {
    setCommandPaletteOpen(true);
    // Focus no input de comando
    setTimeout(() => {
      const commandInput = document.getElementById('command-palette-input');
      if (commandInput) commandInput.focus();
    }, 100);
  }, []);

  const toggleSearchMode = useCallback(() => {
    setSearchMode(!searchMode);
    if (!searchMode) {
      // Focus no campo de pesquisa global
      const searchInput = document.querySelector('[data-testid="global-search"]');
      if (searchInput) searchInput.focus();
    }
  }, [searchMode]);

  const createNew = useCallback(() => {
    // Detectar página atual e abrir modal apropriado
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('/members')) {
      const addButton = document.querySelector('[data-testid="add-member-btn"]');
      if (addButton) addButton.click();
    } else if (currentPath.includes('/payments')) {
      const addButton = document.querySelector('[data-testid="add-payment-btn"]');
      if (addButton) addButton.click();
    }
    // Adicionar mais conforme necessário
  }, []);

  const quickSave = useCallback(() => {
    // Procurar botão de save aberto
    const saveButtons = document.querySelectorAll('[data-testid="save-member-btn"], [data-testid="save-payment-btn"], button[type="submit"]');
    const visibleSaveButton = Array.from(saveButtons).find(btn => 
      btn.offsetParent !== null && !btn.disabled
    );
    
    if (visibleSaveButton) {
      visibleSaveButton.click();
    }
  }, []);

  const focusSearch = useCallback(() => {
    // Focar no campo de pesquisa da página atual
    const searchInputs = document.querySelectorAll(
      '[data-testid="members-search"], [data-testid="member-search"], input[placeholder*="search"], input[placeholder*="procur"]'
    );
    
    const visibleInput = Array.from(searchInputs).find(input => 
      input.offsetParent !== null
    );
    
    if (visibleInput) {
      visibleInput.focus();
      visibleInput.select();
    }
  }, []);

  const closeModals = useCallback(() => {
    // Fechar modais abertos
    const closeButtons = document.querySelectorAll('[aria-label="Close"], button[aria-label="close"], .modal-close');
    closeButtons.forEach(btn => {
      if (btn.offsetParent !== null) btn.click();
    });
    
    // Fechar command palette
    setCommandPaletteOpen(false);
    setSearchMode(false);
  }, []);

  const toggleDebugMode = useCallback(() => {
    const currentDebugState = localStorage.getItem('ko-gym-debug') === 'true';
    localStorage.setItem('ko-gym-debug', (!currentDebugState).toString());
    
    // Mostrar toast
    const debugStatus = !currentDebugState ? 'ativado' : 'desativado';
    console.log(`🐛 Debug mode ${debugStatus}`);
    
    // Adicionar classe de debug ao body
    if (!currentDebugState) {
      document.body.classList.add('debug-mode');
    } else {
      document.body.classList.remove('debug-mode');
    }
  }, []);

  const clearCache = useCallback(async () => {
    try {
      // Clear browser cache
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.unregister();
        
        // Clear caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }
      
      // Clear localStorage (exceto auth)
      const authToken = localStorage.getItem('token');
      localStorage.clear();
      if (authToken) localStorage.setItem('token', authToken);
      
      console.log('🗑️ Cache cleared successfully');
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
    }
  }, []);

  const forceRefresh = useCallback(() => {
    window.location.reload(true);
  }, []);

  const showInstallPrompt = useCallback(() => {
    // Mostrar prompt de instalação PWA
    const installEvent = window.deferredPrompt;
    if (installEvent) {
      installEvent.prompt();
      installEvent.userChoice.then((choiceResult) => {
        console.log('PWA install choice:', choiceResult.outcome);
        window.deferredPrompt = null;
      });
    } else {
      console.log('PWA já está instalado ou não disponível');
    }
  }, []);

  const toggleOfflineMode = useCallback(() => {
    // Simular modo offline para testes
    const isOffline = navigator.onLine;
    if (isOffline) {
      console.log('📴 Simulando modo offline...');
      window.dispatchEvent(new Event('offline'));
    } else {
      console.log('📶 Voltando online...');
      window.dispatchEvent(new Event('online'));
    }
  }, []);

  const showAnalytics = useCallback(() => {
    // Abrir analytics em nova aba ou modal
    navigate('/analytics');
  }, [navigate]);

  const showSystemStatus = useCallback(async () => {
    try {
      // Fazer request para system status
      const response = await fetch('/api/system/status');
      const status = await response.json();
      
      console.group('🔧 KO Gym System Status');
      console.log('Version:', status.version);
      console.log('Cache:', status.cache);
      console.log('Database:', status.database);
      console.log('Analytics:', status.analytics);
      console.log('Firebase:', status.firebase);
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ Failed to get system status:', error);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    // Trigger dark mode toggle via custom event
    const toggleEvent = new CustomEvent('ko-gym-toggle-theme');
    window.dispatchEvent(toggleEvent);
    
    console.log('🎨 Theme toggled via keyboard shortcut');
  }, []);

  // Handler principal de teclado
  const handleKeyDown = useCallback((event) => {
    // Ignorar se estiver em input/textarea (exceto atalhos específicos)
    const activeElement = document.activeElement;
    const isInputFocused = activeElement && (
      activeElement.tagName === 'INPUT' || 
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    );

    // Criar chave do atalho
    const key = [
      event.ctrlKey && 'ctrl',
      event.shiftKey && 'shift', 
      event.altKey && 'alt',
      event.key.toLowerCase()
    ].filter(Boolean).join('+');

    // Atalhos que funcionam sempre
    const globalShortcuts = ['ctrl+k', 'escape', 'ctrl+shift+d', 'ctrl+shift+c', 'ctrl+shift+r'];
    
    if (globalShortcuts.includes(key) || !isInputFocused) {
      const shortcutFunction = shortcuts[key];
      
      if (shortcutFunction) {
        event.preventDefault();
        event.stopPropagation();
        shortcutFunction();
      }
    }
  }, [shortcuts]);

  // Registrar event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Command Palette commands
  const commands = [
    { id: 'dashboard', name: 'Ir para Dashboard', key: 'Ctrl+D', action: () => navigate('/dashboard') },
    { id: 'members', name: 'Gestão de Membros', key: 'Ctrl+M', action: () => navigate('/members') },
    { id: 'attendance', name: 'Presenças', key: 'Ctrl+A', action: () => navigate('/attendance') },
    { id: 'payments', name: 'Pagamentos', key: 'Ctrl+P', action: () => navigate('/payments') },
    { id: 'reports', name: 'Relatórios', key: 'Ctrl+R', action: () => navigate('/reports') },
    { id: 'inventory', name: 'Inventário', key: 'Ctrl+I', action: () => navigate('/inventory') },
    { id: 'users', name: 'Utilizadores', key: 'Ctrl+U', action: () => navigate('/users') },
    { id: 'new', name: 'Criar Novo', key: 'Ctrl+N', action: createNew },
    { id: 'save', name: 'Guardar', key: 'Ctrl+S', action: quickSave },
    { id: 'search', name: 'Procurar', key: 'Ctrl+F', action: focusSearch },
    { id: 'install', name: 'Instalar App', key: 'Ctrl+Shift+I', action: showInstallPrompt },
    { id: 'analytics', name: 'Analytics', key: 'Ctrl+Shift+A', action: showAnalytics },
    { id: 'status', name: 'Status do Sistema', key: 'Ctrl+Shift+S', action: showSystemStatus },
    { id: 'theme', name: 'Alternar Tema', key: 'Ctrl+Shift+T', action: toggleTheme },
    { id: 'debug', name: 'Toggle Debug', key: 'Ctrl+Shift+D', action: toggleDebugMode },
    { id: 'clear', name: 'Limpar Cache', key: 'Ctrl+Shift+C', action: clearCache },
    { id: 'refresh', name: 'Refresh Forçado', key: 'Ctrl+Shift+R', action: forceRefresh }
  ];

  return {
    commandPaletteOpen,
    setCommandPaletteOpen,
    searchMode,
    setSearchMode,
    commands,
    shortcuts: Object.keys(shortcuts)
  };
};

export default useKeyboardShortcuts;