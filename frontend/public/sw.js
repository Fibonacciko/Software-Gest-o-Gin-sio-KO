// KO Gym - Service Worker Premium
// Funcionalidade offline e cache inteligente

const CACHE_NAME = 'ko-gym-v2.0.0';
const STATIC_CACHE = 'ko-gym-static-v2.0.0';
const DYNAMIC_CACHE = 'ko-gym-dynamic-v2.0.0';

// Recursos essenciais para cache
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css', 
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// APIs que devem funcionar offline (com fallback)
const OFFLINE_FALLBACK_APIS = [
  '/api/dashboard',
  '/api/members',
  '/api/activities'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('🚀 KO Gym SW: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 KO Gym SW: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ KO Gym SW: Static cache complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ KO Gym SW: Cache failed', error);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('🎯 KO Gym SW: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ KO Gym SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ KO Gym SW: Activated');
        return self.clients.claim();
      })
  );
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorar requests não-GET ou de outros domínios
  if (request.method !== 'GET' || !url.origin.includes(location.origin.split('//')[1])) {
    return;
  }
  
  event.respondWith(
    handleRequest(request)
  );
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 1. Cache First - Para assets estáticos
    if (isStaticAsset(url.pathname)) {
      return await cacheFirst(request);
    }
    
    // 2. Network First com fallback - Para APIs
    if (isApiRequest(url.pathname)) {
      return await networkFirstWithFallback(request);
    }
    
    // 3. Stale While Revalidate - Para páginas
    return await staleWhileRevalidate(request);
    
  } catch (error) {
    console.error('🚫 KO Gym SW: Request failed', error);
    return await getOfflineFallback(request);
  }
}

// Strategy: Cache First (para assets estáticos)
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, networkResponse.clone());
  
  return networkResponse;
}

// Strategy: Network First com Fallback (para APIs)
async function networkFirstWithFallback(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('📱 KO Gym SW: Network failed, trying cache...');
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      // Adicionar header para indicar que é dados offline
      const response = cachedResponse.clone();
      response.headers.set('X-Served-By', 'KO-Gym-SW-Cache');
      return response;
    }
    
    // Fallback para APIs específicas
    return getApiFallback(request);
  }
}

// Strategy: Stale While Revalidate (para páginas)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Fetch em background (não esperamos)
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  // Retornar cache se disponível, senão esperar network
  return cachedResponse || fetchPromise;
}

// Verificar se é asset estático
function isStaticAsset(pathname) {
  return pathname.startsWith('/static/') || 
         pathname.startsWith('/icons/') ||
         pathname === '/manifest.json' ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.ico');
}

// Verificar se é request de API
function isApiRequest(pathname) {
  return pathname.startsWith('/api/');
}

// Fallback para quando está offline
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  if (isApiRequest(url.pathname)) {
    return getApiFallback(request);
  }
  
  // Fallback para páginas
  const cachedResponse = await caches.match('/');
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'Aplicação está offline. Algumas funcionalidades podem não estar disponíveis.'
    }),
    {
      status: 503,
      statusText: 'Service Unavailable',
      headers: {
        'Content-Type': 'application/json',
        'X-Served-By': 'KO-Gym-SW-Offline'
      }
    }
  );
}

// Fallback específico para APIs
function getApiFallback(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Dashboard fallback
  if (pathname.includes('/api/dashboard')) {
    return new Response(
      JSON.stringify({
        total_members: 0,
        active_members: 0,
        today_attendance: 0,
        offline: true,
        message: 'Dados offline - Reconecte para informações atualizadas'
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'KO-Gym-SW-Fallback'
        }
      }
    );
  }
  
  // Members fallback
  if (pathname.includes('/api/members')) {
    return new Response(
      JSON.stringify({
        offline: true,
        message: 'Lista de membros não disponível offline',
        cached_data: []
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'KO-Gym-SW-Fallback'
        }
      }
    );
  }
  
  // Activities fallback
  if (pathname.includes('/api/activities')) {
    return new Response(
      JSON.stringify([
        { id: 'offline-1', name: 'Boxe', color: '#B8651B', is_active: true },
        { id: 'offline-2', name: 'CrossFit', color: '#F4B942', is_active: true },
        { id: 'offline-3', name: 'Musculação', color: '#6B7280', is_active: true }
      ]),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Served-By': 'KO-Gym-SW-Fallback'
        }
      }
    );
  }
  
  // Generic API fallback
  return new Response(
    JSON.stringify({
      error: 'Offline',
      message: 'Esta funcionalidade requer conexão com internet'
    }),
    {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'X-Served-By': 'KO-Gym-SW-Fallback'
      }
    }
  );
}

// Background Sync para quando voltar online
self.addEventListener('sync', (event) => {
  console.log('🔄 KO Gym SW: Background sync triggered');
  
  if (event.tag === 'ko-gym-sync') {
    event.waitUntil(syncPendingData());
  }
});

async function syncPendingData() {
  try {
    // Aqui seria implementada a sincronização de dados pendentes
    console.log('📡 KO Gym SW: Syncing pending data...');
    
    // Exemplo: sincronizar check-ins offline, novos membros, etc.
    // Implementation would depend on what data needs to be synced
    
    console.log('✅ KO Gym SW: Sync completed');
  } catch (error) {
    console.error('❌ KO Gym SW: Sync failed', error);
  }
}

// Push Notifications (integração com Firebase)
self.addEventListener('push', (event) => {
  console.log('📢 KO Gym SW: Push notification received');
  
  if (!event.data) return;
  
  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'Nova mensagem do KO Gym',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      image: data.image,
      data: data.data || {},
      actions: [
        {
          action: 'view',
          title: 'Ver Mensagem',
          icon: '/icons/action-view.png'
        },
        {
          action: 'dismiss',
          title: 'Dispensar',
          icon: '/icons/action-dismiss.png'
        }
      ],
      tag: data.tag || 'ko-gym-notification',
      renotify: true,
      requireInteraction: data.urgent || false
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'KO Gym', options)
    );
    
  } catch (error) {
    console.error('❌ KO Gym SW: Push notification error', error);
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('👆 KO Gym SW: Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  } else if (event.action === 'dismiss') {
    // Just close, no action needed
    return;
  } else {
    // Default click - open app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (data && data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      status: 'active'
    });
  }
});