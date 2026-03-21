# Validacion pre-commit exhaustiva

Analiza todos los archivos modificados respecto al ultimo commit y valida calidad, arquitectura y buenas practicas. **Prioriza calidad sobre velocidad.**

## Paso 0: Identificar archivos modificados

```bash
git diff --name-only HEAD
git diff --name-only --cached
git ls-files --others --exclude-standard
```

Unir las tres listas (unstaged + staged + untracked nuevos). Si no hay cambios, usar `git diff --name-only HEAD~1` para revisar el ultimo commit. Leer TODOS los archivos modificados antes de empezar el analisis.

## Paso 1: Validacion automatica

Ejecutar en paralelo:

1. `npm run lint` — 0 errores Y 0 warnings
2. `npm run test:shared` — todos los tests unitarios pasan
3. `npm run build` — build sin errores

Despues de los 3 anteriores, ejecutar los tests e2e (requieren build):

4. `npm run test:e2e -w apps/web` — todos los tests e2e pasan

Si alguno falla, corregir inmediatamente antes de continuar con el analisis manual.

## Paso 2: Arquitectura del monorepo

Para cada archivo modificado, verificar:

### Ubicacion correcta
- Logica de negocio (calculos, transformaciones, validaciones) → `packages/shared/src/lib/`
- API calls → `packages/shared/src/api/`
- Hooks con TanStack Query/Zustand → `packages/shared/src/hooks/`
- Componentes UI → `apps/web/src/components/` o `apps/gym-native/src/components/`
- Las apps/ solo deben tener: componentes UI, thin wrappers, stores instanciados, pages/screens

### Barrel exports
- Si se anadio algo nuevo a `packages/shared/`, verificar que esta exportado en `packages/shared/src/index.js`
- Si se anadio componente a una carpeta, verificar que el `index.js` de esa carpeta lo re-exporta

### Imports correctos
- Codigo compartido siempre importado via `@gym/shared`, nunca rutas relativas a `packages/`
- Componentes locales via rutas relativas dentro de la misma app

## Paso 3: Calidad de componentes

Para cada componente (.jsx) modificado:

1. **Un componente = un archivo**. Si hay mas de un componente exportado (o mas de una function component definida que no sea interna), separar. Excepcion: subcomponentes pequenos (<30 lineas) que solo usa ese archivo.
2. **Max ~300 lineas**. Si supera significativamente, proponer como dividir.
3. **Componente tonto**. El componente solo debe manejar:
   - Renderizado JSX
   - Handlers que llaman a hooks/utils
   - Estado local de UI (open/close, hover, etc.)
   - NO debe contener: calculos >5 lineas, transformaciones de datos, logica de negocio
4. **Props destructuring** en la firma de la funcion.
5. **Loading/error states**. Si usa datos async (useQuery), debe manejar isLoading y error.
6. **Sin inline styles** salvo style objects de `lib/styles.js` o valores dinamicos. Usar Tailwind.
7. **Sin magic numbers**. Usar constantes con nombre descriptivo.
8. **Sin console.log/console.error** salvo ErrorBoundary con eslint-disable.

## Paso 4: Calidad de hooks

Para cada hook modificado:

1. **Agrupado por dominio**. Un archivo por dominio (useRoutines.js, useWorkout.js), no hooks sueltos.
2. **Secciones separadas** con comentarios: QUERIES, MUTATIONS, HELPERS.
3. **Naming**: `useEntity` para queries, `useCreateEntity`/`useUpdateEntity`/`useDeleteEntity` para mutations.
4. **Query keys** usando constantes de `QUERY_KEYS`, no strings literales.
5. **enabled** guard en queries que dependen de parametros opcionales.
6. **Invalidacion correcta** de queries tras mutations.
7. **Sin logica de negocio** dentro del hook — delegar a funciones de `lib/`.

## Paso 5: Calidad de utilidades (lib/)

Para cada archivo de utilidad modificado:

1. **Funciones puras**. Mismo input = mismo output, sin side effects, sin dependencias de React.
2. **Single responsibility**. Una funcion, un trabajo.
3. **Edge cases**. Manejar null, undefined, arrays vacios, 0, strings vacios.
4. **Nombres descriptivos**. `calculateEpley1RM` no `calc1RM`.
5. **JSDoc** solo en funciones complejas (>10 lineas o parametros no obvios).

## Paso 6: Tests

### Tests unitarios

Para cada archivo de logica en `packages/shared/src/lib/` que fue modificado o creado:

