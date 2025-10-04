import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor } from 'lucide-react';

/**
 * KO Gym - PWA Install Prompt Premium
 * Prompt inteligente para instalação da aplicação
 */

const PWAInstallPrompt = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Detectar plataforma
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    setIsIOS(/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream);
    setIsAndroid(/android/i.test(userAgent));

    // Listener para beforeinstallprompt (Chrome/Edge)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      
      // Mostrar prompt apenas se não foi instalado e não foi recusado recentemente
      const lastDismissed = localStorage.getItem('ko-gym-install-dismissed');
      const daysSinceDismissed = lastDismissed ? 
        (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24) : 999;
      
      if (daysSinceDismissed > 7) { // Mostrar novamente após 7 dias
        setShowPrompt(true);
      }
    };

    // Listener para appinstalled
    const handleAppInstalled = () => {
      console.log('✅ KO Gym PWA instalada com sucesso');
      setShowPrompt(false);
      setInstallPrompt(null);
      localStorage.removeItem('ko-gym-install-dismissed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      console.log(`PWA install prompt outcome: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
      } else {
        console.log('❌ User dismissed the install prompt');
        localStorage.setItem('ko-gym-install-dismissed', Date.now().toString());
      }
      
      setShowPrompt(false);
      setInstallPrompt(null);
      
    } catch (error) {
      console.error('❌ Error during PWA installation:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ko-gym-install-dismissed', Date.now().toString());
  };

  const getInstallInstructions = () => {
    if (isIOS) {
      return {
        title: 'Instalar no iOS',
        steps: [
          'Toque no ícone de partilha (quadrado com seta)',
          'Role para baixo e toque em "Adicionar ao Ecrã Principal"',
          'Toque em "Adicionar" para confirmar'
        ],
        icon: <Smartphone className="w-8 h-8" />
      };
    } else if (isAndroid) {
      return {
        title: 'Instalar no Android',
        steps: [
          'Toque no menu (3 pontos) do navegador',
          'Selecione "Adicionar ao ecrã principal"',
          'Toque em "Adicionar" para confirmar'
        ],
        icon: <Smartphone className="w-8 h-8" />
      };
    } else {
      return {
        title: 'Instalar no Computador',
        steps: [
          'Clique no ícone de instalação na barra de endereços',
          'Ou use Ctrl+Shift+I',
          'Clique em "Instalar" para confirmar'
        ],
        icon: <Monitor className="w-8 h-8" />
      };
    }
  };

  // Não mostrar se PWA já está instalada
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return null;
  }

  if (!showPrompt) return null;

  const instructions = getInstallInstructions();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:max-w-sm">
      <div 
        className="rounded-lg shadow-2xl p-4"
        style={{ 
          background: 'var(--gradient-card-bg)',
          border: '2px solid var(--ko-primary-orange)',
          boxShadow: 'var(--shadow-xl)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {instructions.icon}
            <div>
              <h3 className="font-bold ko-text-primary">Instalar KO Gym</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Acesso rápido e offline
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full hover:bg-opacity-20"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Benefits */}
        <div className="mb-4">
          <ul className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full ko-bg-primary"></span>
              <span>Funciona offline</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full ko-bg-primary"></span>
              <span>Acesso rápido no desktop</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full ko-bg-primary"></span>
              <span>Notificações push</span>
            </li>
            <li className="flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full ko-bg-primary"></span>
              <span>Performance otimizada</span>
            </li>
          </ul>
        </div>

        {/* Install Button */}
        {installPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ko-hover-primary"
            style={{ backgroundColor: 'var(--button-primary-bg)', color: 'white' }}
          >
            <Download className="w-5 h-5" />
            <span>Instalar Agora</span>
          </button>
        ) : (
          <div>
            <p className="text-sm mb-2 font-medium" style={{ color: 'var(--text-primary)' }}>
              {instructions.title}:
            </p>
            <ol className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
              {instructions.steps.map((step, index) => (
                <li key={index} className="flex">
                  <span className="mr-2 font-medium ko-text-primary">{index + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer */}
        <div className="mt-3 pt-3 border-t text-xs text-center" style={{ borderColor: 'var(--border-light)', color: 'var(--text-muted)' }}>
          Ou use <kbd className="px-1 rounded" style={{ backgroundColor: 'var(--ko-neutral-100)' }}>Ctrl+Shift+I</kbd> para instalar
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;