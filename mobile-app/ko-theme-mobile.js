// KO Gym Theme - Mobile App Colors
// Baseado no logo oficial do ginásio KO

export const KOTheme = {
  // Cores principais do logo (tons de laranja suaves)
  primary: {
    orange: '#B8651B',     // Laranja/âmbar principal do logo (texto KO)
    golden: '#F4B942',     // Dourado vibrante do logo (fundo central)
  },

  // Paleta de laranjas suaves (derivados do logo)
  orange: {
    50: '#FFF8F1',   // Muito claro
    100: '#FEECDC',  // Claro
    200: '#FED7AA',  // Suave
    300: '#FDBA74',  // Médio claro
    400: '#FB923C',  // Vibrante
    500: '#F97316',  // Forte
    600: '#EA580C',  // Escuro
    700: '#C2410C',  // Mais escuro
    800: '#9A3412',  // Muito escuro
    900: '#7C2D12',  // Profundo
  },

  // Paleta de âmbar/dourados (derivados do logo)
  amber: {
    50: '#FFFBEB',   // Muito claro
    100: '#FEF3C7',  // Claro
    200: '#FDE68A',  // Suave
    300: '#FCD34D',  // Médio
    400: '#FBBF24',  // Vibrante
    500: '#F59E0B',  // Forte
    600: '#D97706',  // Escuro
    700: '#B45309',  // Mais escuro
    800: '#92400E',  // Profundo
  },

  // Tons neutros quentes (harmonizam com vermelho/dourado)
  neutral: {
    50: '#FAF9F7',   // Bege muito claro
    100: '#F5F3F0',  // Bege claro
    200: '#E7E5E4',  // Bege suave
    300: '#D6D3D1',  // Bege médio
    400: '#A8A29E',  // Cinza quente
    500: '#78716C',  // Cinza médio
    600: '#57534E',  // Cinza escuro
    700: '#44403C',  // Cinza mais escuro
    800: '#292524',  // Cinza muito escuro
    900: '#1C1917',  // Quase preto quente
  },

  // Cores de sistema
  system: {
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    info: '#0EA5E9',
  },

  // Gradientes (inspirados no logo)
  gradients: {
    primary: ['#EA580C', '#9A3412'],      // Laranja
    golden: ['#FBBF24', '#D97706'],       // Dourado
    warm: ['#FFFBEB', '#FAF9F7'],         // Fundo quente
    logo: ['#F4B942', '#D97706'],         // Gradiente do logo
  },
};

// Tema React Native Paper
export const KOPaperTheme = {
  colors: {
    primary: KOTheme.primary.orange,
    accent: KOTheme.primary.golden,
    background: KOTheme.neutral[50],
    surface: '#FFFFFF',
    text: KOTheme.neutral[900],
    disabled: KOTheme.neutral[400],
    placeholder: KOTheme.neutral[500],
    backdrop: 'rgba(0, 0, 0, 0.5)',
    onSurface: KOTheme.neutral[800],
    notification: KOTheme.system.error,
  },
  roundness: 8,
};

// Exemplo de uso em React Native
export const KOStyles = {
  // Containers
  container: {
    flex: 1,
    backgroundColor: KOTheme.neutral[50],
  },

  // Botões
  primaryButton: {
    backgroundColor: KOTheme.primary.orange,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  secondaryButton: {
    backgroundColor: KOTheme.primary.golden,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  outlineButton: {
    borderColor: KOTheme.primary.orange,
    borderWidth: 2,
    backgroundColor: 'transparent',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: KOTheme.neutral[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Headers
  header: {
    backgroundColor: KOTheme.primary.orange,
    paddingVertical: 16,
  },

  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },

  // Text styles
  primaryText: {
    color: KOTheme.neutral[900],
    fontSize: 16,
  },

  secondaryText: {
    color: KOTheme.neutral[600],
    fontSize: 14,
  },

  mutedText: {
    color: KOTheme.neutral[500],
    fontSize: 12,
  },

  // Badges
  badge: {
    backgroundColor: KOTheme.primary.orange,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // QR Code screen
  qrContainer: {
    flex: 1,
    backgroundColor: KOTheme.neutral[900],
    justifyContent: 'center',
    alignItems: 'center',
  },

  qrCode: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
  },

  // Status indicators
  activeStatus: {
    backgroundColor: KOTheme.system.success,
  },

  inactiveStatus: {
    backgroundColor: KOTheme.neutral[400],
  },

  warningStatus: {
    backgroundColor: KOTheme.system.warning,
  },

  errorStatus: {
    backgroundColor: KOTheme.system.error,
  },
};

// Utilitários
export const KOUtils = {
  // Obter cor com opacidade
  withOpacity: (color, opacity) => `${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
  
  // Cores para atividades (baseadas na paleta KO)
  activityColors: [
    KOTheme.primary.orange,
    KOTheme.primary.golden,
    KOTheme.orange[600],
    KOTheme.amber[600],
    KOTheme.neutral[600],
    KOTheme.system.success,
  ],
};

export default KOTheme;