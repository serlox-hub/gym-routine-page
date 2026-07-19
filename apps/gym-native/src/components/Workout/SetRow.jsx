import { useState, memo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { CheckCircle2, AlertCircle, Trophy } from 'lucide-react-native'
import { useIsPRSet } from './PRContext'
import SetDetailsModal from './SetDetailsModal'
import EffortPicker from './EffortPicker'
import { WeightRepsInputs, RepsOnlyInputs, TimeInputs, WeightTimeInputs, DistanceInputs, LevelTimeInputs, LevelDistanceInputs, LevelCaloriesInputs, DistanceTimeInputs, DistancePaceInputs } from './SetInputs'
import PreviousSetCell from './PreviousSetCell'
import {
  MeasurementType,
  buildCompletedSetData,
  getNotifier,
  t,
  useSetInputs,
} from '@gym/shared'
import { usePreferences } from '../../hooks/usePreferences'
import { useUpdateSetVideo } from '../../hooks/useWorkout'
import { uploadVideo } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'

// Anchos de columna del layout columnar (deben coincidir con la cabecera de SetsList):
// SET · ANTERIOR · [inputs flex] · RIR · ✓.
// La columna ANTERIOR muestra la misma serie de la última sesión (ver PreviousSetCell); ancho
// fijo solo en weight_reps (para alinear con la cabecera); otros tipos usan ancho de contenido.
// Fuente única de anchos (SetsList importa estas constantes para su cabecera → sin desincronizar).
// Afinados para móvil estrecho (360-390px): las fijas comen el hueco de KG/REPS. Ver docs/DECISIONS.md.
export const COL_SET = 36
export const COL_PREV = 54
// COL_RIR/COL_CHECK se quedan en 42/34 (NO 44 como web): el área táctil de 44px se logra con
// hitSlop en los botones, no ensanchando la columna → se conserva el hueco de KG/REPS sin perder
// a11y. No subir a 44 "por paridad" ni bajar web a 34. Ver docs/DECISIONS.md (#10).
export const COL_RIR = 42
export const COL_CHECK = 34

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
      // Un toque: registra la serie (con el RIR inline actual) e inicia el descanso.
      handleCompleteSet()
    }
  }

  const handleCompleteSet = () => {
    // Incluye los detalles ya fijados inline / en la hoja antes de completar (rir, notas, tipo).
    const data = buildCompletedSetData(
      measurementType,
      { weight, reps, time, distance, calories, level, pace },
      { sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit, rirActual: rir, notes, setType },
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
    borderLeftWidth: 3,
    borderLeftColor: isCompleted ? colors.success : 'transparent',
  }

  const setNumberTextStyle = {
    textAlign: 'center',
    color: (isActive || isCompleted) ? colors.success : colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  }

  const dropChipStyle = {
    backgroundColor: colors.orangeBg,
    borderRadius: 6,
    width: 26,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  }

  // Celda SET: identidad de la serie + puerta a los detalles. Absorbe el estado transitorio
  // de subida de vídeo, el indicador de dropset y el punto de "hay nota/vídeo". Solo es
  // interactiva cuando la serie está completada.
  const renderSetCell = () => {
    if (isUploadingVideo) {
      return <Text style={{ color: colors.purple, fontSize: 11, fontWeight: '600' }}>{uploadProgress}%</Text>
    }
    if (videoUploadError) {
      return (
        <Pressable
          onPress={handleRetryVideoUpload}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
          accessibilityRole="button"
          accessibilityLabel={t('common:buttons.retry')}
          className="active:opacity-70"
        >
          <AlertCircle size={16} color={colors.danger} />
        </Pressable>
      )
    }
    const content = isDropset
      ? <View style={dropChipStyle}><Text style={{ color: colors.orange, fontSize: 12, fontWeight: '800' }}>D</Text></View>
      : <Text style={setNumberTextStyle}>{setNumber}</Text>
    // Filas futuras pendientes: número plano, no interactivo.
    if (!canOpenDetails) return content
    // Fila activa o completada: número/«D» en texto plano (sin caja, patrón Strong/Hevy — un
    // recuadro competiría con KG/REPS y parecería un input). Tocar = hoja de detalles; el área
    // de toque se amplía con padding + hitSlop. El dropset («D») ya es su propia pastilla.
    return (
      <Pressable
        onPress={() => setShowModal(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityRole="button"
        accessibilityLabel={t('workout:set.moreOptions')}
        className="active:opacity-70"
        style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, paddingVertical: 4 }}
      >
        {/* punto de detalle anclado al glifo (nº o «D»). Posición vertical anclada al CENTRO de fila
            (top:50% + translateY) — no al alto del glifo — para quedar a la MISMA altura que el punto
            de la columna ANTERIOR (texto más pequeño). Ver PreviousSetCell. */}
        <View style={{ position: 'relative' }}>
          {content}
          {(hasTextNote || hasVideo) && (
            <View style={{ position: 'absolute', top: '50%', right: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textLight, transform: [{ translateY: -9 }] }} />
          )}
        </View>
      </Pressable>
    )
  }

  const renderCheckIndicator = () => {
    if (isCompleted) {
      return (
        <Pressable onPress={handleCheckPress} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={t('workout:set.unmark')} className="w-7 h-7 items-center justify-center active:opacity-70">
          {isPR ? (
            // 22px iguala el diámetro relleno real del CheckCircle2 (size=26 → r=10 en viewbox 24)
            <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={14} color={colors.bgPrimary} strokeWidth={2.5} />
            </View>
          ) : (
            <CheckCircle2 size={26} color={colors.bgPrimary} fill={colors.success} strokeWidth={2.5} />
          )}
        </Pressable>
      )
    }
    // Cualquier fila con datos válidos se puede completar; isActive solo colorea el borde
    return (
      <Pressable
        onPress={handleCheckPress}
        disabled={!isValid()}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('workout:set.complete')}
        accessibilityState={{ disabled: !isValid() }}
        className="w-7 h-7 items-center justify-center active:opacity-70"
        style={{ opacity: isValid() ? 1 : 0.6 }}
      >
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isActive ? colors.success : colors.textMuted }} />
      </Pressable>
    )
  }

  return (
    <>
      <View className="flex-row items-center py-2.5 px-1 rounded-lg" style={{ gap: 8, ...baseRowStyle }}>
        <View style={{ width: COL_SET, alignItems: 'center', justifyContent: 'center' }}>
          {renderSetCell()}
        </View>
        {/* Columna ANTERIOR: ancho fijo en weight_reps (alinea con la cabecera); en otros tipos
            ancho de contenido para no truncar valores largos (p. ej. ritmo "5km @ 5:00/km"). */}
        <View style={{ width: isWeightReps ? COL_PREV : undefined, flexShrink: 0, alignItems: 'center', justifyContent: 'center' }}>
          <PreviousSetCell previousSet={previousSet} measurementType={measurementType} weightUnit={weightUnit} timeUnit={timeUnit} distanceUnit={distanceUnit} />
        </View>
        <View className="flex-row items-center flex-1" style={{ gap: 8 }}>
          {renderInputs()}
        </View>
        {/* Columna RIR: se colapsa si show_rir_input está off (misma condición que la cabecera).
            weight_reps: ancho fijo (alineada). Otros tipos: ancho natural (la etiqueta «Esfuerzo»
            no cabe en 46px y no hay cabecera que la alinee). */}
        {showRirInput && (
          <View style={{ width: isWeightReps ? COL_RIR : undefined, alignItems: 'center', justifyContent: 'center' }}>
            {showEffort && <EffortPicker value={rir} onChange={setRir} measurementType={measurementType} active={isActive} emptyDash={isWeightReps} />}
          </View>
        )}
        <View style={{ width: COL_CHECK, alignItems: 'center', justifyContent: 'center' }}>
          {renderCheckIndicator()}
        </View>
      </View>

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

export default memo(SetRow)
