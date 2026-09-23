import js from '@eslint/js'
import reactPlugin from 'eslint-plugin-react'
import reactHooksPlugin from 'eslint-plugin-react-hooks'

export const baseConfig = [
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      // React
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',

      // React Hooks
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // General
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'prefer-const': 'error',
      'no-var': 'error',

      // Peligro de ejecución/inyección: no hay ningún caso legítimo en esta app.
      'no-eval': 'error',
      'react/no-danger': 'error',

      // Color hardcodeado en componentes (issue #20, G1): el color va SIEMPRE por token de
      // `colors` (styles.js), nunca hex/rgba a pelo. Solo string literals → los `rgba(${RGB_*}, x)`
      // (template literals, patrón de opacidad decorativa) y los hex en comentarios quedan exentos
      // por construcción. styles.js y tailwind.config quedan exentos abajo (ahí el hex es legítimo).
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/rgba?\\(/]',
          message: 'No hardcodees rgb/rgba en componentes: usa un token de `colors` (styles.js), o para opacidades decorativas `rgba(${RGB_*}, x)` con las constantes RGB_ de styles.js.',
        },
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,8}/]',
          message: 'No hardcodees un hex de color en componentes: usa un token de `colors` (styles.js).',
        },
        // Inputs numéricos (DECISIONS, issue #26): el navegador decide el separador decimal por SU
        // locale, así que `<input type="number">` con locale de punto guarda 825 al teclear "82,5".
        // Al targetear el `input` en minúscula (elemento DOM), el `<Input type="number">` de ui/
        // queda exento por construcción: ese wrapper ya delega en CaretEndInput.
        {
          selector: 'JSXOpeningElement[name.name="input"] > JSXAttribute[name.name="type"][value.value="number"]',
          message: 'No uses `<input type="number">` a pelo: `<Input type="number">` para enteros, `DecimalInput` (o `<Input decimal>`) para valores con decimales.',
        },
        // Espejo native de la regla anterior: el primitivo es NumberTextInput (cursor al final),
        // no TextInput a secas. Un keyboardType por expresión no se caza (falso negativo asumido).
        {
          selector: 'JSXOpeningElement[name.name="TextInput"] > JSXAttribute[name.name="keyboardType"][value.value=/^(numeric|decimal-pad|number-pad)$/]',
          message: 'No uses `<TextInput>` con teclado numérico a pelo: usa `NumberTextInput` (cursor al final al enfocar).',
        },
        // Un JWT literal en src/ es una clave de Supabase pegada en el código. La anon key va por
        // env var; la service_role no entra en un bundle de cliente bajo ningún concepto.
        {
          selector: 'Literal[value=/^eyJ[A-Za-z0-9_-]+\\./]',
          message: 'No pegues un JWT en el código: la anon key va por variable de entorno, y la service_role nunca en cliente.',
        },
      ],

      // Frontera arquitectónica apps ↔ @gym/shared (issue #20, G1): la lógica de negocio vive en
      // `packages/shared` y se consume SOLO por el barrel `@gym/shared`. No es posible lintear
      // "lógica de negocio" directamente, pero sí su proxy: (1) prohibir imports profundos a
      // packages/shared (fuerza el barrel), (2) prohibir acceso directo a Supabase desde apps
      // (fuerza la capa de API compartida). Excepción de (2): lib/supabase.js, que CREA el cliente
      // inyectado por initApi (ver override abajo).
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/packages/shared/**', '@gym/shared/src/**', '@gym/shared/dist/**'],
          message: 'Importa la lógica compartida por el barrel `@gym/shared`, no por rutas internas.',
        }],
        paths: [{
          name: '@supabase/supabase-js',
          message: 'Las apps no acceden a Supabase directamente: usa la capa de API de `@gym/shared`. Única excepción: lib/supabase.js (crea el cliente inyectado por initApi).',
        }],
      }],
    },
    settings: { react: { version: 'detect' } },
  },
  {
    // styles.js define los tokens (hex/rgba legítimos) y tailwind.config los reexporta.
    files: ['**/lib/styles.js', '**/tailwind.config.{js,cjs}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
  {
    // lib/supabase.js es el ÚNICO sitio que puede importar @supabase/supabase-js: crea el cliente
    // que initApi inyecta en @gym/shared. El resto de la app pasa por la capa de API compartida.
    files: ['**/lib/supabase.js'],
    rules: { 'no-restricted-imports': 'off' },
  },
]
