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
6. **Sin magic numbers**. Usar constantes con nombre descriptivo.
7. **Sin console.log/console.error** salvo ErrorBoundary con eslint-disable.

## Paso 4: Design tokens (CRITICO)

Tolerancia cero con valores hardcodeados que deberian ser tokens del sistema de diseño.

### Colores hardcodeados

Buscar hex y rgba en archivos modificados:

```bash
for f in $(git diff --name-only HEAD | grep '\.jsx$\|\.js$' | grep -v test | grep -v styles\.js | grep -v tailwind | grep -v constants); do
  grep -nE "#[0-9a-fA-F]{3,8}|rgba?\(" "$f" | grep -v "import\|from\|//\|\.svg\|url(" || true
done
```

**Cada coincidencia es sospechosa**. Los unicos sitios validos para hex/rgba son:
- `lib/styles.js` (definicion de tokens)
- `tailwind.config.*` (importa desde styles.js)
- Gradientes en Landing page (usa constantes RGB_ACCENT / RGB_PURPLE)

Todo lo demas DEBE usar `colors.X` de `lib/styles.js`. Si necesitas un color con alpha que no existe, anadelo como token en ambos `styles.js`.

### Tamaños de icono y fuente

No buscar automaticamente, pero al LEER cada componente verificar que:
- Tamaños de iconos son consistentes con el diseno (12, 14, 16, 18, 20, 24 — no valores raros como 13 o 19)
- Tamaños de fuente usan valores del sistema (11, 12, 13, 14, 15, 16, 20, 24 — no valores raros)
- Si un tamaño se repite en multiples componentes del mismo feature, deberia estar en `design` tokens de `styles.js`

## Paso 5: Safe Area en componentes native

Para cada componente en `apps/gym-native/` modificado o creado:

1. **Elementos con `position: 'absolute'`**: Si usan `top` o `bottom`, DEBEN sumar el inset correspondiente de `useSafeAreaInsets()`. Nunca usar valores fijos de top/bottom sin inset.
2. **Screens y layouts**: Deben usar `SafeAreaView` de `react-native-safe-area-context` (no el de React Native) con los `edges` apropiados.
3. **Modales y overlays**: Verificar que el contenido no queda detras del notch/Dynamic Island ni del home indicator.

Buscar violaciones con:
```bash
grep -n "position.*absolute" apps/gym-native/src/components/**/*.jsx | grep -v "SafeArea\|insets"
```

Si se encuentra un `top:` o `bottom:` numerico fijo en un elemento absolute sin usar insets, es un problema que debe corregirse.

## Paso 6: Calidad de hooks

Para cada hook modificado:

1. **Agrupado por dominio**. Un archivo por dominio (useRoutines.js, useWorkout.js), no hooks sueltos.
2. **Secciones separadas** con comentarios: QUERIES, MUTATIONS, HELPERS.
3. **Naming**: `useEntity` para queries, `useCreateEntity`/`useUpdateEntity`/`useDeleteEntity` para mutations.
4. **enabled** guard en queries que dependen de parametros opcionales.
5. **Invalidacion correcta** de queries tras mutations.
6. **Sin logica de negocio** dentro del hook — delegar a funciones de `lib/`.

### Query keys — verificacion automatizada

```bash
# Buscar query keys literales (string en vez de QUERY_KEYS.X)
for f in $(git diff --name-only HEAD | grep 'hooks/.*\.js$' | grep -v test); do
  grep -nE "queryKey:\s*\['" "$f" && echo "^^^ PROBLEMA: query key literal en $f — usar QUERY_KEYS.X" || true
done
```

Toda query key DEBE usar constantes de `QUERY_KEYS` en `constants.js`. Si falta una constante, crearla.

### Invalidacion cruzada

Cuando una mutation invalida queries, verificar que invalida TODAS las queries relacionadas. Patron comun que falla: invalidar `ROUTINES` (lista) pero no `ROUTINE` (detalle individual). Verificar especialmente:
- Si invalida una lista, ¿debe invalidar tambien el detalle?
- Si invalida un detalle, ¿debe invalidar tambien la lista?
- ¿Los tipos de los query keys coinciden? (string vs number en el ID)

## Paso 7: Calidad de utilidades (lib/)

