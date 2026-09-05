import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Estilo del copy de usuario (regla del CLAUDE.md, "Estilo de copy de UI"): el em dash y el punto
// y coma son los dos tells de texto generado por IA que se cuelan sin que nadie los vea en review.
// Antes esto solo lo cazaba un grep del agente; aquí es determinista y corre en CI, como la paridad
// de claves de i18nParity.test.js. Aplica SOLO a valores de i18n: docs, comentarios y JSDoc quedan
// fuera a propósito.
const localesDir = join(dirname(fileURLToPath(import.meta.url)), 'locales')
// withFileTypes: un `.DS_Store` (macOS lo crea al abrir la carpeta) haría que el readdirSync
// de abajo lanzase ENOTDIR y los 4 tests fallasen con un error que no habla de i18n.
const languages = readdirSync(localesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)

// Entidades HTML (`&nbsp;`, `&#39;`) llevan `;` estructural, no de prosa.
const HTML_ENTITY = /&(#[0-9]+|[a-z]+);/g

// Devuelve [rutaDeClave, valor] de cada string hoja, incluidos los de dentro de arrays.
function flatStrings(value, path = '') {
  if (typeof value === 'string') return [[path, value]]
  if (Array.isArray(value)) return value.flatMap((v, i) => flatStrings(v, `${path}[${i}]`))
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => flatStrings(v, path ? `${path}.${k}` : k))
  }
  return []
}

function offenders(lang, pattern, sanitize = (s) => s) {
  const dir = join(localesDir, lang)
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .flatMap((file) => {
      const json = JSON.parse(readFileSync(join(dir, file), 'utf8'))
      return flatStrings(json)
        .filter(([, value]) => pattern.test(sanitize(value)))
        .map(([path, value]) => `${lang}/${file} → ${path}: ${JSON.stringify(value)}`)
    })
}

describe('estilo del copy de UI', () => {
  for (const lang of languages) {
    it(`${lang}: ningún em dash en el copy (usa punto, coma o paréntesis)`, () => {
      expect(offenders(lang, /—/)).toEqual([])
    })

    it(`${lang}: ningún punto y coma en el copy (parte en frases cortas)`, () => {
      expect(offenders(lang, /;/, (s) => s.replace(HTML_ENTITY, ''))).toEqual([])
    })
  }
})
