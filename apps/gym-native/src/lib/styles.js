// Colores del tema GitHub Dark
export const colors = {
  // Fondos
  bgPrimary: '#0d1117',
  bgSecondary: '#161b22',
  bgTertiary: '#21262d',
  border: '#30363d',

  // Texto
  textPrimary: '#e6edf3',
  textSecondary: '#8b949e',
  textMuted: '#6e7681',

  // Acentos
  accent: '#58a6ff',
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  purple: '#a371f7',
  teal: '#88c6be',
  pink: '#db61a2',

  // Tipos de serie
  dropset: '#f0883e',
  dropsetBg: 'rgba(240, 136, 62, 0.15)',

  // Fondos semanticos (alpha)
  warningBg: 'rgba(210, 153, 34, 0.15)',
  successBg: 'rgba(63, 185, 80, 0.15)',
  dangerBg: 'rgba(248, 81, 73, 0.1)',
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
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
