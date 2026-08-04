import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Paridad de keys es ↔ en: cada namespace debe tener EXACTAMENTE las mismas claves en ambos
// idiomas (regla del CLAUDE.md: nunca añadir una key a un solo idioma). Antes esto solo lo
// cazaba un grep del agente en /pre-commit; aquí es determinista y corre en CI (issue #20, G1).
// Auto-descubre namespaces leyendo el directorio → una key/namespace nuevo queda cubierto sin
// tocar este test.
const localesDir = join(dirname(fileURLToPath(import.meta.url)), 'locales')
const esDir = join(localesDir, 'es')
const enDir = join(localesDir, 'en')

const jsonFiles = (dir) => readdirSync(dir).filter((f) => f.endsWith('.json')).sort()

// Claves aplanadas con notación de punto; recorre solo objetos (los valores string/array son hoja).
function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' && !Array.isArray(value)
      ? flatKeys(value, path)
      : [path]
  })
}

const load = (dir, file) => JSON.parse(readFileSync(join(dir, file), 'utf8'))

describe('i18n key parity (es ↔ en)', () => {
  it('ambos idiomas tienen los mismos archivos de namespace', () => {
    expect(jsonFiles(enDir)).toEqual(jsonFiles(esDir))
  })

  for (const namespace of jsonFiles(esDir)) {
    it(`${namespace}: es y en tienen las mismas claves`, () => {
      const esKeys = flatKeys(load(esDir, namespace)).sort()
      const enKeys = flatKeys(load(enDir, namespace)).sort()
      // toEqual da un diff legible de las claves que sobran/faltan en un idioma.
      expect(enKeys).toEqual(esKeys)
    })
  }
})
