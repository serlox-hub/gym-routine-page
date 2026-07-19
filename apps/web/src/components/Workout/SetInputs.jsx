import { useState } from 'react'
import ExecutionTimer from './ExecutionTimer.jsx'
import { colors } from '../../lib/styles.js'

const inputStyle = {
  backgroundColor: colors.bgSecondary,
  border: `1px solid ${colors.border}`,
  color: colors.textPrimary,
}

// Ghost: sin caja en reposo (borde transparente → sin salto de layout al enfocar);
// la caja aparece al enfocar, o de forma persistente en la fila sugerida (active, borde lima).
const ghostStyle = {
  backgroundColor: 'transparent',
  border: '1px solid transparent',
  color: colors.textPrimary,
}

function useFocusStyle(active = false) {
  const [focused, setFocused] = useState(false)
  const style = active
    ? { ...inputStyle, borderColor: colors.success }
    : focused ? inputStyle : ghostStyle
  return { style, onFocus: () => setFocused(true), onBlur: () => setFocused(false) }
}

function NumberInput({ value, onChange, disabled, width = 'w-16', inputMode = 'numeric', active = false, placeholder = '—' }) {
  const { style, onFocus, onBlur } = useFocusStyle(active)
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
      onFocus={onFocus}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      className={`${width} px-2 py-1 rounded text-center text-sm`}
      style={style}
    />
  )
}

function MMSSInput({ totalSeconds, onChange, disabled, active = false }) {
  const total = Number(totalSeconds) || 0
  const mins = totalSeconds === '' ? '' : Math.floor(total / 60)
  const secs = totalSeconds === '' ? '' : total % 60
  const minFocus = useFocusStyle(active)
  const secFocus = useFocusStyle(active)

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
        onFocus={minFocus.onFocus}
        onBlur={minFocus.onBlur}
        disabled={disabled}
        placeholder="mm"
        className="w-10 px-1 py-1 rounded text-center text-sm"
        style={minFocus.style}
      />
      <span className="text-xs text-muted font-bold">:</span>
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="59"
        value={secs === '' ? '' : String(secs).padStart(2, '0')}
        onChange={(e) => update(mins, e.target.value)}
        onFocus={secFocus.onFocus}
        onBlur={secFocus.onBlur}
        disabled={disabled}
        placeholder="ss"
        className="w-10 px-1 py-1 rounded text-center text-sm"
        style={secFocus.style}
      />
    </div>
  )
}

function TimeInput({ time, setTime, disabled, timeUnit = 's', active = false }) {
  if (timeUnit === 'min') {
    return <MMSSInput totalSeconds={time} onChange={setTime} disabled={disabled} active={active} />
  }
  return <NumberInput value={time} onChange={setTime} disabled={disabled} active={active} />
}

export function WeightRepsInputs({ weight, setWeight, reps, setReps, weightUnit, disabled, repsLabel = 'reps', hideUnits = false, active = false, repsPlaceholder }) {
  // min-w-0: en el grid columnar (SetRow weight_reps) el ancho intrínseco del <input> impide que
  // la columna 1fr encoja en móvil estrecho → sin esto la fila desborda. Deja que el input se ajuste.
  return (
    <>
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" width="w-full" active={active} />
        {!hideUnits && <span className="text-xs text-muted">{weightUnit}</span>}
      </div>
      {!hideUnits && <span className="text-secondary text-sm">×</span>}
      <div className="flex items-center gap-1 flex-1 min-w-0">
        <NumberInput value={reps} onChange={setReps} disabled={disabled} width="w-full" active={active} placeholder={repsPlaceholder} />
        {!hideUnits && <span className="text-xs text-muted">{repsLabel}</span>}
      </div>
    </>
  )
}

export function RepsOnlyInputs({ reps, setReps, disabled, label = 'reps', active = false, repsPlaceholder }) {
  return (
    <div className="flex items-center gap-1">
      <NumberInput value={reps} onChange={setReps} disabled={disabled} width="w-20" active={active} placeholder={repsPlaceholder} />
      <span className="text-xs text-muted">{label}</span>
    </div>
  )
}

