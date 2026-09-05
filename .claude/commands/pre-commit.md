# Validación pre-commit exhaustiva

Valida todos los cambios sin commitear delegando la **revisión** en un agente independiente con **contexto limpio**, para que el juicio sea objetivo y no esté sesgado por esta conversación. Tú (agente principal) orquestas: recibes el informe y aplicas las correcciones.

⚠️ **El revisor pasa UNA sola vez.** No es un bucle de "reportar → parchear → volver a reportar": es la verificación final. Lo que venga después del informe son **correcciones**, y tienen que ser definitivas a la primera. Si estás pensando "lo aplico y que lo compruebe otra ronda", el problema no es la ronda que falta, es que la corrección no está terminada.

Corolario, ya en `CLAUDE.md`: los estándares se cumplen **mientras se codifica**, así que lo ideal es que el revisor no encuentre nada. Cada hallazgo es una señal de que algo se hizo sin el cuidado debido en su momento, no un paso normal del proceso.

## Flujo

1. **Lanzar el revisor** (Agent tool, `subagent_type: pre-commit-validator`). Arranca sin contexto de esta sesión; él mismo lee el diff (`git diff HEAD`, staged, untracked), ejecuta lint/test/build/e2e y aplica el checklist de los tres ejes (buenas prácticas + optimización de datos en entornos lentos + contexto durable en el repo). Devuelve un informe de hallazgos con la corrección propuesta y su porqué.
   - Prompt sugerido: *"Revisa exhaustivamente todos los cambios sin commitear de este repo y reporta los hallazgos según tu checklist. No apliques nada."*
   - Si quieres acotar el alcance, pásale los archivos/área concretos; por defecto revisa todo el diff.
   - Dale de entrada lo que no pueda deducir del diff y le haga falta para correr la suite (p. ej. que la BD local necesita una migración aplicada, o si el stack de Supabase local está levantado — los e2e lo exigen y reconstruyen esa BD, ver `apps/web/.env.example`). Un revisor que no puede ejecutar los tests no valida nada.

2. **Aplicar las correcciones TÚ mismo** (el revisor solo reporta, no edita). Recorre los hallazgos por severidad (🔴 antes que 🟡) y trátalos según su tipo:
   - **Mecánicos / inequívocos** (una sola solución correcta: token en vez de hex, key i18n faltante, falta un test, select con `*`, import mal ubicado, etc.) → **corrígelos directamente**.
   - **Requieren decisión** (hay dudas, trade-offs o varias soluciones válidas: cambio de arquitectura, tocar un contrato/API, elegir entre enfoques, algo con impacto en UX o datos) → **NO decidas por tu cuenta. Pregunta al usuario** (AskUserQuestion) explicando con claridad el problema y las posibles soluciones con sus pros/contras, y espera su elección antes de aplicar. Agrupa las preguntas en una sola tanda en vez de ir de una en una.
   - Si discrepas de una propuesta del revisor, razónalo explícitamente en vez de aplicarla o descartarla a ciegas. El revisor también se equivoca.

3. **Cerrar cada corrección tú, sin red.** Como no hay segunda ronda que te cubra, la verificación es parte de la corrección:
   - **Lee lo que has cambiado**, no solo el resultado del comando. Un hallazgo "aplicado" que no has vuelto a mirar no está aplicado.
   - **Cuidado con los barridos** (regex, `replace_all`, renombrados masivos): son la fuente número uno de correcciones que compilan, pasan lint y están mal. Un cambio de tipo (string → array, por ejemplo) convierte comparaciones válidas en comparaciones por identidad, y una clave de objeto renombrada a medias deja al consumidor recibiendo `undefined` y cayendo al valor por defecto **en silencio**. Tras cualquier barrido, revisa a mano cada sitio tocado.
   - **Desconfía del verde**: un test que pasa después de tu cambio no prueba que pruebe algo. Si has tocado el parámetro que el test ejercita, comprueba que el test falla si rompes la lógica a propósito; si no falla, el fixture está desfasado y hay que arreglarlo también.
   - **Recorre el informe entero al final** y comprueba hallazgo por hallazgo que está resuelto o justificadamente descartado.
   - **Deja la suite en verde**: `npm run lint`, `npm run test:shared`, `npm run test:run -w apps/web`, `npm run build` y los e2e. Si un fallo de lint/test/build/e2e viene en el informe, es bloqueante. Los e2e son la excepción: si el informe dice que no se ejecutaron por no haber stack local, eso no bloquea — levántalo (`npx supabase start` desde `apps/web`) y córrelos, o dilo al cerrar.

4. **No commitear.** Este comando nunca hace `git commit` (regla del proyecto: el commit lo pide el usuario explícitamente). Al terminar, resume qué se corrigió, qué se descartó y por qué, y qué queda pendiente de acciones que no te corresponden (migraciones al remoto, despliegues). Deja claro que está listo para que el usuario decida el commit.

## Notas
- El checklist vive en el agente `pre-commit-validator` (`.claude/agents/pre-commit-validator.md`) — mantenlo ahí, no lo dupliques aquí.
- Si un hallazgo del eje C (contexto durable) propone documentar una decisión, aplícalo escribiendo en el repo (`CLAUDE.md`, `docs/DECISIONS.md` o comentario inline) — no en memorias externas.
- Lanzar un segundo revisor solo se justifica si el informe destapó que el cambio estaba **mal planteado** y hay que rehacer una parte de verdad (no corregir, rehacer). En ese caso lo que se revisa es el trabajo nuevo, no si tus parches valen.
