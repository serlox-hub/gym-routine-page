import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Config of `npm run db:check-pr-parity` alone. The check needs the local database, so its file is
// named outside the `scripts/**/*.test.js` glob of the unit run (vite.config.js).
export default defineConfig({
  root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  test: {
    include: ['scripts/prRuleParity.check.js'],
    environment: 'node',
  },
})
