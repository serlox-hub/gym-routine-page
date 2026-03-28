// RGB base para derivar variantes con alpha
export const RGB_ACCENT = '88, 166, 255'
export const RGB_PURPLE = '163, 113, 247'

// Colores del tema GitHub Dark
export const colors = {
  // Fondos
  bgPrimary: '#0d1117',
  bgSecondary: '#161b22',
  bgAlt: '#1c2128',
  bgTertiary: '#21262d',
  bgHover: 'rgba(255, 255, 255, 0.05)',
  border: '#30363d',

  // Texto
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  textMuted: '#6e7681',
  textLight: '#c9d1d9',
  textDisabled: '#484f58',
  white: '#ffffff',
  black: '#000000',

  // Acentos
  accent: '#58a6ff',
  accentHover: '#79b8ff',
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  purple: '#a371f7',
  purpleAccent: '#8957e5',
  teal: '#88c6be',
  pink: '#db61a2',
  orange: '#f0883e',
  actionPrimary: '#238636',
  textDark: '#1f1f1f',

  // Fondos semánticos (alpha)
  accentBg: 'rgba(88, 166, 255, 0.15)',
  accentBgSubtle: 'rgba(88, 166, 255, 0.1)',
  purpleBg: 'rgba(163, 113, 247, 0.15)',
  purpleAccentBg: 'rgba(136, 87, 229, 0.15)',
  successBg: 'rgba(63, 185, 80, 0.15)',
  warningBg: 'rgba(210, 153, 34, 0.15)',
  orangeBg: 'rgba(240, 136, 62, 0.15)',
  dangerBg: 'rgba(248, 81, 73, 0.1)',
  actionPrimaryBg: 'rgba(35, 134, 54, 0.95)',
  overlay: 'rgba(0, 0, 0, 0.8)',
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