Para cada archivo de utilidad modificado:

1. **Funciones puras**. Mismo input = mismo output, sin side effects, sin dependencias de React.
2. **Single responsibility**. Una funcion, un trabajo.
3. **Edge cases**. Manejar null, undefined, arrays vacios, 0, strings vacios.
4. **Nombres descriptivos**. `calculateEpley1RM` no `calc1RM`.
5. **JSDoc** solo en funciones complejas (>10 lineas o parametros no obvios).

### Falsy checks peligrosos — verificacion automatizada

```bash
# Buscar !variable donde variable podria ser 0 legitimamente
for f in $(git diff --name-only HEAD | grep 'lib/.*\.js$' | grep -v test); do
  grep -nE "if \(!([a-z]*[Cc]ount|[a-z]*[Mm]in|[a-z]*[Tt]otal|[a-z]*[Nn]um|[a-z]*[Ii]ndex|[a-z]*[Ll]ength|[a-z]*[Ss]ize|[a-z]*[Ww]eight|[a-z]*[Rr]eps|[a-z]*[Ss]ets|[a-z]*[Dd]ays)" "$f" && echo "^^^ REVISAR: falsy check en numero — 0 es valido?" || true
done
```

Usar `== null` para null/undefined, comparadores explicitos para numeros. `!variable` solo para booleanos y strings.

## Paso 8: Tests (CRITICO)

### Cobertura de tests para archivos modificados

Verificar automaticamente que todo archivo testeable en `packages/shared/` tiene su test:

```bash
# Buscar archivos modificados en shared que necesitan tests
for f in $(git diff --name-only HEAD | grep 'packages/shared/src/' | grep '\.js$' | grep -v test | grep -v index\.js); do
  base=$(basename "$f" .js)
  dir=$(dirname "$f")
  # Excluir archivos que no necesitan test
  if [[ "$base" == "constants" || "$base" == "_client" || "$base" == "_stores" || "$base" == "queryClient" ]]; then
    continue
  fi
  test_file="${dir}/${base}.test.js"
  if [ ! -f "$test_file" ]; then
    echo "FALTA TEST: $test_file"
  else
    echo "TEST EXISTE: $test_file — verificar que cubra los cambios"
  fi
done
```

**Para archivos sin test** (`FALTA TEST`): crear test si el archivo contiene logica testeable (funciones puras, transformaciones, calculos). No crear tests para: constantes, configuracion, barrels (index.js), clientes (_client.js).

**Para archivos con test existente** (`TEST EXISTE`): LEER el test y verificar que cubre las funciones/ramas modificadas. Si se anadio una nueva funcion exportada o se cambio el comportamiento de una existente, el test debe actualizarse.

### Piramide de testing

Seguir estrictamente la piramide: **muchos tests unitarios** (funciones puras en lib/) > **algunos tests de integracion** (hooks con queries mockeadas) > **pocos tests e2e** (flujos criticos de usuario). No invertir la piramide.

### Requisitos de tests unitarios

1. **Cobertura minima por funcion**:
   - Caso normal (happy path)
   - Edge cases (null, undefined, array vacio, 0)
   - Limites (valores minimos y maximos)
   - Si hay branching, al menos un test por rama
2. **Tests legibles**: nombre describe que se valida, en espanol.
3. **Ubicacion**: junto al archivo fuente (`archivo.test.js` en el mismo directorio).
4. **No crear tests "por cubrir"**. Cada test debe validar un comportamiento concreto que aporte valor. Si un test no puede fallar de forma util, no sirve.

### Buenas practicas de testing

1. **Reutilizar setup**. Si multiples tests necesitan el mismo render, fixture o inicializacion, usar `beforeEach` o funciones helper. No repetir el mismo setup en cada test.
2. **Un assert por comportamiento, no por linea**. Agrupar asserts relacionados en un mismo test si validan el mismo comportamiento (ej. verificar que una funcion devuelve un objeto con shape correcto = un test, no N tests por campo).
3. **Testar comportamiento, no implementacion**. No testear que se llamo a `useState` o que un ref tiene cierto valor. Testear inputs → outputs y efectos visibles.
4. **Nombres de test como especificacion**: `'devuelve 0 si el array esta vacio'`, no `'test caso 3'`.
5. **No mockear lo que no es necesario**. Funciones puras no necesitan mocks. Solo mockear dependencias externas (Supabase, fetch, stores).
6. **Fixtures reutilizables**. Si varios tests usan los mismos datos de entrada, extraer a constantes al inicio del archivo de test.

