import { useTranslation } from 'react-i18next'
import { BookOpen, ChevronDown } from 'lucide-react'
import { colors } from '../../lib/styles.js'

/**
 * Entrada al panel de instrucciones del ejercicio (issue #39).
 *
 * Va CERRADA por defecto: abrirla sola mete ~400-500px (GIF + instrucciones) por delante de la
 * primera serie y entrenando deja la cabecera del ejercicio fuera de pantalla. El problema real
 * era que la barra no delataba lo que esconde, así que se resuelve aquí y no cambiando el
 * default: dice "Instrucciones y consejos" (no "Notas", que en esta app son las TUYAS) y lleva
 * borde propio para leerse como control y no como etiqueta. Ver docs/DECISIONS.md.
 */
function NotesToggleBar({ showNotes, onToggle }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onToggle}
      // Abierta, la barra es la cabecera del panel de notas: comparte fondo (`bgAlt`) con él y
      // pierde las esquinas de abajo para que se lean como UNA superficie, sin hueco entre medias.
      // Cerrada vuelve a ser una píldora suelta. Ver ExerciseCardNotes.
      className={`w-full flex items-center gap-2 px-3 py-3 hover:opacity-90 ${showNotes ? 'rounded-t-lg' : 'rounded-lg'}`}
      style={{
        backgroundColor: colors.bgAlt,
        border: `1px solid ${showNotes ? 'transparent' : colors.border}`,
        cursor: 'pointer',
      }}
    >
      <BookOpen size={16} color={colors.textPrimary} />
      <span className="flex-1 text-left" style={{ color: colors.textPrimary, fontSize: 13, fontWeight: 600 }}>
        {t('exercise:notesAndCues')}
      </span>
      <ChevronDown
        size={16}
        color={colors.textSecondary}
        style={{ transform: showNotes ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
      />
    </button>
  )
}

export default NotesToggleBar
