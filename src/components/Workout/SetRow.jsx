import { useState, useEffect } from 'react'
import useWorkoutStore from '../../stores/workoutStore.js'
import ExecutionTimer from './ExecutionTimer.jsx'

function SetRow({ setNumber, routineExerciseId, exerciseId, measurementType = 'weight_reps', defaultWeightUnit = 'kg', descansoSeg, previousSet, onComplete, onUncomplete, canRemove = false, onRemove }) {
  const isCompleted = useWorkoutStore(state => state.isSetCompleted(routineExerciseId, setNumber))
  const setData = useWorkoutStore(state => state.getSetData(routineExerciseId, setNumber))

  const [weight, setWeight] = useState(setData?.weight ?? 0)
  const [reps, setReps] = useState(setData?.repsCompleted ?? 0)
  const [time, setTime] = useState(setData?.timeSeconds ?? 0)
  const [distance, setDistance] = useState(setData?.distanceMeters ?? 0)

  // Cargar valores de sesión anterior cuando lleguen
  useEffect(() => {
    if (previousSet && !setData) {
      if (previousSet.weight) setWeight(previousSet.weight)
      if (previousSet.reps) setReps(previousSet.reps)
      if (previousSet.timeSeconds) setTime(previousSet.timeSeconds)
      if (previousSet.distanceMeters) setDistance(previousSet.distanceMeters)
    }
  }, [previousSet, setData])

  const handleNumberChange = (setter) => (e) => {
    const value = e.target.value === '' ? 0 : Math.max(0, Number(e.target.value))
    setter(value)
  }

  const handleComplete = () => {
    const data = {
      routineExerciseId,
      exerciseId,
      setNumber,
    }

    switch (measurementType) {
      case 'weight_reps':
        if (!weight || !reps) return
        data.weight = parseFloat(weight)
        data.weightUnit = defaultWeightUnit
        data.repsCompleted = parseInt(reps)
        break
      case 'reps_only':
      case 'reps_per_side':
        if (!reps) return
        data.repsCompleted = parseInt(reps)
        break
      case 'time':
      case 'time_per_side':
        if (!time) return
        data.timeSeconds = parseInt(time)
        break
      case 'distance':
        if (!distance) return
        data.distanceMeters = parseFloat(distance)
        // Farmer's walk también puede tener peso
        if (weight) {
          data.weight = parseFloat(weight)
          data.weightUnit = defaultWeightUnit
        }
        break
    }

    onComplete(data, descansoSeg)
  }

  const isValid = () => {
    switch (measurementType) {
      case 'weight_reps':
        return weight && reps
      case 'reps_only':
      case 'reps_per_side':
        return !!reps
      case 'time':
      case 'time_per_side':
        return !!time
      case 'distance':
        return !!distance
      default:
        return false
    }
  }

  const renderInputs = () => {
    const inputStyle = {
      backgroundColor: '#161b22',
      border: '1px solid #30363d',
      color: '#e6edf3',
    }

    switch (measurementType) {
      case 'weight_reps':
        return (
          <>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={weight}
                onChange={handleNumberChange(setWeight)}
                disabled={isCompleted}
                className="w-16 px-2 py-1 rounded text-center text-sm"
                style={inputStyle}
              />
              <span className="text-xs text-muted">{defaultWeightUnit}</span>
            </div>
            <span className="text-secondary text-sm">×</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={reps}
                onChange={handleNumberChange(setReps)}
                disabled={isCompleted}
                className="w-16 px-2 py-1 rounded text-center text-sm"
                style={inputStyle}
              />
              <span className="text-xs text-muted">reps</span>
            </div>
          </>
        )

      case 'reps_only':
        return (
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={reps}
              onChange={handleNumberChange(setReps)}
              disabled={isCompleted}
              className="w-20 px-2 py-1 rounded text-center text-sm"
              style={inputStyle}
            />
            <span className="text-xs text-muted">reps</span>
          </div>
        )

      case 'reps_per_side':
        return (
          <div className="flex items-center gap-1">
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={reps}
              onChange={handleNumberChange(setReps)}
              disabled={isCompleted}
              className="w-20 px-2 py-1 rounded text-center text-sm"
              style={inputStyle}
            />
            <span className="text-xs text-muted">reps/lado</span>
          </div>
        )

      case 'time':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={time}
                onChange={handleNumberChange(setTime)}
                disabled={isCompleted}
                className="w-16 px-2 py-1 rounded text-center text-sm"
                style={inputStyle}
              />
              <span className="text-xs text-muted">seg</span>
            </div>
            {!isCompleted && <ExecutionTimer seconds={time} />}
          </div>
        )

      case 'time_per_side':
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={time}
                onChange={handleNumberChange(setTime)}
                disabled={isCompleted}
                className="w-16 px-2 py-1 rounded text-center text-sm"
                style={inputStyle}
              />
              <span className="text-xs text-muted">seg/lado</span>
            </div>
            {!isCompleted && <ExecutionTimer seconds={time} />}
          </div>
        )

      case 'distance':
        return (
          <>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="decimal"
                min="0"
                value={weight}
                onChange={handleNumberChange(setWeight)}
                disabled={isCompleted}
                className="w-14 px-2 py-1 rounded text-center text-sm"
                style={inputStyle}
              />
              <span className="text-xs text-muted">{defaultWeightUnit}</span>
            </div>
            <span className="text-secondary text-sm">×</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                inputMode="numeric"
                min="0"
                value={distance}
                onChange={handleNumberChange(setDistance)}
                disabled={isCompleted}
                className="w-14 px-2 py-1 rounded text-center text-sm"
                style={inputStyle}
              />
              <span className="text-xs text-muted">m</span>
            </div>
          </>
        )

      default:
        return null
    }
  }

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded"
      style={{
        backgroundColor: isCompleted ? 'rgba(63, 185, 80, 0.1)' : '#21262d',
        borderLeft: isCompleted ? '3px solid #3fb950' : '3px solid transparent',
      }}
    >
      <span
        className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold"
        style={{
          backgroundColor: isCompleted ? '#3fb950' : '#30363d',
          color: isCompleted ? '#0d1117' : '#8b949e',
        }}
      >
        {setNumber}
      </span>

      <div className="flex items-center gap-2 flex-1">
        {renderInputs()}
      </div>

      <button
        onClick={isCompleted ? () => onUncomplete({ routineExerciseId, setNumber }) : handleComplete}
        disabled={!isCompleted && !isValid()}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
        style={{
          backgroundColor: isCompleted ? '#3fb950' : '#30363d',
          color: isCompleted ? '#0d1117' : isValid() ? '#3fb950' : '#484f58',
          cursor: (!isCompleted && !isValid()) ? 'default' : 'pointer',
          opacity: (!isCompleted && !isValid()) ? 0.5 : 1,
        }}
        title={isCompleted ? 'Desmarcar serie' : 'Completar serie'}
      >
        {isCompleted ? '✕' : '✓'}
      </button>

      {canRemove && !isCompleted && onRemove && (
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
          style={{
            backgroundColor: '#21262d',
            color: '#f85149',
          }}
          title="Eliminar serie"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default SetRow
