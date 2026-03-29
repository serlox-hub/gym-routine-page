import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Plus, Star } from 'lucide-react'
import { useSetFavoriteRoutine } from '../../hooks/useRoutines.js'
import { Card, TruncatedText } from '../ui/index.js'
import { colors } from '../../lib/styles.js'

function RoutineList({ routines, onNewRoutine }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const setFavoriteMutation = useSetFavoriteRoutine()

  return (
    <main>
      <h2 className="text-sm font-medium mb-3" style={{ color: colors.textSecondary }}>{t('routine:myRoutines')}</h2>
      <ul className="space-y-2">
        <li>
          <Card
            className="p-3 border-dashed"
            onClick={onNewRoutine}
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
                      isFavorite: !routine.is_favorite
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
    </main>
  )
}

export default RoutineList
