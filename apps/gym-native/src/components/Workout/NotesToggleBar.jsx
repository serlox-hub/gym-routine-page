import { View, Pressable, Text } from 'react-native'
import { useTranslation } from 'react-i18next'
import { BookOpen, ChevronDown } from 'lucide-react-native'
import { colors } from '../../lib/styles'

/**
 * Entrada al panel de instrucciones del ejercicio (issue #39).
 *
 * Va CERRADA por defecto: abrirla sola mete ~400-500px (GIF + instrucciones) por delante de la
 * primera serie y entrenando deja la cabecera del ejercicio fuera de pantalla. El problema real
 * era que la barra no delataba lo que esconde, así que se resuelve aquí y no cambiando el
 * default: dice "Instrucciones y consejos" (no "Notas", que en esta app son las TUYAS) y lleva
 * borde propio para leerse como control y no como etiqueta. Ver docs/DECISIONS.md.
 */
export default function NotesToggleBar({ showNotes, onToggle }) {
  const { t } = useTranslation()
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: colors.bgAlt,
        borderWidth: 1,
        borderColor: showNotes ? 'transparent' : colors.border,
        // Abierta, la barra es la cabecera del panel de notas: comparte fondo (`bgAlt`) con él y
        // pierde las esquinas de abajo para que se lean como UNA superficie, sin hueco entre
        // medias. Cerrada vuelve a ser una píldora suelta. Ver ExerciseCardNotes.
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottomLeftRadius: showNotes ? 0 : 8,
        borderBottomRightRadius: showNotes ? 0 : 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
      className="active:opacity-80"
    >
      <BookOpen size={16} color={colors.textPrimary} />
      <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: '600' }}>
        {t('exercise:notesAndCues')}
      </Text>
      <View style={{ transform: [{ rotate: showNotes ? '180deg' : '0deg' }] }}>
        <ChevronDown size={16} color={colors.textSecondary} />
      </View>
    </Pressable>
  )
}
