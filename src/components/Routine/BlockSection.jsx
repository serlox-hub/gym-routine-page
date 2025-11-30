import ExerciseCard from './ExerciseCard.jsx'

function BlockSection({ block }) {
  const { nombre, duracion_min, routine_exercises } = block

  return (
    <section className="space-y-3">
      <div
        className="flex items-center justify-between px-3 py-2 rounded border-l-4"
        style={{
          backgroundColor: '#21262d',
          borderLeftColor: '#a371f7'
        }}
      >
        <div className="flex items-center gap-2">
          <h3
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: '#a371f7' }}
          >
            {nombre}
          </h3>
          <span className="text-xs text-muted">
            ({routine_exercises.length})
          </span>
        </div>
        {duracion_min && (
          <span className="text-xs text-muted">{duracion_min} min</span>
        )}
      </div>
      <div className="space-y-2">
        {routine_exercises.map(routineExercise => (
          <ExerciseCard
            key={routineExercise.id}
            routineExercise={routineExercise}
          />
        ))}
      </div>
    </section>
  )
}

export default BlockSection
