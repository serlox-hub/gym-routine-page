import ExecutionTimer from './ExecutionTimer.jsx'
import { colors } from '../../lib/styles.js'

const inputStyle = {
  backgroundColor: colors.bgSecondary,
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
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

function MMSSInput({ totalSeconds, onChange, disabled }) {
  const total = Number(totalSeconds) || 0
  const mins = totalSeconds === '' ? '' : Math.floor(total / 60)
  const secs = totalSeconds === '' ? '' : total % 60

  const update = (m, s) => {
    const newMin = m === '' ? 0 : Math.max(0, parseInt(m) || 0)
    const newSec = s === '' ? 0 : Math.min(59, Math.max(0, parseInt(s) || 0))
    onChange(newMin * 60 + newSec)
  }

  return (
    <div className="flex items-center gap-0.5">
      <input
        type="number"
        inputMode="numeric"
        min="0"
        value={mins}
        onChange={(e) => update(e.target.value, secs)}
        disabled={disabled}
        placeholder="mm"
        className="w-10 px-1 py-1 rounded text-center text-sm"
        style={inputStyle}
      />
      <span className="text-xs text-muted font-bold">:</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="59"
        value={secs === '' ? '' : String(secs).padStart(2, '0')}
        onChange={(e) => update(mins, e.target.value)}
        disabled={disabled}
        placeholder="ss"
        className="w-10 px-1 py-1 rounded text-center text-sm"
        style={inputStyle}
      />
    </div>
  )
}

function TimeInput({ time, setTime, disabled, timeUnit = 's' }) {
  if (timeUnit === 'min') {
    return <MMSSInput totalSeconds={time} onChange={setTime} disabled={disabled} />
  }
  return <NumberInput value={time} onChange={setTime} disabled={disabled} />
}

export function WeightRepsInputs({ weight, setWeight, reps, setReps, weightUnit, disabled, repsLabel = 'reps' }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" />
        <span className="text-xs text-muted">{weightUnit}</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <NumberInput value={reps} onChange={setReps} disabled={disabled} />
        <span className="text-xs text-muted">{repsLabel}</span>
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

export function TimeInputs({ time, setTime, disabled, timeUnit = 's', showTimer = true }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} />
        <span className="text-xs text-muted">{timeUnit === 'min' ? 'min' : 's'}</span>
      </div>
      {showTimer && !disabled && <ExecutionTimer seconds={time} />}
    </div>
  )
}

export function WeightTimeInputs({ weight, setWeight, time, setTime, weightUnit, disabled, timeUnit = 's' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" />
        <span className="text-xs text-muted">{weightUnit}</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} />
        <span className="text-xs text-muted">{timeUnit === 'min' ? 'min' : 's'}</span>
      </div>
    </div>
  )
}

export function DistanceInputs({ weight, setWeight, distance, setDistance, weightUnit, distanceUnit = 'm', disabled }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} width="w-14" inputMode="decimal" />
        <span className="text-xs text-muted">{weightUnit}</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" />
        <span className="text-xs text-muted">{distanceUnit}</span>
      </div>
    </>
  )
}

export function LevelTimeInputs({ level, setLevel, time, setTime, disabled, timeUnit = 's' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width="w-14" />
        <span className="text-xs text-muted">nv</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} />
        <span className="text-xs text-muted">{timeUnit === 'min' ? 'min' : 's'}</span>
      </div>
      {!disabled && <ExecutionTimer seconds={time} />}
    </div>
  )
}

export function LevelDistanceInputs({ level, setLevel, distance, setDistance, disabled, distanceUnit = 'm' }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width="w-14" />
        <span className="text-xs text-muted">nv</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" />
        <span className="text-xs text-muted">{distanceUnit}</span>
      </div>
    </>
  )
}

export function LevelCaloriesInputs({ level, setLevel, calories, setCalories, disabled }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width="w-14" />
        <span className="text-xs text-muted">nv</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <NumberInput value={calories} onChange={setCalories} disabled={disabled} width="w-16" />
        <span className="text-xs text-muted">kcal</span>
      </div>
    </>
  )
}

export function DistanceTimeInputs({ distance, setDistance, time, setTime, disabled, distanceUnit = 'm', timeUnit = 's' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" />
        <span className="text-xs text-muted">{distanceUnit}</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} />
        <span className="text-xs text-muted">{timeUnit === 'min' ? 'min' : 's'}</span>
      </div>
      {!disabled && <ExecutionTimer seconds={time} />}
    </div>
  )
}

export function DistancePaceInputs({ distance, setDistance, pace, setPace, disabled, distanceUnit = 'm' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" inputMode="decimal" />
        <span className="text-xs text-muted">{distanceUnit}</span>
      </div>
      <span className="text-secondary text-sm">@</span>
      <div className="flex items-center gap-1">
        <MMSSInput totalSeconds={pace} onChange={setPace} disabled={disabled} />
        <span className="text-xs text-muted">/{distanceUnit}</span>
      </div>
    </div>
  )
}
