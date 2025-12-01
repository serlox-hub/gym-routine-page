import { Flame } from 'lucide-react'
import ExerciseCard from './ExerciseCard.jsx'
import { colors } from '../../lib/styles.js'

function BlockSection({ block }) {
  const { nombre, duracion_min, routine_exercises } = block
  const isWarmup = nombre.toLowerCase() === 'calentamiento'

  return (
    <section className="space-y-3">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg border-l-4"
        style={{
          backgroundColor: colors.bgTertiary,
          borderLeftColor: isWarmup ? colors.warning : colors.purple,
        }}
      >
        {isWarmup && <Flame size={16} style={{ color: colors.warning }} />}
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: isWarmup ? colors.warning : colors.purple }}
        >
          {nombre}
        </h3>
        <span className="text-xs" style={{ color: colors.textSecondary }}>
          ({routine_exercises.length})
        </span>
        {duracion_min && (
          <span className="text-xs ml-auto" style={{ color: colors.textSecondary }}>
            ~{duracion_min} min
          </span>
        )}
      </div>
      <div className="space-y-2">
        {routine_exercises.map(routineExercise => (
          <ExerciseCard
            key={routineExercise.id}
            routineExercise={routineExercise}
            isWarmup={isWarmup}
          />
        ))}
      </div>
    </section>
  )
}

export default BlockSection
