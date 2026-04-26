import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, FileText, Video, AlertCircle } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import useWorkoutStore from '../../stores/workoutStore.js'
import { useIsPRSet } from './PRContext.jsx'
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
  const { t } = useTranslation()
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
      onComplete(data, descansoSeg, { setNumber, totalSets, exerciseName })
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
    onComplete(data, descansoSeg, { setNumber, totalSets, exerciseName })
  }

  const renderInputs = () => {
    const props = { disabled: isCompleted, hideUnits: true }

    // Weight/reps: show as text when completed or pending (not active), as inputs only when active
    if (measurementType === MeasurementType.WEIGHT_REPS && !isActive) {
      return (
        <>
          <span className="flex-1 text-center" style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{weight || '—'}</span>
          <span className="flex-1 text-center" style={{ color: colors.textPrimary, fontSize: 14, fontWeight: 600 }}>{reps || '—'}</span>
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
  const isWeightReps = measurementType === MeasurementType.WEIGHT_REPS

  const baseRowStyle = {
    backgroundColor: isPR ? colors.warningBg : isActive ? colors.successBg : 'transparent',
    opacity: !isCompleted && !isActive ? 0.55 : 1,
  }

  const setNumberStyle = {
    textAlign: 'center',
    color: isActive ? colors.success : colors.textSecondary,
    fontSize: 14,
    fontWeight: 700,
  }

  const smallBadgeStyle = {
    backgroundColor: colors.bgTertiary,
    borderRadius: 6,
    padding: '4px 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
  }

  const renderCheckIndicator = () => {
    if (isCompleted) {
      return (
        <button
          onClick={handleCheckClick}
          className="w-7 h-7 flex items-center justify-center hover:opacity-80"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
          title={t('workout:set.unmark')}
        >
          <CheckCircle2 size={26} color={colors.bgPrimary} fill={colors.success} strokeWidth={2.5} />
        </button>
      )
    }
    if (isActive) {
      return (
        <button
          onClick={handleCheckClick}
          disabled={!isValid()}
          className="w-7 h-7 flex items-center justify-center hover:opacity-80"
          style={{ background: 'transparent', border: 'none', cursor: isValid() ? 'pointer' : 'default', opacity: isValid() ? 1 : 0.6 }}
          title={t('workout:set.complete')}
        >
          <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${colors.success}`, display: 'inline-block' }} />
        </button>
      )
    }
    return (
      <span className="w-7 h-7 flex items-center justify-center">
        <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${colors.textMuted}`, display: 'inline-block' }} />
      </span>
    )
  }

  const trailingActions = (
    <>
      {isCompleted && setData?.setType === 'dropset' && (
        <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ backgroundColor: colors.orangeBg, color: colors.orange }}>
          D
        </span>
      )}
      {isCompleted && hasTextNote && (
        <button onClick={handleEditClick} style={smallBadgeStyle} title={t('workout:set.notes')}>
          <FileText size={13} color={colors.textSecondary} />
        </button>
      )}
      {videoUploadError && (
        <button onClick={handleRetryVideoUpload} style={{ ...smallBadgeStyle, backgroundColor: colors.dangerBg }} title={t('common:buttons.retry')}>
          <AlertCircle size={13} color={colors.danger} />
        </button>
      )}
      {isUploadingVideo && (
        <span style={{ ...smallBadgeStyle, padding: '3px 7px', cursor: 'default' }}>
          <span style={{ color: colors.purple, fontSize: 11, fontWeight: 600 }}>{uploadProgress}%</span>
        </span>
      )}
      {isCompleted && hasVideo && !isUploadingVideo && !videoUploadError && (
        <button onClick={handleEditClick} style={smallBadgeStyle} title={t('workout:set.addVideo')}>
          <Video size={13} color={colors.textSecondary} />
        </button>
      )}
      {isCompleted && setData?.rirActual != null && (
        <button onClick={handleEditClick} style={{ ...smallBadgeStyle, padding: '3px 7px' }} title={t('workout:set.rir')}>
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600 }}>@{setData.rirActual}</span>
        </button>
      )}
      {renderCheckIndicator()}
    </>
  )

  return (
    <>
      {isWeightReps ? (
        <div
          className="grid items-center gap-3 py-2.5 px-2 rounded-lg"
          style={{ gridTemplateColumns: '48px 1fr 1fr 132px', ...baseRowStyle }}
        >
          <span style={setNumberStyle}>{setNumber}</span>
          {renderInputs()}
          <div className="flex items-center justify-end gap-1.5">
            {trailingActions}
          </div>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 py-2.5 px-2 rounded-lg"
          style={baseRowStyle}
        >
          <span style={{ ...setNumberStyle, width: 48, flexShrink: 0 }}>{setNumber}</span>
          <div className="flex items-center gap-2 flex-1">
            {renderInputs()}
          </div>
          {trailingActions}
        </div>
      )}

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

export default SetRow
