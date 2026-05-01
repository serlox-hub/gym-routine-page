import { useState, useEffect, memo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { CheckCircle2, FileText, Video, AlertCircle } from 'lucide-react-native'
import useWorkoutStore from '../../stores/workoutStore'
import { useIsPRSet } from './PRContext'
import SetDetailsModal from './SetDetailsModal'
import { WeightRepsInputs, RepsOnlyInputs, TimeInputs, WeightTimeInputs, DistanceInputs, LevelTimeInputs, LevelDistanceInputs, LevelCaloriesInputs, DistanceTimeInputs, DistancePaceInputs } from './SetInputs'
import {
  MeasurementType,
  buildCompletedSetData,
  isSetDataValid,
  metersToDistanceUnit,
  getNotifier,
  t,
} from '@gym/shared'
import { usePreferences } from '../../hooks/usePreferences'
import { useCanUploadVideo } from '../../hooks/useAuth'
import { useUpdateSetVideo, useUpdateSetDetails } from '../../hooks/useWorkout'
import { uploadVideo } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'

function SetRow({
  setNumber,
  totalSets,
  exerciseName,
  sessionExerciseId,
  exerciseId,
  measurementType = MeasurementType.WEIGHT_REPS,
  weightUnit = 'kg',
  timeUnit = 's',
  distanceUnit = 'm',
  descansoSeg,
  previousSet,
  isActive = false,
  onComplete,
  onUncomplete,
}) {
  const setKey = `${sessionExerciseId}-${setNumber}`
  const isCompleted = useWorkoutStore(state => !!state.completedSets[setKey])
  const setData = useWorkoutStore(state => state.completedSets[setKey])
  const cachedData = useWorkoutStore(state => state.cachedSetData[setKey])
  const isPR = useIsPRSet(sessionExerciseId, setNumber)

  const { data: preferences } = usePreferences()
  const canUploadVideo = useCanUploadVideo()
  const { mutate: updateSetVideo } = useUpdateSetVideo()
  const { mutate: updateSetDetails } = useUpdateSetDetails()
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoUploadError, setVideoUploadError] = useState(false)
  const [pendingVideoFile, setPendingVideoFile] = useState(null)

  const showRirInput = preferences?.show_rir_input ?? true
  const showSetNotes = preferences?.show_set_notes ?? true
  const showVideoUpload = preferences?.show_video_upload ?? true
  const showVideo = canUploadVideo && showVideoUpload
  const shouldShowModal = showRirInput || showSetNotes || showVideo

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
  }, [previousSet, setData, cachedData, distanceUnit])

  const isValid = () => isSetDataValid(measurementType, { weight, reps, time, distance, calories, level, pace })

  const buildInfo = (rir, notes, videoUrl = null, videoFile = null, setType = 'normal') => ({
    sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit, rirActual: rir, notes, videoUrl, videoFile, setType,
  })

  const uploadVideoInBackground = async (file) => {
    setIsUploadingVideo(true)
    setUploadProgress(0)
    setVideoUploadError(false)
    setPendingVideoFile(file)
    try {
      const uploadedUrl = await uploadVideo(file?.uri, setUploadProgress)
      updateSetVideo({ sessionExerciseId, setNumber, videoUrl: uploadedUrl })
      setPendingVideoFile(null)
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Video upload failed:', err)
      setVideoUploadError(true)
      getNotifier()?.show(t('workout:set.videoUploadError'), 'error')
    } finally {
      setIsUploadingVideo(false)
    }
  }

  const handleRetryVideoUpload = () => {
    if (pendingVideoFile) {
      uploadVideoInBackground(pendingVideoFile)
    }
  }

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

  const handleModalSubmit = ({ rir, notes, videoUrl, videoFile, setType }) => {
    if (modalMode === 'complete') {
      const data = buildCompletedSetData(
        measurementType,
        { weight, reps, time, distance, calories, level, pace },
        buildInfo(rir, notes, videoUrl, videoFile, setType),
      )
      onComplete(data, descansoSeg, { setNumber, totalSets, exerciseName })
    } else {
      updateSetDetails({ sessionExerciseId, setNumber, rirActual: rir, notes, videoUrl, videoFile, setType })
    }
    setShowModal(false)

    if (videoFile) {
      uploadVideoInBackground(videoFile.uri)
    }
  }

  const handleCompleteSet = (rir, notes) => {
    const data = buildCompletedSetData(
      measurementType,
      { weight, reps, time, distance, calories, level, pace },
      buildInfo(rir, notes),
    )
    onComplete(data, descansoSeg, { setNumber, totalSets, exerciseName })
  }

  const renderInputs = () => {
    const props = { disabled: isCompleted, hideUnits: true }

    if (measurementType === MeasurementType.WEIGHT_REPS && !isActive) {
      return (
        <>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{weight || '—'}</Text>
          <Text style={{ flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 14, fontWeight: '600' }}>{reps || '—'}</Text>
        </>
      )
    }

    switch (measurementType) {
      case MeasurementType.WEIGHT_REPS:
        return <WeightRepsInputs weight={weight} setWeight={setWeight} reps={reps} setReps={setReps} weightUnit={weightUnit} weightActive={isActive} {...props} />
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

  const baseRowStyle = {
    backgroundColor: isPR ? colors.warningBg : isActive ? colors.successBg : 'transparent',
    opacity: !isCompleted && !isActive ? 0.55 : 1,
  }

  const setNumberText = (
    <Text style={{ width: 48, textAlign: 'center', color: isActive ? colors.success : colors.textSecondary, fontSize: 14, fontWeight: '700' }}>
      {setNumber}
    </Text>
  )

  const smallBadgeStyle = {
    backgroundColor: colors.bgTertiary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  }

  const renderCheckIndicator = () => {
    if (isCompleted) {
      return (
        <Pressable onPress={handleCheckPress} className="w-7 h-7 items-center justify-center active:opacity-70">
          <CheckCircle2 size={26} color={colors.bgPrimary} fill={colors.success} strokeWidth={2.5} />
        </Pressable>
      )
    }
    if (isActive) {
      return (
        <Pressable
          onPress={handleCheckPress}
          disabled={!valid}
          className="w-7 h-7 items-center justify-center active:opacity-70"
          style={{ opacity: valid ? 1 : 0.6 }}
        >
          <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.success }} />
        </Pressable>
      )
    }
    return (
      <View className="w-7 h-7 items-center justify-center">
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.textMuted }} />
      </View>
    )
  }

  const trailingActions = (
    <>
      {isCompleted && setData?.setType === 'dropset' && (
        <View className="px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.orangeBg }}>
          <Text className="text-xs font-bold" style={{ color: colors.orange }}>D</Text>
        </View>
      )}
      {isCompleted && hasTextNote && (
        <Pressable onPress={handleEditPress} style={smallBadgeStyle}>
          <FileText size={13} color={colors.textSecondary} />
        </Pressable>
      )}
      {videoUploadError && (
        <Pressable onPress={handleRetryVideoUpload} style={{ ...smallBadgeStyle, backgroundColor: colors.dangerBg }}>
          <AlertCircle size={13} color={colors.danger} />
        </Pressable>
      )}
      {isUploadingVideo && (
        <View style={{ ...smallBadgeStyle, paddingHorizontal: 7, paddingVertical: 3 }}>
          <Text style={{ color: colors.purple, fontSize: 11, fontWeight: '600' }}>{uploadProgress}%</Text>
        </View>
      )}
      {isCompleted && hasVideo && !isUploadingVideo && !videoUploadError && (
        <Pressable onPress={handleEditPress} style={smallBadgeStyle}>
          <Video size={13} color={colors.textSecondary} />
        </Pressable>
      )}
      {isCompleted && setData?.rirActual != null && (
        <Pressable onPress={handleEditPress} style={{ ...smallBadgeStyle, paddingHorizontal: 7, paddingVertical: 3 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '600' }}>@{setData.rirActual}</Text>
        </Pressable>
      )}
      {renderCheckIndicator()}
    </>
  )

  return (
    <>
      <View className="flex-row items-center py-2.5 px-2 rounded-lg" style={{ gap: 12, ...baseRowStyle }}>
        {setNumberText}
        <View className="flex-row items-center flex-1" style={{ gap: 8 }}>
          {renderInputs()}
        </View>
        <View className="flex-row items-center justify-end" style={{ gap: 6, width: 132 }}>
          {trailingActions}
        </View>
      </View>

      <SetDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        setNumber={setNumber}
        descansoSeg={descansoSeg}
        initialRir={initialData?.rirActual}
        initialNote={initialData?.notes}
        initialVideoUrl={initialData?.videoUrl}
        initialSetType={initialData?.setType}
        measurementType={measurementType}
        weight={weight} setWeight={setWeight}
        reps={reps} setReps={setReps}
        weightUnit={weightUnit}
      />
    </>
  )
}

export default memo(SetRow)
