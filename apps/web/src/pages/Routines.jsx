import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Star } from 'lucide-react'
import { useRoutines, useSetFavoriteRoutine } from '../hooks/useRoutines.js'
import { LoadingSpinner, ErrorMessage, Card, TruncatedText } from '../components/ui/index.js'
import { NewRoutineFlow } from '../components/Home/index.js'
import { colors } from '../lib/styles.js'

function Routines() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { data: routines, isLoading, error } = useRoutines()
  const setFavoriteMutation = useSetFavoriteRoutine()
  const [showNewRoutineModal, setShowNewRoutineModal] = useState(false)

  useEffect(() => {
    if (location.state?.openNewRoutine) {
      setShowNewRoutineModal(true)
      window.history.replaceState({}, '')
    }
  }, [location.state])

  if (isLoading) return <LoadingSpinner />
  if (error) return <ErrorMessage message={error.message} className="m-4" />

  return (
    <div className="p-4 max-w-2xl mx-auto pb-20">
      <h1 className="text-xl font-bold mb-4" style={{ color: colors.textPrimary }}>
        {t('common:nav.routines')}
      </h1>

      <ul className="space-y-2">
        <li>
          <Card
            className="p-3 border-dashed"
            onClick={() => setShowNewRoutineModal(true)}
          >
            <div className="flex items-center gap-2 justify-center" style={{ color: colors.textSecondary }}>
              <Plus size={18} />
              <span className="text-sm">{t('routine:new')}</span>
            </div>
          </Card>
        </li>
        {routines?.map(routine => (
          <li key={routine.id}>
            <Card
              className="p-3"
              onClick={() => navigate(`/routine/${routine.id}`)}
            >
              <div className={`flex justify-between gap-3 ${routine.description || routine.goal ? 'items-start' : 'items-center'}`}>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm" style={{ color: colors.textPrimary }}>
                    {routine.name}
                  </h3>
                  {routine.description && (
                    <TruncatedText
                      text={routine.description}
                      className="text-xs mt-1"
                      style={{ color: colors.textSecondary }}
                    />
                  )}
                  {routine.goal && (
                    <p className="text-xs mt-1">
                      <span style={{ color: colors.success }}>{t('routine:goal')}:</span>{' '}
                      <span style={{ color: colors.textSecondary }}>{routine.goal}</span>
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFavoriteMutation.mutate({
                      routineId: routine.id,
                      isFavorite: !routine.is_favorite,
                    })
                  }}
                  className="p-1 rounded hover:opacity-80 shrink-0"
                >
                  <Star
                    size={18}
                    style={{ color: routine.is_favorite ? colors.warning : colors.textSecondary }}
                    fill={routine.is_favorite ? colors.warning : 'none'}
                  />
                </button>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <NewRoutineFlow
        isOpen={showNewRoutineModal}
        onClose={() => setShowNewRoutineModal(false)}
      />
    </div>
  )
}

export default Routines
