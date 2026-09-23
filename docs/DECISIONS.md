# Decisiones e implementaciones

Solo lo que una sesión futura, leyendo el código, podría deshacer por no saber el porqué:
decisiones, alternativas descartadas, trampas. Lo que ya dice el código o `CLAUDE.md` no va aquí.

**Se poda.** Una entrada cuyo código ya no existe o cuya decisión se revirtió se borra, no se
parchea con "SUPERADO": git guarda la historia. Al tocar el código que describe una entrada,
reescríbela para que diga lo vigente. Reglas completas en `CLAUDE.md` → "Contexto para futuros
agentes".

Formato: `## AAAA-MM · Título` y bullets `**Clave:** motivo/trampa`, cortos.

---

## 2026-07 · GIFs de ejercicios (issue #6)
- **Ruta con subcarpeta `gif/` obligatoria** (sin ella, 404): `.../public/exercise-gifs/gif/<gif_key>_<180|360|720>.gif`. Tamaño por superficie para ahorrar egress: 180 listas, 360 sesión, 720 pantalla completa.
- **Native usa `expo-image`**: el `<Image>` de RN no anima GIF en Android. Es módulo nativo (rebuild del dev client).
- **`cache-control: no-cache` en el endpoint público NO es bug nuestro:** el Smart CDN que honra el `cacheControl` del objeto es solo del plan Pro. Probado sin efecto: re-subir con `cacheControl` y editar `storage.objects.metadata` por SQL. La metadata sí queda bien, así que todo upload debe seguir pasando `cacheControl: '31536000'`. Con `no-cache` + etag el navegador revalida (304), no re-descarga.
- **Web no cachea GIFs con Workbox a propósito:** un `CacheFirst` tendría que cachear respuestas opacas (`<img>` no-cors da `status 0`, indistinguible de un error) y un fallo transitorio quedaría pegado. Native sí usa `cachePolicy="memory-disk"`.
- **Sin GIF en la ficha ni en el historial** (decisión de producto): va en sesión y catálogo, no en el modal de progreso.
- **El panel de instrucciones se oculta, no se desmonta** (`useLazyMountToggle`): desmontar re-pedía el GIF en cada apertura.
- **La base de GIFs alternativa (`gifBaseUrl`) solo se honra fuera de producción** (`import.meta.env.DEV` / `__DEV__`). Existe porque el bucket de la Supabase local está vacío. Es una redirección global y silenciosa: para servir GIFs desde una CDN en producción hay que quitar el guard a conciencia.
- ⚠️ **`buildSessionExercisesCache` duplica la forma del `exercise` de `fetchSessionExercises`.** Siembra la caché al arrancar desde rutina y el `staleTime` la da por fresca. Un campo nuevo del ejercicio hay que añadirlo a los dos y al select de `fetchRoutineDayExercises`, o faltará solo en sesiones recién iniciadas (así se perdió `gif_key`).

## 2026-07 · Buscador de ejercicios por subsecuencia
- **Dos punteros, no regex `.*p.*m.*r.*`:** un regex construido con input del usuario obliga a escapar y expone a ReDoS.
- **El ranking evita el ruido, no un filtro** (`fuzzyMatchScore`): exacta > prefijo > contigua > dispersa, desempate por cobertura. Con query vacía se conserva el orden de la lista.
- **Límite conocido:** la query colapsa espacios, así que el orden de palabras importa ("banca press" no encuentra "Press de banca").

## 2026-07 · Instrucciones en español de España (migración 050)
- **050 empareja por `name_en`**, no por `name_es`, porque los `name_es` de prod pueden variar. La 025 (español latino) no se editó: las migraciones aplicadas no se tocan.
- **Se mantuvo `pantorrilla`:** es válido en España y coincide con el grupo muscular; cambiarlo tocaría la taxonomía de `muscle_groups`.

## 2026-07 · Detección de PR en sesión: se recalcula todo, no se acumula
- **Trofeo y toast salen de un único recálculo desde cero** (`computeExercisePRSets`) cada vez que cambian las series. Un acumulador no puede deshacer la contribución de una serie editada o descompletada. No volver a un `checkSetForPR` imperativo.
- **Sin spam:** cada serie celebra una vez por sesión (`notifiedKeysRef`) y el primer pase siembra en silencio, para que una sesión restaurada no repita PRs viejos.
- **Los bests previos se piden en lote** (`prewarmPreSessionBests`) y el bucle solo lee caché (`readPreSessionBests`). Si leer pudiera pedir red, un fallo del lote volvería a N peticiones en serie en el mismo pase. Un fallo de red no se cachea: se reintenta en el siguiente recálculo.
- **Los PRs son por gym:** cambiar de gym dispara `resetPRState`, y ese efecto va declarado antes que el de derivación para limpiar la caché antes de releerla.

