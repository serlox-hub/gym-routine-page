import { describe, it, expect } from 'vitest'
import { Linter } from 'eslint'
import { baseConfig } from '@gym/eslint-config'

// A set's note has one icon, `NoteIcon` (components/ui/icons.js in each app). The rule that keeps
// it that way lives in the shared lint config used by BOTH apps. `npm run lint` only proves the
// code as it is today is clean, not that the rule still bites, and `apps/gym-native` has no test
// runner, so the check lives in the web suite like `designTokens.test.js`.
const linter = new Linter({ configType: 'flat' })

const config = [
  ...baseConfig,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
  },
]

// Only the restricted-imports findings: the base config reports other rules on these snippets.
function restrictedImports(code, filename) {
  return linter
    .verify(code, config, { filename })
    .filter((message) => message.ruleId === 'no-restricted-imports')
}

const SOME_COMPONENT = 'src/components/Workout/SomeRow.js'
const ICONS_FILE = 'src/components/ui/icons.js'

describe('the set-note icon import restriction', () => {
  it.each([
    ['web', 'lucide-react'],
    ['native', 'lucide-react-native'],
  ])('rejects importing StickyNote straight from the %s icon library', (_app, library) => {
    const findings = restrictedImports(`import { StickyNote } from '${library}'\nexport const icon = StickyNote\n`, SOME_COMPONENT)

    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain('NoteIcon')
  })

  it.each(['StickyNote', 'StickyNoteIcon', 'LucideStickyNote'])('rejects the %s alias of the glyph', (name) => {
    const findings = restrictedImports(`import { ${name} } from 'lucide-react'\nexport const icon = ${name}\n`, SOME_COMPONENT)

    expect(findings).toHaveLength(1)
  })

  it('rejects the glyph even when it is renamed on import', () => {
    const findings = restrictedImports("import { StickyNote as Memo } from 'lucide-react'\nexport const icon = Memo\n", SOME_COMPONENT)

    expect(findings).toHaveLength(1)
  })

  it('rejects re-exporting the glyph from any file but icons.js', () => {
    const findings = restrictedImports("export { StickyNote as OtherNoteIcon } from 'lucide-react'\n", SOME_COMPONENT)

    expect(findings).toHaveLength(1)
  })

  it('still lets a component import every other glyph, FileText included', () => {
    const code = "import { FileText, Video, SlidersHorizontal } from 'lucide-react'\nexport const icons = [FileText, Video, SlidersHorizontal]\n"

    expect(restrictedImports(code, SOME_COMPONENT)).toEqual([])
  })

  it.each([
    ['web', 'lucide-react'],
    ['native', 'lucide-react-native'],
  ])('lets components/ui/icons.js import and re-export the glyph from the %s library', (_app, library) => {
    const code = `import { StickyNote } from '${library}'\nexport { StickyNote as NoteIcon } from '${library}'\nexport const raw = StickyNote\n`

    expect(restrictedImports(code, ICONS_FILE)).toEqual([])
  })

  it('does not let a sibling file of icons.js import the glyph', () => {
    const findings = restrictedImports("import { StickyNote } from 'lucide-react'\nexport const icon = StickyNote\n", 'src/components/ui/Chip.js')

    expect(findings).toHaveLength(1)
  })
})

// Adding the icon entries rewrote the `paths` list of the same rule, so the older entry in it
// is worth one check.
describe('the Supabase import restriction next to it', () => {
  const SUPABASE_IMPORT = "import { createClient } from '@supabase/supabase-js'\nexport const client = createClient\n"

  it('still rejects a direct Supabase import in a component', () => {
    const findings = restrictedImports(SUPABASE_IMPORT, SOME_COMPONENT)

    expect(findings).toHaveLength(1)
    expect(findings[0].message).toContain('@gym/shared')
  })

  it('still lets lib/supabase.js create the client', () => {
    expect(restrictedImports(SUPABASE_IMPORT, 'src/lib/supabase.js')).toEqual([])
  })
})
