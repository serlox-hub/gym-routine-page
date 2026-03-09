import { useState, useEffect } from 'react'
import { View, Text, Pressable } from 'react-native'
import useWorkoutStore from '../../stores/workoutStore'
import { NotesBadge } from '../ui'
import SetDetailsModal from './SetDetailsModal'
import { WeightRepsInputs, RepsOnlyInputs, TimeInputs, WeightTimeInputs, DistanceInputs, LevelTimeInputs, LevelDistanceInputs, LevelCaloriesInputs, DistanceTimeInputs, DistancePaceInputs } from './SetInputs'
import { isSetDataValid, buildCompletedSetData, metersToDistanceUnit } from '../../lib/setUtils'
import { MeasurementType } from '../../lib/measurementTypes'
import { usePreferences } from '../../hooks/usePreferences'
import { useUpdateSetDetails } from '../../hooks/useWorkout'
import { colors } from '../../lib/styles'

export default function SetRow({
  setNumber,
  sessionExerciseId,
  exerciseId,
  measurementType = MeasurementType.WEIGHT_REPS,
  weightUnit = 'kg',
  timeUnit = 's',
  distanceUnit = 'm',
  descansoSeg,
  previousSet,
  onComplete,
  onUncomplete,
  canRemove = false,
  onRemove,
}) {
  const isCompleted = useWorkoutStore(state => state.isSetCompleted(sessionExerciseId, setNumber))
  const setData = useWorkoutStore(state => state.getSetData(sessionExerciseId, setNumber))
  const cachedData = useWorkoutStore(state => state.getCachedSetData(sessionExerciseId, setNumber))

  const { data: preferences } = usePreferences()
  const { mutate: updateSetDetails } = useUpdateSetDetails()

  const showRirInput = preferences?.show_rir_input ?? true
  const showSetNotes = preferences?.show_set_notes ?? true
  const shouldShowModal = showRirInput || showSetNotes

  const [weight, setWeight] = useState(setData?.weight ?? '')
  const [reps, setReps] = useState(setData?.repsCompleted ?? '')
  const [time, setTime] = useState(setData?.timeSeconds ?? '')
  const [distance, setDistance] = useState(setData?.distanceMeters ?? '')
  const [calories, setCalories] = useState(setData?.caloriesBurned ?? '')
  const [level, setLevel] = useState(setData?.level ?? '')
  const [pace, setPace] = useState(setData?.paceSeconds ?? '')
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('complete')

  useEffect(() => {
    if (previousSet && !setData && !cachedData) {
      if (previousSet.weight != null) setWeight(previousSet.weight)
      if (previousSet.reps != null) setReps(previousSet.reps)
      if (previousSet.timeSeconds != null) setTime(previousSet.timeSeconds)
      if (previousSet.distanceMeters != null) setDistance(metersToDistanceUnit(previousSet.distanceMeters, distanceUnit))
      if (previousSet.caloriesBurned != null) setCalories(previousSet.caloriesBurned)
      if (previousSet.level != null) setLevel(previousSet.level)
      if (previousSet.paceSeconds != null) setPace(previousSet.paceSeconds)
    }
  }, [previousSet, setData, cachedData])

  const isValid = () => isSetDataValid(measurementType, { weight, reps, time, distance, calories, level, pace })

  const buildInfo = (rir, notes, videoUrl = null, videoFile = null) => ({
    sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit, rirActual: rir, notes, videoUrl, videoFile,
  })

  const handleCheckPress = () => {
    if (isCompleted) {
      onUncomplete({ sessionExerciseId, setNumber })
    } else if (isValid()) {
      if (shouldShowModal) {
        setModalMode('complete')
        setShowModal(true)
      } else {
        handleCompleteSet(null, null)
      }
    }
  }

  const handleEditPress = () => {
    setModalMode('edit')
    setShowModal(true)
  }

  const handleModalSubmit = (rir, notes, videoUrl, videoFile) => {
    if (modalMode === 'complete') {
      const data = buildCompletedSetData(
        measurementType,
        { weight, reps, time, distance, calories, level, pace },
        buildInfo(rir, notes, videoUrl, videoFile),
      )
      onComplete(data, descansoSeg)
    } else {
      updateSetDetails({ sessionExerciseId, setNumber, rirActual: rir, notes, videoUrl, videoFile })
    }
    setShowModal(false)
  }

  const handleCompleteSet = (rir, notes) => {
    const data = buildCompletedSetData(
      measurementType,
      { weight, reps, time, distance, calories, level, pace },
      buildInfo(rir, notes),
    )
    onComplete(data, descansoSeg)
  }

  const renderInputs = () => {
    const props = { disabled: isCompleted }
    switch (measurementType) {
      case MeasurementType.WEIGHT_REPS:
        return <WeightRepsInputs weight={weight} setWeight={setWeight} reps={reps} setReps={setReps} weightUnit={weightUnit} {...props} />
      case MeasurementType.REPS_ONLY:
        return <RepsOnlyInputs reps={reps} setReps={setReps} {...props} />
      case MeasurementType.TIME:
        return <TimeInputs time={time} setTime={setTime} timeUnit={timeUnit} {...props} />
      case MeasurementType.WEIGHT_TIME:
        return <WeightTimeInputs weight={weight} setWeight={setWeight} time={time} setTime={setTime} weightUnit={weightUnit} timeUnit={timeUnit} {...props} />
      case MeasurementType.DISTANCE:
        return <DistanceInputs weight={null} setWeight={null} distance={distance} setDistance={setDistance} weightUnit={weightUnit} distanceUnit={distanceUnit} {...props} />
      case MeasurementType.WEIGHT_DISTANCE:
        return <DistanceInputs weight={weight} setWeight={setWeight} distance={distance} setDistance={setDistance} weightUnit={weightUnit} distanceUnit={distanceUnit} {...props} />
      case MeasurementType.CALORIES:
        return <RepsOnlyInputs reps={calories} setReps={setCalories} label="kcal" {...props} />
      case MeasurementType.LEVEL_TIME:
        return <LevelTimeInputs level={level} setLevel={setLevel} time={time} setTime={setTime} timeUnit={timeUnit} {...props} />
      case MeasurementType.LEVEL_DISTANCE:
        return <LevelDistanceInputs level={level} setLevel={setLevel} distance={distance} setDistance={setDistance} distanceUnit={distanceUnit} {...props} />
      case MeasurementType.LEVEL_CALORIES:
        return <LevelCaloriesInputs level={level} setLevel={setLevel} calories={calories} setCalories={setCalories} {...props} />
      case MeasurementType.DISTANCE_TIME:
        return <DistanceTimeInputs distance={distance} setDistance={setDistance} time={time} setTime={setTime} distanceUnit={distanceUnit} timeUnit={timeUnit} {...props} />
      case MeasurementType.DISTANCE_PACE:
        return <DistancePaceInputs distance={distance} setDistance={setDistance} pace={pace} setPace={setPace} distanceUnit={distanceUnit} {...props} />
      default:
        return null
    }
  }

  const hasTextNote = !!setData?.notes
  const hasVideo = !!setData?.videoUrl
  const initialData = modalMode === 'edit' ? setData : cachedData
  const valid = isValid()

  return (
    <View
      className="flex-row items-center gap-3 py-2 px-3 rounded"
      style={{
        backgroundColor: isCompleted ? 'rgba(63, 185, 80, 0.1)' : colors.bgTertiary,
        borderLeftWidth: 3,
        borderLeftColor: isCompleted ? colors.success : 'transparent',
      }}
    >
      <View className="flex-row items-center gap-2 flex-1">
        {renderInputs()}
      </View>

      {isCompleted && (
        <NotesBadge
          rir={setData?.rirActual}
          hasNotes={hasTextNote}
          hasVideo={hasVideo}
          onPress={handleEditPress}
        />
      )}

      <Pressable
        onPress={handleCheckPress}
        disabled={!isCompleted && !valid}
        className="w-8 h-8 rounded-full items-center justify-center"
        style={{
          backgroundColor: isCompleted ? colors.success : colors.border,
          opacity: (!isCompleted && !valid) ? 0.5 : 1,
        }}
      >
        <Text
          className="text-sm font-bold"
          style={{
            color: isCompleted ? colors.bgPrimary : valid ? colors.success : '#484f58',
          }}
        >
          {isCompleted ? '✕' : '✓'}
        </Text>
      </Pressable>

      {canRemove && !isCompleted && onRemove && (
        <Pressable
          onPress={onRemove}
          className="w-6 h-6 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.bgTertiary }}
        >
          <Text style={{ color: colors.danger }}>×</Text>
        </Pressable>
      )}

      <SetDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        descansoSeg={descansoSeg}
        initialRir={initialData?.rirActual}
        initialNote={initialData?.notes}
        initialVideoUrl={initialData?.videoUrl}
        measurementType={measurementType}
      />
    </View>
  )
}
