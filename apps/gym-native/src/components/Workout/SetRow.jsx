import { useState, memo } from 'react'
import { View, Text, Pressable } from 'react-native'
import { CheckCircle2, AlertCircle, Trophy } from 'lucide-react-native'
import { useIsPRSet } from './PRContext'
import SetDetailsModal from './SetDetailsModal'
import EffortPicker from './EffortPicker'
import SetValueInput from './SetInputs'
import SetRowMeta from './SetRowMeta'
import {
  DEFAULT_TRACKED_FIELDS,
  buildCompletedSetData,
  t,
  useSetInputs,
  useSetVideoUpload,
  shouldSuggestProgression,
  shouldShowAnnotationColumn,
  getSetColumns,
  tracksTime,
  effortRendersAsWord,
} from '@gym/shared'
import { usePreferences } from '../../hooks/usePreferences'
import { uploadVideo } from '../../lib/videoStorage'
import { colors } from '../../lib/styles'
import { LoadingSpinner } from '../ui'

// Layout columnar (deben coincidir fila y cabecera de SetsList): SET · [valores] · NOTAS · ✓.
// MISMO layout mida lo que mida el ejercicio: las columnas de valor (1 a 3) las decide
// `getSetColumns(trackedFields)` y su unidad va en la CABECERA (ver SetsList), no dentro de la
// fila. Es lo que permite que la fila lleve solo inputs flexibles y no se salga de la card.
// Ver docs/DECISIONS.md.
// La celda SET (número / «D») es SIEMPRE inerte: la entrada a la anotación (RIR + nota + vídeo)
// es el chip de la columna «Notas» (ver EffortPicker). La columna existe si hay algo que anotar
// (RIR, notas o vídeo; ver shouldShowAnnotationColumn). La referencia de la última sesión NO es
// columna: vive en la subfila SetRowMeta junto al aviso de progresión y al timer, siempre en el
// mismo sitio (antes ocupaba 46px fijos, que con 3 columnas de valor dejaban los inputs a ~26px).
// Fuente única de anchos (SetsList importa estas constantes para su cabecera → sin desincronizar).
// Afinados para móvil estrecho (360-390px): las fijas comen el hueco de los valores.
export const COL_SET = 32
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
export function getEffortColumnWidth(trackedFields, showEffortScale) {
  return effortRendersAsWord(trackedFields, showEffortScale) ? COL_RIR_WORD : COL_RIR
}