### Tests e2e

Evaluar si los cambios afectan flujos de usuario que deberian tener cobertura e2e. Si se anadio o modifico:
- Una nueva pagina/ruta → verificar que existe test e2e para esa ruta
- Texto de UI visible al usuario (botones, labels, modales) → verificar que los tests e2e que referencian esos textos estan actualizados
- Un flujo de usuario completo (crear rutina, importar, iniciar sesion, etc.) → evaluar si necesita test e2e nuevo

Los tests e2e estan en `apps/web/e2e/`. No crear tests nuevos a menos que haya un flujo critico sin cobertura.

## Paso 9: Internacionalizacion (i18n) (CRITICO)

Toda cadena de texto visible al usuario DEBE usar el sistema de i18n. Tolerancia cero con strings hardcodeados.

### Deteccion de strings hardcodeados

Para cada archivo `.jsx` modificado en `apps/web/src/` y `apps/gym-native/src/`, buscar strings en espanol o ingles hardcodeados que deberian estar traducidos:

```bash
for f in $(git diff --name-only HEAD | grep '\.jsx$' | grep -v test); do
  grep -nE "'[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+[^']*'|\"[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+[^\"]*\"" "$f" | \
    grep -v "import\|from\|//\|className\|style\|navigate\|console\|key=\|testID\|data-" | \
    grep -v "Calentamiento\|Principal\|Añadido\|Pecho\|Espalda" || true
done
```

**Excepciones aceptables** (NO necesitan i18n):
- Nombres de rutas de navegacion (`navigate('Home')`, `navigate('Login')`)
- Valores de DB (`'Calentamiento'`, `'Principal'`, `'Añadido'`, nombres de muscle groups como keys)
- Constantes tecnicas (measurement types, status values)
- Contenido decorativo de landing page mockups

**Todo lo demas** debe usar `t('namespace:key')`.

### Verificar que los archivos JSON estan sincronizados

Si se anadieron keys nuevas a los JSON de traduccion:

```bash
for ns in common auth routine exercise workout body validation data; do
  es_keys=$(jq -r '[paths(scalars)] | map(join(".")) | sort[]' packages/shared/src/i18n/locales/es/${ns}.json)
  en_keys=$(jq -r '[paths(scalars)] | map(join(".")) | sort[]' packages/shared/src/i18n/locales/en/${ns}.json)
  diff <(echo "$es_keys") <(echo "$en_keys") && echo "${ns}: OK" || echo "DESINCRONIZADO: ${ns}.json — faltan keys en alguno de los idiomas"
done
```

Si hay keys que existen en un idioma pero no en el otro, es un problema que debe corregirse.

### Verificar uso correcto en componentes

Para cada componente modificado:

1. **useTranslation** importado si tiene strings traducidos
2. **Namespace correcto** — usar el namespace que corresponde al dominio (routine para rutinas, workout para sesiones, etc.)
3. **Datos de referencia** — usar helpers: `translateMuscleGroup()`, `translateBlockName()`, `getSensationLabel()`, no `t()` directo para estos
4. **Shared code** — usar `import { t } from '../i18n/index.js'`, no `useTranslation()` (que es solo para componentes React)

## Paso 10: DRY y duplicacion (CRITICO)

Tolerancia cero con duplicacion. Buscar en TODOS los archivos modificados y compararlos con el resto del codebase:

1. **Codigo duplicado** entre archivos. Si la misma logica (incluso 2-3 lineas) aparece en mas de un sitio, extraer a una funcion en `packages/shared/src/lib/`. No importa lo pequena que sea — si se repite, se extrae.
2. **Strings duplicados** que se generan o formatean. Crear funcion formateadora en el util correspondiente.
3. **Patrones repetidos** de validacion. Mover a `validation.js`.
4. **Constantes repetidas** (colores, tamanhos, umbrales). Mover a `constants.js` o al archivo de estilos.
5. **Logica de componentes web/native**. Los componentes web y native del mismo feature DEBEN compartir toda la logica via `@gym/shared`. Solo el JSX (web) vs View/Text (native) deberia diferir. Si hay calculos, transformaciones, formateo de datos o cualquier logica que no sea puramente de renderizado duplicada entre ambos, extraerla a un hook o util compartido.
6. **Hooks duplicados**. Si dos hooks en distintas apps hacen lo mismo, unificar en `packages/shared/src/hooks/`.

