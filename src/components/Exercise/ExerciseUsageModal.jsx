import { X, Dumbbell, Calendar } from 'lucide-react'
import { Modal, LoadingSpinner, ErrorMessage } from '../ui/index.js'
import { useExerciseUsageDetail } from '../../hooks/useExercises.js'
import { formatShortDate } from '../../lib/dateUtils.js'

function ExerciseUsageModal({ exercise, onClose }) {
  const { data, isLoading, error } = useExerciseUsageDetail(exercise?.id)

  return (
    <Modal
      isOpen={!!exercise}
      onClose={onClose}
      position="bottom"
      maxWidth="max-w-lg"
      className="max-h-[80vh] flex flex-col"
      noBorder
    >
      <div className="flex items-center justify-between p-4 border-b border-[#30363d]">
        <h2 className="text-base font-semibold" style={{ color: '#e6edf3' }}>
          {exercise?.name}
        </h2>
        <button onClick={onClose} className="text-secondary p-1">
          <X size={20} />
        </button>
      </div>

      <div className="overflow-y-auto p-4 space-y-5">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message="No se pudieron cargar los datos" />
        ) : (
          <>
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Dumbbell size={16} className="text-secondary" />
                <h3 className="text-sm font-medium" style={{ color: '#e6edf3' }}>Rutinas</h3>
              </div>
              {data?.routines?.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.routines.map(r => (
                    <li key={`${r.routineId}-${r.dayName}`} className="text-sm text-secondary">
                      <span style={{ color: '#e6edf3' }}>{r.routineName}</span>
                      {' · '}
                      {r.dayName}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secondary">No está en ninguna rutina</p>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} className="text-secondary" />
                <h3 className="text-sm font-medium" style={{ color: '#e6edf3' }}>Últimas sesiones</h3>
              </div>
              {data?.sessions?.length > 0 ? (
                <ul className="space-y-1.5">
                  {data.sessions.slice(0, 20).map(s => (
                    <li key={s.sessionId} className="text-sm text-secondary">
                      <span style={{ color: '#e6edf3' }}>{formatShortDate(s.date)}</span>
                      {s.routineName && ` · ${s.routineName}`}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-secondary">Sin registros</p>
              )}
            </section>
          </>
        )}
      </div>
    </Modal>
  )
}

export default ExerciseUsageModal
