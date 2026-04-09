// RGB base para derivar variantes con alpha
export const RGB_ACCENT = '0, 212, 255'
export const RGB_PURPLE = '124, 92, 252'

// Gradientes reutilizables
export const gradients = {
  lime: ['#BEFF00', '#4ADE80'],
  orange: ['#FF6B35', '#FFAA6B'],
}

// Design tokens (Pencil specs)
export const design = {
  // Tab bar
  tabBarHeight: 62,
  tabBarRadius: 36,
  tabBarPadding: 4,
  tabPillRadius: 26,
  tabFontSize: 9,
  tabLetterSpacing: 1,

  // Streak card
  streakTitleSize: 18,
  progressLabelSize: 28,
  progressBarHeight: 8,
  chartHeight: { web: 120, native: 90 },
  barRadius: 6,

  // Icon backgrounds
  iconBgSize: 48,
  iconBgRadius: 14,
  iconSize: 22,

  // Typography
  greetingSize: 14,
  userNameSize: 26,
  sectionTitleSize: 20,
  cardTitleSize: 15,
  cardMetaSize: 12,
  statValueSize: { primary: 18, large: 22 },
  labelSize: 11,

  // Animation
  slideAnimDuration: 150,
  swipeThreshold: 60,
}

export const colors = {
  // Fondos
  bgPrimary: '#0A0A0F',
  bgSecondary: '#14141F',
  bgAlt: '#1C1C2E',
  bgTertiary: '#1E1E30',
  bgHover: 'rgba(255, 255, 255, 0.05)',
  border: '#2A2A42',
  borderSubtle: '#22223A',

  // Texto
  textPrimary: '#FFFFFF',
  textSecondary: '#8888A4',
  textMuted: '#55556A',
  textLight: '#c9d1d9',
  textDisabled: '#484f58',
  white: '#ffffff',
  black: '#000000',

  // Acentos
  accent: '#00D4FF',
  accentHover: '#33DFFF',
  success: '#BEFF00',
  warning: '#d29922',
  danger: '#f85149',
  purple: '#7C5CFC',
  purpleAccent: '#7C5CFC',
  teal: '#88c6be',
  pink: '#db61a2',
  orange: '#FF6B35',
  actionPrimary: '#BEFF00',
  textDark: '#0A0A0F',

  // Fondos semánticos (alpha)
  accentBg: 'rgba(0, 212, 255, 0.15)',
  accentBgSubtle: 'rgba(0, 212, 255, 0.1)',
  purpleBg: 'rgba(124, 92, 252, 0.15)',
  purpleAccentBg: 'rgba(124, 92, 252, 0.2)',
  successBg: 'rgba(190, 255, 0, 0.12)',
  warningBg: 'rgba(210, 153, 34, 0.15)',
  orangeBg: 'rgba(255, 107, 53, 0.15)',
  dangerBg: 'rgba(248, 81, 73, 0.1)',
  actionPrimaryBg: 'rgba(190, 255, 0, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.85)',
}

// Estilos reutilizables para elementos de formulario
export const inputStyle = {
  backgroundColor: colors.bgTertiary,
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
}

export const selectStyle = {
  ...inputStyle,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%238b949e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: '40px',
}

// Estilos para botones secundarios
export const buttonSecondaryStyle = {
  backgroundColor: colors.bgTertiary,
  color: colors.textSecondary,
}

// Estilos para modales
export const modalOverlayStyle = {
  backgroundColor: colors.overlay,
}

export const modalContentStyle = {
  backgroundColor: colors.bgSecondary,
}

// Estilos para cards
export const cardStyle = {
  backgroundColor: colors.bgSecondary,
  border: `1px solid ${colors.border}`,
}

// Estilos para menús desplegables
export const menuStyle = {
  backgroundColor: colors.bgTertiary,
  border: `1px solid ${colors.border}`,
}
