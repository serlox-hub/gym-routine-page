import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import DropdownMenu from './DropdownMenu.jsx'

function PageHeader({
  title,
  titleExtra,
  backTo,
  onBack,
  menuItems,
  children
}) {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  const showBack = backTo || onBack

  return (
    <header
      className="sticky top-0 z-40 pb-4 -mx-4 px-4 pt-4 -mt-4"
      style={{ backgroundColor: colors.bgPrimary }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {showBack && (
            <button
              onClick={handleBack}
              className="p-1 -ml-1 rounded hover:opacity-80 shrink-0"
              style={{ color: colors.textSecondary }}
            >
              <ChevronLeft size={24} />
            </button>
          )}
          <h1 className="text-xl font-bold truncate">{title}</h1>
          {titleExtra}
        </div>
        {menuItems && menuItems.length > 0 && (
          <DropdownMenu items={menuItems} />
        )}
      </div>
      {children}
    </header>
  )
}

export default PageHeader
