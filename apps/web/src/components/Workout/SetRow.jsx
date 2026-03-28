import { useState, useEffect } from 'react'
import { colors } from '../../lib/styles.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { useIsPRSet } from './PRContext.jsx'
import { NotesBadge } from '../ui/index.js'
import SetDetailsModal from './SetDetailsModal.jsx'
import { WeightRepsInputs, RepsOnlyInputs, TimeInputs, WeightTimeInputs, DistanceInputs, LevelTimeInputs, LevelDistanceInputs, LevelCaloriesInputs, DistanceTimeInputs, DistancePaceInputs } from './SetInputs.jsx'
import {
  MeasurementType,
  buildCompletedSetData,
  isSetDataValid,
  metersToDistanceUnit
} from '@gym/shared'
import { usePreferences } from '../../hooks/usePreferences.js'
import { useCanUploadVideo } from '../../hooks/useAuth.js'
import { useUpdateSetVideo, useUpdateSetDetails } from '../../hooks/useWorkout.js'
import { uploadVideo } from '../../lib/videoStorage.js'

function SetRow({
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
  onRemove
}) {
  const isCompleted = useWorkoutStore(state => state.isSetCompleted(sessionExerciseId, setNumber))
  const setData = useWorkoutStore(state => state.getSetData(sessionExerciseId, setNumber))
  const cachedData = useWorkoutStore(state => state.getCachedSetData(sessionExerciseId, setNumber))
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

  // Cargar valores de sesión anterior (solo si no hay datos en caché)
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

  const handleCheckClick = () => {
    if (isCompleted) {
      onUncomplete({ sessionExerciseId, setNumber })
    } else if (isValid()) {
      if (shouldShowModal) {
        setModalMode('complete')
        setShowModal(true)
      } else {
        handleCompleteSet(null, null, null)
      }
    }
  }

  const handleEditClick = () => {
    setModalMode('edit')
    setShowModal(true)
  }

  const uploadVideoInBackground = async (file) => {
    setIsUploadingVideo(true)
    setUploadProgress(0)
    setVideoUploadError(false)
    setPendingVideoFile(file)
    try {
      const uploadedUrl = await uploadVideo(file, setUploadProgress)
      updateSetVideo({ sessionExerciseId, setNumber, videoUrl: uploadedUrl })
      setPendingVideoFile(null)
    } catch {
      setVideoUploadError(true)
    } finally {
      setIsUploadingVideo(false)
    }
  }

  const handleRetryVideoUpload = () => {
    if (pendingVideoFile) {
      uploadVideoInBackground(pendingVideoFile)
    }
  }

  const buildInfo = (rir, notes, videoUrl, setType = 'normal') => ({
    sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit, rirActual: rir, notes, videoUrl, setType,
  })

  const handleModalSubmit = ({ rir, notes, videoUrl, videoFile, setType }) => {
    if (modalMode === 'complete') {
      const data = buildCompletedSetData(
        measurementType,
        { weight, reps, time, distance, calories, level, pace },
        buildInfo(rir, notes, videoUrl, setType)
      )
      onComplete(data, descansoSeg)
    } else {
      updateSetDetails({
        sessionExerciseId,
        setNumber,
        rirActual: rir,
        notes,
        videoUrl,
        setType,
      })
    }

    setShowModal(false)

    if (videoFile) {
      uploadVideoInBackground(videoFile)
    }
  }

  const handleCompleteSet = (rir, notes, videoUrl) => {
    const data = buildCompletedSetData(
      measurementType,
      { weight, reps, time, distance, calories, level, pace },
      buildInfo(rir, notes, videoUrl)
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
        return <DistanceInputs weight={null} setWeight={null} distance={distance} setDistance={setDistance} weightUnit={weightUnit} distanceUnit={distanceUnit} showWeight={false} {...props} />
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

  return (
    <div
      className="flex items-center gap-3 py-2 px-3 rounded"
      style={{
        backgroundColor: isPR ? 'rgba(210, 153, 34, 0.15)' : isCompleted ? 'rgba(63, 185, 80, 0.1)' : colors.bgTertiary,
        borderLeft: isPR ? `3px solid ${colors.warning}` : isCompleted ? `3px solid ${colors.success}` : '3px solid transparent',
      }}
    >
      <div className="flex items-center gap-2 flex-1">
        {renderInputs()}
      </div>

      {isCompleted && setData?.setType === 'dropset' && (
        <span
          className="px-1.5 py-0.5 rounded text-xs font-bold"
          style={{ backgroundColor: colors.dropsetBg, color: colors.dropset }}
        >
          D
        </span>
      )}

      {(isCompleted || isUploadingVideo || videoUploadError) && (
        <NotesBadge
          rir={setData?.rirActual}
          hasNotes={hasTextNote}
          hasVideo={hasVideo}
          isUploadingVideo={isUploadingVideo}
          uploadProgress={uploadProgress}
          videoUploadError={videoUploadError}
          onRetryUpload={handleRetryVideoUpload}
          onClick={isCompleted ? handleEditClick : null}
        />
      )}

      <button
        onClick={handleCheckClick}
        disabled={!isCompleted && !isValid()}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
        style={{
          backgroundColor: isCompleted ? colors.success : colors.border,
          color: isCompleted ? colors.bgPrimary : isValid() ? colors.success : '#484f58',
          cursor: (!isCompleted && !isValid()) ? 'default' : 'pointer',
          opacity: (!isCompleted && !isValid()) ? 0.5 : 1,
        }}
        title={isCompleted ? 'Desmarcar serie' : 'Completar serie'}
      >
        {isCompleted ? '✕' : '✓'}
      </button>

      <SetDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
        mode={modalMode}
        descansoSeg={descansoSeg}
        initialRir={initialData?.rirActual}
        initialNote={initialData?.notes}
        initialVideoUrl={initialData?.videoUrl}
        initialSetType={initialData?.setType}
        measurementType={measurementType}
      />

      {canRemove && !isCompleted && onRemove && (
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:opacity-80"
          style={{ backgroundColor: colors.bgTertiary, color: colors.danger }}
          title="Eliminar serie"
        >
          ×
        </button>
      )}
    </div>
  )
}

export default SetRow
