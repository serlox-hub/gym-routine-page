import { baseConfig } from '@gym/eslint-config'
import globals from 'globals'

export default [
  ...baseConfig,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
        __APP_VERSION__: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
]
