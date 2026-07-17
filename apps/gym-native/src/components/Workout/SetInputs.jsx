import { useState } from 'react'
import { View, Text, TextInput } from 'react-native'
import ExecutionTimer from './ExecutionTimer'
import { colors } from '../../lib/styles'

const numericInputStyle = {
  backgroundColor: colors.bgSecondary,
  borderWidth: 1,
  borderColor: colors.border,
  color: colors.textPrimary,
  textAlign: 'center',
  fontSize: 14,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 6,
}

// Ghost: sin caja en reposo (borde transparente → sin salto de layout al enfocar);
// la caja aparece al enfocar, o de forma persistente en la fila sugerida (active, borde lima).
const ghostStyle = { ...numericInputStyle, backgroundColor: 'transparent', borderColor: 'transparent' }

function useFocusStyle(active = false) {
  const [focused, setFocused] = useState(false)
  const style = active
    ? { ...numericInputStyle, borderColor: colors.success }
    : focused ? numericInputStyle : ghostStyle
  return { style, onFocus: () => setFocused(true), onBlur: () => setFocused(false) }
}

function NumberInput({ value, onChange, disabled, width = 56, inputMode = 'numeric', active = false, placeholder = '—' }) {
  const { style, onFocus, onBlur } = useFocusStyle(active)
  const handleChange = (raw) => {
    if (raw === '') { onChange(''); return }
    const normalized = raw.replace(',', '.')
    const num = Number(normalized)
    if (!isNaN(num) && num >= 0) onChange(normalized)
  }

  return (
    <TextInput
      value={String(value ?? '')}
      onChangeText={handleChange}
      onFocus={onFocus}
      onBlur={onBlur}
      editable={!disabled}
      keyboardType={inputMode === 'decimal' ? 'decimal-pad' : 'number-pad'}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      style={[style, { width, opacity: disabled ? 0.5 : 1 }]}
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
    <View className="flex-row items-center gap-0.5">
      <TextInput
        value={mins === '' ? '' : String(mins)}
        onChangeText={(v) => update(v, secs)}
        onFocus={minFocus.onFocus}
        onBlur={minFocus.onBlur}
        editable={!disabled}
        keyboardType="number-pad"
        placeholder="mm"
        placeholderTextColor={colors.textMuted}
        style={[minFocus.style, { width: 36 }]}
      />
      <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>:</Text>
      <TextInput
        value={secs === '' ? '' : String(secs).padStart(2, '0')}
        onChangeText={(v) => update(mins, v)}
        onFocus={secFocus.onFocus}
        onBlur={secFocus.onBlur}
        editable={!disabled}
        keyboardType="number-pad"
        placeholder="ss"
        placeholderTextColor={colors.textMuted}
        style={[secFocus.style, { width: 36 }]}
      />
    </View>
  )
}

function TimeInput({ time, setTime, disabled, timeUnit = 's', active = false }) {
  if (timeUnit === 'min') {
    return <MMSSInput totalSeconds={time} onChange={setTime} disabled={disabled} active={active} />
  }
  return <NumberInput value={time} onChange={setTime} disabled={disabled} active={active} />
}

function Label({ children }) {
  return <Text className="text-xs" style={{ color: colors.textSecondary }}>{children}</Text>
}

function Separator({ text = '×' }) {
  return <Text className="text-sm" style={{ color: colors.textSecondary }}>{text}</Text>
}

export function WeightRepsInputs({ weight, setWeight, reps, setReps, weightUnit, disabled, hideUnits = false, active = false, repsPlaceholder }) {
  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" width={hideUnits ? '100%' : 56} active={active} />
        {!hideUnits && <Label>{weightUnit}</Label>}
      </View>
      {!hideUnits && <Separator />}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
        <NumberInput value={reps} onChange={setReps} disabled={disabled} width={hideUnits ? '100%' : 56} active={active} placeholder={repsPlaceholder} />
        {!hideUnits && <Label>reps</Label>}
      </View>
    </>
  )
}

export function RepsOnlyInputs({ reps, setReps, disabled, label = 'reps', active = false, repsPlaceholder }) {
  return (
    <View className="flex-row items-center gap-1">
      <NumberInput value={reps} onChange={setReps} disabled={disabled} width={72} active={active} placeholder={repsPlaceholder} />
      <Label>{label}</Label>
    </View>
  )
}

export function TimeInputs({ time, setTime, disabled, timeUnit = 's', showTimer = true, active = false }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} active={active} />
        <Label>{timeUnit === 'min' ? 'min' : 's'}</Label>
      </View>
      {showTimer && !disabled && <ExecutionTimer seconds={time} />}
    </View>
  )
}

export function WeightTimeInputs({ weight, setWeight, time, setTime, weightUnit, disabled, timeUnit = 's', active = false }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" active={active} />
        <Label>{weightUnit}</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} active={active} />
        <Label>{timeUnit === 'min' ? 'min' : 's'}</Label>
      </View>
    </View>
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
          <View className="flex-row items-center gap-1">
            <NumberInput value={weight} onChange={setWeight} disabled={disabled} width={48} inputMode="decimal" active={active} />
            <Label>{weightUnit}</Label>
          </View>
          <Separator />
        </>
      )}
      <View className="flex-row items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width={48} active={active} />
        <Label>{distanceUnit}</Label>
      </View>
    </>
  )
}

export function LevelTimeInputs({ level, setLevel, time, setTime, disabled, timeUnit = 's', showTimer = true, active = false }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width={48} active={active} />
        <Label>nv</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} active={active} />
        <Label>{timeUnit === 'min' ? 'min' : 's'}</Label>
      </View>
      {showTimer && <ExecutionTimer seconds={time} />}
    </View>
  )
}

export function LevelDistanceInputs({ level, setLevel, distance, setDistance, disabled, distanceUnit = 'm', active = false }) {
  return (
    <>
      <View className="flex-row items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width={48} active={active} />
        <Label>nv</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width={48} active={active} />
        <Label>{distanceUnit}</Label>
      </View>
    </>
  )
}

export function LevelCaloriesInputs({ level, setLevel, calories, setCalories, disabled, active = false }) {
  return (
    <>
      <View className="flex-row items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width={48} active={active} />
        <Label>nv</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <NumberInput value={calories} onChange={setCalories} disabled={disabled} width={56} active={active} />
        <Label>kcal</Label>
      </View>
    </>
  )
}

export function DistanceTimeInputs({ distance, setDistance, time, setTime, disabled, distanceUnit = 'm', timeUnit = 's', showTimer = true, active = false }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width={48} active={active} />
        <Label>{distanceUnit}</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} active={active} />
        <Label>{timeUnit === 'min' ? 'min' : 's'}</Label>
      </View>
      {showTimer && <ExecutionTimer seconds={time} />}
    </View>
  )
}

export function DistancePaceInputs({ distance, setDistance, pace, setPace, disabled, distanceUnit = 'm', active = false }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width={48} inputMode="decimal" active={active} />
        <Label>{distanceUnit}</Label>
      </View>
      <Separator text="@" />
      <View className="flex-row items-center gap-1">
        <MMSSInput totalSeconds={pace} onChange={setPace} disabled={disabled} active={active} />
        <Label>/{distanceUnit}</Label>
      </View>
    </View>
  )
}
