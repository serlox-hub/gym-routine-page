import ExecutionTimer from './ExecutionTimer.jsx'

const inputStyle = {
  backgroundColor: '#161b22',
  border: '1px solid #30363d',
  color: '#e6edf3',
}

function NumberInput({ value, onChange, disabled, width = 'w-16', inputMode = 'numeric' }) {
  const handleChange = (e) => {
    const raw = e.target.value
    if (raw === '') {
      onChange('')
      return
    }
    const num = Number(raw)
    if (!isNaN(num) && num >= 0) {
      onChange(raw)
    }
  }

  return (
    <input
      type="number"
      inputMode={inputMode}
      min="0"
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={`${width} px-2 py-1 rounded text-center text-sm`}
      style={inputStyle}
    />
  )
}

export function WeightRepsInputs({ weight, setWeight, reps, setReps, weightUnit, disabled }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" />
        <span className="text-xs text-muted">{weightUnit}</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <NumberInput value={reps} onChange={setReps} disabled={disabled} />
        <span className="text-xs text-muted">reps</span>
      </div>
    </>
  )
}

export function RepsOnlyInputs({ reps, setReps, disabled, label = 'reps' }) {
  return (
    <div className="flex items-center gap-1">
      <NumberInput value={reps} onChange={setReps} disabled={disabled} width="w-20" />
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

export function TimeInputs({ time, setTime, disabled, label = 'seg', showTimer = true }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={time} onChange={setTime} disabled={disabled} />
        <span className="text-xs text-muted">{label}</span>
      </div>
      {showTimer && !disabled && <ExecutionTimer seconds={time} />}
    </div>
  )
}

export function DistanceInputs({ weight, setWeight, distance, setDistance, weightUnit, disabled }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} width="w-14" inputMode="decimal" />
        <span className="text-xs text-muted">{weightUnit}</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" />
        <span className="text-xs text-muted">m</span>
      </div>
    </>
  )
}
