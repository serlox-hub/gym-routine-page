import { useTranslation } from 'react-i18next'
import { SET_TYPES } from '@gym/shared'
import { colors } from '../../lib/styles.js'

// Number of a set already done, or «D» if it was a dropset; a PR wins the colour. The one mark of
// the exercise history and of History's session detail, so they cannot drift apart again (#197).
// The «D» shows whatever `show_set_type` says: that preference hides the marking, not the history.
function SetNumberMark({ setNumber, setType, isPR = false, className, style }) {
  const { t } = useTranslation()
  const isDropset = setType === SET_TYPES.DROPSET
  const color = isPR ? colors.warning : isDropset ? colors.orange : colors.textMuted

  return (
    <span className={className} style={{ color, fontSize: 12, fontWeight: isPR || isDropset ? 700 : 400, ...style }}>
      {isDropset ? t('workout:set.type.dropsetShort') : setNumber}
    </span>
  )
}

export default SetNumberMark
