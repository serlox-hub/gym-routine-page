# Validación pre-commit exhaustiva

Valida todos los cambios sin commitear delegando la **revisión** en un agente independiente con **contexto limpio**, para que el juicio sea objetivo y no esté sesgado por esta conversación. Tú (agente principal) orquestas: recibes el informe, aplicas las correcciones y revalidas en fresco. **Prioriza calidad sobre velocidad.**

## Flujo

1. **Lanzar el revisor** (Agent tool, `subagent_type: pre-commit-validator`). Arranca sin contexto de esta sesión; él mismo lee el diff (`git diff HEAD`, staged, untracked), ejecuta lint/test/build/e2e y aplica el checklist de los tres ejes (buenas prácticas + optimización de datos en entornos lentos + contexto durable en el repo). Devuelve un informe de hallazgos con la corrección propuesta y su porqué.
   - Prompt sugerido: *"Revisa exhaustivamente todos los cambios sin commitear de este repo y reporta los hallazgos según tu checklist. No apliques nada."*
   - Si quieres acotar el alcance, pásale los archivos/área concretos; por defecto revisa todo el diff.

2. **Aplicar las correcciones TÚ mismo** (el revisor solo reporta, no edita). Recorre los hallazgos por severidad (🔴 antes que 🟡) y trátalos según su tipo:
   - **Mecánicos / inequívocos** (una sola solución correcta: token en vez de hex, key i18n faltante, falta un test, select con `*`, import mal ubicado, etc.) → **corrígelos directamente**.
   - **Requieren decisión** (hay dudas, trade-offs o varias soluciones válidas: cambio de arquitectura, tocar un contrato/API, elegir entre enfoques, algo con impacto en UX o datos) → **NO decidas por tu cuenta. Pregunta al usuario** (AskUserQuestion) explicando con claridad el problema y las posibles soluciones con sus pros/contras, y espera su elección antes de aplicar.
   - Si discrepas de una propuesta del revisor, razónalo explícitamente en vez de aplicarla o descartarla a ciegas.

3. **Revalidar en fresco.** Vuelve a lanzar un **nuevo** `pre-commit-validator` (contexto limpio otra vez) para que confirme que los hallazgos se resolvieron y no se introdujeron nuevos. Repetir 2–3 hasta que el veredicto sea `APTO PARA COMMIT`. La revalidación en un agente nuevo evita que quien hizo el fix se apruebe a sí mismo.

4. **No commitear.** Este comando nunca hace `git commit` (regla del proyecto: el commit lo pide el usuario explícitamente). Al terminar, resume qué se corrigió y qué queda, y deja claro que está listo para que el usuario decida el commit.

## Notas
- El checklist vive en el agente `pre-commit-validator` (`.claude/agents/pre-commit-validator.md`) — mantenlo ahí, no lo dupliques aquí.
- Si el revisor reporta un fallo de lint/test/build/e2e, es bloqueante: córrigelo y revalida.
- Si un hallazgo del eje C (contexto durable) propone documentar una decisión, aplícalo escribiendo en el repo (`CLAUDE.md`, `docs/DECISIONS.md` o comentario inline) — no en memorias externas.