## 2026-07 · Progreso y filas de la sesión
- **Nº de filas = `series` de la rutina, no las de la última sesión.** No reintroducir el efecto que igualaba las filas a la sesión anterior: parece "repetir lo de la última vez" y es lo contrario de lo planificado.
- **La barra de progreso cuenta series, segmentada por ejercicio** (ancho ∝ series, sin calentamiento). La geometría (`fillPct`) sale de `calculateExerciseLevelProgress` para que web y native no diverjan. El total de ejercicios no va en la barra (petición del usuario).

## 2026-09 · La fila de serie (layout y anotación)
- **Completar es un toque; el check nunca abre nada** (#8). Antes un modal por serie re-pedía peso/reps y metía fricción en la acción más frecuente.
- **Una sola hoja (`SetDetailsModal`) con las cuatro secciones:** esfuerzo, tipo, nota y vídeo. Se abre desde el chip de la columna «Notas»; la celda del número es siempre inerte. Cerrar guarda: RIR y tipo persisten en vivo, nota y vídeo al cerrar. Descartado un popover con textarea: en móvil el teclado lo tapa y el vídeo necesita superficie.
- **«Completar» dentro de la hoja, no "check abre la hoja y cerrar completa"** (propuesta del usuario, descartada con él): sobrecargaría el check (¿cómo se descompleta?) y cerrar por accidente completaría. Solo se ofrece si la serie no está completada; el historial nunca lo pasa. La nota va explícita en el payload porque el estado del hook va un tick por detrás.
- **Cada sección tiene su preferencia** (`show_rir_input`, `show_set_notes`, `show_video_upload`, `show_set_type`) y la columna «Notas» solo desaparece con las cuatro apagadas (`shouldShowAnnotationColumn`). Por eso no hace falta una segunda entrada a la hoja: con las cuatro off no habría nada que mostrar. ⚠️ Una 5ª sección sin preferencia propia rompe este razonamiento. Si la columna existe solo por tipo o vídeo, se rotula «Detalles», no «Notas».
- **Mismo grid para cualquier combinación de campos** (`getSetColumns`): la unidad va en la cabecera y la fila lleva inputs `w-full` en tracks `minmax(0,1fr)`, que no pueden desbordar. La rama flex con unidades inline se salía de la card.
- **Anchos (360-390px, #10):** web usa 44px para ✓ y «Notas» (área táctil); native se queda en 42/34 y consigue los 44 con `hitSlop`. No igualar "por paridad". Si falta ancho, se recorta SET o el gap, nunca ✓/«Notas». En RPE la columna crece a 62px porque pinta palabras (`effortRendersAsWord`, que fila, cabecera y chip deben resolver igual).
- **`index.css` quita las flechitas de `input[type=number]` globalmente:** Chrome les reserva ~14px dentro del input y recortaban el valor.
- **La referencia de la última vez, el aviso de progresión y el timer van en la subfila `SetRowMeta`**, no en columnas: con tres campos, una columna fija de 46px dejaba los inputs a ~26px. Sin referencia no se pinta nada.
- **Fila y subfila comparten un contenedor** (#39) con un único inset izquierdo (barra de 3px + `px-1`), que la cabecera de `SetsList` compensa entera. Si el grid interior recupera padding horizontal, las columnas se desalinean de sus etiquetas. La separación entre bloques (12px) debe ser mayor que el padding interior (8px), o la fila se agrupa con la subfila de abajo.
- **Fondos, un significado por canal:** `bgHover` = serie activa; barra lima sólida + check = hecha; `bgHoverSubtle` = el resto, pendientes incluidas (sin relleno el bloque pierde sus bordes).
- **El chip de «Notas» se pinta en todas las filas**; el borde de invitación, solo en la activa.
- **El padding horizontal de la tarjeta se queda en 16px:** es una de las restas de la aritmética de `MAX_TRACKED_FIELDS`. El aire extra de #39 es solo vertical.

## 2026-07 · Tipos de serie: solo `normal` y `dropset`
- **No hay tipo "fallo":** el fallo ya es RIR `F` (`-1`).
- **Las series de aproximación por serie se aplazan, no se descartan.** Añadir el valor es barato (`set_type` es texto sin CHECK), pero hoy stats, PRs y volumen ignoran `set_type`. Sin enseñarles a excluir esas series, un badge "calentamiento" contaría como serie efectiva y engañaría. No confundir con `is_warmup`, que es por ejercicio.

## 2026-08 · Esfuerzo: nunca el número crudo
- **Siempre `formatEffortBadge`:** en RPE el número guardado es un índice y la palabra es el dato. Sin campos, `normalizeTrackedFields` cae a peso × reps y por tanto a RIR: caer a RPE pintaría una palabra falsa ("Moderado").
- **Un solo formatter:** se probó `formatEffortText` ("RIR 2") y se descartó; `getEffortLabel` ya da el rótulo de la escala aparte.
- **Datos legados fuera de escala se pintan crudos** y el formulario los descarta al cargar (`buildExerciseConfigFormFromRow`): validarlos dejaría el formulario imposible de guardar.
- **Pendiente (issue #21):** `importRoutine` inserta `rir` sin validarlo con `isValidEffortValue`.

## 2026-08 · Config de ejercicio: validar, nunca defaults silenciosos
- **El default silencioso estaba también en la capa de API** (`series || 3`, `reps || '8-12'` en los inserts). Arreglar el parser sin los inserts no cerraba el bug: si reaparece un default así, buscar en `api/` además de en `lib/`.
- **`series` se mantiene en cardio:** es NOT NULL y decide cuántas filas genera la sesión (3 × 30 s a nivel 8 son tres intervalos).
- ⚠️ **`handleReplace` no valida a propósito:** en modo reemplazo no se pinta el formulario, así que un `if (!valid) return` sería un callejón mudo, y una fila legada con `series = 0` bloquearía el reemplazo para siempre.
- **`rest_seconds` usa `?? null`:** el descanso 0 es válido.

## 2026-08 · `tracked_fields`: el ejercicio declara qué mide (issue #27)
- **Sustituye al enum de 12 tipos cerrados**, que no podía expresar nivel + distancia + tiempo. `legacyParity.test.js` congela que las reglas derivadas reproducen los 12 casos antiguos.
- **PR solo si la marca es comparable** (una dimensión, o peso × reps vía 1RM, o ritmo). La bici de tres campos no dispara PRs: más distancia a menos nivel no es mejor ni peor.
- **`MAX_TRACKED_FIELDS = 3` es límite de layout, no de modelo.** La aritmética vive solo en su JSDoc; no copiar cifras aquí.
- **Toda lectura normaliza** (`normalizeTrackedFields`): el orden en BD es irrelevante a propósito.
- **`trackedFieldsFromLegacyType` no se borra nunca:** un JSON exportado hace meses tiene que seguir importándose. Detalle en `docs/routine-io.md`.
- **En ritmo menor es mejor** (`lowerIsBetter`), y el ritmo va detrás de la distancia en `CHART_FIELD_PRIORITY` para que distancia × ritmo se resuma por distancia.
- ⚠️ **Divergencia conocida:** el RPC `recalculate_exercise_prs` marca flags de PR por columna sin saber qué mide el ejercicio (puede marcar `is_pr_time` donde `getPRMetrics` es `[]`). Solo se ve tras borrar una sesión.

## 2026-08 · Papeles de los campos: objetivo y progresable (issue #28)
- **El campo objetivo se guarda en `routine_exercises.target_field`** (+ snapshot en sesión), no en `exercises`: permite "bici 20 min" el lunes y "5 km" el jueves.
- **El progresable es derivado** (`getProgressableField`: peso si lo mide, si no nivel), sin columna. Nadie pidió elegirlo.
- **`reps` no se renombra a `target`:** es el valor ("8-12", "20min") y renombrarlo tocaría store, API, export y UI sin cambiar el modelo.
- **El objetivo se pinta crudo en su columna** ("5km" bajo una cabecera M): normalizarlo convertiría lo que escribió el usuario en "5000". Avisado en `SetRow`.
- **El nivel prescrito solo siembra si no hay nada mejor:** lo de la última vez manda. `useSetInputs` espera a `previousLoaded` o el prescrito ganaría la carrera.
- **Cambiar el campo objetivo resetea el valor** (`buildTargetFieldChangeForm`): "8-12" pasado a tiempo se leería como segundos.
- **Backfill (056):** la bici quedó con objetivo en distancia. Se cambia a mano y no se avisa (decisión del usuario).
- **Los PRs de nivel y calorías quedan fuera:** `exercise_session_stats` no tiene columnas para ellos.

## 2026-07 · Progresión automática (issue #13)
- **Doble progresión por serie:** cada serie se compara con la misma serie de la última sesión. Solo necesita la última sesión, que ya se trae.
- **El aviso es direccional ("Sube el peso" / "Sube el nivel"), sin cifra.** El salto depende del equipo (mancuernas de 2 en 2, stacks no lineales) y un número equivocado destruye más confianza que no darlo. Por eso se eliminó el incremento configurable (`weight_increment`, `resolveWeightIncrement`): no volver a añadirlo.
- **Sin acción "bajar":** una serie corta es ruido o fatiga normal, y bajar por varianza puede entrar en espiral. Necesita su propio diseño intra-sesión.
- **Solo aviso, nunca rellena inputs**, y se apaga al completar o al teclear un valor mayor. Vive en `SetRow` porque necesita lo tecleado en vivo.
- **Gate de esfuerzo:** llegar al tope de reps con más esfuerzo del prescrito no gana la subida. `metEffortTarget` usa `== null`, no falsy: un RIR 0 es el caso donde más importa. Invierte el sentido en RPE. Sin RIR real u objetivo, degrada a solo reps. El objetivo es el snapshot de la sesión, así que editar la rutina a mitad no lo cambia.

## 2026-07 · Referencia «Anterior»: por gym y por día de rutina
- **El gym es filtro duro; el día de rutina es preferencia con fallback** a la última del ejercicio en ese gym. Estricto por día saldría vacío demasiado a menudo, y Strong/Hevy la mantienen global a propósito.
- **Se empareja por `routine_day_id`, no por `day_name`:** el nombre es editable. Si viene de otro día se muestra el nombre ACTUAL de ese día.
- ⚠️ **La query se gatea por `sessionId`, no por `gymId`.** `gymId == null` es ambiguo: sesión aún no cargada o sesión sin gym. Gatear por `gymId` ocultaría «Anterior» en las sesiones sin gym. Funciona porque el store fija `sessionId` y `gymId` en el mismo `set()`. Regla general: no gatear por el valor segregador cuando su null es ambiguo.
- **Borde conocido:** en una sesión sin gym, «Anterior» puede venir de cualquier gym. No unificar a ciegas: `gymId = null` también significa "todos los gyms" en historial.
- **Es la única query con embed de dos niveles filtrando el intermedio** (`session_exercises → workout_sessions!inner → routine_days`). Si «Anterior» falla, mirar aquí primero.

## 2026-07 · `useSetInputs`: estado local sembrado una sola vez
- **Editar una serie completada escribe con debounce de 600ms** (`useUpdateCompletedSet`), sin rest timer ni háptico: por eso no reusa `useCompleteSet`. El flush en unmount guarda lo pendiente; el commit es idempotente.
- **Vaciar un campo persiste como `null`**, no se descarta la clave: el merge del store resucitaría el valor viejo.
- ⚠️ **Los inputs se siembran una vez y el commit reescribe el store.** Toda mutación externa de un valor en vivo debe señalizarse o `useSetInputs` la ignora y la revierte. Hay dos señales, elegir por alcance: `weightConversionNonce` (global, re-siembra todas las filas) y `exerciseResetNonces` (por fila).
- **La unidad de distancia llega tarde** (un tick después) y puede cambiar con la tarjeta abierta: un efecto reconvierte el valor local. Sin él, el debounce reescribía la serie ×1000 en BD.
- **Sugerencia sembrada vs dato del usuario** (#39): la sugerencia se pinta atenuada y se detecta COMPARANDO con lo que se sembraría ahora (`isSuggestedValue`, con `getSuggestedSetValues` como fuente única). Se probó rastrear lo tecleado y murió: el debounce escribe la sugerencia en `cachedSetData` a los 600ms sin que el usuario toque nada. Contrapartida: teclear lo mismo que la última vez se sigue viendo atenuado.
- **Reemplazar un ejercicio no remonta las filas** (#72): la key es `${sessionExerciseId}-${n}` y no cambia. Se resetea con `exerciseResetNonces`, porque la prop `exerciseId` llega una vuelta de red tarde, cuando el debounce ya ha reescrito los valores viejos. Descartado re-keyear por `exercise.id`: el flush de desmontaje resucita los valores viejos bajo la misma key. El nivel prescrito heredado se bloquea por VALOR hasta que llega otro distinto. `clearExercise` vacía también `pendingSets`, o el reintento subía series del ejercicio viejo.
- **Al cambiar de gym, las sugerencias se refrescan, no se convierten:** son "lo que hiciste en ESE gym". ⚠️ El prefill no guarda el `undefined` transitorio de «Anterior» mientras recarga (`if (!previousSet) return`), o la detección por identidad falla con caché fría. Relajar ese guard reintroduce el parpadeo.

## 2026-07 · Unidad de peso por (ejercicio, gym)
- **Runtime, no stamping:** el commit `350c37c` quitó `completed_sets.weight_unit` a propósito; se resuelve en runtime y se convierte en bloque con `convert_user_weights`.
- **Tabla propia (`user_exercise_gym_units`)**, separada de `user_exercise_overrides`, porque las notas son por ejercicio y meter `gym_id` las fragmentaría.
- **"Todos los gyms" en el historial convierte al vuelo** gráfica, lista y stats a la unidad del gym por defecto (`convertSessionsToDisplayUnit`). Espera a `useExerciseUnitsByGym` y toma la unidad destino de ahí, no de `useResolvedWeightUnit`, para no pintar un instante con la unidad equivocada.
- ⚠️ **Coherencia:** la conversión del gym por defecto es no-op porque `useResolvedWeightUnit` y `useExerciseUnitsByGym` leen la misma fuente. Si divergen, se rompe.
- **Trade-off:** `fetchExerciseHistorySummary` no pagina, para que máx peso y 1RM sean exactos. Puede crecer en usuarios muy activos.
- ⚠️ **`fetchExerciseAllTimeStats({ gymId: null })` agregaría pesos crudos entre gyms.** Hoy no tiene consumidor; si se usa así, convertir o filtrar.

## 2026-07 · Cambio de gym a mitad de sesión
- **Se convierten los pesos ya registrados**, con toast y sin modal: es corregir "me equivoqué de gym", no una mudanza.
- **El bloqueo era la detección, no la escritura:** se prefetchean todas las unidades del usuario (`useAllUserExerciseGymUnits`, `staleTime: Infinity`) para detectar en local y offline.
- **RPC atómico `change_session_gym` con los pesos calculados por el cliente**: cliente y servidor coinciden exactos, sin re-derivar unidades en SQL. La cola `pendingGymChange` se persiste y guarda el snapshot completo, así que varios cambios offline convergen.
- **`applyWeightConversions` convierte también `pendingSets`**, o una serie completada offline se subiría sin convertir.

## 2026-07 · Editar el fin de una sesión desde el historial
- **Se edita fecha y hora del fin, acotado a [inicio, ahora]** por `resolveSessionEnd` (fuente única). El inicio no se toca.
- **Native usa `@react-native-community/datetimepicker`** (módulo nativo, rebuild del dev client). Android no tiene modo `datetime`: se encadenan fecha y hora, y el clamp hace de red si no respeta min/max.

## 2026-07 · Ejercicio abierto del acordeón persistido
- **Write-through al store**: el Provider lee `expandedExerciseKey` al montar y escribe cada cambio. Evita el flash de usar el store como única fuente.
- **Tres estados:** `undefined` = auto (primer ejercicio), `null` = todo colapsado (elección del usuario), string = card. `JSON.stringify` omite `undefined`, así que sobrevive a la persistencia.
- **`restoreSession` no lo resetea a propósito;** `startSession`/`endSession` sí.

## 2026-07 · Inputs numéricos: caret al final y sugerencia seleccionada
- **Web no puede usar `setSelectionRange` en `type=number`** (lanza): se reasigna el value dentro de un `requestAnimationFrame`, que corre después de que el navegador coloque el caret del toque.
- **En iOS native el caret queda donde cae el toque;** se acepta, es el comportamiento estándar.
- **Una sugerencia sembrada se selecciona entera al enfocar** (#67), para que lo tecleado la sustituya ("80" + "85" daba 8085). Web: `select()` en el mismo rAF, verificado en Chromium, WebKit e iPhone.
- ⚠️ **Native usa `setSelection` imperativo, no la prop `selectTextOnFocus`:** la prop puede reactivarse con el campo enfocado y en Android hace `selectAll()` en el siguiente layout. En iOS la selección se reafirma en cada `onSelectionChange` mientras la sugerencia siga intacta, porque la selección de JS no emite ese evento y el caret del toque la pisaba. Android sin verificar en dispositivo.
- **Edge aceptado:** si la sugerencia llega con el campo ya enfocado, lo tecleado se añade hasta el siguiente focus.
- **Contrapartida:** retocar la última cifra de una sugerencia de 3+ cifras cuesta una pulsación más.

## 2026-08 · Coma decimal independiente del locale del navegador (issue #26)
- **`<input type="number">` con un locale de punto convierte "82,5" en 825** con `validity.valid === true`. `DecimalInput` usa `type="text"` + `inputMode="decimal"` y normaliza a punto en el propio evento. Los enteros siguen en `type="number"`.
- ⚠️ **Para reproducirlo, solo sirve `LANG`/`LC_ALL` del proceso:** ni el `locale` de Playwright ni `--lang` cambian el de Chromium (dieron un falso positivo).
- ⚠️ **La init de i18n para tests de componentes va por archivo**, no en `src/test/setup.js`: ahí rompe los tests de hooks que mockean `_stores.js`.

## 2026-07 · Onboarding y plantillas
- **El wizard se muestra solo si no hay rutinas ni sesiones**, además del flag, para que los usuarios existentes sin flag no lo vean. `isLoading` bloquea la decisión para evitar el parpadeo.
- **Fijar la plantilla como favorita es obligatorio:** `TodaysWorkout` solo pinta la rutina favorita.
- **Las plantillas usan nombres canónicos del catálogo** y `routineTemplates.test.js` falla ante cualquier deriva. Con nombres genéricos, `importRoutine` creaba ejercicios custom sin GIF ni grupo.
- **Plantilla nueva solo si cambia el programa** (selección o estructura). Variar reps, RIR o descanso no justifica otra.
- **La app no adapta plantillas en runtime** (epic #47, capa de adaptación rechazada): el RIR no es resoluble a nivel de plantilla (no se sabe si es RIR o índice de RPE), el primer ejercicio del día no es el principal y aplanar rangos degrada la variación curada. Si una combinación no tiene contenido, se escribe la plantilla. Un `rir` numérico escrito a mano en un ejercicio sin reps es un índice de RPE.
- **Pendiente en #47:** que los días sean restricción dura y el equipo filtre en vez de anular. Hoy `recommendTemplate` elige los días más cercanos y el equipo no-gimnasio ignora objetivo y nivel.

## 2026-08 · Lint y checks mecanizados (issue #20 y siguientes)
- **La regla de color solo mira `Literal`:** así los `rgba(${RGB_*}, x)` quedan exentos sin allowlist. Falso negativo asumido: un hex dentro de un template literal mixto.
- **`shadow` y `divider` son tokens semánticos, no `RGB_*`:** las `RGB_*` son para variar el alpha; estos tienen alpha fijo.
- **Regla de strings literales en JSX rechazada con datos:** 209 avisos para ~2 casos reales.
- **`.select('*')` se permite** y `fetchRoutineDayExercises` lo mantiene: una lista fija hace que una columna nueva llegue `undefined` sin error, y `routine_exercises` ya tiene cuatro copias manuales de su forma. El porqué está junto al `select`.
- **La cobertura de `packages/shared` tiene config propio** (`vitest.config.mjs`): vitest solo instrumenta dentro de su root, y desde `apps/web` daba 0. El umbral es un suelo: se sube, nunca se baja para que pase.
- **`checkJs` no se adopta:** 71 errores para 1 bug real. Se usó una vez como caza-bugs.
- **Exenciones por construcción:** la regla de `<input type="number">` mira `input` en minúscula (no `<Input>`) y la native mira `TextInput` (no `NumberTextInput`).
- **`/gate` activa `build`** (~2s aquí, y es lo único que caza un export que falta en el barrel) y `schemaDrift`.
- **Pendiente: lintear `packages/shared`.** Hoy el lint no lo ve. Medido: 41 avisos de color, todos en `lib/volumeConstants.js` (necesita la exención de `styles.js`), y 7 `no-unused-vars`. Desbloquearía una regla de `queryKey` literal.
- **Native lintea sus imports con `import-x`** (#76), solo `named` y `no-unresolved`: Metro empaqueta sin quejarse un named import inexistente. `extensions` con `.jsx` es obligatorio. `default`/`namespace` dan falsos positivos con Flow.
- ⚠️ **Tripwire:** `import-x/named` se salta en silencio lo que no sabe parsear. Si `@gym/shared` adopta sintaxis que el parser no lea, el gate deja de protegerlo sin error. Re-verificar inyectando `import { thisDoesNotExist } from '@gym/shared'`.

## 2026-08 · Permisos de tablas en migración (057)
- **Las tablas heredaban los GRANT de la imagen de Postgres**, y la imagen 17.6.1.054 los recortó. La 057 los concede explícitamente (también a `anon`, para igualar el remoto); es no-op en prod.
- **Las funciones no se tocan:** restaurar su default daría EXECUTE a `anon` sobre cada RPC nuevo, incluidos los SECURITY DEFINER.
- **Si un reset vuelve a dar 42501, mirar aquí**, no las políticas RLS.

## 2026-08 · Una sola sesión en curso (issue #30)
- **Faltaba un estado:** "no hay sesión" y "aún no lo sé" eran el mismo `null`. `activeSessionSynced` no se persiste (rehidratarlo a `true` es el bug otra vez) y los botones dan `BUSY` mientras vale `false`, solo si el estado local dice que no hay sesión.
- ⚠️ **La re-sincronización cuelga de `userId`, con el suscriptor en ref y fuera de las deps.** Antes funcionaba de rebote porque el callback cambiaba en cada render; memoizarlo con `useCallback` la habría matado sin aviso. Con el callback en deps, el efecto disparaba 14 consultas por arranque.
- **La BD lo garantiza (058):** índice único parcial `(user_id) where status = 'in_progress'`. El cliente reconoce el token `session_already_in_progress` por el mensaje, no por el nombre del índice. Tras el rechazo re-sincroniza, o el aviso sería un callejón sin salida.
- **Los duplicados existentes: sobrevive la que tiene series**, no la más reciente. El duplicado nace de un toque accidental, así que la más reciente es la espuria. Las perdedoras pasan a `abandoned`, sin borrar nada.
- **Anónimos rechazados** (`not_authenticated`): con la anon key se insertaban sesiones con `user_id NULL`, que el índice no limita. Deuda: `user_id` debería ser NOT NULL.
- **Guard de epoch** en la sincronización: dos pueden resolver en orden inverso.
- **En el menú del historial "Repetir entrenamiento" no se ofrece** hasta saberlo, porque ahí no cabe un spinner.

## 2026-08 · Botones de arrancar entrenamiento (`lib/workoutStartAction.js`)
- **`routineDayId == null`, no falsy:** un id 0 es válido.
- **`getRoutineDayAction` pone `BUSY` antes que reanudar**, al revés que `getFreeWorkoutAction`: necesita los bloques del día cargados. Los tests fijan las dos precedencias; no "unificarlas".
- **Dos mensajes:** el día de rutina bloquea con cualquier sesión activa, también libre (`finishCurrentFirst`); el libre solo con una de rutina (`finishRoutineFirst`).
- **El toast de web va abajo** (`tabBarFootprint`): arriba tapaba `ActiveSessionBanner`, justo el atajo que pide el mensaje.

## 2026-09 · Vídeo antes de completar (issue #31)
- **Elegir un vídeo lo sube ya**; la URL se guarda en memoria (`preCompleteUrl`, en `useSetVideoUpload`) y viaja en el mismo `upsert` de completar. Nunca se escribe a una fila que puede no existir.
- **Completar se bloquea mientras sube:** sin eso el vídeo quedaría huérfano en MinIO.
- **No se cachea en el store de Zustand:** `completeSet` reemplaza `cachedSetData[key]` en vez de mezclarlo, y eso abría cinco carreras de pérdida de datos.

## 2026-09 · Edición de series desde el historial
- **`showEffortScale` ignora `show_rir_input` a propósito:** el badge de RIR del historial no mira la preferencia. Pasarle la preferencia "por paridad" vuelve a abrir una hoja sin control de RIR.
- **`videoUrl` en estado local:** la prop solo se refresca tras el refetch, y tocar otro campo antes pisaba el vídeo con el dato viejo.
- **No reusa `useSetVideoUpload`:** ese hook lee la sesión ACTIVA del store y el historial edita una sesión arbitraria.
- **`SetDetailsModal` solo siembra nota y vídeo al pasar de cerrado a abierto** (`wasOpenRef`): resembrar con la hoja abierta borraba lo tecleado.
- **Los badges son solo vistazo;** la entrada a la hoja es el menú «···» → Editar.

## 2026-09 · `ExecutionTimer` (cuenta atrás de serie por tiempo)
- **Anclado al reloj (`endAtRef`), no a ticks:** en segundo plano el intervalo se congela y no se corregía al volver.
- **No usa `useTimerEngine`:** ese engine modela el único descanso global y la cuenta atrás es por fila, a la vez que un descanso.
- **`TIMER_BEEP_WINDOW_SECONDS` decide a la vez el pitido y el pulso rojo**, a propósito.

## 2026-09 · Duplicar día de rutina
- **RPC atómica `duplicate_routine_day` (059):** con dos escrituras de cliente, un fallo en la segunda dejaba un "(copia)" vacío. El nombre localizado lo calcula el cliente.
- ⚠️ **La RPC conserva `superset_group`; `duplicateRoutineExercise` lo anula.** El ejercicio suelto se copia al MISMO día (conservarlo agrandaría el superset); el día duplicado tiene ids nuevos. No igualarlos.

## 2026-09 · Instrucciones del ejercicio en sesión (issue #39)
- **Cerradas por defecto; lo que cambió es la barra.** Abiertas, GIF + instrucciones ocupan ~400-500px y no se ve ninguna serie. La barra dice «Instrucciones y consejos» ("Notas" son las del usuario) y lleva borde para leerse como control.
- **Barra y contenido son un solo panel:** se pueden acoplar sin prop porque `hasExerciseNotes` es exactamente la condición de que el cuerpo no sea null.

## 2026-07 · Import de rutinas por clave estable
- **`name_en`, no un `slug`:** es único, 100% poblado y ya es la clave de join de las migraciones de GIF. Normalización insensible a acentos. Detalle en `docs/routine-io.md`.
- **Tripwire para un slug:** renombrar un `name_en`, un tercer idioma, o querer identidad independiente del nombre. Paso intermedio: tabla de alias.
- **Las plantillas siguen casando por `name_es` exacto,** validado por su test.

## 2026-09 · Unidad de distancia por ejercicio (issue #24)
- **Revive lo que borró la 024** ("se deduce del valor"): deducir la unidad de la magnitud rompe que entrada y display coincidan.
- **Cambiar la unidad no convierte datos,** por eso el override vive en `user_exercise_overrides` sin RPC.
- **`distance_meters` pasó a `numeric(8,2)`** (060): en km, "10" es la entrada típica y el tope de 9.999,99 m reventaba con 22003.
- **Fuera de alcance:** el aviso de PR en vivo sigue en metros; llevar la unidad al motor de PRs no compensa por un aviso de 3 segundos.
- **El payload del override es una función pura compartida** (`exerciseOverrideForm.js`): native no tiene runner y una copia allí no la cubriría nada.

## 2026-09 · BD local, `schema.sql` y e2e
- **`schema.sql` es la foto del estado actual; las migraciones no se squashean** (ya aplicadas en prod, y el problema volvería).
- ⚠️ **`npm run db:schema` empieza por `db reset` y eso es lo que garantiza `schema.sql == migraciones`.** Un dump sin reset refleja la BD local tal cual; así se perdió `duplicate_routine_day` del snapshot.
- **El CI dumpea sin reset y no es una infracción:** el contenedor es nuevo en cada job y `supabase start` ya lo construyó desde las migraciones. El check solo cubre el esquema `public` (no `storage`/`auth` ni datos). Va antes de los e2e.
- **El dump depende de la versión de la CLI:** el `package-lock.json` la fija y CI usa `npm ci`. Una CLI distinta da un diff enorme sin relación con tu cambio.
- **El gate `schemaDrift` no resetea** (~30s por gate); se salta si el stack no está levantado o si `migration list` no casa con el árbol. No ve una migración editada tras aplicarse.
- ⚠️ **`seed.sql`: los cuatro campos de token de `auth.users` van a cadena vacía, no NULL.** Con NULL, GoTrue devuelve un 500 opaco al hacer login. Y sin `email_confirmed_at`, "Email not confirmed". Una subida de la CLI puede romper el seed: mirar aquí primero.
- **El seed no siembra datos de dominio:** las migraciones ya crean los de referencia y `testData.setup.js` la rutina de los e2e.
- **El reset de los e2e es por ejecución, no por test.** Con `retries: 2` en CI, un reintento corre sobre el estado sucio del intento anterior: si fallan tres intentos idénticos, sospecha del primero.
- **El guard `assertLocalSupabase.js` vive en su propio archivo por el orden:** como `pretest:e2e` corre antes del reset; dentro del config corría después.
- **`loadEnv.js` replica la precedencia de Vite** (entorno > `.env.local` > `.env`) para la cadena que corre fuera de Vite. El orden de carga es lo delicado: invertido no falla, simplemente ignora `.env.local`.
- **Descartado inyectar credenciales con `webServer.env`:** el guard y los setups corren fuera de ese webServer.
- **CI levanta solo db, kong, auth, rest y storage:** la app no usa Realtime y Storage solo construye URLs.
- **Un stack por worktree** (#63): `project_id` y los 4 puertos activos vienen de `.env`. `shadow_port` se queda literal porque solo lo usa `db diff`; dos worktrees haciendo `db diff` a la vez chocan en el 54320.
- **`full_reset.sql` está obsoleto** (esquema de ~migración 009) y marcado como tal. No regenerarlo a mano.

## 2026-09 · Auto-merge y versionado
- **Solo squash, con el título de la PR como mensaje:** así `bump-version.js` ve un commit por PR, y el título tiene que ser Conventional Commits.
- ⚠️ **Los required status checks bloquean también los push directos**, no solo el merge. El bot de Actions no es admin, así que `version.yml` pushea con `RELEASE_TOKEN` (PAT de un admin). Descartado mover el bump dentro de la PR (rediseño mayor) y Rulesets con bypass (no verificado en vivo).
- **Sin "require PR" ni "up to date":** cada commit de bump dejaría las PRs pendientes de "Update branch".

## 2026-09 · Credenciales de MinIO
- **Son secrets de las Edge Functions** (`video-upload`, `video-url`, sin prefijo `VITE_`), no del `.env` del cliente. Ningún archivo del cliente las lee.

## 2026-09 · Bloqueo de scroll del body (`lib/bodyScrollLock.js`)
- **Contador, no booleano:** los modales se apilan y React desmonta de padre a hijo.
- **`paddingRight` compensa la scrollbar clásica** (Windows/Linux).
- **Vive en `apps/web`:** es API de DOM, sin equivalente en native.

## 2026-09 · Auto-login de dev (`VITE_DEV_AUTOLOGIN`)
- **Opt-in explícito:** el servidor de los e2e también es Vite dev contra la local, y sin flag los specs sin sesión se romperían.
- **Su regex de "local" acepta rangos LAN y el del guard de e2e no:** aquí un falso positivo es un login fallido; allí, escribir datos en un Supabase remoto. No unificarlos.

## 2026-09 · Store de workout de native (issue #74)
- **Native llama y spreadea `buildSessionTransitionReset()`, `buildSessionSetDataReset()` y `workoutPartialize`** en vez de re-listar campos: la copia ya derivó dos veces. Un campo nuevo va a la constructora compartida.
- **Los campos de identidad se escriben en cada acción,** así `sessionId` y `gymId` caen en el mismo `set()` (invariante de la que depende `usePreviousWorkout`).
- **Constructoras, no constantes:** una constante compartida se contaminaría para siempre con la primera acción que mutase en sitio. Descartado `Object.freeze` (congela el estado vivo).
- **Descartado de momento envolver las acciones compartidas:** parte cada transición en dos `set()` y native no tiene runner para verificarlo.
- **No hay test de paridad de native:** uno que replicaba su `partialize` se borró porque asertaba contra su propia copia.

## 2026-09 · Swipe para borrar un ejercicio de la rutina (issue #78)
- **Swipe en vez de un botón de borrar en la fila:** no ahorra acciones (tres → dos en ambos casos), solo ergonomía. Se le planteó al usuario el botón (que además es la opción accesible) y eligió el gesto. Por eso el `Eliminar` del menú «···» **se queda**: es el único camino con lector de pantalla, y no debe retirarse "porque ya está el swipe".
- **`blocked` no es código muerto:** hoy no lo escribe nadie. Está cableado y testeado como punto de entrada del futuro arrastre-para-reordenar (long press + vertical sobre esta misma fila), que es el único momento en que native puede impedir el swipe. Borrarlo por "no tiene consumidores" obliga a rehacer el gesto entero.
