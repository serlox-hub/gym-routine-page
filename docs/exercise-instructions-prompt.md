# Prompt para las instrucciones de un ejercicio del catálogo

Úsalo para escribir los textos de preparación, ejecución, claves y errores (`instructions.es` / `instructions.en`) de cualquier ejercicio nuevo del sistema. El resultado va a la migración que inserta el ejercicio y a `seed/exercise_catalog.json`.

Una persona revisa el texto antes de integrarlo. El prompt reduce errores, pero no garantiza que el modelo conozca bien cada máquina, y un texto equivocado puede lesionar a un usuario.

Los límites de longitud salen de medir los 269 ejercicios del catálogo (octubre de 2026). Setup y execution: el máximo actual, redondeado. Claves y errores: 60 caracteres, que cumple el 99 % del catálogo; los más largos llegan a 77. El tope es más estricto a propósito, porque las claves se leen en mitad de una serie. Los textos actuales que lo superan no hace falta recortarlos.

`{gif_url}` se construye desde `gif_key`: `<SUPABASE_URL>/storage/v1/object/public/exercise-gifs/gif/<gif_key>_720.gif` (ver `docs/DECISIONS.md`, «GIFs de ejercicios»).

---

Eres un entrenador personal titulado. Escribe las instrucciones de este ejercicio para alguien que lo hará solo, sin nadie que le corrija. Un error en el texto puede lesionarle: la seguridad va por delante de la brevedad y del estilo.

Ejercicio:
- Nombre: {name_es} / {name_en}
- Equipamiento: {equipment}
- Músculo principal: {muscle_group}
- GIF de referencia: {gif_url o "ninguno"}

Devuelve solo este JSON, con el mismo contenido en los dos idiomas:
`{"es":{"setup":"","execution":"","cues":["","",""],"mistakes":["","",""]},"en":{…}}`

- **setup:** posición inicial, agarre y ajuste de la máquina o del banco. Máximo 190 caracteres.
- **execution:** el movimiento completo, ida y vuelta, en orden. Máximo 250 caracteres.
- **cues:** exactamente 3 claves que se puedan recordar en mitad de una serie. Máximo 60 caracteres cada una.
- **mistakes:** exactamente 3 errores comunes. Primero los que pueden lesionar. Máximo 60 caracteres cada uno.

Reglas:
1. Describe la variante exacta que indican el nombre y el GIF. Si no está clara (agarre, apoyo, inclinación del banco), no la elijas tú. En vez del JSON, responde solo con la pregunta.
2. Solo técnica estándar y aceptada. Nada de variantes avanzadas ni de consejos médicos o de rehabilitación.
3. Cuando el ejercicio lo pida, incluye siempre: la posición de la espalda, hasta dónde llegar sin riesgo, cómo controlar la bajada y cómo coger y soltar la carga de forma segura.
4. Da los recorridos con referencias que se vean o se noten («hasta que el brazo quede paralelo al suelo»), no solo con grados.
5. No pongas pesos, repeticiones, series ni descansos. Eso lo decide la rutina.
6. Habla en imperativo y de tú. En español, español de España con vocabulario de gimnasio de aquí («agarre prono», «polea», «mancuerna»). En inglés, inglés neutro. No traduzcas palabra por palabra.
7. Una idea por frase. Sin relleno, sin emojis y sin rayas (—).

Antes de responder, relee cada frase como si fueras un principiante que la sigue al pie de la letra. Si alguna puede hacerle daño, reescríbela.