## Paso 11: Paridad web/native (CRITICO)

Toda funcionalidad debe implementarse tanto en web como en native. Son dos clientes del mismo producto.

1. Si se anadio o modifico un componente/page en web, **debe existir su equivalente en native** (y viceversa). Si falta, crearlo o avisar como problema.
2. Verificar que ambas apps usan el mismo hook/util de `@gym/shared`.
3. Verificar que el comportamiento es equivalente (misma logica, diferente UI layer).
4. La logica de negocio nunca debe duplicarse entre apps — siempre en `@gym/shared`.

### Verificacion automatizada de claves i18n entre plataformas

Para cada par de componentes web/native modificados, extraer y comparar las claves t() usadas:

```bash
for f in $(git diff --name-only HEAD | grep 'apps/web/src/' | grep '\.jsx$'); do
  native_equiv=$(echo "$f" | sed 's|apps/web/src/components/|apps/gym-native/src/components/|; s|apps/web/src/pages/|apps/gym-native/src/screens/|')
  # Intentar variantes de nombre (Page.jsx vs PageScreen.jsx)
  if [ ! -f "$native_equiv" ]; then
    native_equiv=$(echo "$native_equiv" | sed 's|/\([A-Z][a-z]*\)\.jsx|/\1Screen.jsx|')
  fi
  if [ -f "$native_equiv" ]; then
    web_keys=$(grep -oE "t\('[^']+'\)" "$f" | sort -u)
    native_keys=$(grep -oE "t\('[^']+'\)" "$native_equiv" | sort -u)
    diff_result=$(diff <(echo "$web_keys") <(echo "$native_keys") 2>/dev/null)
    if [ -n "$diff_result" ]; then
      echo "DIFERENCIA i18n: $f vs $native_equiv"
      echo "$diff_result"
    fi
  fi
done
```

Cualquier diferencia en claves t() entre el par web/native es sospechosa. Verificar manualmente si es intencional (funcionalidad de plataforma) o un error.

### Verificacion estructural obligatoria

Para cada par de componentes web/native encontrado, LEER ambos archivos y verificar:
- **Mismos estados**: los mismos useState, mismos handlers, misma logica condicional
- **Mismas claves i18n**: ambos deben usar las mismas `t('namespace:key')` para el mismo texto
- **Mismo layout conceptual**: misma jerarquia visual (header/body/footer), misma disposicion de elementos
- **Mismos valores**: validaciones, tamanhos de iconos, colores, constantes
- **Mismos datos consumidos**: mismos campos del hook/API

Diferencias aceptables: JSX vs View/Text, onClick vs onPress, className vs style, lucide-react vs lucide-react-native, funcionalidad que depende de APIs de plataforma (ej. html2canvas en web, ActiveSessionBanner en native).

## Paso 12: Performance

Para cada componente modificado, verificar:

### Renders innecesarios

1. **Funciones inline en props de listas**: Si un componente dentro de `.map()` recibe callbacks como `onClick={() => handler(item.id)}`, verificar que no causa re-renders excesivos. Para listas largas (>20 items), considerar useCallback o extraer componente hijo.
2. **Objetos inline en style**: `style={{ color: X }}` crea un objeto nuevo cada render. Aceptable en componentes simples, pero en listas largas extraer a constante o useMemo.
3. **Queries sin staleTime**: Queries que se llaman frecuentemente (home screen, listas) deberian tener `staleTime` para evitar refetches innecesarios en cada mount.

### Optimistic updates

Si una mutation afecta UI visible inmediatamente (toggles, likes, reorder), verificar que usa optimistic update con `onMutate` + `onError` rollback. El usuario no deberia esperar al servidor para ver feedback visual.

## Paso 13: routineIO.js

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
- E2E: [resultado]

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
