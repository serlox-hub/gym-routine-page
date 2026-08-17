import { useState, memo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { CheckCircle2, AlertCircle, Trophy } from 'lucide-react-native'
import { useIsPRSet } from './PRContext'
import SetDetailsModal from './SetDetailsModal'
import EffortPicker from './EffortPicker'
import SetValueInput from './SetInputs'
import ExecutionTimer from './ExecutionTimer'
import PreviousSetCell from './PreviousSetCell'
import ProgressionHint from './ProgressionHint'
import {
  MeasurementType,
  buildCompletedSetData,
  getNotifier,
  t,
  useSetInputs,
  shouldSuggestProgression,
  shouldShowAnnotationColumn,
  getSetColumns,
  measurementTypeUsesTime,
  effortRendersAsWord,
} from '@gym/shared'
import { usePreferences } from '../../hooks/usePreferences'
import { useUpdateSetVideo } from '../../hooks/useWorkout'
import { uploadVideo } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'

// Layout columnar (deben coincidir fila y cabecera de SetsList): SET · ÚLTIMA · [valores] · NOTAS · ✓.
// MISMO layout para TODOS los measurement types: las columnas de valor (1 o 2) las decide
// `getSetColumns(measurementType)` y su unidad va en la CABECERA (ver SetsList), no dentro de la
// fila. Antes los tipos que no eran weight_reps metían unidades inline ("nv × 1200 s") con anchos
// fijos que no encogían → la fila se salía de la card. Ver docs/DECISIONS.md.
// La celda SET (número / «D») es SIEMPRE inerte: la entrada a la anotación (RIR + nota + vídeo)
// es el chip de la columna «Notas» (ver EffortPicker). La columna existe si hay algo que anotar
// (RIR, notas o vídeo; ver shouldShowAnnotationColumn). La columna ANTERIOR muestra la misma serie
// de la última sesión (ver PreviousSetCell), sin unidades (las dice la cabecera) y elidiendo.
// Fuente única de anchos (SetsList importa estas constantes para su cabecera → sin desincronizar).
// Afinados para móvil estrecho (360-390px): las fijas comen el hueco de los valores.
export const COL_SET = 32
export const COL_PREV = 46
// COL_RIR/COL_CHECK se quedan en 42/34 (NO 44 como web): el área táctil de 44px se logra con
// hitSlop en los botones, no ensanchando la columna → se conserva el hueco de los valores sin
// perder a11y. No subir a 44 "por paridad" ni bajar web a 34. Ver docs/DECISIONS.md (#10).
const COL_RIR = 42
// La escala RPE pinta PALABRAS ("Moderado"), no "@2": su columna necesita más ancho o el chip
// se sale de la celda. Ver EffortPicker.
const COL_RIR_WORD = 62
export const COL_CHECK = 34
export const SET_ROW_GAP = 6
// Barra izquierda de "hecho" (lima) que llevan TODAS las filas, transparente en las no completadas
// para no descuadrar. La cabecera la compensa con el mismo padding o quedaría 3px desplazada.
export const SET_ROW_ACCENT = 3

/** Ancho de la columna «Notas»: la escala RPE pinta palabras, la RIR el compacto "@2". */
export function getEffortColumnWidth(measurementType, showEffortScale) {
  return effortRendersAsWord(measurementType, showEffortScale) ? COL_RIR_WORD : COL_RIR
}

function SetRow({
  setNumber,
  totalSets,
  exerciseName,
  sessionExerciseId,
  exerciseId,
  measurementType = MeasurementType.WEIGHT_REPS,
  weightUnit = 'kg',
  distanceUnit = 'm',
  descansoSeg,
  previousSet,
  repsTarget,
  rirTarget = null,
  progressionEnabled = false,
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
    notes, setType, saveDetails, setSetType,
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
  // Columna «Notas» (entrada estable de anotación; el número nunca abre nada). Helper compartido
  // con SetsList → cabecera y filas nunca se desincronizan. Se colapsa solo con las 3 prefs off.
  const annotationColumn = shouldShowAnnotationColumn(preferences)

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

  const handleCompleteSet = (notesOverride) => {
    // Incluye los detalles ya fijados inline / en la hoja antes de completar (rir, notas, tipo).
    // notesOverride: la nota recién tecleada en la hoja aún no está en `notes` (es estado local
    // de la hoja, solo se vuelca al cerrar); al completar desde la hoja se pasa explícita. `null`
    // (nota vaciada) es un override válido → distinguir de undefined (completar desde el check).
    const finalNotes = notesOverride !== undefined ? notesOverride : notes
    const data = buildCompletedSetData(
      measurementType,
      { weight, reps, time, distance, calories, level, pace },
      { sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit, rirActual: rir, notes: finalNotes, setType },
    )
    onComplete(data, descansoSeg, { setNumber, totalSets, exerciseName })
  }

  // Completar desde el botón «Completar» de la hoja: vuelca la nota tecleada al estado local
  // (el chip de la fila queda en sync) y completa con el RIR/tipo vivos + esa nota. saveDetails
  // solo cachea (la serie aún no está completada); la escritura al servidor la hace la mutación
  // de completar con la nota ya en el payload → una sola escritura.
  const handleCompleteFromModal = ({ notes: nextNotes }) => {
    setShowModal(false)
    saveDetails({ notes: nextNotes, setType })
    handleCompleteSet(nextNotes)
  }

  // Al cerrar la hoja: la nota se persiste vía saveDetails (preservando RIR y el tipo actual, que
  // ya se fijó en vivo desde la hoja). El vídeo va aparte (solo en series completadas): añadir =
  // subida en background; quitar = updateSetVideo. RIR y tipo se persistieron en vivo (setRir/setSetType).
  const handleModalSubmit = ({ notes: nextNotes, videoUrl: nextVideoUrl, videoFile }) => {
    saveDetails({ notes: nextNotes, setType })
    setShowModal(false)
    if (videoFile) {
      uploadVideoInBackground(videoFile)
    } else if (isCompleted && !!setData?.videoUrl && !nextVideoUrl) {
      updateSetVideo({ sessionExerciseId, setNumber, videoUrl: null })
    }
  }

  // Columnas de valor del tipo de medición (1 o 2) + su estado. La cabecera (SetsList) lleva la
  // unidad, así que en la fila solo van inputs desnudos: es lo que deja que encojan sin desbordar.
  const columns = getSetColumns(measurementType, { weightUnit, distanceUnit })
  const fieldState = {
    weight: [weight, setWeight],
    reps: [reps, setReps, repsPlaceholder],
    time: [time, setTime],
    distance: [distance, setDistance],
    calories: [calories, setCalories],
    level: [level, setLevel],
    pace: [pace, setPace],
  }

  // Detalles desde el estado local (reflejan lo fijado antes o después de completar)
  const hasVideo = !!setData?.videoUrl
  const isDropset = setType === 'dropset'
  // El chip (entrada de anotación) se muestra en la fila activa o completada si la columna existe.
  const showEffort = annotationColumn && (isActive || isCompleted)
  // Cuenta atrás de la serie: solo en la fila activa y con una duración ya puesta. Va como
  // subfila, fuera de la fila: dentro robaba el ancho de los inputs y descuadraba al arrancar.
  const showTimer = measurementTypeUsesTime(measurementType) && isActive && !isCompleted && Number(time) > 0

  // Aviso de progresión (issue #13): esta serie llegó al tope del rango la última vez.
  // Se oculta al completar la serie o al teclear un peso mayor que el anterior (nudge cumplido).
  const showProgressionHint = progressionEnabled && !isCompleted &&
    shouldSuggestProgression({ previousSet, repsTarget, measurementType, currentWeight: weight, rirTarget })

  // "Hecho" se marca con lima SÓLIDO (barra izquierda), no con relleno translúcido:
  // el lima #BEFF00 en alpha sobre el navy vira a oliva. Completada y activa comparten
  // relleno neutro sutil; la barra lima distingue lo hecho; la activa muestra sus inputs
  // en caja lima (ver renderInputs); pendiente = transparente.
  // (Todas llevan 3px de borde izq. transparente para no descuadrar el layout.)
  const baseRowStyle = {
    backgroundColor: (isCompleted || isActive) ? colors.bgHover : 'transparent',
    borderLeftWidth: SET_ROW_ACCENT,
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

  // Celda SET: identidad de la serie (número / «D» dropset). SIEMPRE inerte — la entrada a la
  // anotación es el chip de la columna «Notas» (ver EffortPicker), que lleva el glifo/punto de
  // detalle. La celda solo absorbe el estado transitorio de subida de vídeo (%/reintento).
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
    return isDropset
      ? <View style={dropChipStyle}><Text style={{ color: colors.orange, fontSize: 12, fontWeight: '800' }}>D</Text></View>
      : <Text style={setNumberTextStyle}>{setNumber}</Text>
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
      <View className="flex-row items-center py-2.5 px-1 rounded-lg" style={{ gap: SET_ROW_GAP, ...baseRowStyle }}>
        <View style={{ width: COL_SET, alignItems: 'center', justifyContent: 'center' }}>
          {renderSetCell()}
        </View>
        <View style={{ width: COL_PREV, alignItems: 'center', justifyContent: 'center' }}>
          <PreviousSetCell previousSet={previousSet} measurementType={measurementType} weightUnit={weightUnit} distanceUnit={distanceUnit} showRir={showRirInput} />
        </View>
        {columns.map(({ field, decimal }) => {
          const [value, onChange, placeholder] = fieldState[field]
          return (
            <View key={field} style={{ flex: 1 }}>
              <SetValueInput field={field} decimal={decimal} value={value} onChange={onChange}
                placeholder={placeholder} active={isActive} />
            </View>
          )
        })}
        {/* Columna «Notas»: se colapsa si RIR, notas y vídeo están off (misma condición
            annotationColumn que la cabecera). Más ancha con la escala RPE (palabras). */}
        {annotationColumn && (
          <View style={{ width: getEffortColumnWidth(measurementType, showRirInput), alignItems: 'center', justifyContent: 'center' }}>
            {showEffort && <EffortPicker value={rir} measurementType={measurementType} note={notes} hasVideo={hasVideo}
              active={isActive} showEffortScale={showRirInput} onOpenDetails={() => setShowModal(true)} />}
          </View>
        )}
        <View style={{ width: COL_CHECK, alignItems: 'center', justifyContent: 'center' }}>
          {renderCheckIndicator()}
        </View>
      </View>

      {showTimer && <ExecutionTimer seconds={Number(time)} />}

      {showProgressionHint && <ProgressionHint prevReps={previousSet.reps} repsTarget={repsTarget} />}

      <SetDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
        onComplete={isCompleted ? undefined : handleCompleteFromModal}
        canComplete={isValid()}
        setNumber={setNumber}
        allowVideo={isCompleted}
        initialNote={notes}
        initialVideoUrl={setData?.videoUrl}
        rir={rir}
        onRirChange={setRir}
        measurementType={measurementType}
        showEffortScale={showRirInput}
        setType={setType}
        onSetTypeChange={setSetType}
      />
    </>
  )
}

export default memo(SetRow)
