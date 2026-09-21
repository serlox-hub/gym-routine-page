import { baseConfig } from '@gym/eslint-config'
import globals from 'globals'
import importX from 'eslint-plugin-import-x'

export default [
  ...baseConfig,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node, ...globals.es2021, __DEV__: 'readonly' },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
  // Native has no bundler gate: Metro bundles a missing named export without complaint and the
  // app crashes at runtime. These two rules are the only check that imports resolve (issue #76).
  // `default`/`namespace` stay off: they report parse errors on react-native (Flow) today.
  {
    files: ['**/*.{js,jsx}'],
    plugins: { 'import-x': importX },
    settings: {
      // Load-bearing: without .jsx every extensionless import of a component is "unresolved".
      'import-x/resolver': { node: { extensions: ['.js', '.jsx', '.json'] } },
    },
    rules: {
      'import-x/named': 'error',
      'import-x/no-unresolved': ['error', { commonjs: true }],
    },
  },
  {
    ignores: ['node_modules/**', '.expo/**', 'dist/**', 'android/**', 'ios/**'],
  },
]