export function TimeInputs({ time, setTime, disabled, timeUnit = 's', showTimer = true, active = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} active={active} />
        <span className="text-xs text-muted">{timeUnit === 'min' ? 'min' : 's'}</span>
      </div>
      {showTimer && !disabled && <ExecutionTimer seconds={time} />}
    </div>
  )
}

export function WeightTimeInputs({ weight, setWeight, time, setTime, weightUnit, disabled, timeUnit = 's', active = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" active={active} />
        <span className="text-xs text-muted">{weightUnit}</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} active={active} />
        <span className="text-xs text-muted">{timeUnit === 'min' ? 'min' : 's'}</span>
      </div>
    </div>
  )
}

export function DistanceInputs({ weight, setWeight, distance, setDistance, weightUnit, distanceUnit = 'm', disabled, active = false }) {
  // Peso opcional: DISTANCE puro lo invoca con setWeight=null → no renderizar el input
  // (si no, teclear en él llamaría a null(...) → TypeError). WEIGHT_DISTANCE sí lo pasa.
  const showWeight = setWeight != null
  return (
    <>
      {showWeight && (
        <>
          <div className="flex items-center gap-1">
            <NumberInput value={weight} onChange={setWeight} disabled={disabled} width="w-14" inputMode="decimal" active={active} />
            <span className="text-xs text-muted">{weightUnit}</span>
          </div>
          <span className="text-secondary text-sm">×</span>
        </>
      )}
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" active={active} />
        <span className="text-xs text-muted">{distanceUnit}</span>
      </div>
    </>
  )
}

export function LevelTimeInputs({ level, setLevel, time, setTime, disabled, timeUnit = 's', showTimer = true, active = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width="w-14" active={active} />
        <span className="text-xs text-muted">nv</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} active={active} />
        <span className="text-xs text-muted">{timeUnit === 'min' ? 'min' : 's'}</span>
      </div>
      {showTimer && <ExecutionTimer seconds={time} />}
    </div>
  )
}

export function LevelDistanceInputs({ level, setLevel, distance, setDistance, disabled, distanceUnit = 'm', active = false }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width="w-14" active={active} />
        <span className="text-xs text-muted">nv</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" active={active} />
        <span className="text-xs text-muted">{distanceUnit}</span>
      </div>
    </>
  )
}

export function LevelCaloriesInputs({ level, setLevel, calories, setCalories, disabled, active = false }) {
  return (
    <>
      <div className="flex items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width="w-14" active={active} />
        <span className="text-xs text-muted">nv</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <NumberInput value={calories} onChange={setCalories} disabled={disabled} width="w-16" active={active} />
        <span className="text-xs text-muted">kcal</span>
      </div>
    </>
  )
}

export function DistanceTimeInputs({ distance, setDistance, time, setTime, disabled, distanceUnit = 'm', timeUnit = 's', showTimer = true, active = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" active={active} />
        <span className="text-xs text-muted">{distanceUnit}</span>
      </div>
      <span className="text-secondary text-sm">×</span>
      <div className="flex items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} active={active} />
        <span className="text-xs text-muted">{timeUnit === 'min' ? 'min' : 's'}</span>
      </div>
      {showTimer && <ExecutionTimer seconds={time} />}
    </div>
  )
}

export function DistancePaceInputs({ distance, setDistance, pace, setPace, disabled, distanceUnit = 'm', active = false }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width="w-14" inputMode="decimal" active={active} />
        <span className="text-xs text-muted">{distanceUnit}</span>
      </div>
      <span className="text-secondary text-sm">@</span>
      <div className="flex items-center gap-1">
        <MMSSInput totalSeconds={pace} onChange={setPace} disabled={disabled} active={active} />
        <span className="text-xs text-muted">/{distanceUnit}</span>
      </div>
    </div>
  )
}
