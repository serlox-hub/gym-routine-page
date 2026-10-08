import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy } from 'lucide-react'
import { PROMPT_CATALOG_STATUS } from '@gym/shared'
import { LoadingSpinner } from '../ui/index.js'
import { colors, design } from '../../lib/styles.js'

// Copy button of the AI prompts. The prompt carries the exercise catalog (#159), so it copies only
// once the catalog has loaded: busy while it loads, blocked when it failed (pressing it retries and
// says why, inline, since this lives in a modal). On the solid lime only the content is dimmed:
// translucent lime turns olive.
function CopyPromptButton({ status, onCopy, onRetry }) {
  const { t } = useTranslation()
  const [showError, setShowError] = useState(false)
  const isLoading = status === PROMPT_CATALOG_STATUS.LOADING
  const isBlocked = status === PROMPT_CATALOG_STATUS.ERROR

  const handleClick = () => {
    if (!isBlocked) return onCopy()
    setShowError(true)
    onRetry()
  }

  return (
    <div className="flex flex-col gap-2">
      {isBlocked && showError && (
        <p className="text-xs" style={{ color: colors.danger }}>{t('routine:chatbot.catalogLoadError')}</p>
      )}
      <button onClick={handleClick} disabled={isLoading}
        className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 ${isBlocked ? 'cursor-pointer' : ''}`}
        style={{ backgroundColor: colors.success, color: colors.bgPrimary }}>
        <span className="flex items-center gap-2" style={isBlocked ? { opacity: design.blockedOpacity } : undefined}>
          {isLoading ? <LoadingSpinner inline /> : <Copy size={16} />}
          {t('routine:chatbot.copyPrompt')}
        </span>
      </button>
    </div>
  )
}

export default CopyPromptButton
