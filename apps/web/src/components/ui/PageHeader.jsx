import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ChevronLeft } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { goBack } from '../../lib/historyBack.js'
import DropdownMenu from './DropdownMenu.jsx'
import IconButton from './IconButton.jsx'

function PageHeader({
  title,
  titleExtra,
  fallbackTo,
  onBack,
  menuItems,
  rightAction,
  children
}) {
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      goBack(navigate, fallbackTo)
    }
  }

  const showBack = fallbackTo || onBack

  return (
    <header
      className="sticky top-0 z-40 pb-4 -mx-4 px-4 pt-4 -mt-4"
      style={{ backgroundColor: colors.bgPrimary }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <IconButton
              icon={ChevronLeft}
              iconSize={20}
              color={colors.textPrimary}
              label={t('common:buttons.back')}
              onClick={handleBack}
            />
          )}
          <h1 className="text-xl font-bold truncate">{title}</h1>
          {titleExtra}
        </div>
        <div className="flex items-center gap-2">
          {rightAction}
          {menuItems && menuItems.length > 0 && (
            <DropdownMenu items={menuItems} />
          )}
        </div>
      </div>
      {children}
    </header>
  )
}

export default PageHeader