function SetRow({
  setNumber,
  totalSets,
  exerciseName,
  sessionExerciseId,
  exerciseId,
  trackedFields = DEFAULT_TRACKED_FIELDS,
  weightUnit = 'kg',
  distanceUnit = 'm',
  descansoSeg,
  previousSet,
  previousLoaded = false,
  target,
  targetField = null,
  levelTarget = null,
  effortTarget = null,
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
    isCompleted, setData, isValid, targetPlaceholder, targetField: resolvedTargetField, progressableValue,
  } = useSetInputs({ sessionExerciseId, setNumber, exerciseId, trackedFields, weightUnit, distanceUnit, previousSet, previousLoaded, target, targetField, levelTarget })

  const { data: preferences } = usePreferences()
  const [showModal, setShowModal] = useState(false)

  // Subida de vídeo (issue #31): el archivo elegido en la hoja se sube a MinIO EN CUANTO se
  // elige, complete o no la serie todavía — subir no depende de que exista fila en BD. Si la
  // serie aún no está completada, el resultado se queda en `preCompleteUrl` (solo en memoria,
  // nunca se escribe a `completed_sets`) hasta que el usuario completa: entonces viaja en el
  // MISMO payload de completar (una sola escritura, sin carrera contra la fila sin crear). Si ya
  // estaba completada, el vídeo se adjunta con el UPDATE de siempre. Orquestación compartida
  // web+native en `useSetVideoUpload` — ver docs/DECISIONS.md. `uploadVideo` nativo pide el uri
  // del asset, no el objeto entero → se adapta aquí, la única pieza específica de plataforma.
  const {
    isUploading: isUploadingVideo,
    progress: uploadProgress,
    hasError: videoUploadError,
    preCompleteUrl,
    upload: uploadVideoFile,
    retry: retryVideoUpload,
    reset: resetVideoUpload,
    removeVideo,
  } = useSetVideoUpload({ sessionExerciseId, setNumber, uploadVideo: (file, onProgress) => uploadVideo(file?.uri, onProgress) })

  const showRirInput = preferences?.show_rir_input ?? true
  // Columna «Notas» (entrada estable de anotación; el número nunca abre nada). Helper compartido
  // con SetsList → cabecera y filas nunca se desincronizan. Se colapsa solo con las 3 prefs off.
  const annotationColumn = shouldShowAnnotationColumn(preferences)

  const handleRetryVideoUpload = () => retryVideoUpload({ isCompleted })

  const handleCheckPress = () => {
    if (isCompleted) {
      onUncomplete({ sessionExerciseId, setNumber })
    } else if (isValid() && !isUploadingVideo) {
      // Un toque: registra la serie (con el RIR inline actual) e inicia el descanso. Bloqueado
      // mientras sube un vídeo elegido en la hoja: completar sin esperar lo dejaría huérfano
      // (ver useSetVideoUpload) — el botón «Completar» de la hoja tiene el mismo guard.
      handleCompleteSet()
    }
  }

  const handleCompleteSet = (notesOverride) => {
    // Incluye los detalles ya fijados inline / en la hoja antes de completar (rir, notas, tipo,
    // y el vídeo si ya terminó de subir — preCompleteUrl). notesOverride: la nota recién tecleada
    // en la hoja aún no está en `notes` (es estado local de la hoja, solo se vuelca al cerrar); al
    // completar desde la hoja se pasa explícita. `null` (nota vaciada) es un override válido →
    // distinguir de undefined (completar desde el check).
    const finalNotes = notesOverride !== undefined ? notesOverride : notes
    const data = buildCompletedSetData(
      trackedFields,
      { weight, reps, time, distance, calories, level, pace },
      { sessionExerciseId, exerciseId, setNumber, weightUnit, distanceUnit, rirActual: rir, notes: finalNotes, setType, videoUrl: preCompleteUrl ?? undefined },
    )
    onComplete(data, descansoSeg, { setNumber, totalSets, exerciseName })
  }

  // Completar desde el botón «Completar» de la hoja: vuelca la nota tecleada al estado local
  // (el chip de la fila queda en sync) y completa con el RIR/tipo vivos + esa nota + el vídeo si
  // ya terminó de subir (`preCompleteUrl`, leído dentro de `handleCompleteSet`). El botón está
  // deshabilitado mientras `isUploadingVideo` (ver SetDetailsModal), así que este handler no
  // puede dispararse a mitad de una subida — cierra la hoja siempre, sin excepciones.
  const handleCompleteFromModal = ({ notes: nextNotes }) => {
    saveDetails({ notes: nextNotes, setType })
    handleCompleteSet(nextNotes)
    setShowModal(false)
  }

  // Elegir un vídeo en la hoja dispara la subida YA (issue #31), complete o no la serie —
  // `useSetVideoUpload` decide el destino según `isCompleted` en ese instante.
  const handleSelectVideo = (file) => uploadVideoFile(file, { isCompleted })

  // Quitar el vídeo desde la hoja: si la serie ya está completada, borra en BD; si no, nunca se
  // escribió nada (pre-completar solo vive en memoria) — basta descartar el estado local.
  const handleRemoveVideoFromModal = () => {
    if (isCompleted) {
      removeVideo()
    } else {
      resetVideoUpload()
    }
  }

  // Al cerrar la hoja: la nota se persiste vía saveDetails (preservando RIR y el tipo actual, que
  // ya se fijó en vivo desde la hoja). RIR y tipo se persistieron en vivo (setRir/setSetType). El
  // vídeo de una serie NO completada ya se disparó al elegirlo (handleSelectVideo) — aquí no hay
  // nada más que hacer con él.
  const handleModalSubmit = ({ notes: nextNotes }) => {
    saveDetails({ notes: nextNotes, setType })
    setShowModal(false)
  }

  // Columnas de valor del ejercicio (1 a 3) + su estado. La cabecera (SetsList) lleva la unidad,
  // así que en la fila solo van inputs desnudos: es lo que deja que encojan sin desbordar.
  const columns = getSetColumns(trackedFields, { weightUnit, distanceUnit })
  const fieldState = {
    weight: [weight, setWeight],
    reps: [reps, setReps],
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
  // Cuenta atrás de la serie: solo en la fila activa y con una duración ya puesta. Va en la
  // subfila, fuera de la fila: dentro robaba el ancho de los inputs y descuadraba al arrancar.
  const showTimer = tracksTime(trackedFields) && isActive && !isCompleted && Number(time) > 0

  // Aviso de progresión (issue #13): esta serie cumplió el objetivo prescrito la última vez.
  // Se oculta al completar la serie o al teclear un progresable mayor que el anterior (nudge
  // cumplido). El progresable es el peso, o el NIVEL en los ejercicios que no miden peso.
  const showProgressionHint = progressionEnabled && !isCompleted &&
    shouldSuggestProgression({ previousSet, target, trackedFields, targetField, currentProgressable: progressableValue, effortTarget })

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
    // Cualquier fila con datos válidos se puede completar; isActive solo colorea el borde.
    // Bloqueado (disabled real, transitorio) mientras sube un vídeo elegido en la hoja — completar
    // sin esperar lo dejaría huérfano (issue #31, ver useSetVideoUpload); se pinta con spinner.
    const blocked = !isValid() || isUploadingVideo
    return (
      <Pressable
        onPress={handleCheckPress}
        disabled={blocked}
        hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel={t('workout:set.complete')}
        accessibilityState={{ disabled: blocked }}
        className="w-7 h-7 items-center justify-center active:opacity-70"
        style={{ opacity: blocked ? 0.6 : 1 }}
      >
        {isUploadingVideo
          ? <LoadingSpinner inline />
          : <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: isActive ? colors.success : colors.textMuted }} />}
      </Pressable>
    )
  }

  return (
    <>
      <View className="flex-row items-center py-2.5 px-1 rounded-lg" style={{ gap: SET_ROW_GAP, ...baseRowStyle }}>
        <View style={{ width: COL_SET, alignItems: 'center', justifyContent: 'center' }}>
          {renderSetCell()}
        </View>
        {columns.map(({ field, decimal }) => {
          const [value, onChange] = fieldState[field]
          // El objetivo de la rutina se pinta en la columna DE SU CAMPO (issue #28): en un cardio
          // "20min" es la pista de la columna de tiempo, no de la de reps (que no existe).
          // Se pinta CRUDO, tal como lo escribió el usuario ("20min", "20-30min", "5km"), aunque la
          // cabecera diga MM:SS o M: es la prescripción literal y los rangos se ven enteros.
          // Normalizarlo al formato de la caja convertiría "5km" en "5000". No lo "arregles".
          const placeholder = field === resolvedTargetField ? targetPlaceholder : undefined
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
          <View style={{ width: getEffortColumnWidth(trackedFields, showRirInput), alignItems: 'center', justifyContent: 'center' }}>
            {showEffort && <EffortPicker value={rir} trackedFields={trackedFields} note={notes} hasVideo={hasVideo}
              active={isActive} showEffortScale={showRirInput} onOpenDetails={() => setShowModal(true)} />}
          </View>
        )}
        <View style={{ width: COL_CHECK, alignItems: 'center', justifyContent: 'center' }}>
          {renderCheckIndicator()}
        </View>
      </View>

      <SetRowMeta
        previousSet={previousSet}
        trackedFields={trackedFields}
        weightUnit={weightUnit}
        distanceUnit={distanceUnit}
        showRir={showRirInput}
        showProgressionHint={showProgressionHint}
        target={target}
        targetField={targetField}
        timerSeconds={showTimer ? Number(time) : 0}
      />

      <SetDetailsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSubmit={handleModalSubmit}
        onComplete={isCompleted ? undefined : handleCompleteFromModal}
        canComplete={isValid()}
        setNumber={setNumber}
        isUploadingVideo={isUploadingVideo}
        uploadProgress={uploadProgress}
        onSelectVideo={handleSelectVideo}
        onRemoveVideo={handleRemoveVideoFromModal}
        initialNote={notes}
        initialVideoUrl={isCompleted ? setData?.videoUrl : preCompleteUrl}
        rir={rir}
        onRirChange={setRir}
        trackedFields={trackedFields}
        showEffortScale={showRirInput}
        setType={setType}
        onSetTypeChange={setSetType}
      />
    </>
  )
}

export default memo(SetRow)
