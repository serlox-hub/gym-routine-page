import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, AlertCircle, Trophy } from 'lucide-react'
import { colors } from '../../lib/styles.js'
import { useIsPRSet } from './PRContext.jsx'
import SetDetailsModal from './SetDetailsModal.jsx'
import EffortPicker from './EffortPicker.jsx'
import { WeightRepsInputs, RepsOnlyInputs, TimeInputs, WeightTimeInputs, DistanceInputs, LevelTimeInputs, LevelDistanceInputs, LevelCaloriesInputs, DistanceTimeInputs, DistancePaceInputs } from './SetInputs.jsx'
import {
  MeasurementType,
  buildCompletedSetData,
  getNotifier,
  useSetInputs,
} from '@gym/shared'
import { usePreferences } from '../../hooks/usePreferences.js'
import { useUpdateSetVideo } from '../../hooks/useWorkout.js'
import { uploadVideo } from '../../lib/videoStorage.js'

// Layout columnar (tipo hoja de cálculo, patrón Strong/Hevy): SET · KG · REPS · [RIR] · ✓.
// La celda SET es la identidad de la serie (nº / «D» dropset / punto si hay nota o vídeo) y
// abre la hoja de detalles. La columna RIR se colapsa si el usuario desactiva show_rir_input.
// Fuente única del grid (SetsList importa estas constantes para su cabecera → sin desincronizar).
const COL_SET = 40 // ancho de la columna SET; compone el grid y la rama no-grid (sin magic numbers)
export const GRID_WITH_RIR = `${COL_SET}px 1fr 1fr 46px 38px`
export const GRID_NO_RIR = `${COL_SET}px 1fr 1fr 38px`

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
    rir, setRir,
    notes, setType, saveDetails,
    isCompleted, setData, isValid, repsPlaceholder,
  } = useSetInputs({ sessionExerciseId, setNumber, exerciseId, measurementType, weightUnit, distanceUnit, previousSet, repsTarget })

  const { data: preferences } = usePreferences()
  const { mutate: updateSetVideo } = useUpdateSetVideo()
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoUploadError, setVideoUploadError] = useState(false)
  const [pendingVideoFile, setPendingVideoFile] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const showRirInput = preferences?.show_rir_input ?? true

  const handleCheckClick = () => {
    if (isCompleted) {
      onUncomplete({ sessionExerciseId, setNumber })
    } else if (isValid()) {
      // Un toque: registra la serie (con el RIR inline actual) e inicia el descanso.
      handleCompleteSet()
    }
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

  const handleCompleteSet = () => {
    // Incluye los detalles ya fijados inline / en la hoja antes de completar (rir, notas, tipo).
    const data = buildCompletedSetData(
      measurementType,
      { weight, reps, time, distance, calories, level, pace },
      { sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit, rirActual: rir, notes, setType }
    )
    onComplete(data, descansoSeg, { setNumber, totalSets, exerciseName })
  }

  // Guardar la hoja de detalles: tipo de serie y notas se persisten vía saveDetails (caché si
  // la serie no está completada aún, mutación si lo está), preservando el RIR. El vídeo va
  // aparte (solo en series completadas): añadir = subida en background; quitar = updateSetVideo.
  const handleModalSubmit = ({ notes: nextNotes, videoUrl: nextVideoUrl, videoFile, setType: nextSetType }) => {
    saveDetails({ notes: nextNotes, setType: nextSetType })
    setShowModal(false)
    if (videoFile) {
      uploadVideoInBackground(videoFile)
    } else if (isCompleted && !!setData?.videoUrl && !nextVideoUrl) {
      updateSetVideo({ sessionExerciseId, setNumber, videoUrl: null })
    }
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

  // Detalles desde el estado local (reflejan lo fijado antes o después de completar)
  const hasTextNote = !!notes
  const hasVideo = !!setData?.videoUrl
  const isDropset = setType === 'dropset'
  const isWeightReps = measurementType === MeasurementType.WEIGHT_REPS
  const showEffort = showRirInput && (isActive || isCompleted)
  const canOpenDetails = isActive || isCompleted

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

  const dropChipStyle = {
    backgroundColor: colors.orangeBg,
    color: colors.orange,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 800,
    width: 26,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }

  // Celda SET: identidad de la serie + puerta a los detalles. Absorbe el estado transitorio
  // de subida de vídeo (el vídeo es un detalle de la serie), el indicador de dropset y el
  // punto de "hay nota/vídeo". Solo es interactiva cuando la serie está completada.
  const renderSetCell = () => {
    if (isUploadingVideo) {
      return <span style={{ color: colors.purple, fontSize: 11, fontWeight: 600 }}>{uploadProgress}%</span>
    }
    if (videoUploadError) {
      return (
        <button onClick={handleRetryVideoUpload} title={t('common:buttons.retry')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <AlertCircle size={16} color={colors.danger} />
        </button>
      )
    }
    const content = isDropset
      ? <span style={dropChipStyle}>D</span>
      : <span style={setNumberStyle}>{setNumber}</span>
    // Filas futuras pendientes: número plano, no interactivo.
    if (!canOpenDetails) return content
    // Fila activa o completada: número/«D» en texto plano (sin caja, patrón Strong/Hevy — un
    // recuadro competiría con KG/REPS y parecería un input). Tocar = hoja de detalles; el área
    // de toque se amplía con padding transparente. El dropset («D») ya es su propia pastilla.
    return (
      <button onClick={() => setShowModal(true)} title={t('workout:set.moreOptions')}
        style={{
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none', padding: '4px 8px',
        }}>
        {/* punto de detalle anclado al glifo (nº o «D»), no al padding del botón */}
        <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
          {content}
          {(hasTextNote || hasVideo) && (
            <span style={{ position: 'absolute', top: -2, right: -3, width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.textLight }} />
          )}
        </span>
      </button>
    )
  }

  const renderCheckIndicator = () => {
    if (isCompleted) {
      return (
        <button
          onClick={handleCheckClick}
          className="w-8 h-8 flex items-center justify-center hover:opacity-80"
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

  return (
    <>
      {isWeightReps ? (
        <div
          className="grid items-center gap-3 py-2.5 px-2 rounded-lg"
          style={{ gridTemplateColumns: showRirInput ? GRID_WITH_RIR : GRID_NO_RIR, ...baseRowStyle }}
        >
          <div className="flex items-center justify-center">{renderSetCell()}</div>
          {renderInputs()}
          {showRirInput && (
            <div className="flex items-center justify-center">
              {showEffort && <EffortPicker value={rir} onChange={setRir} measurementType={measurementType} active={isActive} emptyDash />}
            </div>
          )}
          <div className="flex items-center justify-center">{renderCheckIndicator()}</div>
        </div>
      ) : (
        <div
          className="flex items-center gap-3 py-2.5 px-2 rounded-lg"
          style={baseRowStyle}
        >
          <div className="flex items-center justify-center" style={{ width: COL_SET, flexShrink: 0 }}>{renderSetCell()}</div>
          <div className="flex items-center gap-2 flex-1">{renderInputs()}</div>
          {showEffort && <EffortPicker value={rir} onChange={setRir} measurementType={measurementType} active={isActive} />}
          <div className="flex items-center justify-center">{renderCheckIndicator()}</div>
        </div>
      )}

      <SetDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
        setNumber={setNumber}
        allowVideo={isCompleted}
        initialNote={notes}
        initialVideoUrl={setData?.videoUrl}
        initialSetType={setType}
      />
    </>
  )
}

export default SetRow
