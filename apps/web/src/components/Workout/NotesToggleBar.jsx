import { useTranslation } from 'react-i18next'
import { FileText, ChevronDown } from 'lucide-react'
import { colors } from '../../lib/styles.js'

function NotesToggleBar({ showNotes, onToggle }) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 rounded-lg px-3 py-2.5 hover:opacity-90"
      style={{ backgroundColor: colors.bgAlt, border: 'none', cursor: 'pointer' }}
    >
      <FileText size={14} color={colors.textSecondary} />
      <span className="flex-1 text-left" style={{ color: colors.textSecondary, fontSize: 13, fontWeight: 500 }}>
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