1. **Debe existir** `archivo.test.js` junto al archivo.
2. **Cobertura minima**:
   - Caso normal (happy path)
   - Edge cases (null, undefined, array vacio, 0)
   - Limites (valores minimos y maximos)
   - Si hay branching, al menos un test por rama
3. **Tests legibles**: nombre describe que se valida, en espanol.
4. **Sin archivos de test para**: constantes simples, configuracion, clientes (supabase.js, styles.js, queryClient.js).

### Tests e2e

Evaluar si los cambios afectan flujos de usuario que deberian tener cobertura e2e. Si se anadio o modifico:
- Una nueva pagina/ruta → verificar que existe test e2e para esa ruta
- Texto de UI visible al usuario (botones, labels, modales) → verificar que los tests e2e que referencian esos textos estan actualizados
- Un flujo de usuario completo (crear rutina, importar, iniciar sesion, etc.) → evaluar si necesita test e2e nuevo

Los tests e2e estan en `apps/web/e2e/`. No crear tests nuevos a menos que haya un flujo critico sin cobertura.

Verificar con:
```bash
for f in packages/shared/src/lib/*.js; do
  if [[ ! "$f" == *.test.js ]] && [[ "$(basename $f)" != "constants.js" ]] && [[ "$(basename $f)" != "queryClient.js" ]]; then
    test_file="${f%.js}.test.js"
    if [ ! -f "$test_file" ]; then
      echo "FALTA TEST: $test_file"
    fi
  fi
done
```

## Paso 7: DRY y duplicacion (CRITICO)

Tolerancia cero con duplicacion. Buscar en TODOS los archivos modificados y compararlos con el resto del codebase:

1. **Codigo duplicado** entre archivos. Si la misma logica (incluso 2-3 lineas) aparece en mas de un sitio, extraer a una funcion en `packages/shared/src/lib/`. No importa lo pequena que sea — si se repite, se extrae.
2. **Strings duplicados** que se generan o formatean. Crear funcion formateadora en el util correspondiente.
3. **Patrones repetidos** de validacion. Mover a `validation.js`.
4. **Constantes repetidas** (colores, tamanhos, umbrales). Mover a `constants.js` o al archivo de estilos.
5. **Logica de componentes web/native**. Los componentes web y native del mismo feature DEBEN compartir toda la logica via `@gym/shared`. Solo el JSX (web) vs View/Text (native) deberia diferir. Si hay calculos, transformaciones, formateo de datos o cualquier logica que no sea puramente de renderizado duplicada entre ambos, extraerla a un hook o util compartido.
6. **Hooks duplicados**. Si dos hooks en distintas apps hacen lo mismo, unificar en `packages/shared/src/hooks/`.

Para verificar, buscar patrones similares entre los archivos modificados y sus equivalentes web/native:
```bash
# Comparar componentes web vs native del mismo feature
diff <(grep -v 'import\|from\|export' apps/web/src/components/FEATURE/FILE.jsx) <(grep -v 'import\|from\|export' apps/gym-native/src/components/FEATURE/FILE.jsx)
```

## Paso 8: Paridad web/native

Toda funcionalidad debe implementarse tanto en web como en native. Son dos clientes del mismo producto.

1. Si se anadio o modifico un componente/page en web, **debe existir su equivalente en native** (y viceversa). Si falta, crearlo o avisar como problema.
2. Verificar que ambas apps usan el mismo hook/util de `@gym/shared`.
3. Verificar que el comportamiento es equivalente (misma logica, diferente UI layer).
4. La logica de negocio nunca debe duplicarse entre apps — siempre en `@gym/shared`.

## Paso 9: routineIO.js

Solo si hay cambios en el modelo de datos (tablas routines, routine_days, routine_blocks, routine_exercises, exercises):

1. Verificar `exportRoutine()` incluye nuevos campos
2. Verificar `importRoutine()` lee nuevos campos
3. Verificar `buildChatbotPrompt()` esta actualizado
4. Verificar tests de routineIO.test.js cubren los cambios

## Output

Reportar hallazgos agrupados por severidad:

```
## Resultado de validacion

### Automatico
- Lint: [resultado]
- Tests: [resultado]
- Build: [resultado]

### Problemas (corregir antes de commit)
- [archivo:linea] — [descripcion] → [solucion]

### Advertencias (considerar)
- [archivo:linea] — [descripcion]

### Correcto
- [descripcion de lo que esta bien]
```

Si hay problemas, corregirlos automaticamente y volver a ejecutar las validaciones automaticas. No reportar hasta que todo este limpio.

Si todo esta correcto, terminar con:
```
Todo correcto. Listo para commit.
```
