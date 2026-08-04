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
    },
    settings: { react: { version: 'detect' } },
  },
  {
    // styles.js define los tokens (hex/rgba legítimos) y tailwind.config los reexporta.
    files: ['**/lib/styles.js', '**/tailwind.config.{js,cjs}'],
    rules: { 'no-restricted-syntax': 'off' },
  },
]
