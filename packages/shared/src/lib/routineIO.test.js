import { describe, it, expect } from 'vitest'
import { buildChatbotPrompt, buildAdaptRoutinePrompt, formatExerciseCatalog, getPromptCatalogStatus, PROMPT_CATALOG_STATUS, ROUTINE_JSON_FORMAT, ROUTINE_JSON_RULES } from './routineIO.js'

describe('routineIO - funciones puras (shared)', () => {
  describe('buildChatbotPrompt', () => {
    it('genera prompt con todos los campos completos', () => {
      const params = {
        objetivo: 'Hipertrofia',
        diasPorSemana: '4',
        nivelExperiencia: 'Intermedio',
        duracionSesion: '60',
        equipamiento: 'Gimnasio completo',
        notas: 'Sin lesiones'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('Hipertrofia')
      expect(prompt).toContain('4')
      expect(prompt).toContain('Intermedio')
      expect(prompt).toContain('60')
      expect(prompt).toContain('Gimnasio completo')
      expect(prompt).toContain('Sin lesiones')
    })

    it('genera prompt solo con campos obligatorios', () => {
      const params = {
        objetivo: 'Fuerza',
        diasPorSemana: '3',
        nivelExperiencia: '',
        duracionSesion: '',
        equipamiento: '',
        notas: ''
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('Fuerza')
      expect(prompt).toContain('3')
    })

    it('genera prompt con campos undefined/null', () => {
      const params = {
        objetivo: 'Resistencia',
        diasPorSemana: '5',
        nivelExperiencia: null,
        duracionSesion: undefined,
        equipamiento: null,
        notas: undefined
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('Resistencia')
      expect(prompt).toContain('5')
      expect(prompt).not.toContain('null')
      expect(prompt).not.toContain('undefined')
    })

    it('incluye el objetivo del usuario en el prompt', () => {
      const params = {
        objetivo: 'Hipertrofia',
        diasPorSemana: '2'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('Hipertrofia')
    })

    it('incluye estructura JSON correcta en el prompt', () => {
      const params = {
        objetivo: 'Hipertrofia',
        diasPorSemana: '4'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('"version": 10')
      expect(prompt).toContain('"exercises":')
      expect(prompt).toContain('"routine":')
      expect(prompt).toContain('"tracked_fields"')
      expect(prompt).toContain('"muscle_group_name"')
      expect(prompt).toContain('JSON')
    })

    it('incluye instrucciones para el chatbot', () => {
      const params = {
        objetivo: 'Fuerza',
        diasPorSemana: '3'
      }

      const prompt = buildChatbotPrompt(params)

      expect(prompt).toContain('entrenador personal certificado')
      expect(prompt).toContain('CRITERIOS DE DISEÑO')
    })
  })

  describe('buildAdaptRoutinePrompt', () => {
    it('genera prompt para adaptar rutina existente', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('rutina de entrenamiento')
      expect(prompt).toContain('MI RUTINA A CONVERTIR:')
    })

    it('incluye el formato JSON compartido', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('"version": 10')
      expect(prompt).toContain('"exercises":')
      expect(prompt).toContain('"routine":')
      expect(prompt).toContain('"duration_min"')
    })

    it('incluye las reglas compartidas', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('IMPORTANT RULES')
      expect(prompt).toContain('EXERCISE FIELDS')
      expect(prompt).toContain('BLOCK FIELDS')
    })

    it('no incluye campos de medición obsoletos', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).not.toContain('reps_per_side')
      expect(prompt).not.toContain('time_per_side')
    })

    it('documenta los campos de medición, no combinaciones cerradas', () => {
      const prompt = buildAdaptRoutinePrompt()

      expect(prompt).toContain('tracked_fields')
      for (const field of ['weight', 'reps', 'time', 'distance', 'pace', 'level', 'calories']) {
        expect(prompt, field).toContain(`"${field}"`)
      }
      // Los 12 tipos del modelo anterior ya no se le ofrecen a la IA
      expect(prompt).not.toContain('"weight_reps"')
      expect(prompt).not.toContain('"level_time"')
    })
  })

  describe('constantes compartidas', () => {
    it('ROUTINE_JSON_FORMAT contiene estructura válida', () => {
      expect(ROUTINE_JSON_FORMAT).toContain('"version": 10')
      expect(ROUTINE_JSON_FORMAT).toContain('"exercises"')
      expect(ROUTINE_JSON_FORMAT).toContain('"routine"')
      expect(ROUTINE_JSON_FORMAT).toContain('"duration_min"')
    })

    it('ROUTINE_JSON_RULES contiene documentación de campos', () => {
      expect(ROUTINE_JSON_RULES).toContain('IMPORTANT RULES')
      expect(ROUTINE_JSON_RULES).toContain('EXERCISE FIELDS')
      expect(ROUTINE_JSON_RULES).toContain('tracked_fields')
      expect(ROUTINE_JSON_RULES).toContain('muscle_group_name')
    })

    it('ROUTINE_JSON_RULES no contiene tipos obsoletos', () => {
      expect(ROUTINE_JSON_RULES).not.toContain('reps_per_side')
      expect(ROUTINE_JSON_RULES).not.toContain('time_per_side')
    })

    it('ROUTINE_JSON_RULES documenta las dos escalas de esfuerzo, no un rango fijo', () => {
      // El prompt es el generador principal de rutinas: un rango que no existe en ninguna escala
      // fabrica valores que la UI no sabe pintar (el viejo "rir: 0-5")
      expect(ROUTINE_JSON_RULES).not.toContain('rir: 0-5')
      expect(ROUTINE_JSON_RULES).toContain('-1..3')
      expect(ROUTINE_JSON_RULES).toContain('1..5')
    })

    it('ambos prompts usan las mismas constantes', () => {
      const chatbotPrompt = buildChatbotPrompt({ objetivo: 'Test', diasPorSemana: '3' })
      const adaptPrompt = buildAdaptRoutinePrompt()

      expect(chatbotPrompt).toContain('EXERCISE FIELDS')
      expect(adaptPrompt).toContain('EXERCISE FIELDS')
    })
  })

  describe('formatExerciseCatalog', () => {
    const chest = { name: 'Pecho', name_en: 'Chest' }
    const back = { name: 'Espalda', name_en: 'Back' }
    const system = (name_en, muscle_group) => ({ name: `ES ${name_en}`, name_en, is_system: true, muscle_group })

    it('lists system exercises by name_en, grouped by muscle group, groups and names sorted', () => {
      const catalog = formatExerciseCatalog([
        system('Push-Up', chest),
        system('Pull-Up', back),
        system('Barbell Bench Press', chest),
        system('Barbell Row', back),
      ])

      expect(catalog.split('\n')).toEqual([
        expect.stringContaining('EXERCISE CATALOG'),
        '## Back', '- Barbell Row', '- Pull-Up',
        '## Chest', '- Barbell Bench Press', '- Push-Up',
      ])
    })

    it('skips custom exercises and exercises without name_en', () => {
      const catalog = formatExerciseCatalog([
        system('Push-Up', chest),
        { name: 'Mi press', name_en: 'My Press', is_system: false, muscle_group: chest },
        { name: 'Sin nombre en inglés', name_en: null, is_system: true, muscle_group: chest },
        null,
      ])

      expect(catalog).toContain('- Push-Up')
      expect(catalog).not.toContain('My Press')
      expect(catalog.match(/^- /gm)).toHaveLength(1)
    })

    it('puts exercises without a muscle group under a final "Other" group', () => {
      const catalog = formatExerciseCatalog([
        system('Burpee', null),
        system('Push-Up', chest),
        system('Rowing Machine', { name: 'Remo', name_en: 'Zzz' }),
      ])

      const groups = catalog.split('\n').filter(line => line.startsWith('## '))
      expect(groups).toEqual(['## Chest', '## Zzz', '## Other'])
      expect(catalog.endsWith('## Other\n- Burpee')).toBe(true)
    })

    it('falls back to the muscle group name when it has no name_en', () => {
      expect(formatExerciseCatalog([system('Push-Up', { name: 'Pecho', name_en: null })])).toContain('## Pecho\n- Push-Up')
    })

    it.each([[[]], [null], [undefined], [[{ name: 'Custom', name_en: 'Custom', is_system: false, muscle_group: chest }]]])(
      'returns an empty string when no row qualifies (%j)',
      (exercises) => {
        expect(formatExerciseCatalog(exercises)).toBe('')
      },
    )
  })

  describe('getPromptCatalogStatus', () => {
    it.each([
      ['ready once the catalog loaded', { data: [{ id: 1 }], isError: false }, PROMPT_CATALOG_STATUS.READY],
      // A catalog with no system exercise is still a loaded catalog: the prompt goes out without it
      ['ready with an empty loaded list', { data: [], isError: false }, PROMPT_CATALOG_STATUS.READY],
      // A background refetch that fails keeps the catalog that already loaded
      ['ready when a later refetch failed', { data: [{ id: 1 }], isError: true }, PROMPT_CATALOG_STATUS.READY],
      // Pending, or paused offline (TanStack v5 reports isLoading false there): never an empty catalog
      ['loading while nothing loaded and no error', { data: undefined, isError: false }, PROMPT_CATALOG_STATUS.LOADING],
      ['error when nothing loaded and the request failed', { data: undefined, isError: true }, PROMPT_CATALOG_STATUS.ERROR],
    ])('%s', (_name, query, expected) => {
      expect(getPromptCatalogStatus(query)).toBe(expected)
    })
  })

  describe('catalog in the prompts', () => {
    const params = { objetivo: 'Hipertrofia', diasPorSemana: '4' }
    const catalog = formatExerciseCatalog([
      { name: 'Press', name_en: 'Barbell Bench Press', is_system: true, muscle_group: { name: 'Pecho', name_en: 'Chest' } },
    ])

    it('buildChatbotPrompt appends the catalog after the rules', () => {
      const prompt = buildChatbotPrompt(params, catalog)

      expect(prompt).toContain(catalog)
      expect(prompt.indexOf(catalog)).toBeGreaterThan(prompt.indexOf('IMPORTANT RULES'))
    })

    it('buildAdaptRoutinePrompt puts the catalog after the rules and before the routine to convert', () => {
      const prompt = buildAdaptRoutinePrompt(catalog)

      expect(prompt.indexOf(catalog)).toBeGreaterThan(prompt.indexOf('IMPORTANT RULES'))
      expect(prompt.indexOf(catalog)).toBeLessThan(prompt.indexOf('MI RUTINA A CONVERTIR:'))
      expect(prompt.trimEnd().endsWith('MI RUTINA A CONVERTIR:')).toBe(true)
    })

    it.each([[''], [undefined]])('builds both prompts as without a catalog when it is %j', (empty) => {
      expect(buildChatbotPrompt(params, empty)).toBe(buildChatbotPrompt(params))
      expect(buildAdaptRoutinePrompt(empty)).toBe(buildAdaptRoutinePrompt())
      expect(buildChatbotPrompt(params, empty)).not.toContain('Barbell Bench Press')
      expect(buildChatbotPrompt(params, empty)).not.toContain('\n## ')
    })

    it('the rules ask for the catalog name in name_en, which is no longer optional', () => {
      expect(ROUTINE_JSON_RULES).toContain('EXERCISE CATALOG')
      expect(ROUTINE_JSON_RULES).toMatch(/name_en: .*REQUIRED/)
      expect(ROUTINE_JSON_FORMAT).not.toMatch(/"name_en": .*optional/)
    })
  })
})
