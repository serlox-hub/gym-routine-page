import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Pin } from 'lucide-react'
import { useRoutines } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage } from '../components/ui/index.js'
import { RoutineCard } from '../components/Routine/index.js'
import { NewRoutineFlow } from '../components/Home/index.js'
import { colors } from '../lib/styles.js'

function Routines() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { data: routines, isLoading, error } = useRoutines()
  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)

  useEffect(() => {
    if (location.state?.openNewRoutine) {
      setShowNewRoutineModal(true)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  const pinnedRoutine = routines?.find(r => r.is_favorite)
  const otherRoutines = routines?.filter(r => !r.is_favorite) || []

  return (
    <div className="px-6 pt-4 pb-20 max-w-2xl mx-auto flex flex-col gap-3">

      {/* Pinned to Home section */}
      {pinnedRoutine && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-1.5">
            <Pin size={14} style={{ color: colors.success }} />
            <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>
              {t('common:home.pinnedToHome')}
            </span>
          </div>
          <RoutineCard
            routine={pinnedRoutine}
            isPinned
            onClick={() => navigate(`/routine/${pinnedRoutine.id}`)}
          />
        </div>
      )}

      {/* All Routines section */}
      <div className="flex flex-col gap-3">
        <span style={{ color: colors.textSecondary, fontSize: 12, fontWeight: 600 }}>
          {t('routine:allRoutines')}
        </span>

        {/* New Routine button */}
        <div
          className="flex items-center justify-center gap-2 cursor-pointer transition-colors"
          style={{
            borderRadius: 16,
            border: `1px dashed ${colors.border}`,
            height: 48,
            color: colors.textSecondary,
          }}
          onClick={() => setShowNewRoutineModal(true)}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.bgHover}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
        >
          <Plus size={18} style={{ color: colors.success }} />
          <span style={{ fontSize: 14, fontWeight: 600 }}>
            {t('routine:new')}
          </span>
        </div>

        {/* Routine cards */}
        {otherRoutines.map(routine => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onClick={() => navigate(`/routine/${routine.id}`)}
          />
        ))}
      </div>

      <NewRoutineFlow
        isOpen={showNewRoutineModal}
        onClose={() => setShowNewRoutineModal(false)}
      />
    </div>
  )
}

export default Routines
