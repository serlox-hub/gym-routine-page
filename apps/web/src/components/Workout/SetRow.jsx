import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, FileText, Video, AlertCircle, Trophy } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { useIsPRSet } from './PRContext.jsx'
import SetDetailsModal from './SetDetailsModal.jsx'
import { WeightRepsInputs, RepsOnlyInputs, TimeInputs, WeightTimeInputs, DistanceInputs, LevelTimeInputs, LevelDistanceInputs, LevelCaloriesInputs, DistanceTimeInputs, DistancePaceInputs } from './SetInputs.jsx'
import {
  MeasurementType,
  buildCompletedSetData,
  getNotifier,
  formatEffortBadge,
  useSetInputs,
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
  repsTarget,
  isActive = false,
  onComplete,
  onUncomplete,
}) {
  const { t } = useTranslation()
  const isPR = useIsPRSet(sessionExerciseId, setNumber)

  // Estado + persistencia de inputs (compartido web/native; ver useSetInputs)
  const {
    weight, setWeight, reps, setReps, time, setTime, distance, setDistance,
    calories, setCalories, level, setLevel, pace, setPace,
    isCompleted, setData, cachedData, isValid, repsPlaceholder,
  } = useSetInputs({ sessionExerciseId, setNumber, exerciseId, measurementType, weightUnit, distanceUnit, previousSet, repsTarget })

  const { data: preferences } = usePreferences()
  const canUploadVideo = useCanUploadVideo()
  const { mutate: updateSetVideo } = useUpdateSetVideo()
  const { mutate: updateSetDetails } = useUpdateSetDetails()
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoUploadError, setVideoUploadError] = useState(false)
  const [pendingVideoFile, setPendingVideoFile] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState('complete')

  const showRirInput = preferences?.show_rir_input ?? true
  const showSetNotes = preferences?.show_set_notes ?? true
  const showVideoUpload = preferences?.show_video_upload ?? true
  const showVideo = canUploadVideo && showVideoUpload
  const shouldShowModal = showRirInput || showSetNotes || showVideo

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
    // Todas las filas son editables; la fila activa muestra sus inputs con caja (active),
    // el resto son ghost (caja al enfocar). El timer se oculta en series completadas.
    const props = { disabled: false, hideUnits: true, showTimer: !isCompleted, active: isActive }

    switch (measurementType) {
      case MeasurementType.WEIGHT_REPS:
        return <WeightRepsInputs weight={weight} setWeight={setWeight} reps={reps} setReps={setReps} weightUnit={weightUnit} repsPlaceholder={repsPlaceholder} {...props} />
      case MeasurementType.REPS_ONLY:
        return <RepsOnlyInputs reps={reps} setReps={setReps} repsPlaceholder={repsPlaceholder} {...props} />
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
  const isWeightReps = measurementType === MeasurementType.WEIGHT_REPS

  // "Hecho" se marca con lima SÓLIDO (barra izquierda), no con relleno translúcido:
  // el lima #BEFF00 en alpha sobre el navy vira a oliva. Completada y activa comparten
  // relleno neutro sutil; la barra lima distingue lo hecho; la activa muestra sus inputs
  // en caja lima (ver renderInputs); pendiente = transparente.
  // (Todas llevan 3px de borde izq. transparente para no descuadrar el layout.)
  const baseRowStyle = {
    backgroundColor: (isCompleted || isActive) ? colors.bgHover : 'transparent',
    borderLeft: `3px solid ${isCompleted ? colors.success : 'transparent'}`,
  }

  const setNumberStyle = {
    textAlign: 'center',
    color: (isActive || isCompleted) ? colors.success : colors.textSecondary,
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
          {isPR ? (
            // 22px iguala el diámetro relleno real del CheckCircle2 (size=26 → r=10 en viewbox 24)
            <div style={{ width: 22, height: 22, borderRadius: '50%', backgroundColor: colors.gold, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={14} color={colors.bgPrimary} strokeWidth={2.5} />
            </div>
          ) : (
            <CheckCircle2 size={26} color={colors.bgPrimary} fill={colors.success} strokeWidth={2.5} />
          )}
        </button>
      )
    }
    // Cualquier fila con datos válidos se puede completar; isActive solo colorea el borde
    const valid = isValid()
    return (
      <button
        onClick={handleCheckClick}
        disabled={!valid}
        className="w-7 h-7 flex items-center justify-center hover:opacity-80"
        style={{ background: 'transparent', border: 'none', cursor: valid ? 'pointer' : 'default', opacity: valid ? 1 : 0.6 }}
        title={t('workout:set.complete')}
      >
        <span style={{ width: 22, height: 22, borderRadius: '50%', border: `2px solid ${isActive ? colors.success : colors.textMuted}`, display: 'inline-block' }} />
      </button>
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
          <span style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 600 }}>
            {formatEffortBadge(setData.rirActual, measurementType)}
          </span>
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
