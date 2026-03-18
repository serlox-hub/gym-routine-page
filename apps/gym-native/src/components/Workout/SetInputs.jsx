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

function NumberInput({ value, onChange, disabled, width = 56, inputMode = 'numeric' }) {
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
      editable={!disabled}
      keyboardType={inputMode === 'decimal' ? 'decimal-pad' : 'number-pad'}
      style={[numericInputStyle, { width, opacity: disabled ? 0.5 : 1 }]}
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
    <View className="flex-row items-center gap-0.5">
      <TextInput
        value={mins === '' ? '' : String(mins)}
        onChangeText={(v) => update(v, secs)}
        editable={!disabled}
        keyboardType="number-pad"
        placeholder="mm"
        placeholderTextColor="#6e7681"
        style={[numericInputStyle, { width: 36 }]}
      />
      <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>:</Text>
      <TextInput
        value={secs === '' ? '' : String(secs).padStart(2, '0')}
        onChangeText={(v) => update(mins, v)}
        editable={!disabled}
        keyboardType="number-pad"
        placeholder="ss"
        placeholderTextColor="#6e7681"
        style={[numericInputStyle, { width: 36 }]}
      />
    </View>
  )
}

function TimeInput({ time, setTime, disabled, timeUnit = 's' }) {
  if (timeUnit === 'min') {
    return <MMSSInput totalSeconds={time} onChange={setTime} disabled={disabled} />
  }
  return <NumberInput value={time} onChange={setTime} disabled={disabled} />
}

function Label({ children }) {
  return <Text className="text-xs" style={{ color: colors.textSecondary }}>{children}</Text>
}

function Separator({ text = '×' }) {
  return <Text className="text-sm" style={{ color: colors.textSecondary }}>{text}</Text>
}

export function WeightRepsInputs({ weight, setWeight, reps, setReps, weightUnit, disabled }) {
  return (
    <>
      <View className="flex-row items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" />
        <Label>{weightUnit}</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <NumberInput value={reps} onChange={setReps} disabled={disabled} />
        <Label>reps</Label>
      </View>
    </>
  )
}

export function RepsOnlyInputs({ reps, setReps, disabled, label = 'reps' }) {
  return (
    <View className="flex-row items-center gap-1">
      <NumberInput value={reps} onChange={setReps} disabled={disabled} width={72} />
      <Label>{label}</Label>
    </View>
  )
}

export function TimeInputs({ time, setTime, disabled, timeUnit = 's', showTimer = true }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} />
        <Label>{timeUnit === 'min' ? 'min' : 's'}</Label>
      </View>
      {showTimer && !disabled && <ExecutionTimer seconds={time} />}
    </View>
  )
}

export function WeightTimeInputs({ weight, setWeight, time, setTime, weightUnit, disabled, timeUnit = 's' }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} inputMode="decimal" />
        <Label>{weightUnit}</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} />
        <Label>{timeUnit === 'min' ? 'min' : 's'}</Label>
      </View>
    </View>
  )
}

export function DistanceInputs({ weight, setWeight, distance, setDistance, weightUnit, distanceUnit = 'm', disabled }) {
  return (
    <>
      <View className="flex-row items-center gap-1">
        <NumberInput value={weight} onChange={setWeight} disabled={disabled} width={48} inputMode="decimal" />
        <Label>{weightUnit}</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width={48} />
        <Label>{distanceUnit}</Label>
      </View>
    </>
  )
}

export function LevelTimeInputs({ level, setLevel, time, setTime, disabled, timeUnit = 's' }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width={48} />
        <Label>nv</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} />
        <Label>{timeUnit === 'min' ? 'min' : 's'}</Label>
      </View>
      {!disabled && <ExecutionTimer seconds={time} />}
    </View>
  )
}

export function LevelDistanceInputs({ level, setLevel, distance, setDistance, disabled, distanceUnit = 'm' }) {
  return (
    <>
      <View className="flex-row items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width={48} />
        <Label>nv</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width={48} />
        <Label>{distanceUnit}</Label>
      </View>
    </>
  )
}

export function LevelCaloriesInputs({ level, setLevel, calories, setCalories, disabled }) {
  return (
    <>
      <View className="flex-row items-center gap-1">
        <NumberInput value={level} onChange={setLevel} disabled={disabled} width={48} />
        <Label>nv</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <NumberInput value={calories} onChange={setCalories} disabled={disabled} width={56} />
        <Label>kcal</Label>
      </View>
    </>
  )
}

export function DistanceTimeInputs({ distance, setDistance, time, setTime, disabled, distanceUnit = 'm', timeUnit = 's' }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width={48} />
        <Label>{distanceUnit}</Label>
      </View>
      <Separator />
      <View className="flex-row items-center gap-1">
        <TimeInput time={time} setTime={setTime} disabled={disabled} timeUnit={timeUnit} />
        <Label>{timeUnit === 'min' ? 'min' : 's'}</Label>
      </View>
      {!disabled && <ExecutionTimer seconds={time} />}
    </View>
  )
}

export function DistancePaceInputs({ distance, setDistance, pace, setPace, disabled, distanceUnit = 'm' }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="flex-row items-center gap-1">
        <NumberInput value={distance} onChange={setDistance} disabled={disabled} width={48} inputMode="decimal" />
        <Label>{distanceUnit}</Label>
      </View>
      <Separator text="@" />
      <View className="flex-row items-center gap-1">
        <MMSSInput totalSeconds={pace} onChange={setPace} disabled={disabled} />
        <Label>/{distanceUnit}</Label>
      </View>
    </View>
  )
}
