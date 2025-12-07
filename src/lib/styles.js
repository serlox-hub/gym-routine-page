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

  // Acentos
  accent: '#58a6ff',
  success: '#3fb950',
  warning: '#d29922',
  danger: '#f85149',
  purple: '#a371f7',
  teal: '#88c6be',
  pink: '#db61a2',
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
  backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
