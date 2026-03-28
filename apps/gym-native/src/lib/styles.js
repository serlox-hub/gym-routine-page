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

// Estilos reutilizables para React Native
export const inputStyle = {
  backgroundColor: colors.bgTertiary,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.textPrimary,
  borderRadius: 8,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 16,
}

export const buttonSecondaryStyle = {
  backgroundColor: colors.bgTertiary,
}

export const modalOverlayStyle = {
  backgroundColor: colors.overlay,
}

export const modalContentStyle = {
  backgroundColor: colors.bgSecondary,
  borderRadius: 12,
  padding: 20,
}

export const cardStyle = {
  backgroundColor: colors.bgSecondary,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: 12,
}
