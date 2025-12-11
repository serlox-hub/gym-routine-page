# Verificar Arquitectura

Analiza **solo los archivos modificados** (según `git status` y `git diff`) para verificar que:

1. **Componentes tontos**: Los componentes en `src/components/` solo contienen lógica de UI (renderizado, eventos, estado local de UI). No deben contener:
   - Cálculos complejos (>5 líneas)
   - Transformaciones de datos
   - Lógica de negocio duplicada
   - Generación de strings/labels repetida

2. **Lógica en utils**: Toda la lógica de negocio debe estar en `src/lib/`:
   - Funciones puras y testables
   - Sin dependencias de React
   - Documentadas con JSDoc si son complejas

3. **Tests unitarios**: Cada archivo en `src/lib/` debe tener tests junto al archivo (ej: `dateUtils.test.js`):
   - Cobertura de casos edge (null, undefined, arrays vacíos)
   - Tests para cada función exportada
   - **IMPORTANTE**: Buscar tests con `find src -name "*.test.js" -o -name "*.test.jsx"` (no usar Glob que puede fallar)

4. **Sin duplicación**: No debe haber código duplicado entre componentes. Si encuentras:
   - Mismo cálculo en múltiples archivos → extraer a utils
   - Mismo string/label generado → crear función formateadora
   - Misma lógica de validación → mover a validation.js

5. **routineIO.js**: Si hay cambios en el modelo de datos (tablas de rutinas, días, bloques, ejercicios):
   - Verificar que `exportRoutine()` incluye los nuevos campos
   - Verificar que `importRoutine()` lee los nuevos campos
   - Verificar que `buildChatbotPrompt()` refleja el esquema actualizado
   - Verificar que los tests cubren los nuevos campos

## Pasos a seguir:

1. Busca patrones de código duplicado en componentes
2. Identifica lógica que debería estar en utils
3. **Verifica tests**: Para cada archivo `.js` en `src/lib/` **que contenga funciones de lógica de negocio** (cálculos, transformaciones, validaciones, utilidades), verifica que existe su correspondiente `.test.js`.

   **Archivos que NO necesitan tests**: configuración, clientes externos, constantes simples (ej: `supabase.js`, `queryClient.js`, `styles.js`, `constants.js`)

   Usa el comando Bash:
   ```bash
   for f in src/lib/*.js; do if [[ ! "$f" == *.test.js ]]; then test_file="${f%.js}.test.js"; if [ ! -f "$test_file" ]; then echo "Falta test: $test_file"; fi; fi; done
   ```
4. Lista los problemas encontrados con:
   - Archivo y línea
   - Descripción del problema
   - Solución propuesta

## Pasos iniciales:

1. Ejecuta `git status --porcelain` para ver si hay cambios en el workspace
2. Si hay cambios pendientes (staged o unstaged):
   - Usa `git diff --name-only` y `git diff --name-only --cached` para obtener los archivos modificados
3. Si NO hay cambios pendientes (workspace limpio):
   - Usa `git diff --name-only main...HEAD` para obtener archivos modificados en la rama actual respecto a main
4. Analiza solo esos archivos (componentes, páginas, hooks, stores, lib)

## Output esperado:

Resume los hallazgos en formato:

```
✅ Correcto: [descripción]
⚠️ Advertencia: [descripción] en [archivo:línea]
❌ Problema: [descripción] en [archivo:línea] → Solución: [propuesta]
```

Al final indica si es necesario hacer cambios o si la arquitectura es correcta.
