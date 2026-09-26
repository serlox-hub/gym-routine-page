export const gradients = {
  lime: ['#A8E600', '#4ADE80'],
  orange: ['#FF6B35', '#FFAA6B'],
}

// Design tokens (Pencil specs)
export const design = {
  // Tab bar
  tabBarHeight: 62,
  tabBarRadius: 36,
  tabBarPadding: 4,
  // Hueco total que ocupa la barra inferior (16 arriba + alto + 21 abajo). Lo que
  // flote sobre ella (toasts) tiene que dejarlo libre o queda debajo de la barra.
  tabBarFootprint: 99,
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

  // Gestos de fila (swipe para borrar de una tarjeta de ejercicio)
  // `gestureActivationDistance` nombra el 5 que ya se repetía en los RestTimer/ActiveSessionBanner
  // de NATIVE. En web no existe ese 5: el arrastre equivalente vive en `hooks/useDrag.js` y usa 3,
  // que es otro gesto (reposición libre) y no debe unificarse con este.
  // El borrado tiene umbral PROPIO en vez de reusar `swipeThreshold` (paginación del chart de
  // StreakCard): son gestos distintos, y compartir el número haría que afinar uno retunease el
  // otro en silencio. `swipeDeleteMaxTravel > swipeDeleteThreshold` es obligatorio: con el
  // recorrido por debajo del disparo la fila nunca podría llegar a borrarse.
  gestureActivationDistance: 5,
  swipeDeleteThreshold: 72,
  swipeDeleteMaxTravel: 96,

  // Arrastre para reordenar: distancia al borde del viewport a la que empieza el auto-scroll.
  // Solo se comparte la DISTANCIA, no la velocidad: dnd-kit acelera con un par umbral/aceleración
  // y el bucle de Reanimated avanza px por frame, así que igualar los números sería una parity
  // test que pasa mientras las dos plataformas se sienten distintas.
  dragAutoScrollEdge: 96,

  // Dragging an exercise at the edge of a superset (right after its last member): how far it must
  // be dragged horizontally to change depth (join, or leave if already a member). It is ONLY that
  // threshold, so it can be tuned on device freely: the preview does not shift the card by this
  // much, it paints it with the purple card's own side padding (`BlockSection`).
  supersetIndent: 12,

  // Tab bar
  tabContentPaddingBottom: 100,

  // Routine card
  routineCardRadius: 16,
  routineCardPadding: 16,
  routineCardGap: 14,
}

export const colors = {
  // Fondos
  bgPrimary: '#0A0A0F',
  bgSecondary: '#14141F',
  bgAlt: '#1C1C2E',
  bgTertiary: '#1E1E30',
  bgHover: 'rgba(255, 255, 255, 0.05)',
  // Superficie elevada MÁS floja que bgHover, para bloques en reposo que aun así deben tener
  // bordes propios (filas de serie pendientes): sin ella el bloque no se ve y su contenido flota.
  bgHoverSubtle: 'rgba(255, 255, 255, 0.03)',
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
  success: '#A8E600',
  warning: '#d29922',
  danger: '#f85149',
  purple: '#6B4AE8',
  purpleAccent: '#6B4AE8',
  teal: '#88c6be',
  pink: '#db61a2',
  orange: '#FF6B35',
  gold: '#F5B800',
  gifBg: '#F4F4F6', // panel claro para enmarcar GIFs de ejercicio, que vienen sobre fondo blanco (issue #6)
  actionPrimary: '#A8E600',
  textDark: '#0A0A0F',

  // Fondos semánticos (alpha)
  purpleBg: 'rgba(107, 74, 232, 0.15)',
  purpleAccentBg: 'rgba(107, 74, 232, 0.2)',
  successBg: 'rgba(168, 230, 0, 0.12)',
  successBgSubtle: 'rgba(168, 230, 0, 0.08)',
  warningBg: 'rgba(210, 153, 34, 0.15)',
  orangeBg: 'rgba(255, 107, 53, 0.15)',
  goldBg: 'rgba(245, 184, 0, 0.15)',
  dangerBg: 'rgba(248, 81, 73, 0.1)',
  actionPrimaryBg: 'rgba(168, 230, 0, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.85)',
  overlaySoft: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.4)', // color de sombras (boxShadow/shadowColor); alpha fijo → token semántico, no RGB_
  divider: 'rgba(255, 255, 255, 0.15)', // divisor translúcido sobre contenido (distinto de border/borderSubtle sólidos)
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
