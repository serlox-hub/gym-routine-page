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
